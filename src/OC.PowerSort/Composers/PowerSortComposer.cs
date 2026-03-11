using Microsoft.Extensions.DependencyInjection;
using OC.PowerSort.Interfaces;
using OC.PowerSort.Migrations;
using OC.PowerSort.NotificationHandlers;
using OC.PowerSort.Services;
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;
using Umbraco.Cms.Core.Notifications;

namespace OC.PowerSort.Composers;

public class PowerSortComposer : IComposer
{
    public void Compose(IUmbracoBuilder builder)
    {
        builder.AddNotificationAsyncHandler<UmbracoApplicationStartingNotification, MigrationComponent>();

        // Register services
        builder.Services.AddScoped<ScheduleService>();
        builder.Services.AddScoped<IScheduleService, ScheduleService>();

        // Register notification handlers
        builder.AddNotificationHandler<ContentDeletingNotification, ContentDeletingHandler>();
        builder.AddNotificationHandler<ContentMovedToRecycleBinNotification, ContentDeletingHandler>();

    }


}
