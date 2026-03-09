using Umbraco.Cms.Infrastructure.Migrations;

namespace OC.PowerSort.Migrations
{
    public class CreateDefaultSortOrderTableMigration : AsyncMigrationBase
    {
        public CreateDefaultSortOrderTableMigration(IMigrationContext context) : base(context)
        {
        }

        protected override async Task MigrateAsync()
        {
            if (!TableExists("ocPowerSortDefaultOrder"))
            {
                Create.Table("ocPowerSortDefaultOrder")
                    .WithColumn("Id").AsGuid().NotNullable().PrimaryKey("PK_ocPowerSortDefaultOrder")
                    .WithColumn("ParentId").AsGuid().NotNullable()
                    .WithColumn("ContentId").AsGuid().NotNullable()
                    .WithColumn("SortOrder").AsInt32().NotNullable()
                    .WithColumn("Created").AsDateTime().NotNullable()
                    .WithColumn("CreatedBy").AsInt32().NotNullable()
                    .WithColumn("Updated").AsDateTime().NotNullable()
                    .Do();
            }

            await Task.CompletedTask;
        }
    }
}
