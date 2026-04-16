using Microsoft.Extensions.Logging;
using Moq;
using OC.PowerSort.Interfaces;
using OC.PowerSort.Services;

namespace OC.PowerSort.Tests.Services;

[TestFixture]
public class SortProviderFactoryTests
{
    private Mock<ILogger<SortProviderFactory>> _loggerMock;
    private Mock<ISortProvider> _provider1Mock;
    private Mock<ISortProvider> _provider2Mock;
    private Mock<ISortProvider> _defaultProviderMock;

    [SetUp]
    public void Setup()
    {
        _loggerMock = new Mock<ILogger<SortProviderFactory>>();
        
        // Create mock providers
        _provider1Mock = new Mock<ISortProvider>();
        _provider1Mock.Setup(p => p.ProviderKey).Returns("Test.Provider1");
        _provider1Mock.Setup(p => p.DisplayName).Returns("Test Provider 1");
        
        _provider2Mock = new Mock<ISortProvider>();
        _provider2Mock.Setup(p => p.ProviderKey).Returns("Test.Provider2");
        _provider2Mock.Setup(p => p.DisplayName).Returns("Test Provider 2");
        
        _defaultProviderMock = new Mock<ISortProvider>();
        _defaultProviderMock.Setup(p => p.ProviderKey).Returns("PowerSort.Default");
        _defaultProviderMock.Setup(p => p.DisplayName).Returns("Default Provider");
    }

    [Test]
    public void Constructor_WithNoProviders_ShouldThrowException()
    {
        // Arrange
        var emptyProviders = Enumerable.Empty<ISortProvider>();

        // Act & Assert
        var exception = Assert.Throws<InvalidOperationException>(() =>
            new SortProviderFactory(emptyProviders, _loggerMock.Object));
        
        exception.Message.Should().Contain("No sort providers registered");
    }

    [Test]
    public void Constructor_WithProviders_ShouldRegisterAll()
    {
        // Arrange
        var providers = new List<ISortProvider>
        {
            _defaultProviderMock.Object,
            _provider1Mock.Object,
            _provider2Mock.Object
        };

        // Act
        var factory = new SortProviderFactory(providers, _loggerMock.Object);
        var allProviders = factory.GetAllProviders().ToList();

        // Assert
        allProviders.Should().HaveCount(3);
        allProviders.Should().Contain(_defaultProviderMock.Object);
        allProviders.Should().Contain(_provider1Mock.Object);
        allProviders.Should().Contain(_provider2Mock.Object);
    }

    [Test]
    public void Constructor_WithDefaultProvider_ShouldSetAsDefault()
    {
        // Arrange
        var providers = new List<ISortProvider>
        {
            _defaultProviderMock.Object,
            _provider1Mock.Object
        };

        // Act
        var factory = new SortProviderFactory(providers, _loggerMock.Object);
        var defaultProvider = factory.GetDefaultProvider();

        // Assert
        defaultProvider.Should().NotBeNull();
        defaultProvider.ProviderKey.Should().Be("PowerSort.Default");
    }

    [Test]
    public void Constructor_WithoutDefaultProvider_ShouldUseFirstProvider()
    {
        // Arrange
        var providers = new List<ISortProvider>
        {
            _provider1Mock.Object,
            _provider2Mock.Object
        };

        // Act
        var factory = new SortProviderFactory(providers, _loggerMock.Object);
        var defaultProvider = factory.GetDefaultProvider();

        // Assert
        defaultProvider.Should().NotBeNull();
        defaultProvider.Should().Be(_provider1Mock.Object);
    }

    [Test]
    public void GetProvider_WithExistingKey_ShouldReturnProvider()
    {
        // Arrange
        var providers = new List<ISortProvider>
        {
            _defaultProviderMock.Object,
            _provider1Mock.Object,
            _provider2Mock.Object
        };
        var factory = new SortProviderFactory(providers, _loggerMock.Object);

        // Act
        var provider = factory.GetProvider("Test.Provider1");

        // Assert
        provider.Should().NotBeNull();
        provider.Should().Be(_provider1Mock.Object);
    }

    [Test]
    public void GetProvider_WithNonExistingKey_ShouldReturnNull()
    {
        // Arrange
        var providers = new List<ISortProvider> { _defaultProviderMock.Object };
        var factory = new SortProviderFactory(providers, _loggerMock.Object);

        // Act
        var provider = factory.GetProvider("NonExistent.Provider");

        // Assert
        provider.Should().BeNull();
    }

    [Test]
    public void GetProvider_WithNullKey_ShouldReturnNull()
    {
        // Arrange
        var providers = new List<ISortProvider> { _defaultProviderMock.Object };
        var factory = new SortProviderFactory(providers, _loggerMock.Object);

        // Act
        var provider = factory.GetProvider(null!);

        // Assert
        provider.Should().BeNull();
    }

