using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using OC.PowerSort.Interfaces;
using OC.PowerSort.Models;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Core.Sync;
using Umbraco.Cms.Infrastructure.BackgroundJobs;
using Umbraco.Cms.Infrastructure.Persistence;
using Umbraco.Cms.Infrastructure.Scoping;

namespace OC.PowerSort.Services
{
    /// <summary>
    /// Recurring background job that activates and deactivates schedules, turns recurring schedule
    /// occurrences into one-time schedules, and applies sort order changes based on active schedules.
    /// </summary>
    /// <remarks>
    /// Implemented as an Umbraco <see cref="IRecurringBackgroundJob"/> rather than a raw hosted service so
    /// that in a load-balanced setup it only runs on the scheduling publisher (or a single server), and only
    /// once the application has reached the Run state.
    /// </remarks>
    public class ScheduleProcessingService : IRecurringBackgroundJob
    {
        private static readonly TimeSpan OccurrenceGenerationInterval = TimeSpan.FromHours(6);

        private readonly ILogger<ScheduleProcessingService> _logger;
        private readonly IScopeProvider _scopeProvider;
        private readonly IContentService _contentService;
        private readonly IServiceScopeFactory _serviceScopeFactory;
        private readonly ISortProviderFactory _sortProviderFactory;
        private DateTime _lastOccurrenceGeneration = DateTime.MinValue;

        public ScheduleProcessingService(
            ILogger<ScheduleProcessingService> logger,
            IScopeProvider scopeProvider,
            IContentService contentService,
            IServiceScopeFactory serviceScopeFactory,
            ISortProviderFactory sortProviderFactory)
        {
            _logger = logger;
            _scopeProvider = scopeProvider;
            _contentService = contentService;
            _serviceScopeFactory = serviceScopeFactory;
            _sortProviderFactory = sortProviderFactory;
        }

        /// <summary>How often the job runs.</summary>
        public TimeSpan Period => TimeSpan.FromMinutes(1);

        /// <summary>Delay before the first run after start-up.</summary>
        public TimeSpan Delay => TimeSpan.FromSeconds(30);

        /// <summary>Only run where scheduling is supposed to happen; never on subscribers.</summary>
        public ServerRole[] ServerRoles => new[] { ServerRole.Single, ServerRole.SchedulingPublisher };

        // The period never changes at runtime, so nothing subscribes to this event.
        public event EventHandler PeriodChanged { add { } remove { } }

        public async Task RunJobAsync()
        {
            // Periodically (and on the first run) generate occurrences for recurring schedules.
            if (DateTime.UtcNow - _lastOccurrenceGeneration >= OccurrenceGenerationInterval)
            {
                try
                {
                    using var serviceScope = _serviceScopeFactory.CreateScope();
                    var occurrenceGenerator = serviceScope.ServiceProvider.GetRequiredService<IOccurrenceGenerationService>();
                    await occurrenceGenerator.GenerateOccurrencesForAllActiveRecurringSchedulesAsync();
                    _lastOccurrenceGeneration = DateTime.UtcNow;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error generating recurring schedule occurrences");
                }
            }

            await ProcessSchedulesAsync();
        }

        private async Task ProcessSchedulesAsync()
        {
            // Everything in this cycle runs in one Umbraco scope so the schedule state changes and the
            // content sort changes commit (or roll back) together. The scope's own database connection is
            // used so the schedule updates are part of the same transaction.
            using var scope = _scopeProvider.CreateScope();
            var database = scope.Database;
            var now = DateTime.UtcNow;

            ProcessRecurringScheduleOccurrences(database, now);

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

            // Parents that no longer have any active schedule get their default order back
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

                    RestoreDefaultSortOrder(parentId, database);
                }
            }

            // Step 3: Apply active schedules to sort order, grouped by parent
            var activeSchedules = database.Fetch<SortScheduleDto>(
                @"SELECT * FROM ocPowerSortSchedule
                  WHERE IsActive = 1
                  AND StartDateTime <= @0
                  AND EndDateTime > @0
                  ORDER BY ParentId, Priority DESC, StartDateTime ASC",
                now);

            foreach (var parentGroup in activeSchedules.GroupBy(s => s.ParentId))
            {
                await ApplySchedulesToParentAsync(parentGroup.Key, parentGroup.ToList());
            }

