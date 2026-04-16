using NPoco;

namespace OC.PowerSort.Models
{
    [TableName("ocPowerSortSchedule")]
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

        /// <summary>
        /// Links this one-time schedule to its parent recurring schedule (if any)
        /// </summary>
        [Column("RecurringScheduleId")]
        public Guid? RecurringScheduleId { get; set; }
    }

    [TableName("ocPowerSortDefaultOrder")]
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
        public bool IsCurrentlyActive { get; set; }
        public int Priority { get; set; }
        public DateTime Created { get; set; }
        public string CreatedByName { get; set; } = string.Empty;
        public Guid? RecurringScheduleId { get; set; }
    }

    public class CreateScheduleRequest
    {
        public Guid ContentId { get; set; }
        public Guid ParentId { get; set; }
        public int TargetPosition { get; set; }
        public DateTime StartDateTime { get; set; }
        public DateTime EndDateTime { get; set; }
        public int Priority { get; set; }
    }

    public class UpdateScheduleRequest
    {
        public int TargetPosition { get; set; }
        public DateTime StartDateTime { get; set; }
        public DateTime EndDateTime { get; set; }
        public int Priority { get; set; }
    }

    public class ScheduleListResponse
    {
        public int Total { get; set; }
        public List<ScheduleResponse> Items { get; set; } = new();
    }

    public class ActiveScheduleInfo
    {
        public Guid ScheduleId { get; set; }
        public Guid ContentId { get; set; }
        public string ContentName { get; set; } = string.Empty;
        public int TargetPosition { get; set; }
        public int Priority { get; set; }
        public DateTime StartDateTime { get; set; }
        public DateTime EndDateTime { get; set; }
    }

    // Enum Priority Models
    [TableName("ocPowerSortEnumPriority")]
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

    public class CreateEnumPriorityRequest
    {
        public string Name { get; set; } = string.Empty;
        public int SortPriority { get; set; }
    }

    public class UpdateEnumPriorityRequest
    {
        public string Name { get; set; } = string.Empty;
        public int SortPriority { get; set; }
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
        public List<EnumPriorityResponse> Items { get; set; } = new();
    }

    // Default Sort Order Models
    public class DefaultSortOrderResponse
    {
        public Guid ParentId { get; set; }
        public string ParentName { get; set; } = string.Empty;
        public int ItemCount { get; set; }
        public DateTime Created { get; set; }
        public DateTime Updated { get; set; }
        public bool IsSet { get; set; }
        public List<DefaultSortOrderItem> Items { get; set; } = new();
    }

    public class DefaultSortOrderItem
    {
        public Guid ContentId { get; set; }
        public string ContentName { get; set; } = string.Empty;
        public int SortOrder { get; set; }
    }

    public class SaveDefaultSortOrderRequest
    {
        public Guid ParentId { get; set; }
    }
}
