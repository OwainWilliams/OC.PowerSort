using Umbraco.Cms.Infrastructure.Migrations;

namespace OC.PowerSorting.Migrations
{
    public class CreateSortScheduleTableMigration : AsyncMigrationBase
    {
        public CreateSortScheduleTableMigration(IMigrationContext context) : base(context)
        {
        }

        protected override async Task MigrateAsync()
        {
            if (!TableExists("ocPowerSortingSchedule"))
            {
                Create.Table("ocPowerSortingSchedule")
                    .WithColumn("Id").AsGuid().NotNullable().PrimaryKey()
                    .WithColumn("ContentId").AsGuid().NotNullable()
                    .WithColumn("ParentId").AsGuid().NotNullable()
                    .WithColumn("TargetPosition").AsInt32().NotNullable()
                    .WithColumn("StartDateTime").AsDateTime().NotNullable()
                    .WithColumn("EndDateTime").AsDateTime().NotNullable()
                    .WithColumn("IsActive").AsBoolean().NotNullable().WithDefaultValue(false)
                    .WithColumn("Priority").AsInt32().NotNullable().WithDefaultValue(0)
                    .WithColumn("Created").AsDateTime().NotNullable()
                    .WithColumn("CreatedBy").AsInt32().NotNullable()
                    .Do();

                // Create indexes for performance
                Create.Index("IX_ocPowerSortingSchedule_ContentId")
                    .OnTable("ocPowerSortingSchedule")
                    .OnColumn("ContentId")
                    .Ascending()
                    .Do();

                Create.Index("IX_ocPowerSortingSchedule_ParentId")
                    .OnTable("ocPowerSortingSchedule")
                    .OnColumn("ParentId")
                    .Ascending()
                    .Do();

                Create.Index("IX_ocPowerSortingSchedule_DateRange")
                    .OnTable("ocPowerSortingSchedule")
                    .OnColumn("StartDateTime")
                    .Ascending()
                    .OnColumn("EndDateTime")
                    .Ascending()
                    .Do();

                Create.Index("IX_ocPowerSortingSchedule_IsActive")
                    .OnTable("ocPowerSortingSchedule")
                    .OnColumn("IsActive")
                    .Ascending()
                    .Do();
            }

            await Task.CompletedTask;
        }
    }
}
