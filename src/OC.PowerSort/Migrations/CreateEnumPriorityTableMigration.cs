using Microsoft.Extensions.Logging;
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
            var tableName = "ocPowerSortEnumPriority";
            Logger.LogInformation("OC.PowerSort: Checking if table {TableName} exists", tableName);

            if (!TableExists(tableName))
            {
                Create.Table(tableName)
                    .WithColumn("Id").AsGuid().NotNullable().PrimaryKey("PK_ocPowerSortEnumPriority")
                    .WithColumn("Name").AsString().NotNullable()
                    .WithColumn("SortPriority").AsInt32().NotNullable()
                    .WithColumn("Created").AsDateTime().NotNullable()
                    .WithColumn("CreatedBy").AsInt32().NotNullable()
                    .WithColumn("Updated").AsDateTime().NotNullable()
                    .WithColumn("UpdatedBy").AsInt32().NotNullable()
                    .Do();
                Logger.LogInformation("OC.PowerSort: Table {TableName} created successfully", tableName);

            }
            else
            {
                Logger.LogInformation("OC.PowerSort: Table {TableName} already exists, skipping creation", tableName);
            }
        }
    }
}
