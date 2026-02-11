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
    public void CancelSchedule(int contentId)
    {
        // This method is not used - schedules use Guid identifiers
        // Kept for interface compatibility
        _logger.LogWarning("CancelSchedule(int) called but schedules use Guid identifiers");
    }

    /// <summary>
    /// Cancels all schedules for a specific content node by its Guid
    /// </summary>
    public void CancelScheduleByGuid(Guid contentId)
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

    /// <summary>
    /// Cancels all schedules where the specified node is the parent
    /// </summary>
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
    public void CancelSchedulesForNodes(IEnumerable<int> contentIds)
    {
        // This method is not used - schedules use Guid identifiers
        _logger.LogWarning("CancelSchedulesForNodes(IEnumerable<int>) called but schedules use Guid identifiers");
    }

    /// <summary>
    /// Cancels all schedules for multiple content nodes by their Guids
    /// </summary>
    public void CancelSchedulesForNodesByGuid(IEnumerable<Guid> contentIds)
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
    public bool HasActiveSchedule(int contentId)
    {
        // This method is not used - schedules use Guid identifiers
        _logger.LogWarning("HasActiveSchedule(int) called but schedules use Guid identifiers");
        return false;
    }

    /// <summary>
    /// Checks if a content node has an active schedule by its Guid
    /// </summary>
    public bool HasActiveScheduleByGuid(Guid contentId)
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
