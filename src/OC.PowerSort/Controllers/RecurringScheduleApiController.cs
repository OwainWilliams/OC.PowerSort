using Asp.Versioning;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using OC.PowerSort.Controllers.Base;
using OC.PowerSort.Models;
using OC.PowerSort.Services;
using Umbraco.Cms.Api.Management.Routing;
using Umbraco.Cms.Core.Security;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Infrastructure.Persistence;

namespace OC.PowerSort.Controllers
{
    [ApiVersion("1.0")]
    [VersionedApiBackOfficeRoute("oc/power-sort")]
    [ApiExplorerSettings(GroupName = Constants.ApiName)]
    public class RecurringScheduleApiController : PowerSortControllerBase
    {
        private readonly IRecurrenceCalculatorService _recurrenceCalculator;
        private readonly IOccurrenceGenerationService _occurrenceGenerator;

        public RecurringScheduleApiController(
            IBackOfficeSecurityAccessor backOfficeSecurityAccessor,
            IUmbracoDatabaseFactory databaseFactory,
            IContentService contentService,
            IUserService userService,
            IRecurrenceCalculatorService recurrenceCalculator,
            IOccurrenceGenerationService occurrenceGenerator)
            : base(backOfficeSecurityAccessor, databaseFactory, contentService, userService)
        {
            _recurrenceCalculator = recurrenceCalculator;
            _occurrenceGenerator = occurrenceGenerator;
        }

        [HttpGet("recurring-schedules")]
        [ProducesResponseType<RecurringScheduleListResponse>(StatusCodes.Status200OK)]
        public IActionResult GetRecurringSchedules([FromQuery] Guid? parentId = null, [FromQuery] bool enabledOnly = false)
        {
            return ExecuteDatabaseOperation(database =>
            {
                var sql = "SELECT * FROM ocPowerSortRecurringSchedule WHERE 1=1";
                var args = new List<object>();

                if (parentId.HasValue)
                {
                    sql += " AND ParentId = @0";
                    args.Add(parentId.Value);
                }

                if (enabledOnly)
                {
                    sql += " AND IsEnabled = 1";
                }

                sql += " ORDER BY Created DESC";

                var schedules = database.Fetch<RecurringScheduleDto>(sql, args.ToArray());

                var items = schedules.Select(s => BuildRecurringScheduleResponse(s, false)).ToList();

                return new RecurringScheduleListResponse
                {
                    Total = items.Count,
                    Items = items
                };
            });
        }

