# PowerSort Provider System - Quick Reference

## What is it?

The PowerSort Provider System allows developers to create custom content sorting strategies that integrate with PowerSort's scheduling system.

## For PowerSort Users

Your existing functionality **continues to work exactly as before**. The provider system adds extensibility without changing current behavior.

## For Third-Party Developers

### Quick Start

#### 1. Create a Provider Class

```csharp
using OC.PowerSort.Interfaces;

public class MySortProvider : ISortProvider
{
    public string ProviderKey => "MyCompany.MyProvider";
    public string DisplayName => "My Custom Sort";
    public string Description => "Sorts content using my custom logic";
    public bool SupportsScheduling => false;

    public async Task<SortResult> CalculateSortOrderAsync(SortContext context)
    {
        // Your sorting logic here
        var sortedIds = context.Children
            .OrderBy(c => /* your logic */)
            .Select(c => c.Id)
            .ToList();

        return new SortResult 
        { 
            SortedContentIds = sortedIds,
            ChangesMade = true 
        };
    }

    public Task<ProviderValidationResult> ValidateAsync()
    {
        return Task.FromResult(new ProviderValidationResult { IsValid = true });
    }
}
```

#### 2. Register via Composer

```csharp
public class MyProviderComposer : IComposer
{
    public void Compose(IUmbracoBuilder builder)
    {
        builder.Services.AddTransient<ISortProvider, MySortProvider>();
    }
}
```

#### 3. Ship as NuGet Package

```xml
<PackageReference Include="OC.PowerSort" Version="17.2.0" />
```

## Key Concepts

### Provider Types

**Schedule-Aware Providers** (`SupportsScheduling = true`)
- Work WITH PowerSort schedules
- Can apply additional logic on top of schedules
- Example: Default provider

**Standalone Providers** (`SupportsScheduling = false`)
- Replace schedule-based sorting entirely
- Use custom sorting algorithms
- Examples: Alphabetical, Analytics, Weather-based

### Context Object

```csharp
public class SortContext
{
    Guid ParentId;                    // Parent being sorted
    List<SortableContent> Children;    // Content to sort
    List<SortSchedule> ActiveSchedules; // Current schedules
    Dictionary<string, string> Configuration; // Settings
    DateTime Timestamp;                // When sorting occurs
}
```

### Result Object

```csharp
public class SortResult
{
    List<Guid> SortedContentIds;      // Desired order
    bool ChangesMade;                  // Whether changes occurred
    Dictionary<string, object> Metadata; // Extra info
    long ExecutionTimeMs;              // Performance metric
}
```

## Examples in This Package

### Built-in Providers

1. **DefaultScheduleSortProvider** - Priority-based schedule sorting
2. **AlphabeticalSortProvider** - Sorts A-Z by name
3. **NewestFirstSortProvider** - Sorts by creation date

### External Provider Ideas

- **Weather API** - Boost content based on weather
- **Google Analytics** - Sort by page views
- **Salesforce** - Prioritize products by sales
- **AI/ML** - Personalized recommendations
- **Time-based** - Different sort by time of day

## Documentation

📖 **Full Guide**: [docs/PROVIDER_DEVELOPMENT.md](./PROVIDER_DEVELOPMENT.md)
📋 **Summary**: [docs/PROVIDER_SYSTEM_SUMMARY.md](./PROVIDER_SYSTEM_SUMMARY.md)

## Architecture

```
User schedules content
        ↓
ScheduleProcessingService
        ↓
ISortProviderFactory
        ↓
ISortProvider (Your code!)
        ↓
Sorted content applied
```

## Provider Interface

```csharp
public interface ISortProvider
{
    string ProviderKey { get; }        // Unique ID
    string DisplayName { get; }        // UI name
    string Description { get; }        // What it does
    bool SupportsScheduling { get; }   // Works with schedules?
    
    Task<SortResult> CalculateSortOrderAsync(SortContext context);
    Task<ProviderValidationResult> ValidateAsync();
}
```

## Best Practices

✅ Use reverse domain notation for keys (`MyCompany.Weather`)
✅ Log your operations for debugging
✅ Handle errors gracefully (return original order on failure)
✅ Implement validation in `ValidateAsync()`
✅ Add metadata to results for insights
✅ Cache external API calls
✅ Write unit tests

## Common Patterns

### Simple Sort
```csharp
result.SortedContentIds = context.Children
    .OrderBy(c => c.Name) // Your logic
    .Select(c => c.Id)
    .ToList();
```

### Scoring System
```csharp
var scored = context.Children.Select(c => new
{
    Content = c,
    Score = CalculateScore(c) // Your scoring logic
});

result.SortedContentIds = scored
    .OrderByDescending(x => x.Score)
    .Select(x => x.Content.Id)
    .ToList();
```

### External API Integration
```csharp
var apiData = await FetchExternalDataAsync();

result.SortedContentIds = context.Children
    .OrderByDescending(c => apiData.GetScore(c.Id))
    .Select(c => c.Id)
    .ToList();
```

## Provider Configuration

Pass configuration through `SortContext.Configuration`:

```csharp
if (!context.Configuration.TryGetValue("ApiKey", out var key))
{
    // Handle missing config
}
```

Future versions will add UI for configuration management.

## Testing

```csharp
[TestMethod]
public async Task Provider_Should_Sort_Correctly()
{
    var provider = new MyProvider();
    var context = new SortContext
    {
        Children = CreateTestChildren(),
        Configuration = new() { ["Setting"] = "Value" }
    };
    
    var result = await provider.CalculateSortOrderAsync(context);
    
    Assert.IsTrue(result.ChangesMade);
}
```

## Support

- 📦 **NuGet**: https://www.nuget.org/packages/OC.PowerSort
- 💻 **GitHub**: https://github.com/OwainWilliams/OC.PowerSort
- 🐛 **Issues**: https://github.com/OwainWilliams/OC.PowerSort/issues

## Future Features

- UI for provider selection per parent
- Configuration management in backoffice
- Provider marketplace
- Multiple provider chaining
- A/B testing framework

## License

MIT - Your providers can use any license.

---

**Get Started**: Read the full guide at [docs/PROVIDER_DEVELOPMENT.md](./PROVIDER_DEVELOPMENT.md)
