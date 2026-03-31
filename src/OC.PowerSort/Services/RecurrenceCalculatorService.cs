using Microsoft.Extensions.Logging;
using OC.PowerSort.Models;

namespace OC.PowerSort.Services
{
    /// <summary>
    /// Service for calculating recurring schedule occurrences
    /// </summary>
    public interface IRecurrenceCalculatorService
    {
        IEnumerable<DateTime> CalculateOccurrences(
            RecurringScheduleDto schedule,
            DateTime fromDate,
            DateTime toDate);

        DateTime? GetNextOccurrence(RecurringScheduleDto schedule, DateTime afterDate);

        string GetRecurrenceDescription(RecurringScheduleDto schedule);
    }

    public class RecurrenceCalculatorService : IRecurrenceCalculatorService
    {
        private readonly ILogger<RecurrenceCalculatorService> _logger;

        public RecurrenceCalculatorService(ILogger<RecurrenceCalculatorService> logger)
        {
            _logger = logger;
        }

        public IEnumerable<DateTime> CalculateOccurrences(
            RecurringScheduleDto schedule,
            DateTime fromDate,
            DateTime toDate)
        {
            if (!schedule.IsEnabled)
                return Enumerable.Empty<DateTime>();

            // Respect recurrence start and end dates
            var effectiveStart = fromDate < schedule.RecurrenceStart ? schedule.RecurrenceStart : fromDate;
            var effectiveEnd = schedule.RecurrenceEnd.HasValue && schedule.RecurrenceEnd < toDate
                ? schedule.RecurrenceEnd.Value
                : toDate;

            if (effectiveStart >= effectiveEnd)
                return Enumerable.Empty<DateTime>();

            var occurrences = schedule.RecurrenceType switch
            {
                "Daily" => CalculateDailyOccurrences(schedule, effectiveStart, effectiveEnd),
                "Weekly" => CalculateWeeklyOccurrences(schedule, effectiveStart, effectiveEnd),
                "Monthly" => CalculateMonthlyOccurrences(schedule, effectiveStart, effectiveEnd),
                _ => Enumerable.Empty<DateTime>()
            };

            // Apply max occurrences limit if specified
            if (schedule.MaxOccurrences.HasValue)
            {
                occurrences = occurrences.Take(schedule.MaxOccurrences.Value);
            }

            return occurrences.ToList();
        }

        public DateTime? GetNextOccurrence(RecurringScheduleDto schedule, DateTime afterDate)
        {
            var lookAheadDate = afterDate.AddYears(1); // Look ahead 1 year
            var occurrences = CalculateOccurrences(schedule, afterDate.AddMinutes(1), lookAheadDate);
            var firstOccurrence = occurrences.FirstOrDefault();
            return firstOccurrence == default ? null : firstOccurrence;
        }

        private IEnumerable<DateTime> CalculateDailyOccurrences(
            RecurringScheduleDto schedule,
            DateTime start,
            DateTime end)
        {
            var current = start.Date;
            var interval = Math.Max(1, schedule.RecurrenceInterval);

            while (current <= end)
            {
                if (current >= start)
                {
                    yield return current;
                }
                current = current.AddDays(interval);
            }
        }

        private IEnumerable<DateTime> CalculateWeeklyOccurrences(
            RecurringScheduleDto schedule,
            DateTime start,
            DateTime end)
        {
            var daysOfWeek = schedule.GetDaysOfWeekArray();
            if (daysOfWeek == null || daysOfWeek.Length == 0)
            {
                _logger.LogWarning("Weekly recurrence schedule {ScheduleId} has no days of week specified", schedule.Id);
                yield break;
            }

            var interval = Math.Max(1, schedule.RecurrenceInterval);

            // Start from the beginning of the week containing the recurrence start date
            var recurrenceStartSunday = schedule.RecurrenceStart.Date;
            while (recurrenceStartSunday.DayOfWeek != DayOfWeek.Sunday)
            {
                recurrenceStartSunday = recurrenceStartSunday.AddDays(-1);
            }

            // Calculate which week we should start evaluating from
            var evaluationStartSunday = start.Date;
            while (evaluationStartSunday.DayOfWeek != DayOfWeek.Sunday)
            {
                evaluationStartSunday = evaluationStartSunday.AddDays(-1);
            }

            // Calculate week offset from recurrence start
            var weeksDiff = (int)((evaluationStartSunday - recurrenceStartSunday).TotalDays / 7);
            var weekNumber = Math.Max(0, weeksDiff);
            var current = evaluationStartSunday;

            while (current <= end)
            {
                // Check if this week matches the interval (every nth week from recurrence start)
                if (weekNumber % interval == 0)
                {
                    foreach (var dayOfWeek in daysOfWeek.OrderBy(d => d))
                    {
                        var occurrenceDate = current.AddDays(dayOfWeek);

                        if (occurrenceDate >= start && occurrenceDate <= end &&
                            occurrenceDate >= schedule.RecurrenceStart)
                        {
                            yield return occurrenceDate;
                        }
                    }
                }

                current = current.AddDays(7);
                weekNumber++;
            }
        }

