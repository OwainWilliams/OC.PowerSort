using Umbraco.Cms.Infrastructure.Migrations;

namespace OC.PowerSorting.Migrations
{
    public class PowerSortingMigrationPlan : MigrationPlan
    {
        public PowerSortingMigrationPlan() : base("OC.PowerSorting")
        {
            From(string.Empty)
                .To<CreateSortScheduleTableMigration>("create-sort-schedule-table-v1")
                .To<CreateDefaultSortOrderTableMigration>("create-default-sort-order-table-v1")
                .To<CreateEnumPriorityTableMigration>("create-enum-priority-table-v1");
        }
    }
}
