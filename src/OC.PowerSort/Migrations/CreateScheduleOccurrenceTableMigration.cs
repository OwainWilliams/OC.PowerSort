using Microsoft.Extensions.Logging;
using Umbraco.Cms.Infrastructure.Migrations;

namespace OC.PowerSort.Migrations
{
    public class CreateScheduleOccurrenceTableMigration : AsyncMigrationBase
    {
        public CreateScheduleOccurrenceTableMigration(IMigrationContext context) : base(context)
        {
        }

        protected override Task MigrateAsync()
        {
            var tableName = "ocPowerSortScheduleOccurrence";
            Logger.LogInformation("OC.PowerSort: Checking if table {TableName} exists", tableName);

            // DatabaseType is a direct property on AsyncMigrationBase (NPoco.DatabaseType).
            // FluentMigrator's SQLite adapter generates ALTER TABLE ... ADD CONSTRAINT syntax for FKs,
            // which SQLite does not support and causes IncompleteMigrationExpressionException.
            var isSqlite = IsSqlite();

            if (!TableExists(tableName))
            {
                Logger.LogInformation("OC.PowerSort: Creating table {TableName}", tableName);

                Create.Table(tableName)
                    .WithColumn("Id").AsGuid().NotNullable().PrimaryKey("PK_ocPowerSortScheduleOccurrence")
                    .WithColumn("RecurringScheduleId").AsGuid().NotNullable()
                    .WithColumn("OccurrenceStartDate").AsDateTime().NotNullable()
                    .WithColumn("OccurrenceEndDate").AsDateTime().NotNullable()
                    .WithColumn("IsProcessed").AsBoolean().NotNullable().WithDefaultValue(0)
                    .WithColumn("IsCancelled").AsBoolean().NotNullable().WithDefaultValue(0)
                    .Do();

                Logger.LogInformation("OC.PowerSort: Table {TableName} created", tableName);

                // SQLite does not reliably support FK constraints via FluentMigrator — skip entirely.
                // SQLite also doesn't enforce FKs by default, so this is non-critical.
                if (!isSqlite && TableExists("ocPowerSortRecurringSchedule"))
                {
                    try
                    {
                        Create.ForeignKey("FK_ocPowerSortScheduleOccurrence_RecurringSchedule")
                            .FromTable(tableName).ForeignColumn("RecurringScheduleId")
                            .ToTable("ocPowerSortRecurringSchedule").PrimaryColumn("Id")
                            .Do();

                        Logger.LogInformation("OC.PowerSort: Foreign key created successfully");
                    }
                    catch (Exception ex)
                    {
                        Logger.LogWarning(ex, "OC.PowerSort: Could not create foreign key, continuing anyway - {Message}", ex.Message);
                    }
                }

                // Create index for performance
                try
                {
                    Create.Index("IX_ocPowerSortScheduleOccurrence_RecurringScheduleId")
                        .OnTable(tableName)
                        .OnColumn("RecurringScheduleId")
                        .Ascending()
                        .Do();

                    Logger.LogInformation("OC.PowerSort: Index created successfully");
                }
                catch (Exception ex)
                {
                    Logger.LogWarning(ex, "OC.PowerSort: Could not create index, continuing anyway - {Message}", ex.Message);
                }

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
