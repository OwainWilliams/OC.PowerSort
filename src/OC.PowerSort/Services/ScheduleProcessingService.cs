using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Infrastructure.Persistence;
using OC.PowerSort.Models;
using OC.PowerSort.Interfaces;
using NPoco;
using Umbraco.Cms.Core.Scoping;

namespace OC.PowerSort.Services
{
    /// <summary>
    /// Background service that runs periodically to activate and deactivate schedules,
    /// process recurring schedule occurrences, and apply sort order changes based on active schedules.
    /// </summary>
    public class ScheduleProcessingService : BackgroundService
    {
        private readonly ILogger<ScheduleProcessingService> _logger;
        private readonly IUmbracoDatabaseFactory _databaseFactory;
        private readonly IContentService _contentService;
        private readonly ICoreScopeProvider _scopeProvider;
        private readonly IServiceScopeFactory _serviceScopeFactory;
        private readonly ISortProviderFactory _sortProviderFactory;
        private readonly TimeSpan _checkInterval = TimeSpan.FromMinutes(1); // Check every minute
        private readonly TimeSpan _occurrenceGenerationInterval = TimeSpan.FromHours(6); // Generate occurrences every 6 hours
        private DateTime _lastOccurrenceGeneration = DateTime.MinValue;

        public ScheduleProcessingService(
            ILogger<ScheduleProcessingService> logger,
            IUmbracoDatabaseFactory databaseFactory,
            IContentService contentService,
            ICoreScopeProvider scopeProvider,
            IServiceScopeFactory serviceScopeFactory,
            ISortProviderFactory sortProviderFactory)
        {
            _logger = logger;
            _databaseFactory = databaseFactory;
            _contentService = contentService;
            _scopeProvider = scopeProvider;
            _serviceScopeFactory = serviceScopeFactory;
            _sortProviderFactory = sortProviderFactory;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Schedule Processing Service started");

            // Generate initial occurrences
            try
            {
                using var scope = _serviceScopeFactory.CreateScope();
                var occurrenceGenerator = scope.ServiceProvider.GetRequiredService<IOccurrenceGenerationService>();
                await occurrenceGenerator.GenerateOccurrencesForAllActiveRecurringSchedulesAsync();
                _lastOccurrenceGeneration = DateTime.UtcNow;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during initial occurrence generation");
            }

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ProcessSchedulesAsync();

                    // Periodically regenerate occurrences
                    if (DateTime.UtcNow - _lastOccurrenceGeneration >= _occurrenceGenerationInterval)
                    {
                        using var scope = _serviceScopeFactory.CreateScope();
                        var occurrenceGenerator = scope.ServiceProvider.GetRequiredService<IOccurrenceGenerationService>();
                        await occurrenceGenerator.GenerateOccurrencesForAllActiveRecurringSchedulesAsync();
                        _lastOccurrenceGeneration = DateTime.UtcNow;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing schedules");
                }

                await Task.Delay(_checkInterval, stoppingToken);
            }

            _logger.LogInformation("Schedule Processing Service stopped");
        }

        private async Task ProcessSchedulesAsync()
        {
            using var scope = _scopeProvider.CreateCoreScope();
            
            try
            {
                var now = DateTime.UtcNow;
                using var database = _databaseFactory.CreateDatabase();

                // Process recurring schedule occurrences
                await ProcessRecurringScheduleOccurrencesAsync(database, now);

                // Step 1: Activate schedules that should be active
                var schedulesToActivate = database.Fetch<SortScheduleDto>(
                    @"SELECT * FROM ocPowerSortSchedule 
                      WHERE IsActive = 0 
                      AND StartDateTime <= @0 
                      AND EndDateTime > @0",
                    now);

                foreach (var schedule in schedulesToActivate)
                {
                    schedule.IsActive = true;
                    database.Update(schedule);
                    _logger.LogInformation(
                        "Activated schedule {ScheduleId} for content {ContentId} to position {Position}",
                        schedule.Id, schedule.ContentId, schedule.TargetPosition);
                }

                // Step 2: Deactivate schedules that have expired
                var schedulesToDeactivate = database.Fetch<SortScheduleDto>(
                    @"SELECT * FROM ocPowerSortSchedule 
                      WHERE IsActive = 1 
                      AND EndDateTime <= @0",
                    now);

                // Track parents that had schedules expire
                var parentsWithExpiredSchedules = new HashSet<Guid>();

                foreach (var schedule in schedulesToDeactivate)
                {
                    schedule.IsActive = false;
                    database.Update(schedule);
                    parentsWithExpiredSchedules.Add(schedule.ParentId);
                    _logger.LogInformation(
                        "Deactivated schedule {ScheduleId} for content {ContentId}",
                        schedule.Id, schedule.ContentId);
                }

                // Check if any parents now have NO active schedules and restore defaults
                foreach (var parentId in parentsWithExpiredSchedules)
                {
                    var remainingActiveSchedules = database.ExecuteScalar<int>(
                        @"SELECT COUNT(*) FROM ocPowerSortSchedule 
                          WHERE ParentId = @0 
                          AND IsActive = 1 
                          AND StartDateTime <= @1 
                          AND EndDateTime > @1",
                        parentId, now);

                    if (remainingActiveSchedules == 0)
                    {
                        _logger.LogInformation(
                            "No active schedules remaining for parent {ParentId}, checking for default order",
                            parentId);
                        
                        await RestoreDefaultSortOrderAsync(parentId, database);
                    }
                }

                // Step 3: Apply active schedules to sort order
                // Group active schedules by parent
                var activeSchedules = database.Fetch<SortScheduleDto>(
                    @"SELECT * FROM ocPowerSortSchedule 
                      WHERE IsActive = 1 
                      AND StartDateTime <= @0 
                      AND EndDateTime > @0
                      ORDER BY ParentId, Priority DESC, StartDateTime ASC",
                    now);

                var schedulesByParent = activeSchedules.GroupBy(s => s.ParentId);

                foreach (var parentGroup in schedulesByParent)
                {
                    await ApplySchedulesToParentAsync(parentGroup.Key, parentGroup.ToList());
                }

                scope.Complete();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in schedule processing cycle");
                throw;
            }
        }

