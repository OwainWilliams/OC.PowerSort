using Microsoft.Extensions.Logging;
using Moq;
using OC.PowerSort.Interfaces;
using OC.PowerSort.Providers.Examples;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Services;

namespace OC.PowerSort.Tests.Providers.Examples;

[TestFixture]
public class PopularityBoostProviderTests
{
    private Mock<IContentService> _contentServiceMock;
    private Mock<ILogger<PopularityBoostProvider>> _loggerMock;
    private PopularityBoostProvider _provider;

    [SetUp]
    public void Setup()
    {
        _contentServiceMock = new Mock<IContentService>();
        _loggerMock = new Mock<ILogger<PopularityBoostProvider>>();
        _provider = new PopularityBoostProvider(_contentServiceMock.Object, _loggerMock.Object);
    }

    [Test]
    public void Provider_Should_Have_Correct_Properties()
    {
        // Assert
        _provider.ProviderKey.Should().Be("PowerSort.PopularityBoost");
        _provider.DisplayName.Should().Be("Popularity Boost (View Count)");
        _provider.SupportsScheduling.Should().BeTrue(); // Schedule-aware!
        _provider.Description.Should().Contain("view count");
        _provider.Description.Should().Contain("schedule");
    }

    [Test]
    public async Task CalculateSortOrderAsync_ShouldSortByViewCount()
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
                new() { Id = childId1, Name = "Low Views", CurrentSortOrder = 0 },
                new() { Id = childId2, Name = "High Views", CurrentSortOrder = 1 },
                new() { Id = childId3, Name = "Medium Views", CurrentSortOrder = 2 }
            }
        };

        // Mock view counts
        SetupContentWithViewCount(childId1, 100);
        SetupContentWithViewCount(childId2, 500); // Highest
        SetupContentWithViewCount(childId3, 300);

        // Act
        var result = await _provider.CalculateSortOrderAsync(context);

        // Assert
        result.Should().NotBeNull();
        result.ChangesMade.Should().BeTrue();
        result.SortedContentIds[0].Should().Be(childId2); // Highest views first
        result.SortedContentIds[1].Should().Be(childId3); // Medium views second
        result.SortedContentIds[2].Should().Be(childId1); // Lowest views last
        result.Metadata["MaxViewCount"].Should().Be(500);
    }

    [Test]
    public async Task CalculateSortOrderAsync_WithSchedules_ShouldOverridePopularity()
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
                new() { Id = childId1, Name = "Low Views", CurrentSortOrder = 0 },
                new() { Id = childId2, Name = "High Views", CurrentSortOrder = 1 },
                new() { Id = childId3, Name = "Medium Views - Scheduled", CurrentSortOrder = 2 }
            },
            ActiveSchedules = new List<SortSchedule>
            {
                new()
                {
                    Id = Guid.NewGuid(),
                    ContentId = childId3, // Schedule overrides popularity
                    TargetPosition = 0,
                    Priority = 10,
                    StartDateTime = DateTime.UtcNow.AddHours(-1),
                    EndDateTime = DateTime.UtcNow.AddHours(1)
                }
            }
        };

        SetupContentWithViewCount(childId1, 100);
        SetupContentWithViewCount(childId2, 500); // Highest views
        SetupContentWithViewCount(childId3, 300); // But scheduled to top

        // Act
        var result = await _provider.CalculateSortOrderAsync(context);

        // Assert
        result.Should().NotBeNull();
        result.SortedContentIds[0].Should().Be(childId3); // Schedule wins over popularity
        result.Metadata["SchedulesApplied"].Should().Be(1);
        result.Metadata["ScheduleOverridesCount"].Should().Be(1);
    }

    [Test]
    public async Task CalculateSortOrderAsync_WithNoViewCountProperty_ShouldUseZeroAsDefault()
    {
        // Arrange
        var childId1 = Guid.NewGuid();
        var childId2 = Guid.NewGuid();

        var context = new SortContext
        {
            ParentId = Guid.NewGuid(),
            Children = new List<SortableContent>
            {
                new() { Id = childId1, Name = "No Property", CurrentSortOrder = 0 },
                new() { Id = childId2, Name = "Has Views", CurrentSortOrder = 1 }
            }
        };

        // childId1 has no viewCount property
        var content1 = new Mock<IContent>();
        content1.Setup(c => c.HasProperty("viewCount")).Returns(false);
        _contentServiceMock.Setup(s => s.GetById(childId1)).Returns(content1.Object);

        SetupContentWithViewCount(childId2, 100);

        // Act
        var result = await _provider.CalculateSortOrderAsync(context);

        // Assert
        result.Should().NotBeNull();
        result.SortedContentIds[0].Should().Be(childId2); // Has views, goes first
        result.SortedContentIds[1].Should().Be(childId1); // No views (0), goes last
    }

    [Test]
    public async Task CalculateSortOrderAsync_WithSameViewCounts_ShouldMaintainCurrentOrder()
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
            }
        };

        // All have same view count
        SetupContentWithViewCount(childId1, 100);
        SetupContentWithViewCount(childId2, 100);
        SetupContentWithViewCount(childId3, 100);

        // Act
        var result = await _provider.CalculateSortOrderAsync(context);

        // Assert
        result.Should().NotBeNull();
        result.SortedContentIds.Should().ContainInOrder(childId1, childId2, childId3); // Stable sort
    }

    [Test]
    public async Task CalculateSortOrderAsync_WithMultipleSchedules_ShouldResolveByPriority()
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
                new() { Id = childId1, Name = "Low Priority", CurrentSortOrder = 0 },
                new() { Id = childId2, Name = "High Priority", CurrentSortOrder = 1 },
                new() { Id = childId3, Name = "No Schedule", CurrentSortOrder = 2 }
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
                    ContentId = childId1,
                    TargetPosition = 0, // Same position, lower priority
                    Priority = 5,
                    StartDateTime = DateTime.UtcNow.AddHours(-1),
                    EndDateTime = DateTime.UtcNow.AddHours(1)
                }
            }
        };

        SetupContentWithViewCount(childId1, 100);
        SetupContentWithViewCount(childId2, 200);
        SetupContentWithViewCount(childId3, 300);

        // Act
        var result = await _provider.CalculateSortOrderAsync(context);

        // Assert
        result.Should().NotBeNull();
        result.SortedContentIds[0].Should().Be(childId2); // Higher priority schedule wins
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
    public async Task ValidateAsync_Should_Return_Valid_With_Warnings()
    {
        // Act
        var result = await _provider.ValidateAsync();

        // Assert
        result.Should().NotBeNull();
        result.IsValid.Should().BeTrue();
        result.Message.Should().Contain("viewCount");
        result.Warnings.Should().NotBeEmpty();
        result.Warnings.Should().Contain(w => w.Contains("viewCount"));
    }

    [Test]
    public async Task CalculateSortOrderAsync_ShouldIncludeMetadata()
    {
        // Arrange
        var childId = Guid.NewGuid();
        var context = new SortContext
        {
            ParentId = Guid.NewGuid(),
            Children = new List<SortableContent>
            {
                new() { Id = childId, Name = "Item", CurrentSortOrder = 0 }
            }
        };

        SetupContentWithViewCount(childId, 100);

        // Act
        var result = await _provider.CalculateSortOrderAsync(context);

        // Assert
        result.Metadata.Should().ContainKey("MaxViewCount");
        result.Metadata["MaxViewCount"].Should().Be(100);
        result.Metadata.Should().ContainKey("BoostingStrategy");
        result.Metadata["BoostingStrategy"].Should().Be("View Count");
        result.Metadata.Should().ContainKey("ScheduleIntegration");
        result.ExecutionTimeMs.Should().BeGreaterOrEqualTo(0);
    }

    [Test]
    public async Task CalculateSortOrderAsync_DemonstratesScheduleOverridesPopularity()
    {
        // Arrange - Real-world scenario: Black Friday promotion
        var regularProductId = Guid.NewGuid();
        var popularProductId = Guid.NewGuid();
        var blackFridayDealId = Guid.NewGuid();

        var context = new SortContext
        {
            ParentId = Guid.NewGuid(),
            Children = new List<SortableContent>
            {
                new() { Id = regularProductId, Name = "Regular Product", CurrentSortOrder = 0 },
                new() { Id = popularProductId, Name = "Popular Product", CurrentSortOrder = 1 },
                new() { Id = blackFridayDealId, Name = "Black Friday Deal", CurrentSortOrder = 2 }
            },
            ActiveSchedules = new List<SortSchedule>
            {
                // Black Friday deal scheduled to be at top during sale period
                new()
                {
                    Id = Guid.NewGuid(),
                    ContentId = blackFridayDealId,
                    TargetPosition = 0,
                    Priority = 100,
                    StartDateTime = DateTime.UtcNow.AddHours(-1),
                    EndDateTime = DateTime.UtcNow.AddHours(24)
                }
            }
        };

        SetupContentWithViewCount(regularProductId, 50);
        SetupContentWithViewCount(popularProductId, 1000); // Most popular
        SetupContentWithViewCount(blackFridayDealId, 100); // Not popular yet

        // Act
        var result = await _provider.CalculateSortOrderAsync(context);

        // Assert - Schedule overrides popularity for time-sensitive promotion
        result.SortedContentIds[0].Should().Be(blackFridayDealId); // Scheduled promotion wins
        result.SortedContentIds[1].Should().Be(popularProductId); // Popular product second
        result.SortedContentIds[2].Should().Be(regularProductId); // Regular product last
    }

    private void SetupContentWithViewCount(Guid contentId, int viewCount)
    {
        var content = new Mock<IContent>();
        content.Setup(c => c.HasProperty("viewCount")).Returns(true);
        content.Setup(c => c.GetValue<int>("viewCount", null, null, false)).Returns(viewCount);
        _contentServiceMock.Setup(s => s.GetById(contentId)).Returns(content.Object);
    }
}
