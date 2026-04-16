using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using NUnit.Framework;
using OC.PowerSort.Models;
using OC.PowerSort.Services;

namespace OC.PowerSort.Tests.Services;

[TestFixture]
public class RecurrenceCalculatorServiceTests
{
    private Mock<ILogger<RecurrenceCalculatorService>> _loggerMock;
    private RecurrenceCalculatorService _service;

    [SetUp]
    public void Setup()
    {
        _loggerMock = new Mock<ILogger<RecurrenceCalculatorService>>();
        _service = new RecurrenceCalculatorService(_loggerMock.Object);
    }

    #region Daily Recurrence Tests

    [Test]
    public void CalculateOccurrences_DailyEveryDay_ShouldReturnCorrectDates()
    {
        // Arrange
        var startDate = new DateTime(2024, 1, 1); // Monday
        var schedule = new RecurringScheduleDto
        {
            Id = Guid.NewGuid(),
            RecurrenceType = "Daily",
            RecurrenceInterval = 1,
            RecurrenceStart = startDate,
            IsEnabled = true
        };

        var fromDate = startDate;
        var toDate = startDate.AddDays(5);

        // Act
        var occurrences = _service.CalculateOccurrences(schedule, fromDate, toDate).ToList();

        // Assert
        occurrences.Should().HaveCount(6); // Jan 1-6 (inclusive)
        occurrences[0].Should().Be(new DateTime(2024, 1, 1));
        occurrences[1].Should().Be(new DateTime(2024, 1, 2));
        occurrences[5].Should().Be(new DateTime(2024, 1, 6));
    }

    [Test]
    public void CalculateOccurrences_DailyEveryTwoDays_ShouldReturnCorrectDates()
    {
        // Arrange
        var startDate = new DateTime(2024, 1, 1);
        var schedule = new RecurringScheduleDto
        {
            Id = Guid.NewGuid(),
            RecurrenceType = "Daily",
            RecurrenceInterval = 2,
            RecurrenceStart = startDate,
            IsEnabled = true
        };

        var fromDate = startDate;
        var toDate = startDate.AddDays(10);

        // Act
        var occurrences = _service.CalculateOccurrences(schedule, fromDate, toDate).ToList();

        // Assert
        occurrences.Should().HaveCount(6); // Jan 1, 3, 5, 7, 9, 11
        occurrences[0].Should().Be(new DateTime(2024, 1, 1));
        occurrences[1].Should().Be(new DateTime(2024, 1, 3));
        occurrences[2].Should().Be(new DateTime(2024, 1, 5));
    }

    #endregion

    #region Weekly Recurrence Tests

    [Test]
    public void CalculateOccurrences_WeeklyMonday_ShouldReturnOnlyMondays()
    {
        // Arrange
        var startDate = new DateTime(2024, 1, 1); // Monday
        var schedule = new RecurringScheduleDto
        {
            Id = Guid.NewGuid(),
            RecurrenceType = "Weekly",
            RecurrenceInterval = 1,
            RecurrenceStart = startDate,
            IsEnabled = true
        };
        schedule.SetDaysOfWeekArray(new[] { 1 }); // Monday

        var fromDate = startDate;
        var toDate = startDate.AddDays(28); // 4 weeks

        // Act
        var occurrences = _service.CalculateOccurrences(schedule, fromDate, toDate).ToList();

        // Assert
        occurrences.Should().HaveCount(5); // 5 Mondays
        foreach (var occurrence in occurrences)
        {
            occurrence.DayOfWeek.Should().Be(DayOfWeek.Monday);
        }
        occurrences[0].Should().Be(new DateTime(2024, 1, 1)); // Jan 1
        occurrences[1].Should().Be(new DateTime(2024, 1, 8)); // Jan 8
        occurrences[4].Should().Be(new DateTime(2024, 1, 29)); // Jan 29
    }

