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
                    .WithColumn("Id").AsGuid().NotNullable().PrimaryKey()
                    .WithColumn("ParentId").AsGuid().NotNullable()
                    .WithColumn("ContentId").AsGuid().NotNullable()
                    .WithColumn("SortOrder").AsInt32().NotNullable()
                    .WithColumn("Created").AsDateTime().NotNullable()
                    .WithColumn("CreatedBy").AsInt32().NotNullable()
                    .WithColumn("Updated").AsDateTime().NotNullable()
                    .Do();

                // Create indexes for performance
                Create.Index("IX_ocPowerSortDefaultOrder_ParentId")
                    .OnTable("ocPowerSortDefaultOrder")
                    .OnColumn("ParentId")
                    .Ascending()
                    .Do();

                Create.Index("IX_ocPowerSortDefaultOrder_ContentId")
                    .OnTable("ocPowerSortDefaultOrder")
                    .OnColumn("ContentId")
                    .Ascending()
                    .Do();

                // Create unique index to prevent duplicate entries
                Create.Index("IX_ocPowerSortDefaultOrder_Unique")
                    .OnTable("ocPowerSortDefaultOrder")
                    .OnColumn("ParentId")
                    .Ascending()
                    .OnColumn("ContentId")
                    .Ascending()
                    .WithOptions()
                    .Unique()
                    .Do();
            }

            await Task.CompletedTask;
        }
    }
}
