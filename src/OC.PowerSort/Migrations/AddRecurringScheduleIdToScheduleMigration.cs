using Microsoft.Extensions.Logging;
using Umbraco.Cms.Infrastructure.Migrations;

namespace OC.PowerSort.Migrations
{
    public class AddRecurringScheduleIdToScheduleMigration : MigrationBase
    {
        public AddRecurringScheduleIdToScheduleMigration(IMigrationContext context) : base(context)
        {
        }

        protected override void Migrate()
        {
            var tableName = "ocPowerSortSchedule";
            var columnName = "RecurringScheduleId";

            // DatabaseType is a direct property on AsyncMigrationBase (NPoco.DatabaseType).
            // Context.Database.DatabaseType is a different path and returns an unexpected type on Umbraco 17.
            var isSqlite = DatabaseType.GetType().Name.Contains("SQLite", StringComparison.OrdinalIgnoreCase);

            Logger.LogInformation("OC.PowerSort: Checking if column {ColumnName} exists in {TableName} (SQLite={IsSqlite})", columnName, tableName, isSqlite);

            if (!ColumnExists(tableName, columnName))
            {
                Logger.LogInformation("OC.PowerSort: Adding column {ColumnName} to {TableName}", columnName, tableName);

                if (isSqlite)
                {
                    // Alter.Table() is not supported on SQLite via FluentMigrator — it throws
                    // NotSupportedException before marking the expression complete, which causes
                    // IncompleteMigrationExpressionException even when wrapped in try-catch.
                    // Database is a direct property on AsyncMigrationBase.
                    Database.Execute($"ALTER TABLE {tableName} ADD COLUMN {columnName} TEXT NULL");
                }
                else
                {
                    Alter.Table(tableName)
                        .AddColumn(columnName).AsGuid().Nullable()
                        .Do();
                }

                Logger.LogInformation("OC.PowerSort: Column {ColumnName} added successfully", columnName);
            }
            else
            {
                Logger.LogInformation("OC.PowerSort: Column {ColumnName} already exists in {TableName}, skipping", columnName, tableName);
            }

            Logger.LogInformation("OC.PowerSort: Migration completed for {TableName}.{ColumnName}", tableName, columnName);
        }
    }
}
