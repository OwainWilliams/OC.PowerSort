using Microsoft.Extensions.Logging;
using Umbraco.Cms.Infrastructure.Migrations;

namespace OC.PowerSort.Migrations
{
    public class AddRecurringScheduleIdToScheduleMigration : AsyncMigrationBase
    {
        public AddRecurringScheduleIdToScheduleMigration(IMigrationContext context) : base(context)
        {
        }

        protected override Task MigrateAsync()
        {
            var tableName = "ocPowerSortSchedule";
            var columnName = "RecurringScheduleId";
            var foreignKeyName = "FK_ocPowerSortSchedule_RecurringSchedule";

            // DatabaseType is a direct property on AsyncMigrationBase (NPoco.DatabaseType).
            // Context.Database.DatabaseType is a different path and returns an unexpected type on Umbraco 17.
            var isSqlite = IsSqlite();

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
            // in the pipeline, causing IncompleteMigrationExpressionException after MigrateAsync() returns.
            // Skip FK creation on SQLite entirely — SQLite doesn't enforce FKs by default anyway.
            if (!isSqlite && TableExists("ocPowerSortRecurringSchedule"))
            {
                try
                {
                    Logger.LogInformation("OC.PowerSort: Creating foreign key {ForeignKeyName}", foreignKeyName);

                    Create.ForeignKey(foreignKeyName)
                        .FromTable(tableName).ForeignColumn(columnName)
                        .ToTable("ocPowerSortRecurringSchedule").PrimaryColumn("Id")
                        .OnDelete(System.Data.Rule.SetNull)
                        .Do();

                    Logger.LogInformation("OC.PowerSort: Foreign key {ForeignKeyName} created successfully", foreignKeyName);
                }
                catch (Exception ex)
                {
                    Logger.LogWarning(ex, "OC.PowerSort: Could not create foreign key {ForeignKeyName}, continuing anyway. This is non-critical.", foreignKeyName);
                }
            }

            Logger.LogInformation("OC.PowerSort: Migration completed for {TableName}.{ColumnName}", tableName, columnName);

            return Task.CompletedTask;
        }

        private bool IsSqlite() =>
            DatabaseType.GetType().Name.Contains("SQLite", StringComparison.OrdinalIgnoreCase);
    }
}
