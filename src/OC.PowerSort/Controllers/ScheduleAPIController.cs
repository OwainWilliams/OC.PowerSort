using Asp.Versioning;
using Umbraco.Cms.Core.Security.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using OC.PowerSort.Controllers.Base;
using OC.PowerSort.Models;
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
    public class ScheduleApiController : PowerSortControllerBase
    {
        public ScheduleApiController(
            IBackOfficeSecurityAccessor backOfficeSecurityAccessor,
            IUmbracoDatabaseFactory databaseFactory,
            IContentService contentService,
            IUserService userService,
            IContentPermissionAuthorizer contentPermissionAuthorizer,
            ILogger<ScheduleApiController> logger)
            : base(backOfficeSecurityAccessor, databaseFactory, contentService, userService, contentPermissionAuthorizer, logger)
        {
        }

        [HttpGet("schedules")]
        [ProducesResponseType<ScheduleListResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public Task<IActionResult> GetSchedules([FromQuery] Guid? parentId = null, [FromQuery] bool activeOnly = false)
        {
            return ExecuteAsync(async (database, _) =>
            {
                var sql = "SELECT * FROM ocPowerSortSchedule WHERE 1=1";
                var args = new List<object>();

                if (parentId.HasValue)
                {
                    var forbidden = await AuthorizeContentAsync(ActionBrowse.ActionLetter, parentId.Value);
                    if (forbidden != null)
                        return forbidden;

                    sql += " AND ParentId = @0";
                    args.Add(parentId.Value);
                }

                if (activeOnly)
                {
                    sql += " AND IsActive = 1";
                }

                sql += " ORDER BY StartDateTime DESC";

                var schedules = database.Fetch<SortScheduleDto>(sql, args.ToArray());
                var now = DateTime.UtcNow;

                var items = schedules.Select(s => BuildScheduleResponse(s, now)).ToList();

                return Ok(new ScheduleListResponse
                {
                    Total = items.Count,
                    Items = items
                });
            });
        }

        [HttpGet("schedules/{id:guid}")]
        [ProducesResponseType<ScheduleResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public Task<IActionResult> GetSchedule(Guid id)
        {
            return ExecuteAsync(async (database, _) =>
            {
                var schedule = database.SingleOrDefault<SortScheduleDto>(
                    "SELECT * FROM ocPowerSortSchedule WHERE Id = @0", id);

                if (schedule == null)
                {
                    return NotFound(new { error = "Schedule not found" });
                }

                var forbidden = await AuthorizeContentAsync(ActionBrowse.ActionLetter, schedule.ParentId);
                if (forbidden != null)
                    return forbidden;

                return Ok(BuildScheduleResponse(schedule, DateTime.UtcNow));
            });
        }

        [HttpPost("schedules")]
        [ProducesResponseType<ScheduleResponse>(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public Task<IActionResult> CreateSchedule([FromBody] CreateScheduleRequest request)
        {
            return ExecuteAsync(async (database, userId) =>
            {
                var validation = ValidateDateRange(request.StartDateTime, request.EndDateTime)
                    ?? ValidateTargetPosition(request.TargetPosition)
                    ?? ValidateContentExists(request.ContentId, out var content)
                    ?? ValidateContentExists(request.ParentId, out _, "Parent not found")
                    ?? ValidateParentChildRelationship(content!, request.ParentId);
                if (validation != null)
                    return validation;

                var forbidden = await AuthorizeContentAsync(ActionSort.ActionLetter, request.ParentId);
                if (forbidden != null)
                    return forbidden;

                var schedule = new SortScheduleDto
                {
                    Id = Guid.NewGuid(),
                    ContentId = request.ContentId,
                    ParentId = request.ParentId,
                    TargetPosition = request.TargetPosition,
                    StartDateTime = request.StartDateTime,
                    EndDateTime = request.EndDateTime,
                    IsActive = false,
                    Priority = request.Priority,
                    Created = DateTime.UtcNow,
                    CreatedBy = userId
                };

                database.Insert(schedule);

                var response = BuildScheduleResponse(schedule, DateTime.UtcNow);
                return CreatedAtAction(nameof(GetSchedule), new { id = schedule.Id }, response);
            });
        }

        [HttpPut("schedules/{id:guid}")]
        [ProducesResponseType<ScheduleResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public Task<IActionResult> UpdateSchedule(Guid id, [FromBody] UpdateScheduleRequest request)
        {
            return ExecuteAsync(async (database, _) =>
            {
                var validation = ValidateDateRange(request.StartDateTime, request.EndDateTime)
                    ?? ValidateTargetPosition(request.TargetPosition);
                if (validation != null)
                    return validation;

                var schedule = database.SingleOrDefault<SortScheduleDto>(
                    "SELECT * FROM ocPowerSortSchedule WHERE Id = @0", id);

                if (schedule == null)
                {
                    return NotFound(new { error = "Schedule not found" });
                }

                var forbidden = await AuthorizeContentAsync(ActionSort.ActionLetter, schedule.ParentId);
                if (forbidden != null)
                    return forbidden;

                schedule.TargetPosition = request.TargetPosition;
                schedule.StartDateTime = request.StartDateTime;
                schedule.EndDateTime = request.EndDateTime;
                schedule.Priority = request.Priority;

                database.Update(schedule);

                return Ok(BuildScheduleResponse(schedule, DateTime.UtcNow));
            });
        }

        [HttpDelete("schedules/{id:guid}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public Task<IActionResult> DeleteSchedule(Guid id)
        {
            return ExecuteAsync(async (database, _) =>
            {
                var schedule = database.SingleOrDefault<SortScheduleDto>(
                    "SELECT * FROM ocPowerSortSchedule WHERE Id = @0", id);

                if (schedule == null)
                {
                    return NotFound(new { error = "Schedule not found" });
                }

                var forbidden = await AuthorizeContentAsync(ActionSort.ActionLetter, schedule.ParentId);
                if (forbidden != null)
                    return forbidden;

                database.Delete(schedule);
                return NoContent();
            });
        }

        [HttpGet("schedules/active/{parentId:guid}")]
        [ProducesResponseType<List<ActiveScheduleInfo>>(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public Task<IActionResult> GetActiveSchedules(Guid parentId)
        {
            return ExecuteAsync(async (database, _) =>
            {
                var forbidden = await AuthorizeContentAsync(ActionBrowse.ActionLetter, parentId);
                if (forbidden != null)
                    return forbidden;

                var now = DateTime.UtcNow;

                var activeSchedules = database.Fetch<SortScheduleDto>(
                    @"SELECT * FROM ocPowerSortSchedule
                      WHERE ParentId = @0
                      AND IsActive = 1
                      AND StartDateTime <= @1
                      AND EndDateTime > @1
                      ORDER BY Priority DESC, StartDateTime ASC",
                    parentId, now);

                var items = activeSchedules.Select(s => new ActiveScheduleInfo
                {
                    ScheduleId = s.Id,
                    ContentId = s.ContentId,
                    ContentName = contentService.GetById(s.ContentId)?.Name ?? "Unknown",
                    TargetPosition = s.TargetPosition,
                    StartDateTime = s.StartDateTime,
                    EndDateTime = s.EndDateTime,
                    Priority = s.Priority
                }).ToList();

                return Ok(items);
            });
        }

        /// <summary>
        /// Helper method to build schedule response from DTO
        /// </summary>
        private ScheduleResponse BuildScheduleResponse(SortScheduleDto schedule, DateTime now)
        {
            var content = contentService.GetById(schedule.ContentId);
            var parent = contentService.GetById(schedule.ParentId);
            var creator = userService.GetUserById(schedule.CreatedBy);

            return new ScheduleResponse
            {
                Id = schedule.Id,
                ContentId = schedule.ContentId,
                ContentName = content?.Name ?? "Unknown",
                ParentId = schedule.ParentId,
                ParentName = parent?.Name ?? "Unknown",
                TargetPosition = schedule.TargetPosition,
                StartDateTime = schedule.StartDateTime,
                EndDateTime = schedule.EndDateTime,
                IsActive = schedule.IsActive,
                IsCurrentlyActive = schedule.IsActive && now >= schedule.StartDateTime && now < schedule.EndDateTime,
                Priority = schedule.Priority,
                Created = schedule.Created,
                CreatedByName = creator?.Name ?? "Unknown",
                RecurringScheduleId = schedule.RecurringScheduleId
            };
        }
    }
}
