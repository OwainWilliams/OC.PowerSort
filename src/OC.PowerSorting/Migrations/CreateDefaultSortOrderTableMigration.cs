using Umbraco.Cms.Infrastructure.Migrations;

namespace OC.PowerSorting.Migrations
{
    public class CreateDefaultSortOrderTableMigration : MigrationBase
    {
        public CreateDefaultSortOrderTableMigration(IMigrationContext context) : base(context)
        {
        }

        protected override void Migrate()
        {
            if (!TableExists("ocPowerSortingDefaultOrder"))
            {
                Create.Table("ocPowerSortingDefaultOrder")
                    .WithColumn("Id").AsGuid().NotNullable().PrimaryKey()
                    .WithColumn("ParentId").AsGuid().NotNullable()
                    .WithColumn("ContentId").AsGuid().NotNullable()
                    .WithColumn("SortOrder").AsInt32().NotNullable()
                    .WithColumn("Created").AsDateTime().NotNullable()
                    .WithColumn("CreatedBy").AsInt32().NotNullable()
                    .WithColumn("Updated").AsDateTime().NotNullable()
                    .Do();

                // Create indexes for performance
                Create.Index("IX_ocPowerSortingDefaultOrder_ParentId")
                    .OnTable("ocPowerSortingDefaultOrder")
                    .OnColumn("ParentId")
                    .Ascending()
                    .Do();

                Create.Index("IX_ocPowerSortingDefaultOrder_ContentId")
                    .OnTable("ocPowerSortingDefaultOrder")
                    .OnColumn("ContentId")
                    .Ascending()
                    .Do();

                // Create unique index to prevent duplicate entries
                Create.Index("IX_ocPowerSortingDefaultOrder_Unique")
                    .OnTable("ocPowerSortingDefaultOrder")
                    .OnColumn("ParentId")
                    .Ascending()
                    .OnColumn("ContentId")
                    .Ascending()
                    .WithOptions()
                    .Unique()
                    .Do();
            }
        }
    }
}