        private IEnumerable<DateTime> CalculateMonthlyOccurrences(
            RecurringScheduleDto schedule,
            DateTime start,
            DateTime end)
        {
            var interval = Math.Max(1, schedule.RecurrenceInterval);
            var current = new DateTime(start.Year, start.Month, 1);

            while (current <= end)
            {
                DateTime? occurrenceDate = null;

                if (schedule.MonthlyPattern == "DayOfMonth" && schedule.DayOfMonth.HasValue)
                {
                    // e.g., "3rd of each month"
                    occurrenceDate = GetDayOfMonthOccurrence(current, schedule.DayOfMonth.Value);
                }
                else if (schedule.MonthlyPattern == "DayOfWeek" &&
                         schedule.WeekOfMonth.HasValue &&
                         schedule.DayOfWeek.HasValue)
                {
                    // e.g., "2nd Tuesday of each month"
                    occurrenceDate = GetDayOfWeekOccurrence(
                        current,
                        schedule.WeekOfMonth.Value,
                        (DayOfWeek)schedule.DayOfWeek.Value);
                }

                if (occurrenceDate.HasValue &&
                    occurrenceDate >= start &&
                    occurrenceDate <= end &&
                    occurrenceDate >= schedule.RecurrenceStart)
                {
                    yield return occurrenceDate.Value;
                }

                current = current.AddMonths(interval);
            }
        }

        private DateTime? GetDayOfMonthOccurrence(DateTime month, int dayOfMonth)
        {
            var daysInMonth = DateTime.DaysInMonth(month.Year, month.Month);

            // Handle invalid day numbers
            if (dayOfMonth < 1 || dayOfMonth > 31)
                return null;

            // If the day doesn't exist in this month, skip this month
            if (dayOfMonth > daysInMonth)
                return null;

            return new DateTime(month.Year, month.Month, dayOfMonth);
        }

        private DateTime? GetDayOfWeekOccurrence(DateTime month, int weekOfMonth, DayOfWeek dayOfWeek)
        {
            var firstDayOfMonth = new DateTime(month.Year, month.Month, 1);
            var daysInMonth = DateTime.DaysInMonth(month.Year, month.Month);

            // Handle "last" occurrence (weekOfMonth = 5)
            if (weekOfMonth == 5)
            {
                // Start from the last day of the month and work backwards
                var lastDay = new DateTime(month.Year, month.Month, daysInMonth);
                while (lastDay.DayOfWeek != dayOfWeek)
                {
                    lastDay = lastDay.AddDays(-1);
                }
                return lastDay;
            }

            // Find the first occurrence of the target day of week
            var current = firstDayOfMonth;
            while (current.DayOfWeek != dayOfWeek)
            {
                current = current.AddDays(1);
            }

            // Add weeks to get to the nth occurrence
            current = current.AddDays((weekOfMonth - 1) * 7);

            // Verify it's still in the same month
            if (current.Month != month.Month)
                return null;

            return current;
        }

        public string GetRecurrenceDescription(RecurringScheduleDto schedule)
        {
            var parts = new List<string>();

            switch (schedule.RecurrenceType)
            {
                case "Daily":
                    if (schedule.RecurrenceInterval == 1)
                        parts.Add("Every day");
                    else
                        parts.Add($"Every {schedule.RecurrenceInterval} days");
                    break;

                case "Weekly":
                    var daysOfWeek = schedule.GetDaysOfWeekArray();
                    var dayNames = daysOfWeek.Select(d => ((DayOfWeek)d).ToString()).ToArray();

                    if (schedule.RecurrenceInterval == 1)
                        parts.Add($"Every {string.Join(", ", dayNames)}");
                    else
                        parts.Add($"Every {schedule.RecurrenceInterval} weeks on {string.Join(", ", dayNames)}");
                    break;

                case "Monthly":
                    if (schedule.MonthlyPattern == "DayOfMonth" && schedule.DayOfMonth.HasValue)
                    {
                        var suffix = GetOrdinalSuffix(schedule.DayOfMonth.Value);
                        if (schedule.RecurrenceInterval == 1)
                            parts.Add($"On the {schedule.DayOfMonth}{suffix} of each month");
                        else
                            parts.Add($"On the {schedule.DayOfMonth}{suffix} of every {schedule.RecurrenceInterval} months");
                    }
                    else if (schedule.MonthlyPattern == "DayOfWeek" &&
                             schedule.WeekOfMonth.HasValue &&
                             schedule.DayOfWeek.HasValue)
                    {
                        var weekName = schedule.WeekOfMonth.Value == 5 ? "last" : $"{schedule.WeekOfMonth}{GetOrdinalSuffix(schedule.WeekOfMonth.Value)}";
                        var dayName = ((DayOfWeek)schedule.DayOfWeek.Value).ToString();

                        if (schedule.RecurrenceInterval == 1)
                            parts.Add($"On the {weekName} {dayName} of each month");
                        else
                            parts.Add($"On the {weekName} {dayName} of every {schedule.RecurrenceInterval} months");
                    }
                    break;
            }

            parts.Add($"for {schedule.BoostDurationHours} hours");

            if (schedule.MaxOccurrences.HasValue)
            {
                parts.Add($"(maximum {schedule.MaxOccurrences} occurrences)");
            }
            else if (schedule.RecurrenceEnd.HasValue)
            {
                parts.Add($"until {schedule.RecurrenceEnd.Value:yyyy-MM-dd}");
            }
            else
            {
                parts.Add("(indefinitely)");
            }

            return string.Join(" ", parts);
        }

        private string GetOrdinalSuffix(int number)
        {
            if (number <= 0) return "";

            switch (number % 100)
            {
                case 11:
                case 12:
                case 13:
                    return "th";
            }

            switch (number % 10)
            {
                case 1: return "st";
                case 2: return "nd";
                case 3: return "rd";
                default: return "th";
            }
        }
    }
}
