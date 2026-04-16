using Microsoft.Extensions.Logging;
using Umbraco.Cms.Infrastructure.Migrations;

namespace OC.PowerSort.Migrations
{
    public class CreateSortScheduleTableMigration : AsyncMigrationBase
    {
        public CreateSortScheduleTableMigration(IMigrationContext context) : base(context)
        {
        }

        protected override Task MigrateAsync()
        {
            var tableName = "ocPowerSortSchedule";
            Logger.LogInformation("OC.PowerSort: Checking if table {TableName} exists", tableName);

            if (!TableExists(tableName))
            {
                Create.Table(tableName)
                    .WithColumn("Id").AsGuid().NotNullable().PrimaryKey("PK_ocPowerSortSchedule")
                    .WithColumn("ContentId").AsGuid().NotNullable()
                    .WithColumn("ParentId").AsGuid().NotNullable()
                    .WithColumn("TargetPosition").AsInt32().NotNullable()
                    .WithColumn("StartDateTime").AsDateTime().NotNullable()
                    .WithColumn("EndDateTime").AsDateTime().NotNullable()
                    .WithColumn("IsActive").AsBoolean().NotNullable().WithDefaultValue(0)
                    .WithColumn("Priority").AsInt32().NotNullable().WithDefaultValue(0)
                    .WithColumn("Created").AsDateTime().NotNullable()
                    .WithColumn("CreatedBy").AsInt32().NotNullable()
                    .WithColumn("RecurringScheduleId").AsGuid().Nullable()
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
