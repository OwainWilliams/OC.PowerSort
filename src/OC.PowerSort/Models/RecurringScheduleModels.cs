using NPoco;
using System.Text.Json;

namespace OC.PowerSort.Models
{
    /// <summary>
    /// Recurrence pattern types
    /// </summary>
    public enum RecurrenceType
    {
        Daily,
        Weekly,
        Monthly,
        Custom
    }

    /// <summary>
    /// Monthly pattern types
    /// </summary>
    public enum MonthlyPatternType
    {
        DayOfMonth,      // e.g., 3rd of each month
        DayOfWeek        // e.g., 2nd Tuesday
    }

    /// <summary>
    /// Database model for recurring schedules
    /// </summary>
    [TableName("ocPowerSortRecurringSchedule")]
    [PrimaryKey("Id", AutoIncrement = false)]
    public class RecurringScheduleDto
    {
        [Column("Id")]
        public Guid Id { get; set; }

        [Column("ContentId")]
        public Guid ContentId { get; set; }

        [Column("ParentId")]
        public Guid ParentId { get; set; }

        [Column("TargetPosition")]
        public int TargetPosition { get; set; }

        [Column("Priority")]
        public int Priority { get; set; }

        [Column("RecurrenceType")]
        public string RecurrenceType { get; set; } = string.Empty;

        [Column("RecurrenceInterval")]
        public int RecurrenceInterval { get; set; }

        [Column("DaysOfWeek")]
        public string? DaysOfWeek { get; set; } // JSON serialized array

        [Column("MonthlyPattern")]
        public string? MonthlyPattern { get; set; }

        [Column("DayOfMonth")]
        public int? DayOfMonth { get; set; }

        [Column("WeekOfMonth")]
        public int? WeekOfMonth { get; set; }

        [Column("DayOfWeek")]
        public int? DayOfWeek { get; set; }

        [Column("RecurrenceStart")]
        public DateTime RecurrenceStart { get; set; }

        [Column("RecurrenceEnd")]
        public DateTime? RecurrenceEnd { get; set; }

        [Column("MaxOccurrences")]
        public int? MaxOccurrences { get; set; }

        [Column("BoostDurationHours")]
        public int BoostDurationHours { get; set; }

        [Column("IsEnabled")]
        public bool IsEnabled { get; set; }

        [Column("Created")]
        public DateTime Created { get; set; }

        [Column("CreatedBy")]
        public int CreatedBy { get; set; }

        [Column("Modified")]
        public DateTime? Modified { get; set; }

        [Column("ModifiedBy")]
        public int? ModifiedBy { get; set; }

        /// <summary>
        /// Helper to deserialize DaysOfWeek JSON
        /// </summary>
        public int[] GetDaysOfWeekArray()
        {
            if (string.IsNullOrWhiteSpace(DaysOfWeek))
                return Array.Empty<int>();

            try
            {
                return JsonSerializer.Deserialize<int[]>(DaysOfWeek) ?? Array.Empty<int>();
            }
            catch
            {
                return Array.Empty<int>();
            }
        }

        /// <summary>
        /// Helper to serialize DaysOfWeek array to JSON
        /// </summary>
        public void SetDaysOfWeekArray(int[] days)
        {
            DaysOfWeek = JsonSerializer.Serialize(days);
        }
    }

    /// <summary>
    /// Database model for individual occurrences generated from recurring schedules
    /// </summary>
    [TableName("ocPowerSortScheduleOccurrence")]
    [PrimaryKey("Id", AutoIncrement = false)]
    public class ScheduleOccurrenceDto
    {
        [Column("Id")]
        public Guid Id { get; set; }

        [Column("RecurringScheduleId")]
        public Guid RecurringScheduleId { get; set; }

        [Column("OccurrenceStartDate")]
        public DateTime OccurrenceStartDate { get; set; }

        [Column("OccurrenceEndDate")]
        public DateTime OccurrenceEndDate { get; set; }

        [Column("IsProcessed")]
        public bool IsProcessed { get; set; }

