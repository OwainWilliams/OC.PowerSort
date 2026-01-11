using OC.PowerSorting.Interfaces;
using OC.PowerSorting.Models;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Infrastructure.Persistence;

namespace OC.PowerSorting.Services
{
    /// <summary>
    /// Service implementation for determining sorting flags
    /// </summary>
    public class SortingFlagService : ISortingFlagService
    {
        private readonly IUmbracoDatabaseFactory _databaseFactory;
        private readonly IContentService _contentService;

        public SortingFlagService(IUmbracoDatabaseFactory databaseFactory, IContentService contentService)
        {
            _databaseFactory = databaseFactory;
            _contentService = contentService;
        }

        /// <inheritdoc/>
        public async Task<bool> HasCustomSortOrderAsync(Guid documentId)
        {
            try
            {
                // Check if this document has been manually sorted (different from creation date order)
                var document = _contentService.GetById(documentId);
                if (document == null) return false;

                // If document has no parent, it can't have custom sort order
                if (document.ParentId == -1) return false;

                // Get all siblings ordered by creation date (default Umbraco order)
                var siblings = _contentService.GetPagedChildren(document.ParentId, 0, int.MaxValue, out _)
                    .OrderBy(c => c.CreateDate)
                    .ToList();

                // If there's only one child, no custom sorting possible
                if (siblings.Count <= 1) return false;

                // Check if current sort order differs from creation date order
                var currentSortOrder = siblings.OrderBy(c => c.SortOrder).Select(c => c.Key).ToList();
                var creationDateOrder = siblings.OrderBy(c => c.CreateDate).Select(c => c.Key).ToList();

                var hasCustomSort = !currentSortOrder.SequenceEqual(creationDateOrder);

                return hasCustomSort;
            }
            catch (Exception ex)
            {
                System.Console.WriteLine($"[PowerSort] Error checking custom sort order for {documentId}: {ex.Message}");
                return false;
            }
        }

        /// <inheritdoc/>
        public async Task<bool> HasActiveScheduleAsync(Guid documentId)
        {
            try
            {
                using var database = _databaseFactory.CreateDatabase();
                
                var now = DateTime.UtcNow;
                
                // Check if this document is either the ContentId OR the ParentId of an active schedule
                var activeScheduleCount = database.ExecuteScalar<int>(
                    @"SELECT COUNT(*) FROM ocPowerSortingSchedule 
                      WHERE (ContentId = @0 OR ParentId = @0)
                      AND IsActive = 1 
                      AND StartDateTime <= @1 
                      AND EndDateTime > @1",
                    documentId, now);

                return activeScheduleCount > 0;
            }
            catch (Exception ex)
            {
                System.Console.WriteLine($"[PowerSort] Error in HasActiveScheduleAsync: {ex.Message}");
                return false;
            }
        }

        /// <inheritdoc/>
        public async Task<bool> HasDefaultSortOrderAsync(Guid documentId)
        {
            try
            {
                using var database = _databaseFactory.CreateDatabase();

                // Check if this document is a parent that has default sort order saved
                var defaultOrderCount = database.ExecuteScalar<int>(
                    @"SELECT COUNT(*) FROM ocPowerSortingDefaultOrder 
                      WHERE ParentId = @0",
                    documentId);

                return defaultOrderCount > 0;
            }
            catch (Exception)
            {
                // Table might not exist yet, return false
                return false;
            }
        }

        /// <inheritdoc/>
        public async Task<Dictionary<Guid, SortingFlagInfo>> GetFlagInfoBatchAsync(IEnumerable<Guid> documentIds)
        {
            var result = new Dictionary<Guid, SortingFlagInfo>();
            var now = DateTime.UtcNow;
            var docIdList = documentIds.ToList();

            if (docIdList.Count == 0) return result;

            // Initialize all documents with default flag info
            foreach (var docId in docIdList)
            {
                result[docId] = new SortingFlagInfo
                {
                    HasCustomSortOrder = false,
                    HasActiveSchedule = false,
                    HasDefaultSortOrder = false,
                    ScheduleCount = 0,
                    DefaultOrderItemCount = 0
                };
            }

            try
            {
                using var database = _databaseFactory.CreateDatabase();

                // For each document, check schedules individually (more reliable than IN clause with GUIDs)
                foreach (var docId in docIdList)
                {
                    try
                    {
                        // Check for active schedules where document is ContentId or ParentId
                        var scheduleCount = database.ExecuteScalar<int>(
                            @"SELECT COUNT(*) FROM ocPowerSortingSchedule 
                              WHERE (ContentId = @0 OR ParentId = @0)
                              AND IsActive = 1 
                              AND StartDateTime <= @1 
                              AND EndDateTime > @1",
                            docId, now);

                        if (scheduleCount > 0)
                        {
                            result[docId].HasActiveSchedule = true;
                            result[docId].ScheduleCount = scheduleCount;
                        }

                        // Check for default sort orders
                        var defaultOrderCount = database.ExecuteScalar<int>(
                            @"SELECT COUNT(*) FROM ocPowerSortingDefaultOrder 
                              WHERE ParentId = @0",
                            docId);

                        if (defaultOrderCount > 0)
                        {
                            result[docId].HasDefaultSortOrder = true;
                            result[docId].DefaultOrderItemCount = defaultOrderCount;
                        }
                    }
                    catch (Exception ex)
                    {
                        System.Console.WriteLine($"[PowerSort] Error checking flags for {docId}: {ex.Message}");
                    }
                }

                // Check for custom sort orders
                foreach (var documentId in docIdList)
                {
                    result[documentId].HasCustomSortOrder = await HasCustomSortOrderAsync(documentId);
                }

                return result;
            }
            catch (Exception ex)
            {
                System.Console.WriteLine($"[PowerSort] Error in GetFlagInfoBatchAsync: {ex.Message}");
                return result;
            }
        }
    }
}
