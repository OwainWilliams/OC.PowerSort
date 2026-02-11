using OC.PowerSort.Services;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Infrastructure.Persistence;

namespace OC.PowerSort.Tests.Services;

[TestFixture]
public class SortingFlagServiceTests
{
    private Mock<IUmbracoDatabaseFactory> _databaseFactoryMock;
    private Mock<IContentService> _contentServiceMock;
    private Mock<IUmbracoDatabase> _databaseMock;
    private SortingFlagService _service;

    [SetUp]
    public void Setup()
    {
        _databaseFactoryMock = new Mock<IUmbracoDatabaseFactory>();
        _contentServiceMock = new Mock<IContentService>();
        _databaseMock = new Mock<IUmbracoDatabase>();

        _databaseFactoryMock.Setup(x => x.CreateDatabase()).Returns(_databaseMock.Object);

        _service = new SortingFlagService(_databaseFactoryMock.Object, _contentServiceMock.Object);
    }

    [Test]
    public async Task HasActiveSchedule_WhenScheduleExists_ShouldReturnTrue()
    {
        // Arrange
        var documentId = Guid.NewGuid();
        _databaseMock.Setup(x => x.ExecuteScalar<int>(
            It.Is<string>(sql => sql.Contains("ocPowerSortSchedule")),
            It.IsAny<object[]>()))
            .Returns(1);

        // Act
        var result = await _service.HasActiveScheduleAsync(documentId);

        // Assert
        result.Should().BeTrue();
    }

    [Test]
    public async Task HasActiveSchedule_WhenNoScheduleExists_ShouldReturnFalse()
    {
        // Arrange
        var documentId = Guid.NewGuid();
        _databaseMock.Setup(x => x.ExecuteScalar<int>(
            It.Is<string>(sql => sql.Contains("ocPowerSortSchedule")),
            It.IsAny<object[]>()))
            .Returns(0);

        // Act
        var result = await _service.HasActiveScheduleAsync(documentId);

        // Assert
        result.Should().BeFalse();
    }

    [Test]
    public async Task HasDefaultSortOrder_WhenDefaultOrderExists_ShouldReturnTrue()
    {
        // Arrange
        var parentId = Guid.NewGuid();
        _databaseMock.Setup(x => x.ExecuteScalar<int>(
            It.Is<string>(sql => sql.Contains("ocPowerSortDefaultOrder")),
            It.IsAny<object[]>()))
            .Returns(3); // Has 3 default order entries

        // Act
        var result = await _service.HasDefaultSortOrderAsync(parentId);

        // Assert
        result.Should().BeTrue();
    }

    [Test]
    public async Task HasCustomSortOrder_WhenSortOrderDiffersFromCreationDate_ShouldReturnTrue()
    {
        // Arrange
        var parentId = Guid.NewGuid();
        var documentId = Guid.NewGuid();
        var baseDate = DateTime.UtcNow.AddDays(-10);

        var parentContent = CreateMockContent(parentId, "Parent", -1, 0, baseDate);
        var child1 = CreateMockContent(Guid.NewGuid(), "Child1", parentId, 1, baseDate.AddDays(1));
        var child2 = CreateMockContent(Guid.NewGuid(), "Child2", parentId, 0, baseDate.AddDays(2)); // Created later but sorted first
        var child3 = CreateMockContent(Guid.NewGuid(), "Child3", parentId, 2, baseDate.AddDays(3));

        _contentServiceMock.Setup(x => x.GetById(It.IsAny<Guid>()))
            .Returns(child2);

        long totalRecords = 3;
        _contentServiceMock.Setup(x => x.GetPagedChildren(It.IsAny<int>(), 0, int.MaxValue, out totalRecords))
            .Returns(new[] { child1, child2, child3 });

        // Act
        var result = await _service.IsPowerSortManagedAsync(documentId);

        // Assert
        result.Should().BeTrue("because the sort order differs from creation date order");
    }

    private static IContent CreateMockContent(Guid key, string name, object parentId, int sortOrder, DateTime createDate)
    {
        var mock = new Mock<IContent>();
        mock.Setup(x => x.Key).Returns(key);
        mock.Setup(x => x.Name).Returns(name);
        mock.Setup(x => x.ParentId).Returns(parentId is Guid guid ? (int)guid.GetHashCode() : (int)parentId);
        mock.Setup(x => x.SortOrder).Returns(sortOrder);
        mock.SetupProperty(x => x.SortOrder, sortOrder);
        mock.Setup(x => x.CreateDate).Returns(createDate);
        return mock.Object;
    }
}
