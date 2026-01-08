namespace OC.PowerSorting.Services
{
    /// <summary>
    /// Service for determining if documents should display custom sorting flags
    /// </summary>
    public interface ISortingFlagService
    {
        /// <summary>
        /// Check if a document has a custom sort order (different from default Umbraco sort)
        /// </summary>
        /// <param name="documentId">Document ID to check</param>
        /// <returns>True if document has custom sort order</returns>
        Task<bool> HasCustomSortOrderAsync(Guid documentId);

        /// <summary>
        /// Check if a document is currently scheduled for sorting
        /// </summary>
        /// <param name="documentId">Document ID to check</param>
        /// <returns>True if document has active schedules</returns>
        Task<bool> HasActiveScheduleAsync(Guid documentId);

        /// <summary>
        /// Check if a document has a saved default sort order
        /// </summary>
        /// <param name="documentId">Document ID to check</param>
        /// <returns>True if document has default sort order saved</returns>
        Task<bool> HasDefaultSortOrderAsync(Guid documentId);

        /// <summary>
        /// Get flag information for multiple documents in batch
        /// </summary>
        /// <param name="documentIds">Document IDs to check</param>
        /// <returns>Dictionary with document ID and flag information</returns>
        Task<Dictionary<Guid, SortingFlagInfo>> GetFlagInfoBatchAsync(IEnumerable<Guid> documentIds);
    }

    /// <summary>
    /// Information about sorting flags for a document
    /// </summary>
    public class SortingFlagInfo
    {
        public bool HasCustomSortOrder { get; set; }
        public bool HasActiveSchedule { get; set; }
        public bool HasDefaultSortOrder { get; set; }
        public int? ScheduleCount { get; set; }
        public int? DefaultOrderItemCount { get; set; }
    }
}