    [Test]
    public void CalculateOccurrences_WeeklyMondayWednesdaySaturday_ShouldReturnCorrectDays()
    {
        // Arrange
        var startDate = new DateTime(2024, 1, 4); // Thursday
        var schedule = new RecurringScheduleDto
        {
            Id = Guid.NewGuid(),
            RecurrenceType = "Weekly",
            RecurrenceInterval = 1,
            RecurrenceStart = startDate,
            IsEnabled = true
        };
        schedule.SetDaysOfWeekArray(new[] { 1, 3, 6 }); // Monday, Wednesday, Saturday

        var fromDate = startDate;
        var toDate = startDate.AddDays(14); // 2 weeks

        // Act
        var occurrences = _service.CalculateOccurrences(schedule, fromDate, toDate).ToList();

        // Assert
        // Starting Thursday Jan 4:
        // Week 1 (Dec 31-Jan 6): Sat Jan 6
        // Week 2 (Jan 7-13): Mon Jan 8, Wed Jan 10, Sat Jan 13
        // Week 3 (Jan 14-20): Mon Jan 15, Wed Jan 17
        occurrences.Should().HaveCount(6);
        occurrences[0].Should().Be(new DateTime(2024, 1, 6));  // Saturday (first occurrence)
        occurrences[1].Should().Be(new DateTime(2024, 1, 8));  // Monday
        occurrences[2].Should().Be(new DateTime(2024, 1, 10)); // Wednesday
        occurrences[3].Should().Be(new DateTime(2024, 1, 13)); // Saturday
        occurrences[4].Should().Be(new DateTime(2024, 1, 15)); // Monday
        occurrences[5].Should().Be(new DateTime(2024, 1, 17)); // Wednesday
    }

    [Test]
    public void CalculateOccurrences_WeeklyEveryTwoWeeks_ShouldSkipWeeks()
    {
        // Arrange
        var startDate = new DateTime(2024, 1, 1); // Monday
        var schedule = new RecurringScheduleDto
        {
            Id = Guid.NewGuid(),
            RecurrenceType = "Weekly",
            RecurrenceInterval = 2,
            RecurrenceStart = startDate,
            IsEnabled = true
        };
        schedule.SetDaysOfWeekArray(new[] { 1, 5 }); // Monday and Friday

        var fromDate = startDate;
        var toDate = startDate.AddDays(28); // 4 weeks

        // Act
        var occurrences = _service.CalculateOccurrences(schedule, fromDate, toDate).ToList();

        // Assert
        // Week 1 (Dec 31-Jan 6): Mon Jan 1, Fri Jan 5
        // Week 2 (Jan 7-13): SKIP
        // Week 3 (Jan 14-20): Mon Jan 15, Fri Jan 19
        // Week 4 (Jan 21-27): SKIP
        // Week 5 (Jan 28-Feb 3): Mon Jan 29
        occurrences.Should().HaveCount(5);
        occurrences[0].Should().Be(new DateTime(2024, 1, 1));  // Monday week 1
        occurrences[1].Should().Be(new DateTime(2024, 1, 5));  // Friday week 1
        occurrences[2].Should().Be(new DateTime(2024, 1, 15)); // Monday week 3
        occurrences[3].Should().Be(new DateTime(2024, 1, 19)); // Friday week 3
        occurrences[4].Should().Be(new DateTime(2024, 1, 29)); // Monday week 5
    }

    [Test]
    public void CalculateOccurrences_WeeklyStartingMidWeek_ShouldIncludeRemainingDaysOfFirstWeek()
    {
        // Arrange - Create schedule on Thursday for Mon/Wed/Sat
        var startDate = new DateTime(2024, 1, 4); // Thursday
        var schedule = new RecurringScheduleDto
        {
            Id = Guid.NewGuid(),
            RecurrenceType = "Weekly",
            RecurrenceInterval = 1,
            RecurrenceStart = startDate,
            IsEnabled = true
        };
        schedule.SetDaysOfWeekArray(new[] { 1, 3, 6 }); // Monday, Wednesday, Saturday

        var fromDate = startDate;
        var toDate = startDate.AddDays(7);

        // Act
        var occurrences = _service.CalculateOccurrences(schedule, fromDate, toDate).ToList();

        // Assert
        // Thursday Jan 4 is in week of Dec 31 - Jan 6
        // Should include: Saturday Jan 6 (this week), then Mon Jan 8, Wed Jan 10 (next week)
        occurrences.Should().HaveCount(3);
        occurrences[0].Should().Be(new DateTime(2024, 1, 6));  // Saturday
        occurrences[1].Should().Be(new DateTime(2024, 1, 8));  // Monday
        occurrences[2].Should().Be(new DateTime(2024, 1, 10)); // Wednesday
    }

