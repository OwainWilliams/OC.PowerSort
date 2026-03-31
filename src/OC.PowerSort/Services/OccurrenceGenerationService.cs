using Microsoft.Extensions.Logging;
using OC.PowerSort.Models;
using Umbraco.Cms.Infrastructure.Persistence;

namespace OC.PowerSort.Services
{
    /// <summary>
    /// Service for generating occurrences from recurring schedules
    /// </summary>
    public interface IOccurrenceGenerationService
    {
        Task GenerateUpcomingOccurrencesAsync(Guid recurringScheduleId);
        Task GenerateOccurrencesForAllActiveRecurringSchedulesAsync();
        Task<List<OccurrencePreview>> GetUpcomingOccurrencesAsync(Guid recurringScheduleId, int count = 10);
    }

    public class OccurrenceGenerationService : IOccurrenceGenerationService
    {
        private readonly ILogger<OccurrenceGenerationService> _logger;
        private readonly IUmbracoDatabaseFactory _databaseFactory;
        private readonly IRecurrenceCalculatorService _recurrenceCalculator;
        private readonly TimeSpan _generateAheadWindow = TimeSpan.FromDays(90); // Generate 90 days ahead

        public OccurrenceGenerationService(
            ILogger<OccurrenceGenerationService> logger,
            IUmbracoDatabaseFactory databaseFactory,
            IRecurrenceCalculatorService recurrenceCalculator)
        {
            _logger = logger;
            _databaseFactory = databaseFactory;
            _recurrenceCalculator = recurrenceCalculator;
        }

        public async Task GenerateUpcomingOccurrencesAsync(Guid recurringScheduleId)
        {
            await Task.Run(() =>
            {
                using var database = _databaseFactory.CreateDatabase();

                var recurringSchedule = database.SingleOrDefault<RecurringScheduleDto>(
                    "SELECT * FROM ocPowerSortRecurringSchedule WHERE Id = @0", recurringScheduleId);

                if (recurringSchedule == null)
                {
                    _logger.LogWarning("Recurring schedule {ScheduleId} not found", recurringScheduleId);
                    return;
                }

                if (!recurringSchedule.IsEnabled)
                {
                    _logger.LogInformation("Recurring schedule {ScheduleId} is disabled, skipping occurrence generation", recurringScheduleId);
                    return;
                }

                GenerateOccurrencesForSchedule(database, recurringSchedule);
            });
        }

        public async Task GenerateOccurrencesForAllActiveRecurringSchedulesAsync()
        {
            await Task.Run(() =>
            {
                using var database = _databaseFactory.CreateDatabase();

                var activeSchedules = database.Fetch<RecurringScheduleDto>(
                    "SELECT * FROM ocPowerSortRecurringSchedule WHERE IsEnabled = 1");

                _logger.LogInformation("Generating occurrences for {Count} active recurring schedules", activeSchedules.Count);

                foreach (var schedule in activeSchedules)
                {
                    try
                    {
                        GenerateOccurrencesForSchedule(database, schedule);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error generating occurrences for recurring schedule {ScheduleId}", schedule.Id);
                    }
                }
            });
        }

        public async Task<List<OccurrencePreview>> GetUpcomingOccurrencesAsync(Guid recurringScheduleId, int count = 10)
        {
            return await Task.Run(() =>
            {
                using var database = _databaseFactory.CreateDatabase();

                var recurringSchedule = database.SingleOrDefault<RecurringScheduleDto>(
                    "SELECT * FROM ocPowerSortRecurringSchedule WHERE Id = @0", recurringScheduleId);

                if (recurringSchedule == null)
                    return new List<OccurrencePreview>();

                var now = DateTime.UtcNow;
                var endDate = now.Add(_generateAheadWindow);

                // Calculate next occurrences
                var occurrenceDates = _recurrenceCalculator.CalculateOccurrences(
                    recurringSchedule, now, endDate).Take(count);

                // Get existing occurrence records
                var existingOccurrences = database.Fetch<ScheduleOccurrenceDto>(
                    "SELECT * FROM ocPowerSortScheduleOccurrence WHERE RecurringScheduleId = @0 AND OccurrenceStartDate >= @1",
                    recurringScheduleId, now);

                var previews = new List<OccurrencePreview>();

                foreach (var occurrenceDate in occurrenceDates)
                {
                    var endDate_occurrence = occurrenceDate.AddHours(recurringSchedule.BoostDurationHours);
                    var existingOccurrence = existingOccurrences.FirstOrDefault(o =>
                        o.OccurrenceStartDate.Date == occurrenceDate.Date);

                    previews.Add(new OccurrencePreview
                    {
                        StartDate = occurrenceDate,
                        EndDate = endDate_occurrence,
                        IsProcessed = existingOccurrence?.IsProcessed ?? false,
                        IsCancelled = existingOccurrence?.IsCancelled ?? false
                    });
                }

                return previews;
            });
        }

        private void GenerateOccurrencesForSchedule(
            Umbraco.Cms.Infrastructure.Persistence.IUmbracoDatabase database,
            RecurringScheduleDto schedule)
        {
            var now = DateTime.UtcNow;
            var generateUntil = now.Add(_generateAheadWindow);

            // Calculate occurrences
            var occurrenceDates = _recurrenceCalculator.CalculateOccurrences(
                schedule, now, generateUntil);

            // Get existing occurrences to avoid duplicates
            var existingOccurrences = database.Fetch<ScheduleOccurrenceDto>(
                "SELECT * FROM ocPowerSortScheduleOccurrence WHERE RecurringScheduleId = @0 AND OccurrenceStartDate >= @1",
                schedule.Id, now);

            var existingDates = existingOccurrences
                .Select(o => o.OccurrenceStartDate.Date)
                .ToHashSet();

            var newCount = 0;

            foreach (var occurrenceDate in occurrenceDates)
            {
                // Skip if already exists
                if (existingDates.Contains(occurrenceDate.Date))
                    continue;

                var occurrence = new ScheduleOccurrenceDto
                {
                    Id = Guid.NewGuid(),
                    RecurringScheduleId = schedule.Id,
                    OccurrenceStartDate = occurrenceDate,
                    OccurrenceEndDate = occurrenceDate.AddHours(schedule.BoostDurationHours),
                    IsProcessed = false,
                    IsCancelled = false
                };

                database.Insert(occurrence);
                newCount++;
            }

            if (newCount > 0)
            {
                _logger.LogInformation(
                    "Generated {Count} new occurrences for recurring schedule {ScheduleId}",
                    newCount, schedule.Id);
            }
        }
    }
}