        [HttpGet("recurring-schedules/{id:guid}")]
        [ProducesResponseType<RecurringScheduleResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public IActionResult GetRecurringSchedule(Guid id)
        {
            return ExecuteDatabaseOperation(database =>
            {
                var schedule = database.SingleOrDefault<RecurringScheduleDto>(
                    "SELECT * FROM ocPowerSortRecurringSchedule WHERE Id = @0", id);

                if (schedule == null)
                {
                    throw new KeyNotFoundException("Recurring schedule not found");
                }

                return BuildRecurringScheduleResponse(schedule, true);
            });
        }

        [HttpGet("recurring-schedules/{id:guid}/debug")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public IActionResult GetRecurringScheduleDebug(Guid id)
        {
            return ExecuteDatabaseOperation(database =>
            {
                var schedule = database.SingleOrDefault<RecurringScheduleDto>(
                    "SELECT * FROM ocPowerSortRecurringSchedule WHERE Id = @0", id);

                if (schedule == null)
                {
                    throw new KeyNotFoundException("Recurring schedule not found");
                }

                var daysOfWeekArray = schedule.GetDaysOfWeekArray();
                var nextOccurrence = _recurrenceCalculator.GetNextOccurrence(schedule, DateTime.UtcNow);
                var upcomingOccurrences = _occurrenceGenerator.GetUpcomingOccurrencesAsync(schedule.Id, 5).Result;

                return new
                {
                    scheduleId = schedule.Id,
                    recurrenceType = schedule.RecurrenceType,
                    recurrenceInterval = schedule.RecurrenceInterval,
                    recurrenceStart = schedule.RecurrenceStart,
                    daysOfWeekJson = schedule.DaysOfWeek,  // Raw JSON string
                    daysOfWeekArray = daysOfWeekArray,      // Parsed array
                    daysOfWeekDisplay = daysOfWeekArray.Select(d => ((DayOfWeek)d).ToString()).ToArray(),
                    currentTime = DateTime.UtcNow,
                    nextOccurrence = nextOccurrence,
                    upcomingOccurrences = upcomingOccurrences
                };
            });
        }

        [HttpPost("recurring-schedules")]
        [ProducesResponseType<RecurringScheduleResponse>(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> CreateRecurringSchedule([FromBody] CreateRecurringScheduleRequest request)
        {
            var authResult = ValidateUserAccess(out var userId);
            if (authResult != null)
                return authResult;

            // Validation
            var positionValidation = ValidateTargetPosition(request.TargetPosition);
            if (positionValidation != null)
                return positionValidation;

            var patternValidation = ValidateRecurrencePattern(request.Pattern);
            if (patternValidation != null)
                return patternValidation;

            // Verify content exists and relationship
            var contentValidation = ValidateContentExists(request.ContentId, out var content);
            if (contentValidation != null)
                return contentValidation;

            var parentValidation = ValidateContentExists(request.ParentId, out var parent, "Parent not found");
            if (parentValidation != null)
                return parentValidation;

            var relationshipValidation = ValidateParentChildRelationship(content!, request.ParentId);
            if (relationshipValidation != null)
                return relationshipValidation;

            if (request.BoostDurationHours <= 0)
            {
                return BadRequest(new { error = "Boost duration must be greater than 0" });
            }

            try
            {
                using var database = databaseFactory.CreateDatabase();
                
                var schedule = new RecurringScheduleDto
                {
                    Id = Guid.NewGuid(),
                    ContentId = request.ContentId,
                    ParentId = request.ParentId,
                    TargetPosition = request.TargetPosition,
                    Priority = request.Priority,
                    RecurrenceType = request.Pattern.Type.ToString(),
                    RecurrenceInterval = request.Pattern.Interval,
                    RecurrenceStart = request.Pattern.StartDate,
                    RecurrenceEnd = request.Pattern.EndDate,
                    MaxOccurrences = request.Pattern.MaxOccurrences,
                    BoostDurationHours = request.BoostDurationHours,
                    IsEnabled = true,
                    Created = DateTime.UtcNow,
                    CreatedBy = userId
                };

                // Set pattern-specific fields
                if (request.Pattern.Type == RecurrenceType.Weekly && request.Pattern.DaysOfWeek != null)
                {
                    schedule.SetDaysOfWeekArray(request.Pattern.DaysOfWeek);
                }
                else if (request.Pattern.Type == RecurrenceType.Monthly && request.Pattern.MonthlyPattern != null)
                {
                    schedule.MonthlyPattern = request.Pattern.MonthlyPattern.Type.ToString();
                    schedule.DayOfMonth = request.Pattern.MonthlyPattern.DayOfMonth;
                    schedule.WeekOfMonth = request.Pattern.MonthlyPattern.WeekOfMonth;
                    schedule.DayOfWeek = request.Pattern.MonthlyPattern.DayOfWeek;
                }

                database.Insert(schedule);

                // Generate initial occurrences
                await _occurrenceGenerator.GenerateUpcomingOccurrencesAsync(schedule.Id);

                var response = BuildRecurringScheduleResponse(schedule, true);
                return CreatedAtAction(nameof(GetRecurringSchedule), new { id = schedule.Id }, response);
            }
            catch (Exception ex)
            {
                return HandleException(ex);
            }
        }

        [HttpPut("recurring-schedules/{id:guid}")]
        [ProducesResponseType<RecurringScheduleResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdateRecurringSchedule(Guid id, [FromBody] UpdateRecurringScheduleRequest request)
        {
            var authResult = ValidateUserAccess(out var userId);
            if (authResult != null)
                return authResult;

            // Validation
            var positionValidation = ValidateTargetPosition(request.TargetPosition);
            if (positionValidation != null)
                return positionValidation;

            var patternValidation = ValidateRecurrencePattern(request.Pattern);
            if (patternValidation != null)
                return patternValidation;

            if (request.BoostDurationHours <= 0)
            {
                return BadRequest(new { error = "Boost duration must be greater than 0" });
            }

            try
            {
                using var database = databaseFactory.CreateDatabase();

                var schedule = database.SingleOrDefault<RecurringScheduleDto>(
                    "SELECT * FROM ocPowerSortRecurringSchedule WHERE Id = @0", id);

                if (schedule == null)
                {
                    return NotFound(new { error = "Recurring schedule not found" });
                }

                schedule.TargetPosition = request.TargetPosition;
                schedule.Priority = request.Priority;
                schedule.RecurrenceType = request.Pattern.Type.ToString();
                schedule.RecurrenceInterval = request.Pattern.Interval;
                schedule.RecurrenceStart = request.Pattern.StartDate;
                schedule.RecurrenceEnd = request.Pattern.EndDate;
                schedule.MaxOccurrences = request.Pattern.MaxOccurrences;
                schedule.BoostDurationHours = request.BoostDurationHours;
                schedule.IsEnabled = request.IsEnabled;
                schedule.Modified = DateTime.UtcNow;
                schedule.ModifiedBy = userId;

                // Set pattern-specific fields
                if (request.Pattern.Type == RecurrenceType.Weekly && request.Pattern.DaysOfWeek != null)
                {
                    schedule.SetDaysOfWeekArray(request.Pattern.DaysOfWeek);
                }
                else if (request.Pattern.Type == RecurrenceType.Monthly && request.Pattern.MonthlyPattern != null)
                {
                    schedule.MonthlyPattern = request.Pattern.MonthlyPattern.Type.ToString();
                    schedule.DayOfMonth = request.Pattern.MonthlyPattern.DayOfMonth;
                    schedule.WeekOfMonth = request.Pattern.MonthlyPattern.WeekOfMonth;
                    schedule.DayOfWeek = request.Pattern.MonthlyPattern.DayOfWeek;
                }

                database.Update(schedule);

                // Delete future unprocessed occurrences and regenerate
                database.Execute(
                    @"DELETE FROM ocPowerSortScheduleOccurrence 
                      WHERE RecurringScheduleId = @0 
                      AND IsProcessed = 0 
                      AND OccurrenceStartDate > @1",
                    id, DateTime.UtcNow);

                await _occurrenceGenerator.GenerateUpcomingOccurrencesAsync(schedule.Id);

                return Ok(BuildRecurringScheduleResponse(schedule, true));
            }
            catch (Exception ex)
            {
                return HandleException(ex);
            }
        }

        [HttpDelete("recurring-schedules/{id:guid}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public IActionResult DeleteRecurringSchedule(Guid id)
        {
            return ExecuteDatabaseOperation(database =>
            {
                var schedule = database.SingleOrDefault<RecurringScheduleDto>(
                    "SELECT * FROM ocPowerSortRecurringSchedule WHERE Id = @0", id);

                if (schedule == null)
                {
                    throw new KeyNotFoundException("Recurring schedule not found");
                }

                // Delete will cascade to occurrences and set null on one-time schedules
                database.Delete(schedule);
                
                return new { success = true };
            });
        }

        [HttpGet("recurring-schedules/{id:guid}/preview")]
        [ProducesResponseType<List<OccurrencePreview>>(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> PreviewOccurrences(Guid id, [FromQuery] int count = 10)
        {
            var authResult = ValidateUserAccess(out _);
            if (authResult != null)
                return authResult;

            try
            {
                var previews = await _occurrenceGenerator.GetUpcomingOccurrencesAsync(id, count);

                if (!previews.Any())
                {
                    using var database = databaseFactory.CreateDatabase();
                    var schedule = database.SingleOrDefault<RecurringScheduleDto>(
                        "SELECT * FROM ocPowerSortRecurringSchedule WHERE Id = @0", id);

                    if (schedule == null)
                    {
                        return NotFound(new { error = "Recurring schedule not found" });
                    }
                }

                return Ok(previews);
            }
            catch (Exception ex)
            {
                return HandleException(ex);
            }
        }

        [HttpPost("recurring-schedules/{id:guid}/cancel-occurrence")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public IActionResult CancelOccurrence(Guid id, [FromBody] CancelOccurrenceRequest request)
        {
            return ExecuteDatabaseOperation(database =>
            {
                var occurrence = database.SingleOrDefault<ScheduleOccurrenceDto>(
                    @"SELECT * FROM ocPowerSortScheduleOccurrence 
                      WHERE RecurringScheduleId = @0 
                      AND OccurrenceStartDate >= @1 
                      AND OccurrenceStartDate < @2",
                    id, request.OccurrenceDate.Date, request.OccurrenceDate.Date.AddDays(1));

                if (occurrence == null)
                {
                    throw new KeyNotFoundException("Occurrence not found");
                }

                occurrence.IsCancelled = true;
                database.Update(occurrence);

                return new { success = true, message = "Occurrence cancelled successfully" };
            });
        }

        [HttpPost("recurring-schedules/{id:guid}/toggle")]
        [ProducesResponseType<RecurringScheduleResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public IActionResult ToggleRecurringSchedule(Guid id)
        {
            return ExecuteDatabaseOperation(database =>
            {
                var schedule = database.SingleOrDefault<RecurringScheduleDto>(
                    "SELECT * FROM ocPowerSortRecurringSchedule WHERE Id = @0", id);

                if (schedule == null)
                {
                    throw new KeyNotFoundException("Recurring schedule not found");
                }

                schedule.IsEnabled = !schedule.IsEnabled;
                database.Update(schedule);

                return BuildRecurringScheduleResponse(schedule, false);
            });
        }

        private RecurringScheduleResponse BuildRecurringScheduleResponse(RecurringScheduleDto schedule, bool includeOccurrences)
        {
            var content = contentService.GetById(schedule.ContentId);
            var parent = contentService.GetById(schedule.ParentId);
            var creator = userService.GetUserById(schedule.CreatedBy);
            var modifier = schedule.ModifiedBy.HasValue ? userService.GetUserById(schedule.ModifiedBy.Value) : null;

            var response = new RecurringScheduleResponse
            {
                Id = schedule.Id,
                ContentId = schedule.ContentId,
                ContentName = content?.Name ?? "Unknown",
                ParentId = schedule.ParentId,
                ParentName = parent?.Name ?? "Unknown",
                TargetPosition = schedule.TargetPosition,
                Priority = schedule.Priority,
                BoostDurationHours = schedule.BoostDurationHours,
                IsEnabled = schedule.IsEnabled,
                Created = schedule.Created,
                CreatedByName = creator?.Name ?? "Unknown",
                Modified = schedule.Modified,
                ModifiedByName = modifier?.Name,
                Pattern = BuildRecurrencePatternResponse(schedule)
            };

            // Get next occurrence
            response.NextOccurrence = _recurrenceCalculator.GetNextOccurrence(schedule, DateTime.UtcNow);

            // Include upcoming occurrences if requested
            if (includeOccurrences)
            {
                response.UpcomingOccurrences = _occurrenceGenerator
                    .GetUpcomingOccurrencesAsync(schedule.Id, 10)
                    .Result;
            }

            return response;
        }

        private RecurrencePatternResponse BuildRecurrencePatternResponse(RecurringScheduleDto schedule)
        {
            var pattern = new RecurrencePatternResponse
            {
                Type = Enum.Parse<RecurrenceType>(schedule.RecurrenceType),
                TypeDisplay = schedule.RecurrenceType,
                Interval = schedule.RecurrenceInterval,
                StartDate = schedule.RecurrenceStart,
                EndDate = schedule.RecurrenceEnd,
                MaxOccurrences = schedule.MaxOccurrences,
                Description = _recurrenceCalculator.GetRecurrenceDescription(schedule)
            };

            if (schedule.RecurrenceType == "Weekly")
            {
                pattern.DaysOfWeek = schedule.GetDaysOfWeekArray();
                pattern.DaysOfWeekDisplay = pattern.DaysOfWeek
                    .Select(d => ((DayOfWeek)d).ToString())
                    .ToArray();
            }
            else if (schedule.RecurrenceType == "Monthly" && !string.IsNullOrEmpty(schedule.MonthlyPattern))
            {
                pattern.MonthlyPattern = new MonthlyPatternResponse
                {
                    Type = Enum.Parse<MonthlyPatternType>(schedule.MonthlyPattern),
                    DayOfMonth = schedule.DayOfMonth,
                    WeekOfMonth = schedule.WeekOfMonth,
                    DayOfWeek = schedule.DayOfWeek,
                    Description = GetMonthlyPatternDescription(schedule)
                };
            }

            return pattern;
        }

        private string GetMonthlyPatternDescription(RecurringScheduleDto schedule)
        {
            if (schedule.MonthlyPattern == "DayOfMonth" && schedule.DayOfMonth.HasValue)
            {
                return $"Day {schedule.DayOfMonth} of each month";
            }
            else if (schedule.MonthlyPattern == "DayOfWeek" &&
                     schedule.WeekOfMonth.HasValue &&
                     schedule.DayOfWeek.HasValue)
            {
                var weekName = schedule.WeekOfMonth.Value == 5 ? "last" : $"{schedule.WeekOfMonth}";
                var dayName = ((DayOfWeek)schedule.DayOfWeek.Value).ToString();
                return $"{weekName} {dayName} of each month";
            }

            return "Unknown pattern";
        }

        private IActionResult? ValidateRecurrencePattern(RecurrencePatternRequest pattern)
        {
            if (pattern.Interval < 1)
            {
                return BadRequest(new { error = "Recurrence interval must be at least 1" });
            }

            if (pattern.StartDate < DateTime.UtcNow.AddDays(-1))
            {
                return BadRequest(new { error = "Start date cannot be in the past" });
            }

            if (pattern.EndDate.HasValue && pattern.EndDate <= pattern.StartDate)
            {
                return BadRequest(new { error = "End date must be after start date" });
            }

            if (pattern.Type == RecurrenceType.Weekly)
            {
                if (pattern.DaysOfWeek == null || pattern.DaysOfWeek.Length == 0)
                {
                    return BadRequest(new { error = "Weekly recurrence requires at least one day of week" });
                }

                if (pattern.DaysOfWeek.Any(d => d < 0 || d > 6))
                {
                    return BadRequest(new { error = "Days of week must be between 0 (Sunday) and 6 (Saturday)" });
                }
            }
            else if (pattern.Type == RecurrenceType.Monthly)
            {
                if (pattern.MonthlyPattern == null)
                {
                    return BadRequest(new { error = "Monthly recurrence requires a monthly pattern" });
                }

                if (pattern.MonthlyPattern.Type == MonthlyPatternType.DayOfMonth)
                {
                    if (!pattern.MonthlyPattern.DayOfMonth.HasValue ||
                        pattern.MonthlyPattern.DayOfMonth < 1 ||
                        pattern.MonthlyPattern.DayOfMonth > 31)
                    {
                        return BadRequest(new { error = "Day of month must be between 1 and 31" });
                    }
                }
                else if (pattern.MonthlyPattern.Type == MonthlyPatternType.DayOfWeek)
                {
                    if (!pattern.MonthlyPattern.WeekOfMonth.HasValue ||
                        pattern.MonthlyPattern.WeekOfMonth < 1 ||
                        pattern.MonthlyPattern.WeekOfMonth > 5)
                    {
                        return BadRequest(new { error = "Week of month must be between 1 and 5 (5 = last)" });
                    }

                    if (!pattern.MonthlyPattern.DayOfWeek.HasValue ||
                        pattern.MonthlyPattern.DayOfWeek < 0 ||
                        pattern.MonthlyPattern.DayOfWeek > 6)
                    {
                        return BadRequest(new { error = "Day of week must be between 0 (Sunday) and 6 (Saturday)" });
                    }
                }
            }

            return null;
        }
    }
}
