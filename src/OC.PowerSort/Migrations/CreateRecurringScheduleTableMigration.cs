using Microsoft.Extensions.Logging;
using Umbraco.Cms.Infrastructure.Migrations;

namespace OC.PowerSort.Migrations
{
    public class CreateRecurringScheduleTableMigration : MigrationBase
    {
        public CreateRecurringScheduleTableMigration(IMigrationContext context) : base(context)
        {
        }

        protected override void Migrate()
        {
            var tableName = "ocPowerSortRecurringSchedule";
            Logger.LogInformation("OC.PowerSort: Checking if table {TableName} exists", tableName);

            if (!TableExists(tableName))
            {
                Create.Table(tableName)
                    .WithColumn("Id").AsGuid().NotNullable().PrimaryKey("PK_ocPowerSortRecurringSchedule")
                    .WithColumn("ContentId").AsGuid().NotNullable()
                    .WithColumn("ParentId").AsGuid().NotNullable()
                    .WithColumn("TargetPosition").AsInt32().NotNullable()
                    .WithColumn("Priority").AsInt32().NotNullable()
                    .WithColumn("RecurrenceType").AsString(50).NotNullable()
                    .WithColumn("RecurrenceInterval").AsInt32().NotNullable()
                    .WithColumn("DaysOfWeek").AsString(100).Nullable()
                    .WithColumn("MonthlyPattern").AsString(20).Nullable()
                    .WithColumn("DayOfMonth").AsInt32().Nullable()
                    .WithColumn("WeekOfMonth").AsInt32().Nullable()
                    .WithColumn("DayOfWeek").AsInt32().Nullable()
                    .WithColumn("RecurrenceStart").AsDateTime().NotNullable()
                    .WithColumn("RecurrenceEnd").AsDateTime().Nullable()
                    .WithColumn("MaxOccurrences").AsInt32().Nullable()
                    .WithColumn("BoostDurationHours").AsInt32().NotNullable()
                    .WithColumn("IsEnabled").AsBoolean().NotNullable().WithDefaultValue(1)
                    .WithColumn("Created").AsDateTime().NotNullable()
                    .WithColumn("CreatedBy").AsInt32().NotNullable()
                    .WithColumn("Modified").AsDateTime().Nullable()
                    .WithColumn("ModifiedBy").AsInt32().Nullable()
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
