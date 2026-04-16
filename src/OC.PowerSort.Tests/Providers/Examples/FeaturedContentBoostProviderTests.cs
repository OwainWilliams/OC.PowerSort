using Microsoft.Extensions.Logging;
using Moq;
using OC.PowerSort.Interfaces;
using OC.PowerSort.Providers.Examples;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Services;

namespace OC.PowerSort.Tests.Providers.Examples;

[TestFixture]
public class FeaturedContentBoostProviderTests
{
    private Mock<IContentService> _contentServiceMock;
    private Mock<ILogger<FeaturedContentBoostProvider>> _loggerMock;
    private FeaturedContentBoostProvider _provider;

    [SetUp]
    public void Setup()
    {
        _contentServiceMock = new Mock<IContentService>();
        _loggerMock = new Mock<ILogger<FeaturedContentBoostProvider>>();
        _provider = new FeaturedContentBoostProvider(_contentServiceMock.Object, _loggerMock.Object);
    }

    [Test]
    public void Provider_Should_Have_Correct_Properties()
    {
        // Assert
        _provider.ProviderKey.Should().Be("PowerSort.FeaturedBoost");
        _provider.DisplayName.Should().Be("Featured Content Boost");
        _provider.SupportsScheduling.Should().BeTrue(); // Schedule-aware!
        _provider.Description.Should().Contain("featured");
        _provider.Description.Should().Contain("schedule");
    }