            scope.Complete();
        }

        private void ProcessRecurringScheduleOccurrences(IUmbracoDatabase database, DateTime now)
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

                    // Create a one-time schedule from this occurrence; it is activated by the normal processing above
                    var oneTimeSchedule = new SortScheduleDto
                    {
                        Id = Guid.NewGuid(),
                        ContentId = recurringSchedule.ContentId,
                        ParentId = recurringSchedule.ParentId,
                        TargetPosition = recurringSchedule.TargetPosition,
                        StartDateTime = occurrence.OccurrenceStartDate,
                        EndDateTime = occurrence.OccurrenceEndDate,
                        IsActive = false,
                        Priority = recurringSchedule.Priority,
                        Created = DateTime.UtcNow,
                        CreatedBy = recurringSchedule.CreatedBy,
                        RecurringScheduleId = recurringSchedule.Id
                    };

                    database.Insert(oneTimeSchedule);

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

            // Clean up old occurrences (processed or cancelled, ended more than 30 days ago)
            var cleanupDate = now.AddDays(-30);
            var deletedCount = database.Execute(
                @"DELETE FROM ocPowerSortScheduleOccurrence
                  WHERE (IsProcessed = 1 OR IsCancelled = 1)
                  AND OccurrenceEndDate < @0",
                cleanupDate);

            if (deletedCount > 0)
            {
                _logger.LogInformation("Cleaned up {Count} old occurrences", deletedCount);
            }
        }

        private void RestoreDefaultSortOrder(Guid parentId, IUmbracoDatabase database)
        {
            try
            {
                var defaultOrders = database.Fetch<DefaultSortOrderDto>(
                    "SELECT * FROM ocPowerSortDefaultOrder WHERE ParentId = @0 ORDER BY SortOrder",
                    parentId);

                if (defaultOrders.Count == 0)
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

                _logger.LogInformation(
                    "Restoring default sort order for parent {ParentName} ({ParentId})",
                    parent.Name, parentId);

                var changed = ApplyOrder(parent, defaultOrders.Select(d => d.ContentId));

                if (changed > 0)
                {
                    _logger.LogInformation(
                        "Restored default sort order for parent {ParentId} ({Count} items moved)",
                        parentId, changed);
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

                var children = GetOrderedChildren(parent);
                if (children.Count == 0)
                {
                    return;
                }

                _logger.LogInformation(
                    "Processing {ScheduleCount} schedules for parent {ParentId} with {ChildCount} children using provider system",
                    schedules.Count, parentId, children.Count);

                var context = new SortContext
                {
                    ParentId = parentId,
                    Children = children.Select(c => new SortableContent
                    {
                        Id = c.Key,
                        Name = c.Name ?? string.Empty,
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

                var provider = _sortProviderFactory.GetDefaultProvider();
                _logger.LogInformation("Using sort provider: {ProviderKey} - {DisplayName}",
                    provider.ProviderKey, provider.DisplayName);

                var sortResult = await provider.CalculateSortOrderAsync(context);

                _logger.LogInformation(
                    "Provider completed in {ExecutionTime}ms. Changes needed: {ChangesMade}",
                    sortResult.ExecutionTimeMs, sortResult.ChangesMade);

                if (!sortResult.ChangesMade || sortResult.SortedContentIds.Count == 0)
                {
                    _logger.LogInformation("No sort order changes needed for parent {ParentId}", parentId);
                    return;
                }

                var changed = ApplyOrder(parent, sortResult.SortedContentIds, children);

                _logger.LogInformation(
                    "Applied sort order changes for parent {ParentId} ({Count} items moved)",
                    parentId, changed);

                if (sortResult.Metadata.Count > 0)
                {
                    _logger.LogInformation("Sort metadata: {Metadata}",
                        string.Join(", ", sortResult.Metadata.Select(kvp => $"{kvp.Key}={kvp.Value}")));
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error applying schedules to parent {ParentId}", parentId);
            }
        }

        private List<IContent> GetOrderedChildren(IContent parent)
        {
            return _contentService.GetPagedChildren(parent.Id, 0, int.MaxValue, out _)
                .OrderBy(c => c.SortOrder)
                .ToList();
        }

        private int ApplyOrder(IContent parent, IEnumerable<Guid> orderedKeys)
            => ApplyOrder(parent, orderedKeys, GetOrderedChildren(parent));

        /// <summary>
        /// Applies an order to a parent's children through Umbraco's sort API. Children not present in
        /// <paramref name="orderedKeys"/> keep their relative order after the ordered ones.
        /// Returns the number of children whose position changed.
        /// </summary>
        private int ApplyOrder(IContent parent, IEnumerable<Guid> orderedKeys, List<IContent> children)
        {
            var byKey = children.ToDictionary(c => c.Key, c => c);
            var ordered = new List<IContent>(children.Count);
            var seen = new HashSet<Guid>();

            foreach (var key in orderedKeys)
            {
                if (byKey.TryGetValue(key, out var child) && seen.Add(key))
                {
                    ordered.Add(child);
                }
            }

            ordered.AddRange(children.Where(c => !seen.Contains(c.Key)));

            var changed = ordered.Where((c, index) => c.SortOrder != index).Count();
            if (changed == 0)
            {
                return 0;
            }

            var result = _contentService.Sort(ordered);
            if (!result.Success)
            {
                throw new InvalidOperationException($"Sorting children of {parent.Key} failed: {result.Result}");
            }

            return changed;
        }
    }
}