        private async Task ProcessRecurringScheduleOccurrencesAsync(
            Umbraco.Cms.Infrastructure.Persistence.IUmbracoDatabase database,
            DateTime now)
        {
            // Find unprocessed occurrences that should start
            var occurrencesToProcess = database.Fetch<ScheduleOccurrenceDto>(
                @"SELECT * FROM ocPowerSortScheduleOccurrence 
                  WHERE IsProcessed = 0 
                  AND IsCancelled = 0 
                  AND OccurrenceStartDate <= @0",
                now);

            foreach (var occurrence in occurrencesToProcess)
            {
                try
                {
                    // Get the parent recurring schedule
                    var recurringSchedule = database.SingleOrDefault<RecurringScheduleDto>(
                        "SELECT * FROM ocPowerSortRecurringSchedule WHERE Id = @0",
                        occurrence.RecurringScheduleId);

                    if (recurringSchedule == null || !recurringSchedule.IsEnabled)
                    {
                        _logger.LogWarning(
                            "Recurring schedule {RecurringScheduleId} not found or disabled for occurrence {OccurrenceId}",
                            occurrence.RecurringScheduleId, occurrence.Id);
                        occurrence.IsProcessed = true;
                        database.Update(occurrence);
                        continue;
                    }

                    // Create a one-time schedule from this occurrence
                    var oneTimeSchedule = new SortScheduleDto
                    {
                        Id = Guid.NewGuid(),
                        ContentId = recurringSchedule.ContentId,
                        ParentId = recurringSchedule.ParentId,
                        TargetPosition = recurringSchedule.TargetPosition,
                        StartDateTime = occurrence.OccurrenceStartDate,
                        EndDateTime = occurrence.OccurrenceEndDate,
                        IsActive = false, // Will be activated by normal schedule processing
                        Priority = recurringSchedule.Priority,
                        Created = DateTime.UtcNow,
                        CreatedBy = recurringSchedule.CreatedBy,
                        RecurringScheduleId = recurringSchedule.Id
                    };

                    database.Insert(oneTimeSchedule);

                    // Mark occurrence as processed
                    occurrence.IsProcessed = true;
                    database.Update(occurrence);

                    _logger.LogInformation(
                        "Created one-time schedule {ScheduleId} from recurring schedule {RecurringScheduleId} occurrence {OccurrenceId}",
                        oneTimeSchedule.Id, recurringSchedule.Id, occurrence.Id);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing occurrence {OccurrenceId}", occurrence.Id);
                }
            }

            // Clean up old processed occurrences (older than 30 days)
            var cleanupDate = now.AddDays(-30);
            var deletedCount = database.Execute(
                @"DELETE FROM ocPowerSortScheduleOccurrence 
                  WHERE IsProcessed = 1 
                  AND OccurrenceEndDate < @0",
                cleanupDate);

            if (deletedCount > 0)
            {
                _logger.LogInformation("Cleaned up {Count} old processed occurrences", deletedCount);
            }
        }

