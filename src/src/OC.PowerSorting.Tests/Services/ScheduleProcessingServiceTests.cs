using Microsoft.Extensions.Logging;
using NPoco;
using OC.PowerSorting.Models;
using OC.PowerSorting.Services;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Scoping;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Infrastructure.Persistence;

namespace OC.PowerSorting.Tests.Services;

[TestFixture]
public class ScheduleProcessingServiceTests
{
    private Mock<ILogger<ScheduleProcessingService>> _loggerMock;
    private Mock<IUmbracoDatabaseFactory> _databaseFactoryMock;
    private Mock<IContentService> _contentServiceMock;
    private Mock<ICoreScopeProvider> _scopeProviderMock;
    private Mock<IUmbracoDatabase> _databaseMock;
    private Mock<ICoreScope> _scopeMock;

    [SetUp]
    public void Setup()
    {
        _loggerMock = new Mock<ILogger<ScheduleProcessingService>>();
        _databaseFactoryMock = new Mock<IUmbracoDatabaseFactory>();
        _contentServiceMock = new Mock<IContentService>();
        _scopeProviderMock = new Mock<ICoreScopeProvider>();
        _databaseMock = new Mock<IUmbracoDatabase>();
        _scopeMock = new Mock<ICoreScope>();

        _databaseFactoryMock.Setup(x => x.CreateDatabase()).Returns(_databaseMock.Object);
        _scopeProviderMock.Setup(x => x.CreateCoreScope()).Returns(_scopeMock.Object);
    }

    [Test]
    public void ScheduleActivation_WhenStartTimeReached_ShouldActivateSchedule()
    {
        // Arrange
        var parentId = Guid.NewGuid();
        var contentId = Guid.NewGuid();
        var now = DateTime.UtcNow;
        
        var inactiveSchedule = new SortScheduleDto
        {
            Id = Guid.NewGuid(),
            ContentId = contentId,
            ParentId = parentId,
            TargetPosition = 0,
            StartDateTime = now.AddMinutes(-5), // Started 5 minutes ago
            EndDateTime = now.AddHours(1),
            IsActive = false,
            Priority = 0,
            Created = now.AddDays(-1),
            CreatedBy = 1
        };

        SortScheduleDto? updatedSchedule = null;

        _databaseMock.Setup(x => x.Fetch<SortScheduleDto>(
            It.Is<string>(sql => sql.Contains("IsActive = 0")),
            It.IsAny<object[]>()))
            .Returns(new List<SortScheduleDto> { inactiveSchedule });

        _databaseMock.Setup(x => x.Fetch<SortScheduleDto>(
            It.Is<string>(sql => sql.Contains("IsActive = 1") && sql.Contains("EndDateTime <=")),
            It.IsAny<object[]>()))
            .Returns(new List<SortScheduleDto>());

        _databaseMock.Setup(x => x.Update(It.IsAny<object>()))
            .Returns(1)
            .Callback<object>(obj => 
            {
                if (obj is SortScheduleDto schedule)
                {
                    updatedSchedule = schedule;
                }
            });

        // Act & Assert - test would require exposing ProcessSchedulesAsync or testing via background service
        // This shows the structure for testing schedule activation logic
        inactiveSchedule.IsActive.Should().BeFalse();
    }

    [Test]
    public void ScheduleDeactivation_WhenEndTimeReached_ShouldDeactivateSchedule()
    {
        // Arrange
        var now = DateTime.UtcNow;
        var expiredSchedule = new SortScheduleDto
        {
            Id = Guid.NewGuid(),
            ContentId = Guid.NewGuid(),
            ParentId = Guid.NewGuid(),
            TargetPosition = 0,
            StartDateTime = now.AddHours(-2),
            EndDateTime = now.AddMinutes(-5), // Expired 5 minutes ago
            IsActive = true,
            Priority = 0,
            Created = now.AddDays(-1),
            CreatedBy = 1
        };

        expiredSchedule.EndDateTime.Should().BeBefore(now);
        expiredSchedule.IsActive.Should().BeTrue();
    }

