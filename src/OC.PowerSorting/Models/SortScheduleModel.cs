using NPoco;

namespace OC.PowerSorting.Models
{
    [TableName("ocPowerSortingSchedule")]
    [PrimaryKey("Id", AutoIncrement = false)]
    public class SortScheduleDto
    {
        [Column("Id")]
        public Guid Id { get; set; }

        [Column("ContentId")]
        public Guid ContentId { get; set; }

        [Column("ParentId")]
        public Guid ParentId { get; set; }

        [Column("TargetPosition")]
        public int TargetPosition { get; set; }

        [Column("StartDateTime")]
        public DateTime StartDateTime { get; set; }

        [Column("EndDateTime")]
        public DateTime EndDateTime { get; set; }

        [Column("IsActive")]
        public bool IsActive { get; set; }

        [Column("Priority")]
        public int Priority { get; set; }

        [Column("Created")]
        public DateTime Created { get; set; }

        [Column("CreatedBy")]
        public int CreatedBy { get; set; }
    }

    [TableName("ocPowerSortingDefaultOrder")]
    [PrimaryKey("Id", AutoIncrement = false)]
    public class DefaultSortOrderDto
    {
        [Column("Id")]
        public Guid Id { get; set; }

        [Column("ParentId")]
        public Guid ParentId { get; set; }

        [Column("ContentId")]
        public Guid ContentId { get; set; }

        [Column("SortOrder")]
        public int SortOrder { get; set; }

        [Column("Created")]
        public DateTime Created { get; set; }

        [Column("CreatedBy")]
        public int CreatedBy { get; set; }

        [Column("Updated")]
        public DateTime Updated { get; set; }
    }

    [TableName("ocPowerSortingEnumPriority")]
    [PrimaryKey("Id", AutoIncrement = false)]
    public class EnumPriorityDto
    {
        [Column("Id")]
        public Guid Id { get; set; }

        [Column("Name")]
        public string Name { get; set; } = string.Empty;

        [Column("SortPriority")]
        public int SortPriority { get; set; }

        [Column("Created")]
        public DateTime Created { get; set; }

        [Column("CreatedBy")]
        public int CreatedBy { get; set; }

        [Column("Updated")]
        public DateTime Updated { get; set; }

        [Column("UpdatedBy")]
        public int UpdatedBy { get; set; }
    }

    // Request/Response models for API
    public class CreateScheduleRequest
    {
        public required Guid ContentId { get; set; }
        public required Guid ParentId { get; set; }
        public required int TargetPosition { get; set; }
        public required DateTime StartDateTime { get; set; }
        public required DateTime EndDateTime { get; set; }
        public int Priority { get; set; } = 0;
    }

    public class UpdateScheduleRequest
    {
        public required int TargetPosition { get; set; }
        public required DateTime StartDateTime { get; set; }
        public required DateTime EndDateTime { get; set; }
        public int Priority { get; set; } = 0;
    }

    public class ScheduleResponse
    {
        public Guid Id { get; set; }
        public Guid ContentId { get; set; }
        public string ContentName { get; set; } = string.Empty;
        public Guid ParentId { get; set; }
        public string ParentName { get; set; } = string.Empty;
        public int TargetPosition { get; set; }
        public DateTime StartDateTime { get; set; }
        public DateTime EndDateTime { get; set; }
        public bool IsActive { get; set; }
        public bool IsCurrentlyActive { get; set; } // Computed based on current time
        public int Priority { get; set; }
        public DateTime Created { get; set; }
        public string CreatedByName { get; set; } = string.Empty;
    }

    public class ScheduleListResponse
    {
        public int Total { get; set; }
        public required List<ScheduleResponse> Items { get; set; }
    }

    public class ActiveScheduleInfo
    {
        public Guid ScheduleId { get; set; }
        public Guid ContentId { get; set; }
        public int TargetPosition { get; set; }
        public DateTime EndDateTime { get; set; }
        public int Priority { get; set; }
    }

    public class DefaultSortOrderResponse
    {
        public Guid ParentId { get; set; }
        public string ParentName { get; set; } = string.Empty;
        public int ItemCount { get; set; }
        public DateTime Created { get; set; }
        public DateTime Updated { get; set; }
        public bool IsSet { get; set; }
    }

    public class SaveDefaultSortOrderRequest
    {
        public required Guid ParentId { get; set; }
    }

    // Enum Priority Request/Response models
    public class CreateEnumPriorityRequest
    {
        public required string Name { get; set; }
        public required int SortPriority { get; set; }
    }

    public class UpdateEnumPriorityRequest
    {
        public required string Name { get; set; }
        public required int SortPriority { get; set; }
    }

    public class EnumPriorityResponse
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public int SortPriority { get; set; }
        public DateTime Created { get; set; }
        public string CreatedByName { get; set; } = string.Empty;
        public DateTime Updated { get; set; }
        public string UpdatedByName { get; set; } = string.Empty;
    }

    public class EnumPriorityListResponse
    {
        public int Total { get; set; }
        public required List<EnumPriorityResponse> Items { get; set; }
    }
}
