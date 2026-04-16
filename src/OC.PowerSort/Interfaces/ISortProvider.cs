namespace OC.PowerSort.Interfaces
{
    /// <summary>
    /// Provider interface for implementing custom content sorting strategies
    /// </summary>
    public interface ISortProvider
    {
        /// <summary>
        /// Unique identifier for the provider (e.g., "Default", "Weather", "Salesforce")
        /// </summary>
        string ProviderKey { get; }

        /// <summary>
        /// Display name shown in UI
        /// </summary>
        string DisplayName { get; }

        /// <summary>
        /// Description of what this provider does
        /// </summary>
        string Description { get; }

        /// <summary>
        /// Calculate the desired sort order for children of a parent
        /// </summary>
        /// <param name="context">Context containing parent info, children, and configuration</param>
        /// <returns>Sorted list of content IDs in desired order</returns>
        Task<SortResult> CalculateSortOrderAsync(SortContext context);

        /// <summary>
        /// Validate provider configuration
        /// </summary>
        Task<ProviderValidationResult> ValidateAsync();

        /// <summary>
        /// Indicates if this provider supports scheduling
        /// </summary>
        bool SupportsScheduling { get; }
    }

    /// <summary>
    /// Context passed to sort providers
    /// </summary>
    public class SortContext
    {
        /// <summary>
        /// Parent content ID
        /// </summary>
        public Guid ParentId { get; set; }

        /// <summary>
        /// Children to be sorted (in current order)
        /// </summary>
        public List<SortableContent> Children { get; set; } = new();

        /// <summary>
        /// Active schedules to consider (for schedule-aware providers)
        /// </summary>
        public List<SortSchedule> ActiveSchedules { get; set; } = new();

        /// <summary>
        /// Provider-specific configuration
        /// </summary>
        public Dictionary<string, string> Configuration { get; set; } = new();

        /// <summary>
        /// User ID requesting the sort
        /// </summary>
        public int? UserId { get; set; }

        /// <summary>
        /// Timestamp for the sort operation
        /// </summary>
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }

    /// <summary>
    /// Represents content that can be sorted
    /// </summary>
    public class SortableContent
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public int CurrentSortOrder { get; set; }
        public DateTime CreateDate { get; set; }
        public DateTime UpdateDate { get; set; }

        /// <summary>
        /// Additional properties for provider-specific logic
        /// </summary>
        public Dictionary<string, object> Properties { get; set; } = new();
    }

    /// <summary>
    /// Schedule information for sort context
    /// </summary>
    public class SortSchedule
    {
        public Guid Id { get; set; }
        public Guid ContentId { get; set; }
        public int TargetPosition { get; set; }
        public int Priority { get; set; }
        public DateTime StartDateTime { get; set; }
        public DateTime EndDateTime { get; set; }
    }

    /// <summary>
    /// Result from a sort operation
    /// </summary>
    public class SortResult
    {
        /// <summary>
        /// Ordered list of content IDs (position 0 is first)
        /// </summary>
        public List<Guid> SortedContentIds { get; set; } = new();

        /// <summary>
        /// Whether any changes were made
        /// </summary>
        public bool ChangesMade { get; set; }

        /// <summary>
        /// Optional metadata about the sort operation
        /// </summary>
        public Dictionary<string, object> Metadata { get; set; } = new();

        /// <summary>
        /// Execution time in milliseconds
        /// </summary>
        public long ExecutionTimeMs { get; set; }
    }

    /// <summary>
    /// Validation result for provider configuration
    /// </summary>
    public class ProviderValidationResult
    {
        public bool IsValid { get; set; }
        public string Message { get; set; } = string.Empty;
        public List<string> Errors { get; set; } = new();
        public List<string> Warnings { get; set; } = new();
    }
}
