using Microsoft.Extensions.Logging;
using Umbraco.Cms.Infrastructure.Migrations;

namespace OC.PowerSort.Migrations
{
    public class CreateEnumPriorityTableMigration : AsyncMigrationBase
    {
        public CreateEnumPriorityTableMigration(IMigrationContext context) : base(context)
        {
        }

        protected override Task MigrateAsync()
        {
            var tableName = "ocPowerSortEnumPriority";
            Logger.LogInformation("OC.PowerSort: Checking if table {TableName} exists", tableName);

            if (!TableExists(tableName))
            {
                Create.Table(tableName)
                    .WithColumn("Id").AsGuid().NotNullable().PrimaryKey("PK_ocPowerSortEnumPriority")
                    .WithColumn("Name").AsString(255).NotNullable()
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

            return Task.CompletedTask;
        }

        private bool IsSqlite() =>
            DatabaseType.GetType().Name.Contains("SQLite", StringComparison.OrdinalIgnoreCase);

        private bool TableExists(string tableName)
        {
            if (IsSqlite())
                return Database.ExecuteScalar<int>("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=@0", tableName) > 0;
            return Database.ExecuteScalar<int>("SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME=@0", tableName) > 0;
        }
    }
}
