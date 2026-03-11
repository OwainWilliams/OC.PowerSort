using Microsoft.Extensions.Logging;
using Umbraco.Cms.Core;
using Umbraco.Cms.Core.Events;
using Umbraco.Cms.Core.Migrations;
using Umbraco.Cms.Core.Notifications;
using Umbraco.Cms.Core.Scoping;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Infrastructure.Migrations;
using Umbraco.Cms.Infrastructure.Migrations.Upgrade;

namespace OC.PowerSort.Migrations
{
    public class MigrationComponent : INotificationAsyncHandler<UmbracoApplicationStartingNotification>
    {
        private readonly IMigrationPlanExecutor _migrationPlanExecutor;
        private readonly ICoreScopeProvider _coreScopeProvider;
        private readonly IKeyValueService _keyValueService;
        private readonly IRuntimeState _runtimeState;
        private readonly ILogger<MigrationComponent> _logger;

        public MigrationComponent(
            IMigrationPlanExecutor migrationPlanExecutor,
            ICoreScopeProvider coreScopeProvider,
            IKeyValueService keyValueService,
            IRuntimeState runtimeState,
            ILogger<MigrationComponent> logger)
        {
            _migrationPlanExecutor = migrationPlanExecutor;
            _coreScopeProvider = coreScopeProvider;
            _keyValueService = keyValueService;
            _runtimeState = runtimeState;
            _logger = logger;
        }

        public async Task HandleAsync(UmbracoApplicationStartingNotification notification, CancellationToken cancellationToken)
        {
            if (_runtimeState.Level < RuntimeLevel.Run)
            {
                _logger.LogInformation("OC.PowerSort: Runtime level is {Level}, skipping migrations", _runtimeState.Level);
                return;
            }

            try
            {
                _logger.LogInformation("OC.PowerSort: Starting migration execution");

                var plan = new MigrationPlan("OC.PowerSort");

                plan.From(string.Empty)
                    .To<CreateSortScheduleTableMigration>("create-sort-schedule-table-v1")
                    .To<CreateDefaultSortOrderTableMigration>("create-default-sort-order-table-v1")
                    .To<CreateEnumPriorityTableMigration>("create-enum-priority-table-v1");


                var upgrader = new Upgrader(plan);

                await upgrader.ExecuteAsync(_migrationPlanExecutor, _coreScopeProvider, _keyValueService);

                _logger.LogInformation("OC.PowerSort: Migration execution completed successfully");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "OC.PowerSort: Error executing migrations - {Message}", ex.Message);

                // Log inner exception details
                if (ex.InnerException != null)
                {
                    _logger.LogError(ex.InnerException, "OC.PowerSort: Inner exception - {InnerMessage}", ex.InnerException.Message);
                }

            }
        }
    }

}
