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
    public class MigrationComponent : INotificationHandler<UmbracoApplicationStartingNotification>
    {
        private readonly IMigrationPlanExecutor _migrationPlanExecutor;
        private readonly ICoreScopeProvider _coreScopeProvider;
        private readonly IKeyValueService _keyValueService;
        private readonly IRuntimeState _runtimeState;

        public MigrationComponent(
            IMigrationPlanExecutor migrationPlanExecutor,
            ICoreScopeProvider coreScopeProvider,
            IKeyValueService keyValueService,
            IRuntimeState runtimeState)
        {
            _migrationPlanExecutor = migrationPlanExecutor;
            _coreScopeProvider = coreScopeProvider;
            _keyValueService = keyValueService;
            _runtimeState = runtimeState;
        }

        public void Handle(UmbracoApplicationStartingNotification notification)
        {
            if (_runtimeState.Level < RuntimeLevel.Run)
            {
                return;
            }

            var plan = new PowerSortMigrationPlan();
            var upgrader = new Upgrader(plan);

            using var scope = _coreScopeProvider.CreateCoreScope();
            upgrader.ExecuteAsync(_migrationPlanExecutor, _coreScopeProvider, _keyValueService).GetAwaiter().GetResult();
            scope.Complete();
        }
    }
}
