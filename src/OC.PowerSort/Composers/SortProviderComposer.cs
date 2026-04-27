using Microsoft.Extensions.DependencyInjection;
using OC.PowerSort.Interfaces;
using OC.PowerSort.Providers;
using OC.PowerSort.Providers.Examples;
using OC.PowerSort.Services;
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;

namespace OC.PowerSort.Composers
{
    /// <summary>
    /// Composer for registering sort providers and provider factory
    /// </summary>
    public class SortProviderComposer : IComposer
    {
        public void Compose(IUmbracoBuilder builder)
        {
            // Register factory as singleton (one instance for app lifetime)
            builder.Services.AddSingleton<ISortProviderFactory, SortProviderFactory>();

            // Register built-in default provider (schedule-based sorting)
            builder.Services.AddTransient<ISortProvider, DefaultScheduleSortProvider>();

            // Register example providers (demonstrating PowerSort-specific use cases)
            builder.Services.AddTransient<ISortProvider, FeaturedContentBoostProvider>();
            builder.Services.AddTransient<ISortProvider, PopularityBoostProvider>();

            // Third-party developers can register their own providers in their own composers:
            // Example:
            // builder.Services.AddTransient<ISortProvider, WeatherBoostProvider>();
            // builder.Services.AddTransient<ISortProvider, SalesforceBoostProvider>();
        }
    }
}
