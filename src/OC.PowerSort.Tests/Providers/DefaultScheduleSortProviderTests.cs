using Microsoft.Extensions.Logging;
using Moq;
using OC.PowerSort.Interfaces;
using OC.PowerSort.Providers;
using Umbraco.Cms.Core.Services;

namespace OC.PowerSort.Tests.Providers;

[TestFixture]
public class DefaultScheduleSortProviderTests
{
    private Mock<IContentService> _contentServiceMock;
    private Mock<ILogger<DefaultScheduleSortProvider>> _loggerMock;
    private DefaultScheduleSortProvider _provider;

    [SetUp]
    public void Setup()
    {
        _contentServiceMock = new Mock<IContentService>();
        _loggerMock = new Mock<ILogger<DefaultScheduleSortProvider>>();
        _provider = new DefaultScheduleSortProvider(_contentServiceMock.Object, _loggerMock.Object);
    }

    [Test]
    public void Provider_Should_Have_Correct_Properties()
    {
        // Assert
        _provider.ProviderKey.Should().Be("PowerSort.Default");
        _provider.DisplayName.Should().Be("Default Schedule-Based Sort");
        _provider.SupportsScheduling.Should().BeTrue();
        _provider.Description.Should().NotBeNullOrEmpty();
    }

    [Test]
    public async Task CalculateSortOrderAsync_WithNoChildren_ShouldReturnEmptyResult()
    {
        // Arrange
        var context = new SortContext
        {
            ParentId = Guid.NewGuid(),
            Children = new List<SortableContent>()
        };

        // Act
        var result = await _provider.CalculateSortOrderAsync(context);

        // Assert
        result.Should().NotBeNull();
        result.SortedContentIds.Should().BeEmpty();
        result.ChangesMade.Should().BeFalse();
        result.ExecutionTimeMs.Should().BeGreaterOrEqualTo(0);
    }

    [Test]
    public async Task CalculateSortOrderAsync_WithNoSchedules_ShouldReturnOriginalOrder()
    {
        // Arrange
        var childId1 = Guid.NewGuid();
        var childId2 = Guid.NewGuid();
        var childId3 = Guid.NewGuid();

        var context = new SortContext
        {
            ParentId = Guid.NewGuid(),
            Children = new List<SortableContent>
            {
                new() { Id = childId1, Name = "Child 1", CurrentSortOrder = 0 },
                new() { Id = childId2, Name = "Child 2", CurrentSortOrder = 1 },
                new() { Id = childId3, Name = "Child 3", CurrentSortOrder = 2 }
            },
            ActiveSchedules = new List<SortSchedule>()
        };

        // Act
        var result = await _provider.CalculateSortOrderAsync(context);

        // Assert
        result.Should().NotBeNull();
        result.ChangesMade.Should().BeFalse();
        result.SortedContentIds.Should().HaveCount(3);
        result.SortedContentIds.Should().ContainInOrder(childId1, childId2, childId3);
    }

    [Test]
    public async Task CalculateSortOrderAsync_WithSingleSchedule_ShouldMoveThatContent()
    {
        // Arrange
        var childId1 = Guid.NewGuid();
        var childId2 = Guid.NewGuid();
        var childId3 = Guid.NewGuid();

        var context = new SortContext
        {
            ParentId = Guid.NewGuid(),
            Children = new List<SortableContent>
            {
                new() { Id = childId1, Name = "Child 1", CurrentSortOrder = 0 },
                new() { Id = childId2, Name = "Child 2", CurrentSortOrder = 1 },
                new() { Id = childId3, Name = "Child 3", CurrentSortOrder = 2 }
            },
            ActiveSchedules = new List<SortSchedule>
            {
                new()
                {
                    Id = Guid.NewGuid(),
                    ContentId = childId3, // Move Child 3 to position 0
                    TargetPosition = 0,
                    Priority = 1,
                    StartDateTime = DateTime.UtcNow.AddHours(-1),
                    EndDateTime = DateTime.UtcNow.AddHours(1)
                }
            }
        };

        // Act
        var result = await _provider.CalculateSortOrderAsync(context);

        // Assert
        result.Should().NotBeNull();
        result.ChangesMade.Should().BeTrue();
        result.SortedContentIds.Should().HaveCount(3);
        result.SortedContentIds[0].Should().Be(childId3); // Child 3 moved to first
        result.Metadata.Should().ContainKey("SchedulesApplied");
        result.Metadata["SchedulesApplied"].Should().Be(1);
    }