        private async Task RestoreDefaultSortOrderAsync(Guid parentId, Umbraco.Cms.Infrastructure.Persistence.IUmbracoDatabase database)
        {
            try
            {
                // Get default order for this parent
                var defaultOrders = database.Fetch<DefaultSortOrderDto>(
                    "SELECT * FROM ocPowerSortDefaultOrder WHERE ParentId = @0 ORDER BY SortOrder",
                    parentId);

                if (!defaultOrders.Any())
                {
                    _logger.LogInformation(
                        "No default sort order configured for parent {ParentId}, skipping restoration",
                        parentId);
                    return;
                }

                var parent = _contentService.GetById(parentId);
                if (parent == null)
                {
                    _logger.LogWarning("Parent {ParentId} not found for default order restoration", parentId);
                    return;
                }

                // Get current children
                var children = _contentService.GetPagedChildren(parent.Id, 0, int.MaxValue, out _)
                    .ToDictionary(c => c.Key, c => c);

                var changesMade = false;

                _logger.LogInformation(
                    "Restoring default sort order for parent {ParentName} ({ParentId})",
                    parent.Name, parentId);

                // Apply default order
                foreach (var defaultOrder in defaultOrders)
                {
                    if (children.TryGetValue(defaultOrder.ContentId, out var child))
                    {
                        if (child.SortOrder != defaultOrder.SortOrder)
                        {
                            _logger.LogInformation(
                                "Restoring {ContentName} to default position {Position} (was {OldPosition})",
                                child.Name, defaultOrder.SortOrder, child.SortOrder);

                            child.SortOrder = defaultOrder.SortOrder;
                            _contentService.Save(child);
                            changesMade = true;
                        }
                    }
                }

                if (changesMade)
                {
                    _logger.LogInformation(
                        "Successfully restored default sort order for parent {ParentId}",
                        parentId);
                }
                else
                {
                    _logger.LogInformation(
                        "Default sort order already matches current order for parent {ParentId}",
                        parentId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error restoring default sort order for parent {ParentId}", parentId);
            }
        }

        private async Task ApplySchedulesToParentAsync(Guid parentId, List<SortScheduleDto> schedules)
        {
            try
            {
                var parent = _contentService.GetById(parentId);
                if (parent == null)
                {
                    _logger.LogWarning("Parent {ParentId} not found for schedules", parentId);
                    return;
                }

                // Get all children ordered by their current sort order
                var children = _contentService.GetPagedChildren(parent.Id, 0, int.MaxValue, out var totalChildren)
                    .OrderBy(c => c.SortOrder)
                    .ToList();

                if (!children.Any())
                {
                    return;
                }

                _logger.LogInformation(
                    "Processing {ScheduleCount} schedules for parent {ParentId} with {ChildCount} children using provider system",
                    schedules.Count, parentId, children.Count);

                // Convert to provider context
                var context = new SortContext
                {
                    ParentId = parentId,
                    Children = children.Select(c => new SortableContent
                    {
                        Id = c.Key,
                        Name = c.Name,
                        CurrentSortOrder = c.SortOrder,
                        CreateDate = c.CreateDate,
                        UpdateDate = c.UpdateDate,
                        Properties = new Dictionary<string, object>()
                    }).ToList(),
                    ActiveSchedules = schedules.Select(s => new SortSchedule
                    {
                        Id = s.Id,
                        ContentId = s.ContentId,
                        TargetPosition = s.TargetPosition,
                        Priority = s.Priority,
                        StartDateTime = s.StartDateTime,
                        EndDateTime = s.EndDateTime
                    }).ToList(),
                    Timestamp = DateTime.UtcNow
                };

                // Get the default provider and calculate sort order
                var provider = _sortProviderFactory.GetDefaultProvider();
                _logger.LogInformation("Using sort provider: {ProviderKey} - {DisplayName}", 
                    provider.ProviderKey, provider.DisplayName);

                var sortResult = await provider.CalculateSortOrderAsync(context);

                _logger.LogInformation(
                    "Provider completed in {ExecutionTime}ms. Changes needed: {ChangesMade}",
                    sortResult.ExecutionTimeMs, sortResult.ChangesMade);

                // Apply the sorted order if changes were made
                if (sortResult.ChangesMade && sortResult.SortedContentIds.Any())
                {
                    _logger.LogInformation("Applying new sort order to {Count} children", sortResult.SortedContentIds.Count);

                    for (int i = 0; i < sortResult.SortedContentIds.Count; i++)
                    {
                        var contentId = sortResult.SortedContentIds[i];
                        var child = children.FirstOrDefault(c => c.Key == contentId);

                        if (child != null)
                        {
                            var oldSortOrder = child.SortOrder;
                            child.SortOrder = i;

                            if (oldSortOrder != i)
                            {
                                _contentService.Save(child);
                                _logger.LogInformation(
                                    "Updated {ContentName} SortOrder from {OldOrder} to {NewOrder}",
                                    child.Name, oldSortOrder, i);
                            }
                        }
                    }

                    _logger.LogInformation("Successfully applied sort order changes for parent {ParentId}", parentId);

                    // Log metadata if available
                    if (sortResult.Metadata.Any())
                    {
                        _logger.LogInformation("Sort metadata: {Metadata}", 
                            string.Join(", ", sortResult.Metadata.Select(kvp => $"{kvp.Key}={kvp.Value}")));
                    }
                }
                else
                {
                    _logger.LogInformation("No sort order changes needed for parent {ParentId}", parentId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error applying schedules to parent {ParentId}", parentId);
            }
        }

        public override Task StopAsync(CancellationToken cancellationToken)
        {
            _logger.LogInformation("Schedule Processing Service is stopping");
            return base.StopAsync(cancellationToken);
        }
    }
}
