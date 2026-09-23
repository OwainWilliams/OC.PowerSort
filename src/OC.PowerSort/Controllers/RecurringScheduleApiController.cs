using Asp.Versioning;
using Umbraco.Cms.Core.Security.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using OC.PowerSort.Controllers.Base;
using OC.PowerSort.Models;
using OC.PowerSort.Services;
using Umbraco.Cms.Api.Management.Routing;
using Umbraco.Cms.Core.Actions;
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
            IContentPermissionAuthorizer contentPermissionAuthorizer,
            ILogger<RecurringScheduleApiController> logger,
            IRecurrenceCalculatorService recurrenceCalculator,
            IOccurrenceGenerationService occurrenceGenerator)
            : base(backOfficeSecurityAccessor, databaseFactory, contentService, userService, contentPermissionAuthorizer, logger)
        {
            _recurrenceCalculator = recurrenceCalculator;
            _occurrenceGenerator = occurrenceGenerator;
        }

        [HttpGet("recurring-schedules")]
        [ProducesResponseType<RecurringScheduleListResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public Task<IActionResult> GetRecurringSchedules([FromQuery] Guid? parentId = null, [FromQuery] bool enabledOnly = false)
        {
            return ExecuteAsync(async (database, _) =>
            {
                var sql = "SELECT * FROM ocPowerSortRecurringSchedule WHERE 1=1";
                var args = new List<object>();

                if (parentId.HasValue)
                {
                    var forbidden = await AuthorizeContentAsync(ActionBrowse.ActionLetter, parentId.Value);
                    if (forbidden != null)
                        return forbidden;

                    sql += " AND ParentId = @0";
                    args.Add(parentId.Value);
                }

                if (enabledOnly)
                {
                    sql += " AND IsEnabled = 1";
                }

                sql += " ORDER BY Created DESC";

                var schedules = database.Fetch<RecurringScheduleDto>(sql, args.ToArray());

                var items = new List<RecurringScheduleResponse>(schedules.Count);
                foreach (var schedule in schedules)
                {
                    items.Add(await BuildRecurringScheduleResponseAsync(schedule, includeOccurrences: false));
                }

                return Ok(new RecurringScheduleListResponse
                {
                    Total = items.Count,
                    Items = items
                });
            });
        }

        [HttpGet("recurring-schedules/{id:guid}")]
        [ProducesResponseType<RecurringScheduleResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public Task<IActionResult> GetRecurringSchedule(Guid id)
        {
            return ExecuteAsync(async (database, _) =>
            {
                var schedule = GetRecurringSchedule(database, id);
                if (schedule == null)
                {
                    return NotFound(new { error = "Recurring schedule not found" });
                }

                var forbidden = await AuthorizeContentAsync(ActionBrowse.ActionLetter, schedule.ParentId);
                if (forbidden != null)
                    return forbidden;

                return Ok(await BuildRecurringScheduleResponseAsync(schedule, includeOccurrences: true));
            });
        }

        [HttpGet("recurring-schedules/{id:guid}/debug")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public Task<IActionResult> GetRecurringScheduleDebug(Guid id)
        {
            return ExecuteAsync(async (database, _) =>
            {
                var schedule = GetRecurringSchedule(database, id);
                if (schedule == null)
                {
                    return NotFound(new { error = "Recurring schedule not found" });
                }

                var forbidden = await AuthorizeContentAsync(ActionBrowse.ActionLetter, schedule.ParentId);
                if (forbidden != null)
                    return forbidden;

                var daysOfWeekArray = schedule.GetDaysOfWeekArray();
                var nextOccurrence = _recurrenceCalculator.GetNextOccurrence(schedule, DateTime.UtcNow);
                var upcomingOccurrences = await _occurrenceGenerator.GetUpcomingOccurrencesAsync(schedule.Id, 5);

                return Ok(new
                {
                    scheduleId = schedule.Id,
                    recurrenceType = schedule.RecurrenceType,
                    recurrenceInterval = schedule.RecurrenceInterval,
                    recurrenceStart = schedule.RecurrenceStart,
                    daysOfWeekJson = schedule.DaysOfWeek,
                    daysOfWeekArray,
                    daysOfWeekDisplay = daysOfWeekArray.Select(d => ((DayOfWeek)d).ToString()).ToArray(),
                    currentTime = DateTime.UtcNow,
                    nextOccurrence,
                    upcomingOccurrences
                });
            });
        }

        [HttpPost("recurring-schedules")]
        [ProducesResponseType<RecurringScheduleResponse>(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public Task<IActionResult> CreateRecurringSchedule([FromBody] CreateRecurringScheduleRequest request)
        {
            return ExecuteAsync(async (database, userId) =>
            {
                var validation = ValidateTargetPosition(request.TargetPosition)
                    ?? ValidateRecurrencePattern(request.Pattern)
                    ?? ValidateBoostDuration(request.BoostDurationHours)
                    ?? ValidateContentExists(request.ContentId, out var content)
                    ?? ValidateContentExists(request.ParentId, out _, "Parent not found")
                    ?? ValidateParentChildRelationship(content!, request.ParentId);
                if (validation != null)
                    return validation;

                var forbidden = await AuthorizeContentAsync(ActionSort.ActionLetter, request.ParentId);
                if (forbidden != null)
                    return forbidden;

                var schedule = new RecurringScheduleDto
                {
                    Id = Guid.NewGuid(),
                    ContentId = request.ContentId,
                    ParentId = request.ParentId,
                    TargetPosition = request.TargetPosition,
                    Priority = request.Priority,
                    IsEnabled = true,
                    Created = DateTime.UtcNow,
                    CreatedBy = userId
                };

                ApplyPattern(schedule, request.Pattern, request.BoostDurationHours);

                database.Insert(schedule);

                // Generate initial occurrences
                await _occurrenceGenerator.GenerateUpcomingOccurrencesAsync(schedule.Id);

                var response = await BuildRecurringScheduleResponseAsync(schedule, includeOccurrences: true);
                return CreatedAtAction(nameof(GetRecurringSchedule), new { id = schedule.Id }, response);
            });
        }

        [HttpPut("recurring-schedules/{id:guid}")]
        [ProducesResponseType<RecurringScheduleResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public Task<IActionResult> UpdateRecurringSchedule(Guid id, [FromBody] UpdateRecurringScheduleRequest request)
        {
            return ExecuteAsync(async (database, userId) =>
            {
                var validation = ValidateTargetPosition(request.TargetPosition)
                    ?? ValidateRecurrencePattern(request.Pattern, isUpdate: true)
                    ?? ValidateBoostDuration(request.BoostDurationHours);
                if (validation != null)
                    return validation;

                var schedule = GetRecurringSchedule(database, id);
                if (schedule == null)
                {
                    return NotFound(new { error = "Recurring schedule not found" });
                }

                var forbidden = await AuthorizeContentAsync(ActionSort.ActionLetter, schedule.ParentId);
                if (forbidden != null)
                    return forbidden;

                schedule.TargetPosition = request.TargetPosition;
                schedule.Priority = request.Priority;
                schedule.IsEnabled = request.IsEnabled;
                schedule.Modified = DateTime.UtcNow;
                schedule.ModifiedBy = userId;

                ApplyPattern(schedule, request.Pattern, request.BoostDurationHours);

                database.Update(schedule);

                // Regenerate future occurrences for the new pattern. Occurrences the editor has explicitly
                // cancelled are kept so that a cancellation survives editing the schedule.
                database.Execute(
                    @"DELETE FROM ocPowerSortScheduleOccurrence
                      WHERE RecurringScheduleId = @0
                      AND IsProcessed = 0
                      AND IsCancelled = 0
                      AND OccurrenceStartDate > @1",
                    id, DateTime.UtcNow);

                await _occurrenceGenerator.GenerateUpcomingOccurrencesAsync(schedule.Id);

                return Ok(await BuildRecurringScheduleResponseAsync(schedule, includeOccurrences: true));
            });
        }

        [HttpDelete("recurring-schedules/{id:guid}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public Task<IActionResult> DeleteRecurringSchedule(Guid id)
        {
            return ExecuteAsync(async (database, _) =>
            {
                var schedule = GetRecurringSchedule(database, id);
                if (schedule == null)
                {
                    return NotFound(new { error = "Recurring schedule not found" });
                }

                var forbidden = await AuthorizeContentAsync(ActionSort.ActionLetter, schedule.ParentId);
                if (forbidden != null)
                    return forbidden;

                using var transaction = database.GetTransaction();

                // Remove dependants explicitly: existing installations may have a foreign key without a
                // cascade rule, and SQLite installations have no foreign key at all.
                database.Execute(
                    "DELETE FROM ocPowerSortScheduleOccurrence WHERE RecurringScheduleId = @0", id);

                database.Execute(
                    "UPDATE ocPowerSortSchedule SET RecurringScheduleId = NULL WHERE RecurringScheduleId = @0", id);

                database.Delete(schedule);

                transaction.Complete();

                return NoContent();
            });
        }

        [HttpGet("recurring-schedules/{id:guid}/preview")]
        [ProducesResponseType<List<OccurrencePreview>>(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public Task<IActionResult> PreviewOccurrences(Guid id, [FromQuery] int count = 10)
        {
            return ExecuteAsync(async (database, _) =>
            {
                var schedule = GetRecurringSchedule(database, id);
                if (schedule == null)
                {
                    return NotFound(new { error = "Recurring schedule not found" });
                }

                var forbidden = await AuthorizeContentAsync(ActionBrowse.ActionLetter, schedule.ParentId);
                if (forbidden != null)
                    return forbidden;

                var previews = await _occurrenceGenerator.GetUpcomingOccurrencesAsync(id, count);
                return Ok(previews);
            });
        }

        [HttpPost("recurring-schedules/{id:guid}/cancel-occurrence")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public Task<IActionResult> CancelOccurrence(Guid id, [FromBody] CancelOccurrenceRequest request)
        {
            return ExecuteAsync(async (database, _) =>
            {
                var schedule = GetRecurringSchedule(database, id);
                if (schedule == null)
                {
                    return NotFound(new { error = "Recurring schedule not found" });
                }

                var forbidden = await AuthorizeContentAsync(ActionSort.ActionLetter, schedule.ParentId);
                if (forbidden != null)
                    return forbidden;

                var occurrence = database.SingleOrDefault<ScheduleOccurrenceDto>(
                    @"SELECT * FROM ocPowerSortScheduleOccurrence
                      WHERE RecurringScheduleId = @0
                      AND OccurrenceStartDate >= @1
                      AND OccurrenceStartDate < @2",
                    id, request.OccurrenceDate.Date, request.OccurrenceDate.Date.AddDays(1));

                if (occurrence == null)
                {
                    return NotFound(new { error = "Occurrence not found" });
                }

                occurrence.IsCancelled = true;
                database.Update(occurrence);

                return Ok(new { success = true, message = "Occurrence cancelled successfully" });
            });
        }

        [HttpPost("recurring-schedules/{id:guid}/toggle")]
        [ProducesResponseType<RecurringScheduleResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public Task<IActionResult> ToggleRecurringSchedule(Guid id)
        {
            return ExecuteAsync(async (database, _) =>
            {
                var schedule = GetRecurringSchedule(database, id);
                if (schedule == null)
                {
                    return NotFound(new { error = "Recurring schedule not found" });
                }

                var forbidden = await AuthorizeContentAsync(ActionSort.ActionLetter, schedule.ParentId);
                if (forbidden != null)
                    return forbidden;

                schedule.IsEnabled = !schedule.IsEnabled;
                database.Update(schedule);

                return Ok(await BuildRecurringScheduleResponseAsync(schedule, includeOccurrences: false));
            });
        }

        private static RecurringScheduleDto? GetRecurringSchedule(IUmbracoDatabase database, Guid id)
        {
            return database.SingleOrDefault<RecurringScheduleDto>(
                "SELECT * FROM ocPowerSortRecurringSchedule WHERE Id = @0", id);
        }

        /// <summary>
        /// Copies the recurrence pattern from a request onto the DTO, clearing fields that do not apply
        /// to the selected pattern type so a Weekly-to-Monthly edit does not leave stale data behind.
        /// </summary>
        private static void ApplyPattern(RecurringScheduleDto schedule, RecurrencePatternRequest pattern, int boostDurationHours)
        {
            schedule.RecurrenceType = pattern.Type.ToString();
            schedule.RecurrenceInterval = pattern.Interval;
            schedule.RecurrenceStart = pattern.StartDate;
            schedule.RecurrenceEnd = pattern.EndDate;
            schedule.MaxOccurrences = pattern.MaxOccurrences;
            schedule.BoostDurationHours = boostDurationHours;

            schedule.DaysOfWeek = null;
            schedule.MonthlyPattern = null;
            schedule.DayOfMonth = null;
            schedule.WeekOfMonth = null;
            schedule.DayOfWeek = null;

            if (pattern.Type == RecurrenceType.Weekly && pattern.DaysOfWeek != null)
            {
                schedule.SetDaysOfWeekArray(pattern.DaysOfWeek);
            }
            else if (pattern.Type == RecurrenceType.Monthly && pattern.MonthlyPattern != null)
            {
                schedule.MonthlyPattern = pattern.MonthlyPattern.Type.ToString();
                schedule.DayOfMonth = pattern.MonthlyPattern.DayOfMonth;
                schedule.WeekOfMonth = pattern.MonthlyPattern.WeekOfMonth;
                schedule.DayOfWeek = pattern.MonthlyPattern.DayOfWeek;
            }
        }

        private async Task<RecurringScheduleResponse> BuildRecurringScheduleResponseAsync(RecurringScheduleDto schedule, bool includeOccurrences)
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
                Pattern = BuildRecurrencePatternResponse(schedule),
                NextOccurrence = _recurrenceCalculator.GetNextOccurrence(schedule, DateTime.UtcNow)
            };

            if (includeOccurrences)
            {
                response.UpcomingOccurrences = await _occurrenceGenerator.GetUpcomingOccurrencesAsync(schedule.Id, 10);
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

        private static string GetMonthlyPatternDescription(RecurringScheduleDto schedule)
        {
            if (schedule.MonthlyPattern == "DayOfMonth" && schedule.DayOfMonth.HasValue)
            {
                return $"Day {schedule.DayOfMonth} of each month";
            }

            if (schedule.MonthlyPattern == "DayOfWeek" &&
                schedule.WeekOfMonth.HasValue &&
                schedule.DayOfWeek.HasValue)
            {
                var weekName = schedule.WeekOfMonth.Value == 5 ? "last" : $"{schedule.WeekOfMonth}";
                var dayName = ((DayOfWeek)schedule.DayOfWeek.Value).ToString();
                return $"{weekName} {dayName} of each month";
            }

            return "Unknown pattern";
        }

        private IActionResult? ValidateBoostDuration(int boostDurationHours)
        {
            if (boostDurationHours <= 0)
            {
                return BadRequest(new { error = "Boost duration must be greater than 0" });
            }

            return null;
        }

        /// <summary>
        /// Validates a recurrence pattern. On update the start date may already be in the past, because the
        /// schedule has been running; the past-date rule only applies when creating a new schedule.
        /// </summary>
        private IActionResult? ValidateRecurrencePattern(RecurrencePatternRequest pattern, bool isUpdate = false)
        {
            if (pattern.Interval < 1)
            {
                return BadRequest(new { error = "Recurrence interval must be at least 1" });
            }

            if (pattern.StartDate < DateTime.UtcNow.AddDays(-1) && !isUpdate)
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
