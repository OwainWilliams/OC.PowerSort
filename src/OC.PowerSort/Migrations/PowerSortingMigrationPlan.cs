using Umbraco.Cms.Infrastructure.Migrations;

namespace OC.PowerSort.Migrations
{
    public class PowerSortMigrationPlan : MigrationPlan
    {
        public PowerSortMigrationPlan() : base("OC.PowerSort")
        {
            From(string.Empty)
                .To<CreateSortScheduleTableMigration>("create-sort-schedule-table-v1")
                .To<CreateDefaultSortOrderTableMigration>("create-default-sort-order-table-v1")
                .To<CreateEnumPriorityTableMigration>("create-enum-priority-table-v1");
        }
    }
}