    [Test]
    public async Task CalculateSortOrderAsync_WithMultipleSchedules_ShouldApplyAll()
    {
        // Arrange
        var childId1 = Guid.NewGuid();
        var childId2 = Guid.NewGuid();
        var childId3 = Guid.NewGuid();
        var childId4 = Guid.NewGuid();

        var context = new SortContext
        {
            ParentId = Guid.NewGuid(),
            Children = new List<SortableContent>
            {
                new() { Id = childId1, Name = "Child 1", CurrentSortOrder = 0 },
                new() { Id = childId2, Name = "Child 2", CurrentSortOrder = 1 },
                new() { Id = childId3, Name = "Child 3", CurrentSortOrder = 2 },
                new() { Id = childId4, Name = "Child 4", CurrentSortOrder = 3 }
            },
            ActiveSchedules = new List<SortSchedule>
            {
                new()
                {
                    Id = Guid.NewGuid(),
                    ContentId = childId3,
                    TargetPosition = 0,
                    Priority = 5,
                    StartDateTime = DateTime.UtcNow.AddHours(-1),
                    EndDateTime = DateTime.UtcNow.AddHours(1)
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    ContentId = childId1,
                    TargetPosition = 3,
                    Priority = 5,
                    StartDateTime = DateTime.UtcNow.AddHours(-1),
                    EndDateTime = DateTime.UtcNow.AddHours(1)
                }
            }
        };

        // Act
        var result = await _provider.CalculateSortOrderAsync(context);

        // Assert
        result.Should().NotBeNull();
        result.ChangesMade.Should().BeTrue();
        result.SortedContentIds[0].Should().Be(childId3); // Child 3 at position 0
        result.Metadata["SchedulesApplied"].Should().Be(2);
    }

    [Test]
    public async Task CalculateSortOrderAsync_WithConflictingSchedules_ShouldResolvePriorityCorrectly()
    {
        // Arrange
        var childId1 = Guid.NewGuid();
        var childId2 = Guid.NewGuid();
        var childId3 = Guid.NewGuid();

        var context = new SortContext
        {
            ParentId = Guid.NewGuid(),
            Children = new List<SortableContent>
            {
                new() { Id = childId1, Name = "Child 1", CurrentSortOrder = 0 },
                new() { Id = childId2, Name = "Child 2", CurrentSortOrder = 1 },
                new() { Id = childId3, Name = "Child 3", CurrentSortOrder = 2 }
            },
            ActiveSchedules = new List<SortSchedule>
            {
                new()
                {
                    Id = Guid.NewGuid(),
                    ContentId = childId2,
                    TargetPosition = 0,
                    Priority = 10, // Higher priority
                    StartDateTime = DateTime.UtcNow.AddHours(-2),
                    EndDateTime = DateTime.UtcNow.AddHours(1)
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    ContentId = childId3,
                    TargetPosition = 0, // Same position
                    Priority = 5, // Lower priority (should lose)
                    StartDateTime = DateTime.UtcNow.AddHours(-1),
                    EndDateTime = DateTime.UtcNow.AddHours(1)
                }
            }
        };

        // Act
        var result = await _provider.CalculateSortOrderAsync(context);

        // Assert
        result.Should().NotBeNull();
        result.SortedContentIds[0].Should().Be(childId2); // Higher priority wins
        result.Metadata["SchedulesApplied"].Should().Be(1); // Only one schedule applied
        result.Metadata["ConflictsResolved"].Should().Be(1); // One conflict resolved
    }

