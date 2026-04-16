using Microsoft.Extensions.Logging;
using OC.PowerSort.Interfaces;
using Umbraco.Cms.Core.Services;

namespace OC.PowerSort.Providers.Examples
{
    /// <summary>
    /// Example provider that boosts content based on view count/popularity metrics.
    /// Demonstrates how to integrate analytics data with PowerSort's scheduling system.
    /// Use case: Boost popular articles while respecting time-sensitive promotions via schedules.
    /// </summary>
    public class PopularityBoostProvider : ISortProvider
    {
        private readonly IContentService _contentService;
        private readonly ILogger<PopularityBoostProvider> _logger;

        public string ProviderKey => "PowerSort.PopularityBoost";
        public string DisplayName => "Popularity Boost (View Count)";
        public string Description => "Boosts content based on view count, then applies PowerSort schedules. Demonstrates analytics-driven boosting with schedule support.";
        public bool SupportsScheduling => true; // Works WITH schedules

        public PopularityBoostProvider(
            IContentService contentService,
            ILogger<PopularityBoostProvider> logger)
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
                result.ExecutionTimeMs = (long)(DateTime.UtcNow - startTime).TotalMilliseconds;
                return result;
            }

            _logger.LogInformation(
                "Applying popularity boost for parent {ParentId} with {ScheduleCount} active schedules",
                context.ParentId, context.ActiveSchedules.Count);

            // Step 1: Get view counts and calculate boost scores
            var contentScores = new Dictionary<Guid, int>();
            var maxViews = 0;

            foreach (var child in context.Children)
            {
                var content = _contentService.GetById(child.Id);
                if (content?.HasProperty("viewCount") == true)
                {
                    var viewCount = content.GetValue<int>("viewCount");
                    contentScores[child.Id] = viewCount;
                    maxViews = Math.Max(maxViews, viewCount);
                }
                else
                {
                    contentScores[child.Id] = 0; // Default score
                }
            }

            _logger.LogInformation("View counts range from 0 to {MaxViews}", maxViews);

            // Step 2: Sort by popularity (view count descending)
            var orderedChildren = context.Children
                .OrderByDescending(c => contentScores.GetValueOrDefault(c.Id, 0))
                .ThenBy(c => c.CurrentSortOrder) // Tie-breaker: current position
                .ToList();

            result.ChangesMade = true; // Popularity changes over time

            // Step 3: Apply PowerSort schedules on top of popularity sort
            // Schedules override popularity for time-sensitive promotions
            if (context.ActiveSchedules.Any())
            {
                var claimedPositions = new Dictionary<int, SortSchedule>();
                var sortedSchedules = context.ActiveSchedules
                    .OrderByDescending(s => s.Priority)
                    .ThenBy(s => s.StartDateTime)
                    .ToList();

                // Determine which schedule claims which position (priority-based)
                foreach (var schedule in sortedSchedules)
                {
                    var targetPosition = Math.Min(schedule.TargetPosition, orderedChildren.Count - 1);

                    if (!claimedPositions.ContainsKey(targetPosition))
                    {
                        claimedPositions[targetPosition] = schedule;
                        _logger.LogDebug("Schedule {ScheduleId} claims position {Position} (Priority: {Priority})",
                            schedule.Id, targetPosition, schedule.Priority);
                    }
                }

                // Apply winning schedules (overrides popularity)
                foreach (var kvp in claimedPositions.OrderBy(x => x.Key))
                {
                    var targetPosition = kvp.Key;
                    var schedule = kvp.Value;
                    var contentIndex = orderedChildren.FindIndex(c => c.Id == schedule.ContentId);

                    if (contentIndex != -1 && contentIndex != targetPosition)
                    {
                        var contentToMove = orderedChildren[contentIndex];
                        orderedChildren.RemoveAt(contentIndex);
                        orderedChildren.Insert(targetPosition, contentToMove);

                        _logger.LogInformation(
                            "Schedule overrides popularity: moved content from position {From} to {To}",
                            contentIndex, targetPosition);
                    }
                }

                result.Metadata["SchedulesApplied"] = claimedPositions.Count;
                result.Metadata["ScheduleOverridesCount"] = claimedPositions.Count;
            }

            result.SortedContentIds = orderedChildren.Select(c => c.Id).ToList();
            result.Metadata["MaxViewCount"] = maxViews;
            result.Metadata["BoostingStrategy"] = "View Count";
            result.Metadata["ScheduleIntegration"] = "Schedules override popularity";
            result.ExecutionTimeMs = (long)(DateTime.UtcNow - startTime).TotalMilliseconds;

            _logger.LogInformation(
                "Popularity boost completed in {Time}ms. Max views: {MaxViews}, Schedules: {Schedules}",
                result.ExecutionTimeMs, maxViews, context.ActiveSchedules.Count);

            return result;
        }

        public Task<ProviderValidationResult> ValidateAsync()
        {
            var result = new ProviderValidationResult { IsValid = true };
            result.Message = "Popularity boost provider ready. Looks for 'viewCount' integer property on content.";
            result.Warnings.Add("Ensure your content types have a 'viewCount' integer property for this provider to work effectively.");
            result.Warnings.Add("View counts should be updated regularly (e.g., from analytics) for best results.");
            return Task.FromResult(result);
        }
    }
}
