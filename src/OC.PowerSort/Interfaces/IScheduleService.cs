namespace OC.PowerSort.Interfaces;

public interface IScheduleService
{
    void CancelSchedule(Guid contentId);
    void CancelSchedulesForNodes(IEnumerable<Guid> contentIds);
    void CancelSchedulesForParent(Guid parentId);
    bool HasActiveSchedule(Guid contentId);
}
