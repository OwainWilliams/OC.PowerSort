using Microsoft.Extensions.Logging;
using OC.PowerSort.Interfaces;
using Umbraco.Cms.Core.Services;

namespace OC.PowerSort.Providers.Examples
{
    /// <summary>
    /// Example provider that boosts "featured" content to the top while respecting PowerSort schedules.
    /// Demonstrates schedule-aware provider that combines property-based boosting with scheduled sorting.
    /// Use case: Promote featured articles/products while maintaining scheduled promotions.
    /// </summary>
    public class FeaturedContentBoostProvider : ISortProvider
    {
        private readonly IContentService _contentService;
        private readonly ILogger<FeaturedContentBoostProvider> _logger;

        public string ProviderKey => "PowerSort.FeaturedBoost";
        public string DisplayName => "Featured Content Boost";
        public string Description => "Boosts content marked as 'featured' to the top, then applies PowerSort schedules. Demonstrates schedule-aware boosting.";
        public bool SupportsScheduling => true; // Works WITH schedules

        public FeaturedContentBoostProvider(
            IContentService contentService,
            ILogger<FeaturedContentBoostProvider> logger)
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
                return result;
            }

            _logger.LogInformation(
                "Applying featured content boost for parent {ParentId} with {ScheduleCount} active schedules",
                context.ParentId, context.ActiveSchedules.Count);

            // Step 1: Get featured status for each content item
            var featuredItems = new HashSet<Guid>();
            var featuredCount = 0;

            foreach (var child in context.Children)
            {
                var content = _contentService.GetById(child.Id);
                if (content?.HasProperty("featured") == true)
                {
                    var isFeatured = content.GetValue<bool>("featured");
                    if (isFeatured)
                    {
                        featuredItems.Add(child.Id);
                        featuredCount++;
                    }
                }
            }

            _logger.LogInformation("Found {FeaturedCount} featured items out of {TotalCount}",
                featuredCount, context.Children.Count);

            // Step 2: Start with children in current order
            var orderedChildren = context.Children
                .OrderBy(c => c.CurrentSortOrder)
                .ToList();

            // Step 3: Apply PowerSort schedules (same logic as default provider)
            if (context.ActiveSchedules.Any())
            {
                var claimedPositions = new Dictionary<int, SortSchedule>();
                var sortedSchedules = context.ActiveSchedules
                    .OrderByDescending(s => s.Priority)
                    .ThenBy(s => s.StartDateTime)
                    .ToList();

                // Determine which schedule claims which position
                foreach (var schedule in sortedSchedules)
                {
                    var targetPosition = Math.Min(schedule.TargetPosition, orderedChildren.Count - 1);

                    if (!claimedPositions.ContainsKey(targetPosition))
                    {
                        claimedPositions[targetPosition] = schedule;
                    }
                }

                // Apply winning schedules
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
                        result.ChangesMade = true;
                    }
                }

                result.Metadata["SchedulesApplied"] = claimedPositions.Count;
            }

            // Step 4: Boost featured items (move to top, maintaining relative order)
            if (featuredItems.Any())
            {
                var featured = orderedChildren.Where(c => featuredItems.Contains(c.Id)).ToList();
                var nonFeatured = orderedChildren.Where(c => !featuredItems.Contains(c.Id)).ToList();

                orderedChildren = featured.Concat(nonFeatured).ToList();
                result.ChangesMade = true;

                _logger.LogInformation("Boosted {FeaturedCount} featured items to top positions", featured.Count);
            }

            result.SortedContentIds = orderedChildren.Select(c => c.Id).ToList();
            result.Metadata["FeaturedItemsCount"] = featuredCount;
            result.Metadata["BoostingStrategy"] = "Featured Property";
            result.ExecutionTimeMs = (long)(DateTime.UtcNow - startTime).TotalMilliseconds;

            _logger.LogInformation(
                "Featured boost completed in {Time}ms. Changes: {Changed}, Featured: {Featured}",
                result.ExecutionTimeMs, result.ChangesMade, featuredCount);

            return result;
        }

        public Task<ProviderValidationResult> ValidateAsync()
        {
            // Validate that content type has 'featured' property
            var result = new ProviderValidationResult { IsValid = true };
            result.Message = "Featured boost provider ready. Looks for 'featured' boolean property on content.";
            result.Warnings.Add("Ensure your content types have a 'featured' boolean property for this provider to work effectively.");
            return Task.FromResult(result);
        }
    }
}