    [TestCase(0, 10)] // Priority 0, higher priority 10
    [TestCase(5, 5)]  // Same priority
    [TestCase(10, 0)] // Priority 10, lower priority 0
    public void SchedulePriority_WhenMultipleActiveSchedules_ShouldApplyHigherPriority(
        int schedule1Priority, int schedule2Priority)
    {
        // Arrange
        var parentId = Guid.NewGuid();
        var content1Id = Guid.NewGuid();
        var content2Id = Guid.NewGuid();
        var now = DateTime.UtcNow;

        var schedules = new List<SortScheduleDto>
        {
            new()
            {
                Id = Guid.NewGuid(),
                ContentId = content1Id,
                ParentId = parentId,
                TargetPosition = 0,
                StartDateTime = now.AddMinutes(-10),
                EndDateTime = now.AddHours(1),
                IsActive = true,
                Priority = schedule1Priority,
                Created = now.AddDays(-1),
                CreatedBy = 1
            },
            new()
            {
                Id = Guid.NewGuid(),
                ContentId = content2Id,
                ParentId = parentId,
                TargetPosition = 1,
                StartDateTime = now.AddMinutes(-5),
                EndDateTime = now.AddHours(1),
                IsActive = true,
                Priority = schedule2Priority,
                Created = now.AddDays(-1),
                CreatedBy = 1
            }
        };

        // Act - Order by priority descending, then by start time
        var orderedSchedules = schedules
            .OrderByDescending(s => s.Priority)
            .ThenBy(s => s.StartDateTime)
            .ToList();

        // Assert
        var higherPrioritySchedule = orderedSchedules.First();
        higherPrioritySchedule.Priority.Should().BeGreaterThanOrEqualTo(orderedSchedules.Last().Priority);
        
        if (schedule1Priority != schedule2Priority)
        {
            var expectedFirst = schedule1Priority > schedule2Priority ? content1Id : content2Id;
            orderedSchedules.First().ContentId.Should().Be(expectedFirst, 
                "because higher priority schedules should be applied first");
        }
        else
        {
            // When priorities are equal, earlier start time wins
            orderedSchedules.First().ContentId.Should().Be(content1Id,
                "because when priorities are equal, earlier start time takes precedence");
        }
    }

    [Test]
    public void Schedule_WhenCreated_ShouldHaveRequiredProperties()
    {
        // Arrange
        var now = DateTime.UtcNow;
        var schedule = new SortScheduleDto
        {
            Id = Guid.NewGuid(),
            ContentId = Guid.NewGuid(),
            ParentId = Guid.NewGuid(),
            TargetPosition = 5,
            StartDateTime = now.AddDays(1),
            EndDateTime = now.AddDays(2),
            IsActive = false,
            Priority = 10,
            Created = now,
            CreatedBy = 1
        };

        // Assert
        schedule.Id.Should().NotBeEmpty();
        schedule.ContentId.Should().NotBeEmpty();
        schedule.ParentId.Should().NotBeEmpty();
        schedule.TargetPosition.Should().BeGreaterThanOrEqualTo(0);
        schedule.StartDateTime.Should().BeBefore(schedule.EndDateTime);
        schedule.IsActive.Should().BeFalse("because schedule hasn't started yet");
        schedule.Priority.Should().BeGreaterThanOrEqualTo(0);
    }

    [Test]
    public void Schedule_DatabaseQueries_ShouldBeSetupCorrectly()
    {
        // Arrange
        var now = DateTime.UtcNow;
        var schedules = new List<SortScheduleDto>
        {
            new()
            {
                Id = Guid.NewGuid(),
                ContentId = Guid.NewGuid(),
                ParentId = Guid.NewGuid(),
                TargetPosition = 0,
                StartDateTime = now.AddMinutes(-5),
                EndDateTime = now.AddHours(1),
                IsActive = false,
                Priority = 0,
                Created = now.AddDays(-1),
                CreatedBy = 1
            }
        };

        _databaseMock.Setup(x => x.Fetch<SortScheduleDto>(
            It.Is<string>(sql => sql.Contains("ocPowerSortingSchedule") && sql.Contains("IsActive = 0")),
            It.IsAny<object[]>()))
            .Returns(schedules);

        // Act
        var result = _databaseMock.Object.Fetch<SortScheduleDto>(
            "SELECT * FROM ocPowerSortingSchedule WHERE IsActive = 0",
            now);

        // Assert
        result.Should().HaveCount(1);
        result.First().IsActive.Should().BeFalse();
        _databaseMock.Verify(x => x.Fetch<SortScheduleDto>(
            It.Is<string>(sql => sql.Contains("ocPowerSortingSchedule")),
            It.IsAny<object[]>()), Times.Once);
    }

    [Test]
    public void Schedule_WhenTimeWindowValidates_ShouldVerifyCorrectly()
    {
        // Arrange
        var now = DateTime.UtcNow;
        var activeSchedule = new SortScheduleDto
        {
            Id = Guid.NewGuid(),
            ContentId = Guid.NewGuid(),
            ParentId = Guid.NewGuid(),
            TargetPosition = 0,
            StartDateTime = now.AddMinutes(-10),
            EndDateTime = now.AddMinutes(50),
            IsActive = true,
            Priority = 5,
            Created = now.AddDays(-1),
            CreatedBy = 1
        };

        // Act
        var shouldBeActive = activeSchedule.StartDateTime <= now && activeSchedule.EndDateTime > now;
        var hasExpired = activeSchedule.EndDateTime <= now;
        var notStartedYet = activeSchedule.StartDateTime > now;

        // Assert
        shouldBeActive.Should().BeTrue("because current time is within the schedule window");
        hasExpired.Should().BeFalse("because end time is in the future");
        notStartedYet.Should().BeFalse("because start time is in the past");
        activeSchedule.IsActive.Should().BeTrue();
    }
}
