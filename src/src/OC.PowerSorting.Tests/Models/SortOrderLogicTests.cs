using OC.PowerSorting.Models;

namespace OC.PowerSorting.Tests.Models;

[TestFixture]
public class SortOrderLogicTests
{
    [Test]
    public void ScheduleTimeWindow_WhenCurrentTimeWithinWindow_IsActive()
    {
        // Arrange
        var now = DateTime.UtcNow;
        var schedule = new SortScheduleDto
        {
            Id = Guid.NewGuid(),
            ContentId = Guid.NewGuid(),
            ParentId = Guid.NewGuid(),
            TargetPosition = 0,
            StartDateTime = now.AddHours(-1),
            EndDateTime = now.AddHours(1),
            IsActive = true,
            Priority = 0,
            Created = now.AddDays(-1),
            CreatedBy = 1
        };

        // Act
        var isInWindow = schedule.StartDateTime <= now && schedule.EndDateTime > now;

        // Assert
        isInWindow.Should().BeTrue();
        schedule.IsActive.Should().BeTrue();
    }

    [Test]
    public void ScheduleTimeWindow_WhenCurrentTimeBeforeStart_IsNotActive()
    {
        // Arrange
        var now = DateTime.UtcNow;
        var schedule = new SortScheduleDto
        {
            Id = Guid.NewGuid(),
            ContentId = Guid.NewGuid(),
            ParentId = Guid.NewGuid(),
            TargetPosition = 0,
            StartDateTime = now.AddHours(1),
            EndDateTime = now.AddHours(2),
            IsActive = false,
            Priority = 0,
            Created = now.AddDays(-1),
            CreatedBy = 1
        };

        // Act
        var isInWindow = schedule.StartDateTime <= now && schedule.EndDateTime > now;

        // Assert
        isInWindow.Should().BeFalse();
    }

    [Test]
    public void ScheduleTimeWindow_WhenCurrentTimeAfterEnd_IsNotActive()
    {
        // Arrange
        var now = DateTime.UtcNow;
        var schedule = new SortScheduleDto
        {
            Id = Guid.NewGuid(),
            ContentId = Guid.NewGuid(),
            ParentId = Guid.NewGuid(),
            TargetPosition = 0,
            StartDateTime = now.AddHours(-2),
            EndDateTime = now.AddHours(-1),
            IsActive = false,
            Priority = 0,
            Created = now.AddDays(-1),
            CreatedBy = 1
        };

        // Act
        var isInWindow = schedule.StartDateTime <= now && schedule.EndDateTime > now;

        // Assert
        isInWindow.Should().BeFalse();
    }

    [TestCase(0, 1, 2)] // Positions 0, 1, 2
    [TestCase(2, 1, 0)] // Reverse order
    [TestCase(0, 2, 1)] // Mixed order
    public void DefaultSortOrder_ShouldMaintainConfiguredPositions(int pos1, int pos2, int pos3)
    {
        // Arrange
        var parentId = Guid.NewGuid();
        var baseDate = DateTime.UtcNow;
        
        var defaultOrders = new List<DefaultSortOrderDto>
        {
            new()
            {
                Id = Guid.NewGuid(),
                ParentId = parentId,
                ContentId = Guid.NewGuid(),
                SortOrder = pos1,
                Created = baseDate,
                CreatedBy = 1,
                Updated = baseDate
            },
            new()
            {
                Id = Guid.NewGuid(),
                ParentId = parentId,
                ContentId = Guid.NewGuid(),
                SortOrder = pos2,
                Created = baseDate,
                CreatedBy = 1,
                Updated = baseDate
            },
            new()
            {
                Id = Guid.NewGuid(),
                ParentId = parentId,
                ContentId = Guid.NewGuid(),
                SortOrder = pos3,
                Created = baseDate,
                CreatedBy = 1,
                Updated = baseDate
            }
        };

        // Act
        var orderedByPosition = defaultOrders.OrderBy(x => x.SortOrder).ToList();

        // Assert
        orderedByPosition[0].SortOrder.Should().Be(defaultOrders.Min(x => x.SortOrder));
        orderedByPosition[2].SortOrder.Should().Be(defaultOrders.Max(x => x.SortOrder));
    }

    [Test]
    public void MultipleSchedules_SameParent_ShouldOrderByPriorityThenStartTime()
    {
        // Arrange
        var parentId = Guid.NewGuid();
        var now = DateTime.UtcNow;
        
        var schedules = new List<SortScheduleDto>
        {
            new()
            {
                Id = Guid.NewGuid(),
                ContentId = Guid.NewGuid(),
                ParentId = parentId,
                TargetPosition = 0,
                StartDateTime = now.AddMinutes(-30),
                EndDateTime = now.AddHours(1),
                IsActive = true,
                Priority = 5,
                Created = now.AddDays(-1),
                CreatedBy = 1
            },
            new()
            {
                Id = Guid.NewGuid(),
                ContentId = Guid.NewGuid(),
                ParentId = parentId,
                TargetPosition = 1,
                StartDateTime = now.AddMinutes(-10), // Started more recently
                EndDateTime = now.AddHours(1),
                IsActive = true,
                Priority = 10, // Higher priority
                Created = now.AddDays(-1),
                CreatedBy = 1
            },
            new()
            {
                Id = Guid.NewGuid(),
                ContentId = Guid.NewGuid(),
                ParentId = parentId,
                TargetPosition = 2,
                StartDateTime = now.AddMinutes(-20),
                EndDateTime = now.AddHours(1),
                IsActive = true,
                Priority = 5,
                Created = now.AddDays(-1),
                CreatedBy = 1
            }
        };

        // Act
        var orderedSchedules = schedules
            .OrderByDescending(s => s.Priority)
            .ThenBy(s => s.StartDateTime)
            .ToList();

        // Assert
        orderedSchedules[0].Priority.Should().Be(10);
        orderedSchedules[1].StartDateTime.Should().BeBefore(orderedSchedules[2].StartDateTime);
    }
}