    [Test]
    public void CalculateOccurrences_WeeklyNoDaysSpecified_ShouldReturnEmpty()
    {
        // Arrange
        var startDate = new DateTime(2024, 1, 1);
        var schedule = new RecurringScheduleDto
        {
            Id = Guid.NewGuid(),
            RecurrenceType = "Weekly",
            RecurrenceInterval = 1,
            RecurrenceStart = startDate,
            IsEnabled = true
        };
        // No days of week set

        var fromDate = startDate;
        var toDate = startDate.AddDays(14);

        // Act
        var occurrences = _service.CalculateOccurrences(schedule, fromDate, toDate).ToList();

        // Assert
        occurrences.Should().BeEmpty();
    }

    #endregion

    #region Monthly Recurrence Tests

    [Test]
    public void CalculateOccurrences_MonthlyDayOfMonth_ShouldReturnCorrectDates()
    {
        // Arrange
        var startDate = new DateTime(2024, 1, 15);
        var schedule = new RecurringScheduleDto
        {
            Id = Guid.NewGuid(),
            RecurrenceType = "Monthly",
            RecurrenceInterval = 1,
            RecurrenceStart = startDate,
            MonthlyPattern = "DayOfMonth",
            DayOfMonth = 15,
            IsEnabled = true
        };

        var fromDate = startDate;
        var toDate = startDate.AddMonths(3);

        // Act
        var occurrences = _service.CalculateOccurrences(schedule, fromDate, toDate).ToList();

        // Assert
        occurrences.Should().HaveCount(4); // Jan 15, Feb 15, Mar 15, Apr 15
        occurrences[0].Should().Be(new DateTime(2024, 1, 15));
        occurrences[1].Should().Be(new DateTime(2024, 2, 15));
        occurrences[2].Should().Be(new DateTime(2024, 3, 15));
        occurrences[3].Should().Be(new DateTime(2024, 4, 15));
    }

    [Test]
    public void CalculateOccurrences_MonthlyDayOfMonth31_ShouldHandleShortMonths()
    {
        // Arrange
        var startDate = new DateTime(2024, 1, 31);
        var schedule = new RecurringScheduleDto
        {
            Id = Guid.NewGuid(),
            RecurrenceType = "Monthly",
            RecurrenceInterval = 1,
            RecurrenceStart = startDate,
            MonthlyPattern = "DayOfMonth",
            DayOfMonth = 31,
            IsEnabled = true
        };

        var fromDate = startDate;
        var toDate = startDate.AddMonths(3);

        // Act
        var occurrences = _service.CalculateOccurrences(schedule, fromDate, toDate).ToList();

        // Assert
        // Jan 31 (exists), Feb (skip - only 29 days in 2024), Mar 31 (exists), Apr (skip - only 30 days)
        occurrences.Should().HaveCount(2);
        occurrences[0].Should().Be(new DateTime(2024, 1, 31));
        occurrences[1].Should().Be(new DateTime(2024, 3, 31));
    }

    [Test]
    public void CalculateOccurrences_MonthlySecondTuesday_ShouldReturnCorrectDates()
    {
        // Arrange
        var startDate = new DateTime(2024, 1, 1);
        var schedule = new RecurringScheduleDto
        {
            Id = Guid.NewGuid(),
            RecurrenceType = "Monthly",
            RecurrenceInterval = 1,
            RecurrenceStart = startDate,
            MonthlyPattern = "DayOfWeek",
            WeekOfMonth = 2, // Second
            DayOfWeek = 2,   // Tuesday
            IsEnabled = true
        };

        var fromDate = startDate;
        var toDate = startDate.AddMonths(4); // Extended to get 4 occurrences

        // Act
        var occurrences = _service.CalculateOccurrences(schedule, fromDate, toDate).ToList();

        // Assert
        occurrences.Should().HaveCount(4);
        occurrences[0].Should().Be(new DateTime(2024, 1, 9));  // 2nd Tuesday of Jan
        occurrences[1].Should().Be(new DateTime(2024, 2, 13)); // 2nd Tuesday of Feb
        occurrences[2].Should().Be(new DateTime(2024, 3, 12)); // 2nd Tuesday of Mar
        occurrences[3].Should().Be(new DateTime(2024, 4, 9));  // 2nd Tuesday of Apr
    }

