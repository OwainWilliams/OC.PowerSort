using Microsoft.Extensions.Logging;
using OC.PowerSort.Interfaces;

namespace OC.PowerSort.Services
{
    /// <summary>
    /// Factory implementation for managing sort providers
    /// </summary>
    public class SortProviderFactory : ISortProviderFactory
    {
        private readonly Dictionary<string, ISortProvider> _providers = new();
        private readonly ISortProvider _defaultProvider;
        private readonly ILogger<SortProviderFactory> _logger;

        public SortProviderFactory(
            IEnumerable<ISortProvider> providers,
            ILogger<SortProviderFactory> logger)
        {
            _logger = logger;

            // Register all discovered providers
            foreach (var provider in providers)
            {
                _providers[provider.ProviderKey] = provider;
                _logger.LogInformation("Registered sort provider: {ProviderKey} - {DisplayName}",
                    provider.ProviderKey, provider.DisplayName);
            }

            // Set default provider (PowerSort.Default)
            _defaultProvider = _providers.TryGetValue("PowerSort.Default", out var defaultProv)
                ? defaultProv
                : _providers.Values.FirstOrDefault() 
                    ?? throw new InvalidOperationException("No sort providers registered. At least one provider must be available.");

            _logger.LogInformation("Default sort provider set to: {ProviderKey}", _defaultProvider.ProviderKey);
        }

        public IEnumerable<ISortProvider> GetAllProviders() => _providers.Values;

        public ISortProvider? GetProvider(string providerKey)
        {
            if (string.IsNullOrEmpty(providerKey))
                return null;

            return _providers.TryGetValue(providerKey, out var provider) ? provider : null;
        }

        public ISortProvider GetDefaultProvider() => _defaultProvider;

        public void RegisterProvider(ISortProvider provider)
        {
            _providers[provider.ProviderKey] = provider;
            _logger.LogInformation("Dynamically registered provider: {ProviderKey} - {DisplayName}", 
                provider.ProviderKey, provider.DisplayName);
        }
    }
}
