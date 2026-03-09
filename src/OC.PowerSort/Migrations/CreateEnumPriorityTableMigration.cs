using Umbraco.Cms.Infrastructure.Migrations;

namespace OC.PowerSort.Migrations
{
    public class CreateEnumPriorityTableMigration : AsyncMigrationBase
    {
        public CreateEnumPriorityTableMigration(IMigrationContext context) : base(context)
        {
        }

        protected override async Task MigrateAsync()
        {
            if (!TableExists("ocPowerSortEnumPriority"))
            {
                Create.Table("ocPowerSortEnumPriority")
                    .WithColumn("Id").AsGuid().NotNullable().PrimaryKey("PK_ocPowerSortEnumPriority")
                    .WithColumn("Name").AsString().NotNullable()
                    .WithColumn("SortPriority").AsInt32().NotNullable()
                    .WithColumn("Created").AsDateTime().NotNullable()
                    .WithColumn("CreatedBy").AsInt32().NotNullable()
                    .WithColumn("Updated").AsDateTime().NotNullable()
                    .WithColumn("UpdatedBy").AsInt32().NotNullable()
                    .Do();
            }

            await Task.CompletedTask;
        }
    }
}
