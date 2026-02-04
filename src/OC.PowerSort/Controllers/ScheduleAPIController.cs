using Asp.Versioning;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using OC.PowerSort.Controllers.Base;
using OC.PowerSort.Models;
using Umbraco.Cms.Api.Management.Routing;
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

        private readonly IEntityService _entityService;
        public ScheduleApiController(
            IBackOfficeSecurityAccessor backOfficeSecurityAccessor,
            IUmbracoDatabaseFactory databaseFactory,
            IEntityService entityService,
            IContentService contentService,
            IUserService userService)
            : base(backOfficeSecurityAccessor, databaseFactory, contentService, userService)
        {
            _entityService = entityService;

        }

        [HttpGet("schedules")]
        [ProducesResponseType<ScheduleListResponse>(StatusCodes.Status200OK)]
        public IActionResult GetSchedules([FromQuery] Guid? parentId = null, [FromQuery] bool activeOnly = false)
        {
            return ExecuteDatabaseOperation(database =>
            {
                var sql = "SELECT * FROM ocPowerSortSchedule WHERE 1=1";
                var args = new List<object>();

                if (parentId.HasValue)
                {
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

                return new ScheduleListResponse
                {
                    Total = items.Count,
                    Items = items
                };
            });
        }

        [HttpGet("schedules/{id:guid}")]
        [ProducesResponseType<ScheduleResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public IActionResult GetSchedule(Guid id)
        {
            return ExecuteDatabaseOperation(database =>
            {
                var schedule = database.SingleOrDefault<SortScheduleDto>(
                    "SELECT * FROM ocPowerSortSchedule WHERE Id = @0", id);

                if (schedule == null)
                {
                    throw new KeyNotFoundException("Schedule not found");
                }

                return BuildScheduleResponse(schedule, DateTime.UtcNow);
            });
        }

        [HttpPost("schedules")]
        [ProducesResponseType<ScheduleResponse>(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public IActionResult CreateSchedule([FromBody] CreateScheduleRequest request)
        {
            var authResult = ValidateUserAccess(out var userId);
            if (authResult != null)
                return authResult;

            // Validation
            var dateValidation = ValidateDateRange(request.StartDateTime, request.EndDateTime);
            if (dateValidation != null)
                return dateValidation;

            var positionValidation = ValidateTargetPosition(request.TargetPosition);
            if (positionValidation != null)
                return positionValidation;

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

            try
            {
                using var database = databaseFactory.CreateDatabase();
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
            }
            catch (Exception ex)
            {
                return HandleException(ex);
            }
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
                CreatedByName = creator?.Name ?? "Unknown"
            };
        }

        [HttpPut("schedules/{id:guid}")]
        [ProducesResponseType<ScheduleResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public IActionResult UpdateSchedule(Guid id, [FromBody] UpdateScheduleRequest request)
        {
            var authResult = ValidateUserAccess(out _);
            if (authResult != null)
                return authResult;

            // Validation
            var dateValidation = ValidateDateRange(request.StartDateTime, request.EndDateTime);
            if (dateValidation != null)
                return dateValidation;

            var positionValidation = ValidateTargetPosition(request.TargetPosition);
            if (positionValidation != null)
                return positionValidation;

            return ExecuteDatabaseOperation(database =>
            {
                var schedule = database.SingleOrDefault<SortScheduleDto>(
                    "SELECT * FROM ocPowerSortSchedule WHERE Id = @0", id);

                if (schedule == null)
                {
                    throw new KeyNotFoundException("Schedule not found");
                }

                schedule.TargetPosition = request.TargetPosition;
                schedule.StartDateTime = request.StartDateTime;
                schedule.EndDateTime = request.EndDateTime;
                schedule.Priority = request.Priority;

                database.Update(schedule);

                return BuildScheduleResponse(schedule, DateTime.UtcNow);
            });
        }

        [HttpDelete("schedules/{id:guid}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public IActionResult DeleteSchedule(Guid id)
        {
            return ExecuteDatabaseOperation(database =>
            {
                var schedule = database.SingleOrDefault<SortScheduleDto>(
                    "SELECT * FROM ocPowerSortSchedule WHERE Id = @0", id);

                if (schedule == null)
                {
                    throw new KeyNotFoundException("Schedule not found");
                }

                database.Delete(schedule);
                return new { success = true };
            });
        }

        [HttpGet("schedules/active/{parentId:guid}")]
        [ProducesResponseType<List<ActiveScheduleInfo>>(StatusCodes.Status200OK)]
        public IActionResult GetActiveSchedules(Guid parentId)
        {
            return ExecuteDatabaseOperation(database =>
            {
                var now = DateTime.UtcNow;

                var activeSchedules = database.Fetch<SortScheduleDto>(
                    @"SELECT * FROM ocPowerSortSchedule 
                      WHERE ParentId = @0 
                      AND IsActive = 1 
                      AND StartDateTime <= @1 
                      AND EndDateTime > @1
                      ORDER BY Priority DESC, StartDateTime ASC",
                    parentId, now);

                return activeSchedules.Select(s => new ActiveScheduleInfo
                {
                    ScheduleId = s.Id,
                    ContentId = s.ContentId,
                    TargetPosition = s.TargetPosition,
                    EndDateTime = s.EndDateTime,
                    Priority = s.Priority
                }).ToList();
            });
        }

      
    }
}