    [Test]
    public async Task CalculateSortOrderAsync_WithSamePriority_ShouldUseStartTimeAsTiebreaker()
    {
        // Arrange
        var childId1 = Guid.NewGuid();
        var childId2 = Guid.NewGuid();
        var childId3 = Guid.NewGuid();

        var earlierTime = DateTime.UtcNow.AddHours(-2);
        var laterTime = DateTime.UtcNow.AddHours(-1);

        var context = new SortContext
        {
            ParentId = Guid.NewGuid(),
            Children = new List<SortableContent>
            {
                new() { Id = childId1, Name = "Child 1", CurrentSortOrder = 0 },
                new() { Id = childId2, Name = "Child 2", CurrentSortOrder = 1 },
                new() { Id = childId3, Name = "Child 3", CurrentSortOrder = 2 }
            },
            ActiveSchedules = new List<SortSchedule>
            {
                new()
                {
                    Id = Guid.NewGuid(),
                    ContentId = childId2,
                    TargetPosition = 0,
                    Priority = 5,
                    StartDateTime = laterTime,
                    EndDateTime = DateTime.UtcNow.AddHours(1)
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    ContentId = childId3,
                    TargetPosition = 0,
                    Priority = 5, // Same priority
                    StartDateTime = earlierTime, // Earlier start time (should win)
                    EndDateTime = DateTime.UtcNow.AddHours(1)
                }
            }
        };

        // Act
        var result = await _provider.CalculateSortOrderAsync(context);

        // Assert
        result.Should().NotBeNull();
        result.SortedContentIds[0].Should().Be(childId3); // Earlier start time wins
        result.Metadata["SchedulesApplied"].Should().Be(1);
        result.Metadata["ConflictsResolved"].Should().Be(1);
    }

    [Test]
    public async Task CalculateSortOrderAsync_WithTargetPositionBeyondBounds_ShouldClampToMaxPosition()
    {
        // Arrange
        var childId1 = Guid.NewGuid();
        var childId2 = Guid.NewGuid();
        var childId3 = Guid.NewGuid();

        var context = new SortContext
        {
            ParentId = Guid.NewGuid(),
            Children = new List<SortableContent>
            {
                new() { Id = childId1, Name = "Child 1", CurrentSortOrder = 0 },
                new() { Id = childId2, Name = "Child 2", CurrentSortOrder = 1 },
                new() { Id = childId3, Name = "Child 3", CurrentSortOrder = 2 }
            },
            ActiveSchedules = new List<SortSchedule>
            {
                new()
                {
                    Id = Guid.NewGuid(),
                    ContentId = childId1,
                    TargetPosition = 999, // Way beyond bounds
                    Priority = 5,
                    StartDateTime = DateTime.UtcNow.AddHours(-1),
                    EndDateTime = DateTime.UtcNow.AddHours(1)
                }
            }
        };

        // Act
        var result = await _provider.CalculateSortOrderAsync(context);

        // Assert
        result.Should().NotBeNull();
        result.ChangesMade.Should().BeTrue();
        result.SortedContentIds[2].Should().Be(childId1); // Moved to last position (index 2)
    }

    [Test]
    public async Task CalculateSortOrderAsync_WithScheduleForNonExistentContent_ShouldSkipThatSchedule()
    {
        // Arrange
        var childId1 = Guid.NewGuid();
        var childId2 = Guid.NewGuid();
        var nonExistentId = Guid.NewGuid();

        var context = new SortContext
        {
            ParentId = Guid.NewGuid(),
            Children = new List<SortableContent>
            {
                new() { Id = childId1, Name = "Child 1", CurrentSortOrder = 0 },
                new() { Id = childId2, Name = "Child 2", CurrentSortOrder = 1 }
            },
            ActiveSchedules = new List<SortSchedule>
            {
                new()
                {
                    Id = Guid.NewGuid(),
                    ContentId = nonExistentId, // This content doesn't exist
                    TargetPosition = 0,
                    Priority = 5,
                    StartDateTime = DateTime.UtcNow.AddHours(-1),
                    EndDateTime = DateTime.UtcNow.AddHours(1)
                }
            }
        };

        // Act
        var result = await _provider.CalculateSortOrderAsync(context);

        // Assert
        result.Should().NotBeNull();
        result.ChangesMade.Should().BeFalse(); // No changes since schedule couldn't be applied
        result.SortedContentIds.Should().ContainInOrder(childId1, childId2); // Original order maintained
    }

