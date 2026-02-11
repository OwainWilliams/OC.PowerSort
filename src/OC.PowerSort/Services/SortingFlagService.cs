using OC.PowerSort.Interfaces;
using OC.PowerSort.Models;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Infrastructure.Persistence;

namespace OC.PowerSort.Services
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
                using var database = _databaseFactory.CreateDatabase();

                // Only return true if this document is actually managed by PowerSort
                // Check if there are any schedules (current or future) or default orders for this document as a parent
                var isPowerSortManaged = database.ExecuteScalar<int>(
                    @"SELECT CASE 
                        WHEN EXISTS (SELECT 1 FROM ocPowerSortSchedule WHERE ParentId = @0)
                        OR EXISTS (SELECT 1 FROM ocPowerSortDefaultOrder WHERE ParentId = @0)
                        THEN 1 ELSE 0 END",
                    documentId);

                return isPowerSortManaged > 0;
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
                    @"SELECT COUNT(*) FROM ocPowerSortSchedule 
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
                    @"SELECT COUNT(*) FROM ocPowerSortDefaultOrder 
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
                            @"SELECT COUNT(*) FROM ocPowerSortSchedule 
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
                            @"SELECT COUNT(*) FROM ocPowerSortDefaultOrder 
                              WHERE ParentId = @0",
                            docId);

                        if (defaultOrderCount > 0)
                        {
                            result[docId].HasDefaultSortOrder = true;
                            result[docId].DefaultOrderItemCount = defaultOrderCount;
                        }

                        // Check if this document is managed by PowerSort (has any schedules or default orders as a parent)
                        // This includes both active and future schedules
                        var isPowerSortManaged = database.ExecuteScalar<int>(
                            @"SELECT CASE 
                                WHEN EXISTS (SELECT 1 FROM ocPowerSortSchedule WHERE ParentId = @0)
                                OR EXISTS (SELECT 1 FROM ocPowerSortDefaultOrder WHERE ParentId = @0)
                                THEN 1 ELSE 0 END",
                            docId);

                        result[docId].HasCustomSortOrder = isPowerSortManaged > 0;
                    }
                    catch (Exception ex)
                    {
                        System.Console.WriteLine($"[PowerSort] Error checking flags for {docId}: {ex.Message}");
                    }
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
