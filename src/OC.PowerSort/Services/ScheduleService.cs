using Microsoft.Extensions.Logging;
using OC.PowerSort.Interfaces;
using OC.PowerSort.Models;
using Umbraco.Cms.Infrastructure.Persistence;

namespace OC.PowerSort.Services;

/// <summary>
/// Service for managing sort schedules
/// </summary>
public class ScheduleService : IScheduleService
{
    private readonly IUmbracoDatabaseFactory _databaseFactory;
    private readonly ILogger<ScheduleService> _logger;

    public ScheduleService(
        IUmbracoDatabaseFactory databaseFactory,
        ILogger<ScheduleService> logger)
    {
        _databaseFactory = databaseFactory;
        _logger = logger;
    }

    /// <inheritdoc/>
    public void CancelSchedule(Guid contentId)
    {
        try
        {
            using var database = _databaseFactory.CreateDatabase();

            // Delete schedules where this content is the scheduled item
            var deletedCount = database.Delete<SortScheduleDto>(
                "WHERE ContentId = @0",
                contentId);

            if (deletedCount > 0)
            {
                _logger.LogInformation(
                    "Cancelled {Count} schedule(s) for content {ContentId}",
                    deletedCount, contentId);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error cancelling schedule for content {ContentId}", contentId);
        }
    }

    /// <inheritdoc/>
    public void CancelSchedulesForParent(Guid parentId)
    {
        try
        {
            using var database = _databaseFactory.CreateDatabase();

            // Delete schedules where this content is the parent
            var deletedCount = database.Delete<SortScheduleDto>(
                "WHERE ParentId = @0",
                parentId);

            if (deletedCount > 0)
            {
                _logger.LogInformation(
                    "Cancelled {Count} schedule(s) for parent {ParentId}",
                    deletedCount, parentId);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error cancelling schedules for parent {ParentId}", parentId);
        }
    }

    /// <inheritdoc/>
    public void CancelSchedulesForNodes(IEnumerable<Guid> contentIds)
    {
        try
        {
            var guidList = contentIds.ToList();
            if (!guidList.Any()) return;

            using var database = _databaseFactory.CreateDatabase();

            // Delete schedules where ContentId is in the list
            var deletedCount = database.Delete<SortScheduleDto>(
                "WHERE ContentId IN (@0)",
                guidList);

            if (deletedCount > 0)
            {
                _logger.LogInformation(
                    "Cancelled {Count} schedule(s) for {NodeCount} content nodes",
                    deletedCount, guidList.Count);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error cancelling schedules for multiple nodes");
        }
    }

    /// <inheritdoc/>
    public bool HasActiveSchedule(Guid contentId)
    {
        try
        {
            using var database = _databaseFactory.CreateDatabase();

            var now = DateTime.UtcNow;
            var count = database.ExecuteScalar<int>(
                @"SELECT COUNT(*) FROM ocPowerSortSchedule 
                  WHERE ContentId = @0 
                  AND IsActive = 1 
                  AND StartDateTime <= @1 
                  AND EndDateTime > @1",
                contentId, now);

            return count > 0;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking active schedule for content {ContentId}", contentId);
            return false;
        }
    }
}