        [Column("IsCancelled")]
        public bool IsCancelled { get; set; }
    }

    /// <summary>
    /// Request model for creating recurring schedules
    /// </summary>
    public class CreateRecurringScheduleRequest
    {
        public Guid ContentId { get; set; }
        public Guid ParentId { get; set; }
        public int TargetPosition { get; set; }
        public int Priority { get; set; }
        public RecurrencePatternRequest Pattern { get; set; } = new();
        public int BoostDurationHours { get; set; }
    }

    /// <summary>
    /// Request model for updating recurring schedules
    /// </summary>
    public class UpdateRecurringScheduleRequest
    {
        public int TargetPosition { get; set; }
        public int Priority { get; set; }
        public RecurrencePatternRequest Pattern { get; set; } = new();
        public int BoostDurationHours { get; set; }
        public bool IsEnabled { get; set; }
    }

    /// <summary>
    /// Recurrence pattern request model
    /// </summary>
    public class RecurrencePatternRequest
    {
        public RecurrenceType Type { get; set; }
        public int Interval { get; set; } = 1;
        public int[]? DaysOfWeek { get; set; }
        public MonthlyPatternRequest? MonthlyPattern { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public int? MaxOccurrences { get; set; }
    }

    /// <summary>
    /// Monthly pattern request model
    /// </summary>
    public class MonthlyPatternRequest
    {
        public MonthlyPatternType Type { get; set; }
        public int? DayOfMonth { get; set; }
        public int? WeekOfMonth { get; set; }
        public int? DayOfWeek { get; set; }
    }

    /// <summary>
    /// Response model for recurring schedules
    /// </summary>
    public class RecurringScheduleResponse
    {
        public Guid Id { get; set; }
        public Guid ContentId { get; set; }
        public string ContentName { get; set; } = string.Empty;
        public Guid ParentId { get; set; }
        public string ParentName { get; set; } = string.Empty;
        public int TargetPosition { get; set; }
        public int Priority { get; set; }
        public RecurrencePatternResponse Pattern { get; set; } = new();
        public int BoostDurationHours { get; set; }
        public bool IsEnabled { get; set; }
        public DateTime Created { get; set; }
        public string CreatedByName { get; set; } = string.Empty;
        public DateTime? Modified { get; set; }
        public string? ModifiedByName { get; set; }
        public DateTime? NextOccurrence { get; set; }
        public List<OccurrencePreview>? UpcomingOccurrences { get; set; }
    }

    /// <summary>
    /// Recurrence pattern response model
    /// </summary>
    public class RecurrencePatternResponse
    {
        public RecurrenceType Type { get; set; }
        public string TypeDisplay { get; set; } = string.Empty;
        public int Interval { get; set; }
        public int[]? DaysOfWeek { get; set; }
        public string[]? DaysOfWeekDisplay { get; set; }
        public MonthlyPatternResponse? MonthlyPattern { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public int? MaxOccurrences { get; set; }
        public string Description { get; set; } = string.Empty;
    }

    /// <summary>
    /// Monthly pattern response model
    /// </summary>
    public class MonthlyPatternResponse
    {
        public MonthlyPatternType Type { get; set; }
        public int? DayOfMonth { get; set; }
        public int? WeekOfMonth { get; set; }
        public int? DayOfWeek { get; set; }
        public string Description { get; set; } = string.Empty;
    }

    /// <summary>
    /// Occurrence preview model
    /// </summary>
    public class OccurrencePreview
    {
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public bool IsProcessed { get; set; }
        public bool IsCancelled { get; set; }
    }

    /// <summary>
    /// List response for recurring schedules
    /// </summary>
    public class RecurringScheduleListResponse
    {
        public int Total { get; set; }
        public List<RecurringScheduleResponse> Items { get; set; } = new();
    }

    /// <summary>
    /// Request to cancel a single occurrence
    /// </summary>
    public class CancelOccurrenceRequest
    {
        public DateTime OccurrenceDate { get; set; }
    }
}
