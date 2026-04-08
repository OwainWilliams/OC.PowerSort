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

            // FluentMigrator's SQLite adapter generates ALTER TABLE ... ADD CONSTRAINT syntax for FKs,
            // which SQLite does not support. The resulting SQL error leaves an incomplete expression
            // in the pipeline, causing IncompleteMigrationExpressionException after Migrate() returns.
            // Skip FK creation on SQLite entirely — SQLite doesn't enforce FKs by default anyway.
            if (!isSqlite && TableExists("ocPowerSortRecurringSchedule"))
            {
                try
                {
                    // Use raw SQL for SQLite compatibility - the migration builder's Alter.Table doesn't support SQLite
                    Execute.Sql($"ALTER TABLE {tableName} ADD COLUMN {columnName} TEXT;");

                    Logger.LogInformation("OC.PowerSort: Column {ColumnName} added successfully", columnName);
                }
                catch (Exception ex)
                {
                    Logger.LogWarning(ex, "OC.PowerSort: Could not add column {ColumnName}, continuing anyway", columnName);
                }
            }

            Logger.LogInformation("OC.PowerSort: Migration completed for {TableName}.{ColumnName}", tableName, columnName);
        }

        private bool ForeignKeyExists(string tableName, string foreignKeyName)
        {
            try
            {
                return Schema.Table(tableName).Constraint(foreignKeyName).Exists();
            }
            catch
            {
                return false;
            }
        }
    }
}
