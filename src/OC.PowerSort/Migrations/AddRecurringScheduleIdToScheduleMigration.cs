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

            Logger.LogInformation("OC.PowerSort: Checking if column {ColumnName} exists in {TableName}", columnName, tableName);

            if (!ColumnExists(tableName, columnName))
            {
                Logger.LogInformation("OC.PowerSort: Adding column {ColumnName} to {TableName}", columnName, tableName);

                var isSqlite = Context.Database.DatabaseType.GetType().Name
                    .Contains("SQLite", StringComparison.OrdinalIgnoreCase);

                if (isSqlite)
                {
                    // FluentMigrator's SQLite adapter does not support Alter.Table — it registers
                    // a pending expression before throwing, causing IncompleteMigrationExpressionException.
                    // SQLite natively supports ADD COLUMN via raw SQL, so use that instead.
                    Execute.Sql($"ALTER TABLE {tableName} ADD COLUMN {columnName} TEXT NULL");
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
                Logger.LogInformation("OC.PowerSort: Column {ColumnName} already exists in {TableName}, skipping column creation", columnName, tableName);
            }

            // Only create foreign key if target table exists and FK doesn't already exist
            if (TableExists("ocPowerSortRecurringSchedule"))
            {
                // Check if foreign key already exists by attempting to query the constraint
                // SQLite doesn't have a direct way to check FK existence, so we wrap in try-catch
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
            else
            {
                Logger.LogWarning("OC.PowerSort: Target table ocPowerSortRecurringSchedule does not exist yet, skipping foreign key creation. This should be created by a previous migration.");
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