    [Test]
    public void GetAllProviders_ShouldReturnAllRegisteredProviders()
    {
        // Arrange
        var providers = new List<ISortProvider>
        {
            _defaultProviderMock.Object,
            _provider1Mock.Object,
            _provider2Mock.Object
        };
        var factory = new SortProviderFactory(providers, _loggerMock.Object);

        // Act
        var allProviders = factory.GetAllProviders().ToList();

        // Assert
        allProviders.Should().HaveCount(3);
        allProviders.Select(p => p.ProviderKey).Should().Contain(new[]
        {
            "PowerSort.Default",
            "Test.Provider1",
            "Test.Provider2"
        });
    }

    [Test]
    public void RegisterProvider_ShouldAddNewProvider()
    {
        // Arrange
        var providers = new List<ISortProvider> { _defaultProviderMock.Object };
        var factory = new SortProviderFactory(providers, _loggerMock.Object);
        
        var newProviderMock = new Mock<ISortProvider>();
        newProviderMock.Setup(p => p.ProviderKey).Returns("Dynamic.Provider");
        newProviderMock.Setup(p => p.DisplayName).Returns("Dynamic Provider");

        // Act
        factory.RegisterProvider(newProviderMock.Object);
        var allProviders = factory.GetAllProviders().ToList();
        var dynamicProvider = factory.GetProvider("Dynamic.Provider");

        // Assert
        allProviders.Should().HaveCount(2);
        dynamicProvider.Should().NotBeNull();
        dynamicProvider.Should().Be(newProviderMock.Object);
    }

    [Test]
    public void RegisterProvider_WithDuplicateKey_ShouldReplaceExisting()
    {
        // Arrange
        var providers = new List<ISortProvider> 
        { 
            _defaultProviderMock.Object,
            _provider1Mock.Object 
        };
        var factory = new SortProviderFactory(providers, _loggerMock.Object);
        
        var replacementMock = new Mock<ISortProvider>();
        replacementMock.Setup(p => p.ProviderKey).Returns("Test.Provider1"); // Same key
        replacementMock.Setup(p => p.DisplayName).Returns("Replacement Provider");

        // Act
        factory.RegisterProvider(replacementMock.Object);
        var retrievedProvider = factory.GetProvider("Test.Provider1");
        var allProviders = factory.GetAllProviders().ToList();

        // Assert
        allProviders.Should().HaveCount(2); // Still 2 providers
        retrievedProvider.Should().Be(replacementMock.Object); // New one replaces old
        retrievedProvider.DisplayName.Should().Be("Replacement Provider");
    }

    [Test]
    public void Constructor_ShouldLogAllRegisteredProviders()
    {
        // Arrange
        var providers = new List<ISortProvider>
        {
            _defaultProviderMock.Object,
            _provider1Mock.Object
        };

        // Act
        var factory = new SortProviderFactory(providers, _loggerMock.Object);

        // Assert
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Registered sort provider")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.AtLeast(2));
    }

    [Test]
    public void Constructor_ShouldLogDefaultProvider()
    {
        // Arrange
        var providers = new List<ISortProvider>
        {
            _defaultProviderMock.Object,
            _provider1Mock.Object
        };

        // Act
        var factory = new SortProviderFactory(providers, _loggerMock.Object);

        // Assert
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Default sort provider set to")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Test]
    public void RegisterProvider_ShouldLogDynamicRegistration()
    {
        // Arrange
        var providers = new List<ISortProvider> { _defaultProviderMock.Object };
        var factory = new SortProviderFactory(providers, _loggerMock.Object);
        
        var newProviderMock = new Mock<ISortProvider>();
        newProviderMock.Setup(p => p.ProviderKey).Returns("Dynamic.Provider");
        newProviderMock.Setup(p => p.DisplayName).Returns("Dynamic Provider");

        // Act
        factory.RegisterProvider(newProviderMock.Object);

        // Assert
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Dynamically registered provider")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Test]
    public void GetAllProviders_ShouldReturnMutableCollection()
    {
        // Arrange
        var providers = new List<ISortProvider> { _defaultProviderMock.Object };
        var factory = new SortProviderFactory(providers, _loggerMock.Object);

        // Act
        var providers1 = factory.GetAllProviders().ToList();
        var newProviderMock = new Mock<ISortProvider>();
        newProviderMock.Setup(p => p.ProviderKey).Returns("New.Provider");
        newProviderMock.Setup(p => p.DisplayName).Returns("New Provider");
        factory.RegisterProvider(newProviderMock.Object);
        var providers2 = factory.GetAllProviders().ToList();

        // Assert
        providers1.Should().HaveCount(1);
        providers2.Should().HaveCount(2);
    }

    [Test]
    public void GetProvider_IsCaseSensitive()
    {
        // Arrange
        var providers = new List<ISortProvider> { _provider1Mock.Object };
        var factory = new SortProviderFactory(providers, _loggerMock.Object);

        // Act
        var lowerCase = factory.GetProvider("test.provider1");
        var upperCase = factory.GetProvider("TEST.PROVIDER1");
        var correctCase = factory.GetProvider("Test.Provider1");

        // Assert
        lowerCase.Should().BeNull();
        upperCase.Should().BeNull();
        correctCase.Should().NotBeNull();
    }
}
