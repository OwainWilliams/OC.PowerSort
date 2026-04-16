namespace OC.PowerSort.Interfaces
{
    /// <summary>
    /// Factory for discovering and managing sort providers
    /// </summary>
    public interface ISortProviderFactory
    {
        /// <summary>
        /// Get all registered providers
        /// </summary>
        IEnumerable<ISortProvider> GetAllProviders();

        /// <summary>
        /// Get provider by key
        /// </summary>
        ISortProvider? GetProvider(string providerKey);

        /// <summary>
        /// Get default provider (used when no specific provider is requested)
        /// </summary>
        ISortProvider GetDefaultProvider();

        /// <summary>
        /// Register a new provider dynamically
        /// </summary>
        void RegisterProvider(ISortProvider provider);
    }
}