    [Test]
    public void CalculateOccurrences_MonthlyEveryTwoMonths_ShouldSkipMonths()
    {
        // Arrange
        var startDate = new DateTime(2024, 1, 15);
        var schedule = new RecurringScheduleDto
        {
            Id = Guid.NewGuid(),
            RecurrenceType = "Monthly",
            RecurrenceInterval = 2,
            RecurrenceStart = startDate,
            MonthlyPattern = "DayOfMonth",
            DayOfMonth = 15,
            IsEnabled = true
        };

        var fromDate = startDate;
        var toDate = startDate.AddMonths(6);

        // Act
        var occurrences = _service.CalculateOccurrences(schedule, fromDate, toDate).ToList();

        // Assert
        occurrences.Should().HaveCount(4); // Jan, Mar, May, Jul
        occurrences[0].Should().Be(new DateTime(2024, 1, 15));
        occurrences[1].Should().Be(new DateTime(2024, 3, 15));
        occurrences[2].Should().Be(new DateTime(2024, 5, 15));
        occurrences[3].Should().Be(new DateTime(2024, 7, 15));
    }

    #endregion

    #region Recurrence End Date Tests

    [Test]
    public void CalculateOccurrences_WithRecurrenceEndDate_ShouldStopAtEndDate()
    {
        // Arrange
        var startDate = new DateTime(2024, 1, 1);
        var endDate = new DateTime(2024, 1, 10);
        var schedule = new RecurringScheduleDto
        {
            Id = Guid.NewGuid(),
            RecurrenceType = "Daily",
            RecurrenceInterval = 1,
            RecurrenceStart = startDate,
            RecurrenceEnd = endDate,
            IsEnabled = true
        };

        var fromDate = startDate;
        var toDate = startDate.AddMonths(1);

        // Act
        var occurrences = _service.CalculateOccurrences(schedule, fromDate, toDate).ToList();

        // Assert
        occurrences.Should().HaveCount(10); // Jan 1-10
        occurrences.Last().Should().Be(endDate);
    }

    [Test]
    public void CalculateOccurrences_WithMaxOccurrences_ShouldLimitResults()
    {
        // Arrange
        var startDate = new DateTime(2024, 1, 1);
        var schedule = new RecurringScheduleDto
        {
            Id = Guid.NewGuid(),
            RecurrenceType = "Daily",
            RecurrenceInterval = 1,
            RecurrenceStart = startDate,
            MaxOccurrences = 5,
            IsEnabled = true
        };

        var fromDate = startDate;
        var toDate = startDate.AddMonths(1);

        // Act
        var occurrences = _service.CalculateOccurrences(schedule, fromDate, toDate).ToList();

        // Assert
        occurrences.Should().HaveCount(5);
    }

    #endregion

    #region Disabled Schedule Tests

    [Test]
    public void CalculateOccurrences_DisabledSchedule_ShouldReturnEmpty()
    {
        // Arrange
        var startDate = new DateTime(2024, 1, 1);
        var schedule = new RecurringScheduleDto
        {
            Id = Guid.NewGuid(),
            RecurrenceType = "Daily",
            RecurrenceInterval = 1,
            RecurrenceStart = startDate,
            IsEnabled = false // Disabled
        };

        var fromDate = startDate;
        var toDate = startDate.AddDays(7);

        // Act
        var occurrences = _service.CalculateOccurrences(schedule, fromDate, toDate).ToList();

        // Assert
        occurrences.Should().BeEmpty();
    }

    #endregion

    #region GetNextOccurrence Tests

    [Test]
    public void GetNextOccurrence_ShouldReturnNextDate()
    {
        // Arrange
        var startDate = new DateTime(2024, 1, 1);
        var schedule = new RecurringScheduleDto
        {
            Id = Guid.NewGuid(),
            RecurrenceType = "Daily",
            RecurrenceInterval = 1,
            RecurrenceStart = startDate,
            IsEnabled = true
        };

        var afterDate = new DateTime(2024, 1, 5);

        // Act
        var nextOccurrence = _service.GetNextOccurrence(schedule, afterDate);

        // Assert
        nextOccurrence.Should().Be(new DateTime(2024, 1, 6));
    }

