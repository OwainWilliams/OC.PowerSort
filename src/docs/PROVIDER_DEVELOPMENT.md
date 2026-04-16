# PowerSort Provider System

The PowerSort provider system allows third-party developers to create custom sorting strategies that integrate seamlessly with PowerSort's scheduling system.

## Overview

PowerSort uses a provider pattern to enable extensible sorting logic. The default provider implements the existing schedule-based sorting with priority conflict resolution, but developers can create their own providers to implement custom sorting strategies (e.g., weather-based, analytics-based, AI-driven, etc.).

## Creating a Custom Provider

### 1. Implement the ISortProvider Interface

```csharp
using OC.PowerSort.Interfaces;
using Umbraco.Cms.Core.Services;

namespace MyCompany.PowerSort.Weather
{
    public class WeatherSortProvider : ISortProvider
    {
        private readonly IContentService _contentService;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<WeatherSortProvider> _logger;

        // Unique identifier for your provider
        public string ProviderKey => "MyCompany.Weather";
        
        // Display name shown in UI
        public string DisplayName => "Weather-Based Sort";
        
        // Description of what your provider does
        public string Description => "Boosts content based on current weather conditions";
        
        // Whether your provider works with PowerSort schedules
        public bool SupportsScheduling => false;

        public WeatherSortProvider(
            IContentService contentService,
            IHttpClientFactory httpClientFactory,
            ILogger<WeatherSortProvider> logger)
        {
            _contentService = contentService;
            _httpClientFactory = httpClientFactory;
            _logger = logger;
        }

        public async Task<SortResult> CalculateSortOrderAsync(SortContext context)
        {
            var startTime = DateTime.UtcNow;
            var result = new SortResult();

            // Get weather API key from configuration
            if (!context.Configuration.TryGetValue("WeatherApiKey", out var apiKey))
            {
                _logger.LogWarning("No WeatherApiKey configured, returning original order");
                result.SortedContentIds = context.Children.Select(c => c.Id).ToList();
                return result;
            }

            // Fetch current weather
            var weather = await GetCurrentWeatherAsync(apiKey);

            // Score each content item based on weather
            var scoredContent = new List<(SortableContent content, int score)>();
            
            foreach (var child in context.Children)
            {
                var content = _contentService.GetById(child.Id);
                var tags = content?.GetValue<string>("tags")?.Split(',') ?? Array.Empty<string>();
                
                int score = 50; // Neutral score
                
                // Boost relevant content based on weather
                if (weather == "Rainy" && tags.Contains("raincoat"))
                    score = 100;
                else if (weather == "Rainy" && tags.Contains("umbrella"))
                    score = 95;
                else if (weather == "Sunny" && tags.Contains("sunglasses"))
                    score = 100;
                else if (weather == "Sunny" && tags.Contains("sunscreen"))
                    score = 95;
                
                scoredContent.Add((child, score));
            }

            // Sort by score (highest first), then by original order
            result.SortedContentIds = scoredContent
                .OrderByDescending(x => x.score)
                .ThenBy(x => x.content.CurrentSortOrder)
                .Select(x => x.content.Id)
                .ToList();

            result.ChangesMade = true;
            result.Metadata["WeatherCondition"] = weather;
            result.Metadata["ProviderType"] = "Weather";
            result.ExecutionTimeMs = (long)(DateTime.UtcNow - startTime).TotalMilliseconds;
            
            _logger.LogInformation("Weather sort completed in {Time}ms with weather: {Weather}",
                result.ExecutionTimeMs, weather);
            
            return result;
        }

        public async Task<ProviderValidationResult> ValidateAsync()
        {
            var result = new ProviderValidationResult { IsValid = true };
            
            // Add validation logic (e.g., check API connectivity)
            try
            {
                // Test API connection here
                result.Message = "Weather provider configured correctly";
            }
            catch (Exception ex)
            {
                result.IsValid = false;
                result.Errors.Add($"Weather API validation failed: {ex.Message}");
            }
            
            return result;
        }

        private async Task<string> GetCurrentWeatherAsync(string apiKey)
        {
            // Implement actual weather API call
            // Example: OpenWeatherMap, WeatherAPI, etc.
            var client = _httpClientFactory.CreateClient();
            // ... make API call
            return "Rainy"; // Placeholder
        }
    }
}
```

### 2. Register Your Provider

Create a Composer to register your provider with Umbraco's dependency injection:

```csharp
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;
using OC.PowerSort.Interfaces;

namespace MyCompany.PowerSort.Weather
{
    public class WeatherSortProviderComposer : IComposer
    {
        public void Compose(IUmbracoBuilder builder)
        {
            // Register your provider
            builder.Services.AddTransient<ISortProvider, WeatherSortProvider>();
            
            // Optional: Register HttpClient if needed
            builder.Services.AddHttpClient();
        }
    }
}
```

### 3. PR your provider

It would be great to have a collection of providers available within this project for others to use. 


## Provider Context

