using OC.PowerSorting.Services;
using Umbraco.Cms.Api.Management.Services.Flags;
using Umbraco.Cms.Api.Management.ViewModels;
using Umbraco.Cms.Api.Management.ViewModels.Document.Collection;
using Umbraco.Cms.Api.Management.ViewModels.Document.Item;
using Umbraco.Cms.Api.Management.ViewModels.Tree;
using Microsoft.Extensions.Logging;

namespace OC.PowerSorting.FlagProvider
{
    public class SortingFlagProvider : IFlagProvider
    {
        private readonly ISortingFlagService _sortingFlagService;
        private readonly ILogger<SortingFlagProvider> _logger;

        // Static counter to verify if provider is being instantiated and called
        private static int _instanceCount = 0;
        private static int _canProvideFlagsCallCount = 0;
        private static int _populateFlagsCallCount = 0;
        
        // Track which flags were added for diagnostics
        private static readonly List<string> _recentFlagsAdded = new();
        private static readonly object _lockObj = new();
        
        public static (int instances, int canProvideFlags, int populateFlags) GetDiagnostics() 
            => (_instanceCount, _canProvideFlagsCallCount, _populateFlagsCallCount);
            
        public static List<string> GetRecentFlagsAdded()
        {
            lock (_lockObj)
            {
                return _recentFlagsAdded.TakeLast(50).ToList();
            }
        }

        public SortingFlagProvider(ISortingFlagService sortingFlagService, ILogger<SortingFlagProvider> logger)
        {
            _sortingFlagService = sortingFlagService;
            _logger = logger;
            
            _instanceCount++;
            
            // Debug logging to confirm instantiation
            _logger.LogWarning("[PowerSort] SortingFlagProvider constructor called - instance #{InstanceCount}", _instanceCount);
        }

        public bool CanProvideFlags<TItem>()
             where TItem : IHasFlags
        {
            _canProvideFlagsCallCount++;
            
            var itemType = typeof(TItem);
            var canProvide = itemType == typeof(DocumentTreeItemResponseModel) ||
                           itemType == typeof(DocumentCollectionResponseModel) ||
                           itemType == typeof(DocumentItemResponseModel);
           
            _logger.LogWarning("[PowerSort] CanProvideFlags<{ItemType}> called - returning {CanProvide} (call #{Count})", 
                itemType.Name, canProvide, _canProvideFlagsCallCount);
            
            return canProvide;
        }

        public async Task PopulateFlagsAsync<TItem>(IEnumerable<TItem> items) where TItem : IHasFlags
        {
            _populateFlagsCallCount++;
            
            var itemsList = items.ToList();
            _logger.LogWarning("[PowerSort] PopulateFlagsAsync called with {ItemCount} items of type {ItemType} (call #{Count})", 
                itemsList.Count, typeof(TItem).Name, _populateFlagsCallCount);
            
            if (itemsList.Count == 0) return;

            // Extract document IDs for batch processing
            var documentIds = new List<Guid>();

            foreach (TItem item in itemsList)
            {
                var id = GetDocumentId(item);
                if (id != Guid.Empty)
                {
                    documentIds.Add(id);
                }
            }

            if (documentIds.Count == 0)
            {
                _logger.LogWarning("[PowerSort] No document IDs extracted from items");
                return;
            }

            try
            {
                _logger.LogWarning("[PowerSort] Processing flags for {DocumentCount} documents", documentIds.Count);

                // Get flag information for all documents in one batch call
                var flagInfos = await _sortingFlagService.GetFlagInfoBatchAsync(documentIds);

                _logger.LogWarning("[PowerSort] Got flag info for {FlagInfoCount} documents", flagInfos.Count);

                // Apply flags to items
                foreach (TItem item in itemsList)
                {
                    var id = GetDocumentId(item);
                    if (id != Guid.Empty && flagInfos.TryGetValue(id, out var flagInfo))
                    {
                        // Log what flags would be added
                        _logger.LogWarning("[PowerSort] Document {DocumentId}: CustomSort={CustomSort}, Schedule={Schedule}, DefaultOrder={DefaultOrder}",
                            id, flagInfo.HasCustomSortOrder, flagInfo.HasActiveSchedule, flagInfo.HasDefaultSortOrder);

                        // Add schedule flag FIRST (highest priority) if document has active schedules
                        if (flagInfo.HasActiveSchedule)
                        {
                            var flag = Constants.Conventions.Flags.HasSchedule;
                            _logger.LogWarning("[PowerSort] Adding HasSchedule flag '{Flag}' to document {DocumentId}", flag, id);
                            item.AddFlag(flag);
                            TrackFlag($"Schedule: {id} -> {flag}");
                        }

                        // Add default order flag if document is a parent with saved default order
                        if (flagInfo.HasDefaultSortOrder)
                        {
                            var flag = Constants.Conventions.Flags.HasDefaultOrder;
                            _logger.LogWarning("[PowerSort] Adding HasDefaultOrder flag '{Flag}' to document {DocumentId}", flag, id);
                            item.AddFlag(flag);
                            TrackFlag($"DefaultOrder: {id} -> {flag}");
                        }

                        // Add custom sort flag LAST (lowest priority) if document has been manually sorted
                        if (flagInfo.HasCustomSortOrder)
                        {
                            var flag = Constants.Conventions.Flags.CustomSorted;
                            _logger.LogWarning("[PowerSort] Adding CustomSorted flag '{Flag}' to document {DocumentId}", flag, id);
                            item.AddFlag(flag);
                            TrackFlag($"CustomSorted: {id} -> {flag}");
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[PowerSort] Error populating flags: {ErrorMessage}", ex.Message);
            }
        }
        
        private static void TrackFlag(string flagInfo)
        {
            lock (_lockObj)
            {
                _recentFlagsAdded.Add($"{DateTime.UtcNow:HH:mm:ss} - {flagInfo}");
                if (_recentFlagsAdded.Count > 100)
                {
                    _recentFlagsAdded.RemoveAt(0);
                }
            }
        }

        private Guid GetDocumentId<TItem>(TItem item)
        {
            return item switch
            {
                DocumentTreeItemResponseModel dti => dti.Id,
                DocumentCollectionResponseModel dc => dc.Id,
                DocumentItemResponseModel di => di.Id,
                _ => Guid.Empty
            };
        }
    }
}