    [Test]
    public void GetNextOccurrence_WeeklySchedule_ShouldReturnNextDayOfWeek()
    {
        // Arrange
        var startDate = new DateTime(2024, 1, 1); // Monday
        var schedule = new RecurringScheduleDto
        {
            Id = Guid.NewGuid(),
            RecurrenceType = "Weekly",
            RecurrenceInterval = 1,
            RecurrenceStart = startDate,
            IsEnabled = true
        };
        schedule.SetDaysOfWeekArray(new[] { 1, 3, 6 }); // Monday, Wednesday, Saturday

        var afterDate = new DateTime(2024, 1, 4); // Thursday

        // Act
        var nextOccurrence = _service.GetNextOccurrence(schedule, afterDate);

        // Assert
        nextOccurrence.Should().Be(new DateTime(2024, 1, 6)); // Next Saturday
    }

    [Test]
    public void CalculateOccurrences_ThursdayMondaySaturday_ShouldReturnCorrectDays()
    {
        // Arrange - Thursday March 28, 2024 for Monday and Saturday
        var thursday = new DateTime(2024, 3, 28); // Thursday
        var schedule = new RecurringScheduleDto
        {
            Id = Guid.NewGuid(),
            RecurrenceType = "Weekly",
            RecurrenceInterval = 1,
            RecurrenceStart = thursday,
            IsEnabled = true
        };
        schedule.SetDaysOfWeekArray(new[] { 1, 6 }); // Monday, Saturday

        var fromDate = thursday;
        var toDate = thursday.AddDays(14); // 2 weeks

        // Act
        var occurrences = _service.CalculateOccurrences(schedule, fromDate, toDate).ToList();

        // Assert
        // Week 1 (Mar 24-30): Saturday Mar 30 (Thursday is Mar 28, so Saturday is 2 days away)
        // Week 2 (Mar 31-Apr 6): Monday Apr 1, Saturday Apr 6
        // Week 3 (Apr 7-13): Monday Apr 8
        occurrences.Should().HaveCount(4);
        occurrences[0].Should().Be(new DateTime(2024, 3, 30)); // Saturday
        occurrences[0].DayOfWeek.Should().Be(DayOfWeek.Saturday);
        occurrences[1].Should().Be(new DateTime(2024, 4, 1));  // Monday
        occurrences[1].DayOfWeek.Should().Be(DayOfWeek.Monday);
        occurrences[2].Should().Be(new DateTime(2024, 4, 6));  // Saturday
        occurrences[2].DayOfWeek.Should().Be(DayOfWeek.Saturday);
        occurrences[3].Should().Be(new DateTime(2024, 4, 8));  // Monday
        occurrences[3].DayOfWeek.Should().Be(DayOfWeek.Monday);
    }

    [Test]
    public void GetNextOccurrence_ThursdayMondaySaturday_ShouldReturnSaturday()
    {
        // Arrange - This matches the user's exact scenario
        var thursday = new DateTime(2024, 3, 28); // Thursday March 28, 2024
        var schedule = new RecurringScheduleDto
        {
            Id = Guid.NewGuid(),
            RecurrenceType = "Weekly",
            RecurrenceInterval = 1,
            RecurrenceStart = thursday,
            IsEnabled = true
        };
        schedule.SetDaysOfWeekArray(new[] { 1, 6 }); // Monday, Saturday

        // Act - Call from Thursday
        var nextOccurrence = _service.GetNextOccurrence(schedule, thursday);

        // Assert - Should be Saturday (2 days from Thursday), not Friday
        nextOccurrence.Should().Be(new DateTime(2024, 3, 30)); // Saturday March 30
        nextOccurrence.Value.DayOfWeek.Should().Be(DayOfWeek.Saturday);
    }