    [Test]
    public async Task CalculateSortOrderAsync_ShouldIncludeExecutionTimeMetadata()
    {
        // Arrange
        var context = new SortContext
        {
            ParentId = Guid.NewGuid(),
            Children = new List<SortableContent>
            {
                new() { Id = Guid.NewGuid(), Name = "Child 1", CurrentSortOrder = 0 }
            }
        };

        // Act
        var result = await _provider.CalculateSortOrderAsync(context);

        // Assert
        result.ExecutionTimeMs.Should().BeGreaterOrEqualTo(0);
    }

    [Test]
    public async Task ValidateAsync_Should_Always_Return_Valid()
    {
        // Act
        var result = await _provider.ValidateAsync();

        // Assert
        result.Should().NotBeNull();
        result.IsValid.Should().BeTrue();
        result.Message.Should().NotBeNullOrEmpty();
        result.Errors.Should().BeEmpty();
    }

    [Test]
    public async Task CalculateSortOrderAsync_WithComplexScenario_ShouldHandleCorrectly()
    {
        // Arrange - Complex real-world scenario
        var childId1 = Guid.NewGuid();
        var childId2 = Guid.NewGuid();
        var childId3 = Guid.NewGuid();
        var childId4 = Guid.NewGuid();
        var childId5 = Guid.NewGuid();

        var context = new SortContext
        {
            ParentId = Guid.NewGuid(),
            Children = new List<SortableContent>
            {
                new() { Id = childId1, Name = "Child 1", CurrentSortOrder = 0 },
                new() { Id = childId2, Name = "Child 2", CurrentSortOrder = 1 },
                new() { Id = childId3, Name = "Child 3", CurrentSortOrder = 2 },
                new() { Id = childId4, Name = "Child 4", CurrentSortOrder = 3 },
                new() { Id = childId5, Name = "Child 5", CurrentSortOrder = 4 }
            },
            ActiveSchedules = new List<SortSchedule>
            {
                // High priority - move Child 5 to position 0
                new()
                {
                    Id = Guid.NewGuid(),
                    ContentId = childId5,
                    TargetPosition = 0,
                    Priority = 10,
                    StartDateTime = DateTime.UtcNow.AddHours(-1),
                    EndDateTime = DateTime.UtcNow.AddHours(1)
                },
                // Medium priority - move Child 2 to position 2
                new()
                {
                    Id = Guid.NewGuid(),
                    ContentId = childId2,
                    TargetPosition = 2,
                    Priority = 5,
                    StartDateTime = DateTime.UtcNow.AddHours(-1),
                    EndDateTime = DateTime.UtcNow.AddHours(1)
                },
                // Conflict - same position as Child 5, lower priority (should lose)
                new()
                {
                    Id = Guid.NewGuid(),
                    ContentId = childId1,
                    TargetPosition = 0,
                    Priority = 8,
                    StartDateTime = DateTime.UtcNow.AddHours(-1),
                    EndDateTime = DateTime.UtcNow.AddHours(1)
                }
            }
        };

        // Act
        var result = await _provider.CalculateSortOrderAsync(context);

        // Assert
        result.Should().NotBeNull();
        result.ChangesMade.Should().BeTrue();
        result.SortedContentIds[0].Should().Be(childId5); // Highest priority wins position 0
        result.Metadata["SchedulesApplied"].Should().Be(2); // Child 5 and Child 2 applied
        result.Metadata["ConflictsResolved"].Should().Be(1); // Child 1 conflict resolved
    }
}