    [Test]
    public async Task CalculateSortOrderAsync_WithFeaturedContent_ShouldBoostToTop()
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
                new() { Id = childId1, Name = "Regular Item", CurrentSortOrder = 0 },
                new() { Id = childId2, Name = "Featured Item", CurrentSortOrder = 1 },
                new() { Id = childId3, Name = "Another Regular", CurrentSortOrder = 2 }
            }
        };

        // Mock content service to return featured=true for childId2
        var content2 = new Mock<IContent>();
        content2.Setup(c => c.HasProperty("featured")).Returns(true);
        content2.Setup(c => c.GetValue<bool>("featured", null, null, false)).Returns(true);
        _contentServiceMock.Setup(s => s.GetById(childId2)).Returns(content2.Object);

        var content1 = new Mock<IContent>();
        content1.Setup(c => c.HasProperty("featured")).Returns(false);
        _contentServiceMock.Setup(s => s.GetById(childId1)).Returns(content1.Object);

        var content3 = new Mock<IContent>();
        content3.Setup(c => c.HasProperty("featured")).Returns(false);
        _contentServiceMock.Setup(s => s.GetById(childId3)).Returns(content3.Object);

        // Act
        var result = await _provider.CalculateSortOrderAsync(context);

        // Assert
        result.Should().NotBeNull();
        result.ChangesMade.Should().BeTrue();
        result.SortedContentIds[0].Should().Be(childId2); // Featured item boosted to top
        result.Metadata.Should().ContainKey("FeaturedItemsCount");
        result.Metadata["FeaturedItemsCount"].Should().Be(1);
    }

    [Test]
    public async Task CalculateSortOrderAsync_WithSchedulesAndFeatured_ShouldApplySchedulesThenBoost()
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
                new() { Id = childId1, Name = "Regular Item", CurrentSortOrder = 0 },
                new() { Id = childId2, Name = "Featured Item", CurrentSortOrder = 1 },
                new() { Id = childId3, Name = "Scheduled Item", CurrentSortOrder = 2 }
            },
            ActiveSchedules = new List<SortSchedule>
            {
                new()
                {
                    Id = Guid.NewGuid(),
                    ContentId = childId3, // Schedule moves this to position 1
                    TargetPosition = 1,
                    Priority = 10,
                    StartDateTime = DateTime.UtcNow.AddHours(-1),
                    EndDateTime = DateTime.UtcNow.AddHours(1)
                }
            }
        };

        // Mock childId2 as featured
        var content2 = new Mock<IContent>();
        content2.Setup(c => c.HasProperty("featured")).Returns(true);
        content2.Setup(c => c.GetValue<bool>("featured", null, null, false)).Returns(true);
        _contentServiceMock.Setup(s => s.GetById(childId2)).Returns(content2.Object);

        // Act
        var result = await _provider.CalculateSortOrderAsync(context);

        // Assert
        result.Should().NotBeNull();
        result.ChangesMade.Should().BeTrue();
        result.SortedContentIds[0].Should().Be(childId2); // Featured still at top
        result.Metadata["SchedulesApplied"].Should().Be(1);
        result.Metadata["FeaturedItemsCount"].Should().Be(1);
    }

    [Test]
    public async Task CalculateSortOrderAsync_WithMultipleFeatured_ShouldBoostAllToTop()
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
                new() { Id = childId1, Name = "Regular 1", CurrentSortOrder = 0 },
                new() { Id = childId2, Name = "Featured 1", CurrentSortOrder = 1 },
                new() { Id = childId3, Name = "Regular 2", CurrentSortOrder = 2 },
                new() { Id = childId4, Name = "Featured 2", CurrentSortOrder = 3 }
            }
        };

        // Mock featured items
        var content2 = new Mock<IContent>();
        content2.Setup(c => c.HasProperty("featured")).Returns(true);
        content2.Setup(c => c.GetValue<bool>("featured", null, null, false)).Returns(true);
        _contentServiceMock.Setup(s => s.GetById(childId2)).Returns(content2.Object);

        var content4 = new Mock<IContent>();
        content4.Setup(c => c.HasProperty("featured")).Returns(true);
        content4.Setup(c => c.GetValue<bool>("featured", null, null, false)).Returns(true);
        _contentServiceMock.Setup(s => s.GetById(childId4)).Returns(content4.Object);

        // Act
        var result = await _provider.CalculateSortOrderAsync(context);

        // Assert
        result.Should().NotBeNull();
        result.ChangesMade.Should().BeTrue();
        result.SortedContentIds[0].Should().Be(childId2); // First featured
        result.SortedContentIds[1].Should().Be(childId4); // Second featured
        result.SortedContentIds[2].Should().Be(childId1); // Regular items after
        result.SortedContentIds[3].Should().Be(childId3);
        result.Metadata["FeaturedItemsCount"].Should().Be(2);
    }

    [Test]
    public async Task CalculateSortOrderAsync_WithNoFeatured_ShouldReturnOriginalOrder()
    {
        // Arrange
        var childId1 = Guid.NewGuid();
        var childId2 = Guid.NewGuid();

        var context = new SortContext
        {
            ParentId = Guid.NewGuid(),
            Children = new List<SortableContent>
            {
                new() { Id = childId1, Name = "Item 1", CurrentSortOrder = 0 },
                new() { Id = childId2, Name = "Item 2", CurrentSortOrder = 1 }
            }
        };

        // No featured content
        var content1 = new Mock<IContent>();
        content1.Setup(c => c.HasProperty("featured")).Returns(false);
        _contentServiceMock.Setup(s => s.GetById(childId1)).Returns(content1.Object);

        var content2 = new Mock<IContent>();
        content2.Setup(c => c.HasProperty("featured")).Returns(false);
        _contentServiceMock.Setup(s => s.GetById(childId2)).Returns(content2.Object);

        // Act
        var result = await _provider.CalculateSortOrderAsync(context);

        // Assert
        result.Should().NotBeNull();
        result.SortedContentIds.Should().ContainInOrder(childId1, childId2);
        result.Metadata["FeaturedItemsCount"].Should().Be(0);
    }

    [Test]
    public async Task CalculateSortOrderAsync_WithEmptyList_ShouldReturnEmpty()
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
    }

    [Test]
    public async Task CalculateSortOrderAsync_WithScheduleConflicts_ShouldResolveByPriority()
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
                new() { Id = childId1, Name = "Item 1", CurrentSortOrder = 0 },
                new() { Id = childId2, Name = "Item 2", CurrentSortOrder = 1 },
                new() { Id = childId3, Name = "Item 3", CurrentSortOrder = 2 }
            },
            ActiveSchedules = new List<SortSchedule>
            {
                new()
                {
                    Id = Guid.NewGuid(),
                    ContentId = childId2,
                    TargetPosition = 0,
                    Priority = 10, // Higher priority
                    StartDateTime = DateTime.UtcNow.AddHours(-1),
                    EndDateTime = DateTime.UtcNow.AddHours(1)
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    ContentId = childId3,
                    TargetPosition = 0, // Same position, lower priority
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
        result.SortedContentIds[0].Should().Be(childId2); // Higher priority wins
        result.Metadata["SchedulesApplied"].Should().Be(1); // Only one applied due to conflict
    }

    [Test]
    public async Task ValidateAsync_Should_Return_Valid_With_Warnings()
    {
        // Act
        var result = await _provider.ValidateAsync();

        // Assert
        result.Should().NotBeNull();
        result.IsValid.Should().BeTrue();
        result.Message.Should().Contain("featured");
        result.Warnings.Should().NotBeEmpty();
        result.Warnings.Should().Contain(w => w.Contains("featured"));
    }

    [Test]
    public async Task CalculateSortOrderAsync_ShouldIncludeMetadata()
    {
        // Arrange
        var context = new SortContext
        {
            ParentId = Guid.NewGuid(),
            Children = new List<SortableContent>
            {
                new() { Id = Guid.NewGuid(), Name = "Item", CurrentSortOrder = 0 }
            }
        };

        // Act
        var result = await _provider.CalculateSortOrderAsync(context);

        // Assert
        result.Metadata.Should().ContainKey("FeaturedItemsCount");
        result.Metadata.Should().ContainKey("BoostingStrategy");
        result.Metadata["BoostingStrategy"].Should().Be("Featured Property");
        result.ExecutionTimeMs.Should().BeGreaterOrEqualTo(0);
    }
}