The `SortContext` object provides everything your provider needs:

```csharp
public class SortContext
{
    public Guid ParentId { get; set; }                      // Parent being sorted
    public List<SortableContent> Children { get; set; }     // Children to sort
    public List<SortSchedule> ActiveSchedules { get; set; } // Active PowerSort schedules
    public Dictionary<string, string> Configuration { get; set; } // Custom config
    public int? UserId { get; set; }                        // User requesting sort
    public DateTime Timestamp { get; set; }                 // When sort was requested
}
```

## Provider Examples

### Analytics-Based Provider

```csharp
public class AnalyticsSortProvider : ISortProvider
{
    public string ProviderKey => "MyCompany.Analytics";
    public string DisplayName => "Analytics-Based Sort";
    public bool SupportsScheduling => false;
    
    public async Task<SortResult> CalculateSortOrderAsync(SortContext context)
    {
        // Fetch page view data from Google Analytics
        var analyticsData = await GetAnalyticsDataAsync(context.Children);
        
        // Sort by page views (descending)
        var sorted = context.Children
            .OrderByDescending(c => analyticsData.GetValueOrDefault(c.Id, 0))
            .Select(c => c.Id)
            .ToList();
            
        return new SortResult 
        { 
            SortedContentIds = sorted,
            ChangesMade = true,
            Metadata = { ["DataSource"] = "Google Analytics" }
        };
    }
}
```

### Salesforce Integration Provider

```csharp
public class SalesforceSortProvider : ISortProvider
{
    public string ProviderKey => "MyCompany.Salesforce";
    public string DisplayName => "Salesforce Performance Sort";
    public bool SupportsScheduling => false;
    
    public async Task<SortResult> CalculateSortOrderAsync(SortContext context)
    {
        // Get product performance from Salesforce
        var salesData = await GetSalesforceDataAsync(context.Configuration["SalesforceApiKey"]);
        
        // Boost poorly performing products or new promotions
        var sorted = context.Children
            .Select(c => new 
            {
                Content = c,
                Score = CalculateBoostScore(c, salesData)
            })
            .OrderByDescending(x => x.Score)
            .Select(x => x.Content.Id)
            .ToList();
            
        return new SortResult 
        { 
            SortedContentIds = sorted,
            ChangesMade = true,
            Metadata = { ["DataSource"] = "Salesforce" }
        };
    }
}
```

## Schedule-Aware Providers

If your provider wants to work **with** PowerSort schedules (not replace them), set `SupportsScheduling = true` and use the `ActiveSchedules` from context:

```csharp
public async Task<SortResult> CalculateSortOrderAsync(SortContext context)
{
    // First, apply your custom logic
    var customSorted = ApplyCustomLogic(context.Children);
    
    // Then, apply active schedules on top (like default provider does)
    if (context.ActiveSchedules.Any())
    {
        return ApplySchedulesToOrder(customSorted, context.ActiveSchedules);
    }
    
    return new SortResult { SortedContentIds = customSorted };
}
```

## Best Practices

1. **Use Descriptive Provider Keys**: Use reverse domain notation (e.g., `MyCompany.Weather`)
2. **Log Your Actions**: Use `ILogger` to help debug provider behavior
3. **Handle Errors Gracefully**: Return original order if your provider fails
4. **Validate Configuration**: Implement `ValidateAsync()` to check API keys, settings, etc.
5. **Add Metadata**: Include useful metadata in `SortResult.Metadata` for debugging
6. **Consider Performance**: Cache external API calls when possible
7. **Document Configuration**: Clearly document required configuration keys

## Configuration

Providers can receive configuration through the `SortContext.Configuration` dictionary. Future versions of PowerSort may include UI for configuring providers.

Example configuration keys:
- `WeatherApiKey`
- `AnalyticsPropertyId`
- `SalesforceApiKey`
- `CacheDurationMinutes`

## Testing Your Provider

```csharp
[TestClass]
public class WeatherSortProviderTests
{
    [TestMethod]
    public async Task Provider_Should_Boost_Rainy_Content_When_Raining()
    {
        // Arrange
        var provider = CreateProvider();
        var context = new SortContext
        {
            Children = CreateTestChildren(),
            Configuration = { ["WeatherApiKey"] = "test-key" }
        };
        
        // Act
        var result = await provider.CalculateSortOrderAsync(context);
        
        // Assert
        Assert.IsTrue(result.ChangesMade);
        Assert.AreEqual("Rainy", result.Metadata["WeatherCondition"]);
    }
}
```

## Future Enhancements

The PowerSort team is considering:
- UI for selecting active provider per parent node
- Configuration management UI in Umbraco backoffice


## Support

- GitHub Issues: https://github.com/OwainWilliams/OC.PowerSort/issues
- Documentation: https://github.com/OwainWilliams/OC.PowerSort
- NuGet: https://www.nuget.org/packages/OC.PowerSort

## License

The PowerSort provider system is MIT licensed. Your providers can use any license.