    [Test]
    public void GetNextOccurrence_NoFutureOccurrences_ShouldReturnNull()
    {
        // Arrange
        var startDate = new DateTime(2024, 1, 1);
        var schedule = new RecurringScheduleDto
        {
            Id = Guid.NewGuid(),
            RecurrenceType = "Daily",
            RecurrenceInterval = 1,
            RecurrenceStart = startDate,
            RecurrenceEnd = new DateTime(2024, 1, 10),
            IsEnabled = true
        };

        var afterDate = new DateTime(2024, 1, 15); // After end date

        // Act
        var nextOccurrence = _service.GetNextOccurrence(schedule, afterDate);

        // Assert
        nextOccurrence.Should().BeNull();
    }

    #endregion

    #region GetRecurrenceDescription Tests

    [Test]
    public void GetRecurrenceDescription_DailyEveryDay_ShouldReturnCorrectDescription()
    {
        // Arrange
        var schedule = new RecurringScheduleDto
        {
            RecurrenceType = "Daily",
            RecurrenceInterval = 1,
            BoostDurationHours = 24
        };

        // Act
        var description = _service.GetRecurrenceDescription(schedule);

        // Assert
        description.Should().Be("Every day for 24 hours (indefinitely)");
    }

    [Test]
    public void GetRecurrenceDescription_DailyEveryTwoDays_ShouldReturnCorrectDescription()
    {
        // Arrange
        var schedule = new RecurringScheduleDto
        {
            RecurrenceType = "Daily",
            RecurrenceInterval = 2,
            BoostDurationHours = 12
        };

        // Act
        var description = _service.GetRecurrenceDescription(schedule);

        // Assert
        description.Should().Be("Every 2 days for 12 hours (indefinitely)");
    }

    [Test]
    public void GetRecurrenceDescription_WeeklyMonday_ShouldReturnCorrectDescription()
    {
        // Arrange
        var schedule = new RecurringScheduleDto
        {
            RecurrenceType = "Weekly",
            RecurrenceInterval = 1,
            BoostDurationHours = 24
        };
        schedule.SetDaysOfWeekArray(new[] { 1 });

        // Act
        var description = _service.GetRecurrenceDescription(schedule);

        // Assert
        description.Should().Be("Every Monday for 24 hours (indefinitely)");
    }

    [Test]
    public void GetRecurrenceDescription_WeeklyMultipleDays_ShouldReturnCorrectDescription()
    {
        // Arrange
        var schedule = new RecurringScheduleDto
        {
            RecurrenceType = "Weekly",
            RecurrenceInterval = 1,
            BoostDurationHours = 48
        };
        schedule.SetDaysOfWeekArray(new[] { 1, 3, 5 });

        // Act
        var description = _service.GetRecurrenceDescription(schedule);

        // Assert
        description.Should().Be("Every Monday, Wednesday, Friday for 48 hours (indefinitely)");
    }

    #endregion

    #region Edge Cases

    [Test]
    public void CalculateOccurrences_StartDateAfterEvaluationPeriod_ShouldReturnEmpty()
    {
        // Arrange
        var startDate = new DateTime(2024, 2, 1);
        var schedule = new RecurringScheduleDto
        {
            Id = Guid.NewGuid(),
            RecurrenceType = "Daily",
            RecurrenceInterval = 1,
            RecurrenceStart = startDate,
            IsEnabled = true
        };

        var fromDate = new DateTime(2024, 1, 1);
        var toDate = new DateTime(2024, 1, 15);

        // Act
        var occurrences = _service.CalculateOccurrences(schedule, fromDate, toDate).ToList();

        // Assert
        occurrences.Should().BeEmpty();
    }

    [Test]
    public void CalculateOccurrences_WeeklyAllDaysSelected_ShouldReturnAllDaysOfWeek()
    {
        // Arrange
        var startDate = new DateTime(2024, 1, 1); // Monday
        var schedule = new RecurringScheduleDto
        {
            Id = Guid.NewGuid(),
            RecurrenceType = "Weekly",
            RecurrenceInterval = 1,
            RecurrenceStart = startDate,
            IsEnabled = true
        };
        schedule.SetDaysOfWeekArray(new[] { 0, 1, 2, 3, 4, 5, 6 }); // All days

        var fromDate = startDate;
        var toDate = startDate.AddDays(7);

        // Act
        var occurrences = _service.CalculateOccurrences(schedule, fromDate, toDate).ToList();

        // Assert
        occurrences.Should().HaveCount(8); // 8 days (Jan 1-8 inclusive)
    }

    #endregion
}
