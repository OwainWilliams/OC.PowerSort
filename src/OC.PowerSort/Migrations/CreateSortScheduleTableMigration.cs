using Umbraco.Cms.Infrastructure.Migrations;

namespace OC.PowerSort.Migrations
{
    public class CreateSortScheduleTableMigration : AsyncMigrationBase
    {
        public CreateSortScheduleTableMigration(IMigrationContext context) : base(context)
        {
        }

        protected override async Task MigrateAsync()
        {
            if (!TableExists("ocPowerSortSchedule"))
            {
                Create.Table("ocPowerSortSchedule")
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
                Create.Index("IX_ocPowerSortSchedule_ContentId")
                    .OnTable("ocPowerSortSchedule")
                    .OnColumn("ContentId")
                    .Ascending()
                    .Do();

                Create.Index("IX_ocPowerSortSchedule_ParentId")
                    .OnTable("ocPowerSortSchedule")
                    .OnColumn("ParentId")
                    .Ascending()
                    .Do();

                Create.Index("IX_ocPowerSortSchedule_DateRange")
                    .OnTable("ocPowerSortSchedule")
                    .OnColumn("StartDateTime")
                    .Ascending()
                    .OnColumn("EndDateTime")
                    .Ascending()
                    .Do();

                Create.Index("IX_ocPowerSortSchedule_IsActive")
                    .OnTable("ocPowerSortSchedule")
                    .OnColumn("IsActive")
                    .Ascending()
                    .Do();
            }

            await Task.CompletedTask;
        }
    }
}
