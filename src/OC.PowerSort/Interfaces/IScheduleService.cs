namespace OC.PowerSort.Interfaces;

public interface IScheduleService
{
    public void CancelSchedule(int contentId);
    public void CancelSchedulesForNodes(IEnumerable<int> contentIds);
    public bool HasActiveSchedule(int contentId);
}
