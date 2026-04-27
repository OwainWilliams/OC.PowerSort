using Microsoft.Extensions.Logging;
using OC.PowerSort.Interfaces;
using Umbraco.Cms.Core.Services;

namespace OC.PowerSort.Providers
{
    /// <summary>
    /// Default PowerSort provider implementing schedule-based sorting with priority handling.
    /// This is the built-in provider that maintains backward compatibility with existing functionality.
    /// </summary>
    public class DefaultScheduleSortProvider : ISortProvider
    {
        private readonly IContentService _contentService;
        private readonly ILogger<DefaultScheduleSortProvider> _logger;

        public string ProviderKey => "PowerSort.Default";
        public string DisplayName => "Default Schedule-Based Sort";
        public string Description => "Built-in provider that sorts content based on scheduled positions with priority conflict resolution";
        public bool SupportsScheduling => true;

        public DefaultScheduleSortProvider(
            IContentService contentService,
            ILogger<DefaultScheduleSortProvider> logger)
        {
            _contentService = contentService;
            _logger = logger;
        }

        public async Task<SortResult> CalculateSortOrderAsync(SortContext context)
        {
            var startTime = DateTime.UtcNow;
            var result = new SortResult();

            if (!context.Children.Any())
            {
                _logger.LogDebug("No children to sort for parent {ParentId}", context.ParentId);
                return result;
            }

            // Create working copy of children in current order
            var orderedChildren = context.Children
                .OrderBy(c => c.CurrentSortOrder)
                .ToList();

            // If no active schedules, return current order (no changes needed)
            if (!context.ActiveSchedules.Any())
            {
                _logger.LogDebug("No active schedules for parent {ParentId}, returning current order", context.ParentId);
                result.SortedContentIds = orderedChildren.Select(c => c.Id).ToList();
                result.ChangesMade = false;
                result.ExecutionTimeMs = (long)(DateTime.UtcNow - startTime).TotalMilliseconds;
                return result;
            }

            _logger.LogInformation(
                "Processing {ScheduleCount} schedules for parent {ParentId} with {ChildCount} children",
                context.ActiveSchedules.Count, context.ParentId, orderedChildren.Count);

            // Track which positions have been claimed by schedules (conflict resolution)
            var claimedPositions = new Dictionary<int, SortSchedule>();

            // Sort schedules by priority (highest first), then by start time (earliest first)
            var sortedSchedules = context.ActiveSchedules
                .OrderByDescending(s => s.Priority)
                .ThenBy(s => s.StartDateTime)
                .ToList();

            // First pass: Determine which schedule claims which position (priority wins)
            foreach (var schedule in sortedSchedules)
            {
                var targetPosition = Math.Min(schedule.TargetPosition, orderedChildren.Count - 1);

                if (!claimedPositions.ContainsKey(targetPosition))
                {
                    claimedPositions[targetPosition] = schedule;
                    _logger.LogDebug(
                        "Schedule {ScheduleId} (Priority: {Priority}) claims position {Position}",
                        schedule.Id, schedule.Priority, targetPosition);
                }
                else
                {
                    var existingSchedule = claimedPositions[targetPosition];
                    _logger.LogWarning(
                        "Position {Position} conflict: Schedule {ScheduleId} (Priority: {Priority}) blocked by schedule {ExistingScheduleId} (Priority: {ExistingPriority})",
                        targetPosition, schedule.Id, schedule.Priority, existingSchedule.Id, existingSchedule.Priority);
                }
            }

            // Second pass: Apply only the winning schedules
            foreach (var kvp in claimedPositions.OrderBy(x => x.Key))
            {
                var targetPosition = kvp.Key;
                var schedule = kvp.Value;

                // Find content in ordered list
                var contentIndex = orderedChildren.FindIndex(c => c.Id == schedule.ContentId);
                
                if (contentIndex == -1)
                {
                    _logger.LogWarning(
                        "Content {ContentId} from schedule {ScheduleId} not found in parent {ParentId}",
                        schedule.ContentId, schedule.Id, context.ParentId);
                    continue;
                }

                if (contentIndex != targetPosition)
                {
                    // Move content to target position
                    var contentToMove = orderedChildren[contentIndex];
                    orderedChildren.RemoveAt(contentIndex);
                    orderedChildren.Insert(targetPosition, contentToMove);
                    
                    result.ChangesMade = true;

                    _logger.LogInformation(
                        "Moving content {ContentName} (ID: {ContentId}, Priority: {Priority}) from position {From} to {To}",
                        contentToMove.Name, schedule.ContentId, schedule.Priority, contentIndex, targetPosition);
                }
                else
                {
                    _logger.LogDebug(
                        "Content {ContentName} already at target position {Position}",
                        orderedChildren[contentIndex].Name, targetPosition);
                }
            }

            result.SortedContentIds = orderedChildren.Select(c => c.Id).ToList();
            result.Metadata["SchedulesApplied"] = claimedPositions.Count;
            result.Metadata["ConflictsResolved"] = sortedSchedules.Count - claimedPositions.Count;
            result.Metadata["TotalSchedules"] = sortedSchedules.Count;
            result.ExecutionTimeMs = (long)(DateTime.UtcNow - startTime).TotalMilliseconds;

            _logger.LogInformation(
                "Sort calculation complete for parent {ParentId}: {AppliedCount} schedules applied, {ConflictCount} conflicts resolved, {ExecutionTime}ms",
                context.ParentId, claimedPositions.Count, sortedSchedules.Count - claimedPositions.Count, result.ExecutionTimeMs);

            return result;
        }

        public Task<ProviderValidationResult> ValidateAsync()
        {
            // Default provider is always valid (no external dependencies)
            return Task.FromResult(new ProviderValidationResult
            {
                IsValid = true,
                Message = "Default provider is always valid - no configuration required"
            });
        }
    }
}
