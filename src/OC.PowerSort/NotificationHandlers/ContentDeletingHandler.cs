using OC.PowerSort.Interfaces;
using Umbraco.Cms.Core.Events;
using Umbraco.Cms.Core.Notifications;
using Umbraco.Cms.Core.Services;

namespace OC.PowerSort.NotificationHandlers;

public class ContentDeletingHandler : 
    INotificationHandler<ContentDeletingNotification>,
    INotificationHandler<ContentMovedToRecycleBinNotification>
{
    private readonly IContentService _contentService;
    private readonly IScheduleService _scheduleService;

    public ContentDeletingHandler(
        IContentService contentService,
        IScheduleService scheduleService)
    {
        _contentService = contentService;
        _scheduleService = scheduleService;
    }

    /// <summary>
    /// Handles permanent deletion of content
    /// </summary>
    public void Handle(ContentDeletingNotification notification)
    {
        foreach (var content in notification.DeletedEntities)
        {
            CancelSchedulesForNodeAndDescendants(content.Id, content.Key);
        }
    }

    /// <summary>
    /// Handles content moved to recycle bin (normal delete operation)
    /// </summary>
    public void Handle(ContentMovedToRecycleBinNotification notification)
    {
        foreach (var moveInfo in notification.MoveInfoCollection)
        {
            CancelSchedulesForNodeAndDescendants(moveInfo.Entity.Id, moveInfo.Entity.Key);
        }
    }

    private void CancelSchedulesForNodeAndDescendants(int contentId, Guid contentKey)
    {
        // Cancel any schedules where this node is the parent (schedules for its children)
        _scheduleService.CancelSchedulesForParent(contentKey);

        // Get all descendants of the node being deleted
        var descendants = _contentService.GetPagedDescendants(
            contentId,
            0,
            int.MaxValue,
            out _);

        // Collect all descendant Guids
        var descendantGuids = descendants.Select(d => d.Key).ToList();

        // Cancel schedules for all descendants (where they are the ContentId)
        if (descendantGuids.Count > 0)
        {
            _scheduleService.CancelSchedulesForNodes(descendantGuids);

            // Also cancel schedules where any descendant is the parent
            foreach (var descendantGuid in descendantGuids)
            {
                _scheduleService.CancelSchedulesForParent(descendantGuid);
            }
        }

        // Cancel schedules for the deleted node itself
        _scheduleService.CancelSchedule(contentKey);
    }
}
