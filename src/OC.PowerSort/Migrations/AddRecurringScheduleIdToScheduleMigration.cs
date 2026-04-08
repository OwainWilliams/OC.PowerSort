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
            var foreignKeyName = "FK_ocPowerSortSchedule_RecurringSchedule";

            // Detect SQLite upfront — FluentMigrator's SQLite adapter throws NotSupportedException
            // from inside builder .Do() calls (before the expression is marked complete), which
            // causes IncompleteMigrationExpressionException even when wrapped in try-catch.
            var isSqlite = Context.Database.DatabaseType.GetType().Name
                .Contains("SQLite", StringComparison.OrdinalIgnoreCase);

            Logger.LogInformation("OC.PowerSort: Checking if column {ColumnName} exists in {TableName} (SQLite={IsSqlite})", columnName, tableName, isSqlite);

            if (!ColumnExists(tableName, columnName))
            {
                Logger.LogInformation("OC.PowerSort: Adding column {ColumnName} to {TableName}", columnName, tableName);

                if (isSqlite)
                {
                    // Alter.Table() is not supported on SQLite via FluentMigrator.
                    // Use the database connection directly to bypass the expression pipeline.
                    Context.Database.Execute($"ALTER TABLE {tableName} ADD COLUMN {columnName} TEXT NULL");
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

            // SQLite does not reliably support FK constraints via FluentMigrator — skip entirely.
            // SQLite also doesn't enforce FKs by default, so this is non-critical.
            if (!isSqlite && TableExists("ocPowerSortRecurringSchedule"))
            {
                try
                {
                    if (!ForeignKeyExists(tableName, foreignKeyName))
                    {
                        Logger.LogInformation("OC.PowerSort: Creating foreign key {ForeignKeyName}", foreignKeyName);

                        Create.ForeignKey(foreignKeyName)
                            .FromTable(tableName).ForeignColumn(columnName)
                            .ToTable("ocPowerSortRecurringSchedule").PrimaryColumn("Id")
                            .OnDelete(System.Data.Rule.SetNull)
                            .Do();

                        Logger.LogInformation("OC.PowerSort: Foreign key {ForeignKeyName} created successfully", foreignKeyName);
                    }
                    else
                    {
                        Logger.LogInformation("OC.PowerSort: Foreign key {ForeignKeyName} already exists, skipping", foreignKeyName);
                    }
                }
                catch (Exception ex)
                {
                    Logger.LogWarning(ex, "OC.PowerSort: Could not create foreign key {ForeignKeyName}, continuing anyway. This is non-critical.", foreignKeyName);
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
