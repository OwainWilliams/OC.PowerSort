using Microsoft.Extensions.Logging;
using Umbraco.Cms.Infrastructure.Migrations;

namespace OC.PowerSort.Migrations
{
    public class CreateScheduleOccurrenceTableMigration : AsyncMigrationBase
    {
        public CreateScheduleOccurrenceTableMigration(IMigrationContext context) : base(context)
        {
        }

        protected override async Task MigrateAsync()
        {
            var tableName = "ocPowerSortScheduleOccurrence";
            Logger.LogInformation("OC.PowerSort: Checking if table {TableName} exists", tableName);

            if (!TableExists(tableName))
            {
                Create.Table(tableName)
                    .WithColumn("Id").AsGuid().NotNullable().PrimaryKey("PK_ocPowerSortScheduleOccurrence")
                    .WithColumn("RecurringScheduleId").AsGuid().NotNullable()
                    .WithColumn("OccurrenceStartDate").AsDateTime().NotNullable()
                    .WithColumn("OccurrenceEndDate").AsDateTime().NotNullable()
                    .WithColumn("IsProcessed").AsBoolean().NotNullable().WithDefaultValue(false)
                    .WithColumn("IsCancelled").AsBoolean().NotNullable().WithDefaultValue(false)
                    .Do();

                // Create foreign key relationship
                Create.ForeignKey("FK_ocPowerSortScheduleOccurrence_RecurringSchedule")
                    .FromTable(tableName).ForeignColumn("RecurringScheduleId")
                    .ToTable("ocPowerSortRecurringSchedule").PrimaryColumn("Id")
                    .OnDelete(System.Data.Rule.Cascade)
                    .Do();

                // Create index for performance
                Create.Index("IX_ocPowerSortScheduleOccurrence_RecurringScheduleId")
                    .OnTable(tableName)
                    .OnColumn("RecurringScheduleId")
                    .Ascending()
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
