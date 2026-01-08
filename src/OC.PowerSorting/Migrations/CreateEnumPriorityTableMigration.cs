using System;
using System.Collections.Generic;
using System.Text;
using Umbraco.Cms.Infrastructure.Migrations;

namespace OC.PowerSorting.Migrations
{
    public class CreateEnumPriorityTableMigration : AsyncMigrationBase
    {
        public CreateEnumPriorityTableMigration(IMigrationContext context) : base(context)
        {
        }

        protected override async Task MigrateAsync()
        {
            if (!TableExists("ocPowerSortingEnumPriority"))
            {
                Create.Table("ocPowerSortingEnumPriority")
                    .WithColumn("Id").AsGuid().NotNullable().PrimaryKey()
                    .WithColumn("Name").AsString().NotNullable()
                    .WithColumn("SortPriority").AsInt32().NotNullable()
                    .WithColumn("Created").AsDateTime().NotNullable()
                    .WithColumn("CreatedBy").AsInt32().NotNullable()
                    .WithColumn("Updated").AsDateTime().NotNullable()
                    .WithColumn("UpdatedBy").AsInt32().NotNullable()
                    .Do();
            }
        }
    }
}
