using Microsoft.Extensions.Logging;
using Umbraco.Cms.Infrastructure.Migrations;

namespace OC.PowerSort.Migrations
{
    public class CreateScheduleOccurrenceTableMigration : MigrationBase
    {
        public CreateScheduleOccurrenceTableMigration(IMigrationContext context) : base(context)
        {
        }

        protected override void Migrate()
        {
            var tableName = "ocPowerSortScheduleOccurrence";
            Logger.LogInformation("OC.PowerSort: Checking if table {TableName} exists", tableName);

            if (!TableExists(tableName))
            {
                Logger.LogInformation("OC.PowerSort: Creating table {TableName}", tableName);
                
                Create.Table(tableName)
                    .WithColumn("Id").AsGuid().NotNullable().PrimaryKey("PK_ocPowerSortScheduleOccurrence")
                    .WithColumn("RecurringScheduleId").AsGuid().NotNullable()
                    .WithColumn("OccurrenceStartDate").AsDateTime().NotNullable()
                    .WithColumn("OccurrenceEndDate").AsDateTime().NotNullable()
                    .WithColumn("IsProcessed").AsBoolean().NotNullable().WithDefaultValue(false)
                    .WithColumn("IsCancelled").AsBoolean().NotNullable().WithDefaultValue(false)
                    .Do();

                Logger.LogInformation("OC.PowerSort: Table {TableName} created, now creating foreign key", tableName);

                // Create foreign key relationship - only if the target table exists
                if (TableExists("ocPowerSortRecurringSchedule"))
                {
                    try
                    {
                        Create.ForeignKey("FK_ocPowerSortScheduleOccurrence_RecurringSchedule")
                            .FromTable(tableName).ForeignColumn("RecurringScheduleId")
                            .ToTable("ocPowerSortRecurringSchedule").PrimaryColumn("Id")
                            .OnDelete(System.Data.Rule.Cascade)
                            .Do();

                        Logger.LogInformation("OC.PowerSort: Foreign key created successfully");
                    }
                    catch (Exception ex)
                    {
                        Logger.LogWarning(ex, "OC.PowerSort: Could not create foreign key, continuing anyway - {Message}", ex.Message);
                    }
                }
                else
                {
                    Logger.LogWarning("OC.PowerSort: Target table ocPowerSortRecurringSchedule does not exist, skipping foreign key creation");
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
        }
    }
}
