using Asp.Versioning;
using Umbraco.Cms.Core.Security.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using OC.PowerSort.Controllers.Base;
using OC.PowerSort.Models;
using Umbraco.Cms.Api.Management.Routing;
using Umbraco.Cms.Core.Security;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Infrastructure.Persistence;

namespace OC.PowerSort.Controllers
{
    /// <summary>
    /// Enum priorities are global PowerSort settings (not tied to a content node), so access is governed
    /// by section access alone rather than per-node content permissions.
    /// </summary>
    [ApiVersion("1.0")]
    [VersionedApiBackOfficeRoute("oc/power-sort")]
    [ApiExplorerSettings(GroupName = Constants.ApiName)]
    public class EnumPriorityApiController : PowerSortControllerBase
    {
        public EnumPriorityApiController(
            IBackOfficeSecurityAccessor backOfficeSecurityAccessor,
            IUmbracoDatabaseFactory databaseFactory,
            IContentService contentService,
            IUserService userService,
            IContentPermissionAuthorizer contentPermissionAuthorizer,
            ILogger<EnumPriorityApiController> logger)
            : base(backOfficeSecurityAccessor, databaseFactory, contentService, userService, contentPermissionAuthorizer, logger)
        {
        }

        [HttpGet("enum-priorities")]
        [ProducesResponseType<EnumPriorityListResponse>(StatusCodes.Status200OK)]
        public Task<IActionResult> GetEnumPriorities([FromQuery] int skip = 0, [FromQuery] int take = 100)
        {
            return ExecuteAsync((database, _) =>
            {
                var sql = "SELECT * FROM ocPowerSortEnumPriority ORDER BY SortPriority ASC, Name ASC";
                var enumPriorities = database.Fetch<EnumPriorityDto>(sql);

                var items = enumPriorities.Skip(skip).Take(take).Select(ToResponse).ToList();

                return Task.FromResult<IActionResult>(Ok(new EnumPriorityListResponse
                {
                    Total = enumPriorities.Count,
                    Items = items
                }));
            });
        }

        [HttpGet("enum-priorities/{id:guid}")]
        [ProducesResponseType<EnumPriorityResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public Task<IActionResult> GetEnumPriority(Guid id)
        {
            return ExecuteAsync((database, _) =>
            {
                var enumPriority = database.SingleOrDefault<EnumPriorityDto>(
                    "SELECT * FROM ocPowerSortEnumPriority WHERE Id = @0", id);

                if (enumPriority == null)
                {
                    return Task.FromResult<IActionResult>(NotFound(new { error = "Enum priority not found" }));
                }

                return Task.FromResult<IActionResult>(Ok(ToResponse(enumPriority)));
            });
        }

        [HttpPost("enum-priorities")]
        [ProducesResponseType<EnumPriorityResponse>(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public Task<IActionResult> CreateEnumPriority([FromBody] CreateEnumPriorityRequest request)
        {
            return ExecuteAsync((database, userId) =>
            {
                var validation = ValidateRequest(database, request.Name, request.SortPriority, excludeId: null);
                if (validation != null)
                {
                    return Task.FromResult(validation);
                }

                var now = DateTime.UtcNow;
                var enumPriority = new EnumPriorityDto
                {
                    Id = Guid.NewGuid(),
                    Name = request.Name.Trim(),
                    SortPriority = request.SortPriority,
                    Created = now,
                    CreatedBy = userId,
                    Updated = now,
                    UpdatedBy = userId
                };

                database.Insert(enumPriority);

                return Task.FromResult<IActionResult>(
                    CreatedAtAction(nameof(GetEnumPriority), new { id = enumPriority.Id }, ToResponse(enumPriority)));
            });
        }

        [HttpPut("enum-priorities/{id:guid}")]
        [ProducesResponseType<EnumPriorityResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public Task<IActionResult> UpdateEnumPriority(Guid id, [FromBody] UpdateEnumPriorityRequest request)
        {
            return ExecuteAsync((database, userId) =>
            {
                var enumPriority = database.SingleOrDefault<EnumPriorityDto>(
                    "SELECT * FROM ocPowerSortEnumPriority WHERE Id = @0", id);

                if (enumPriority == null)
                {
                    return Task.FromResult<IActionResult>(NotFound(new { error = "Enum priority not found" }));
                }

                var validation = ValidateRequest(database, request.Name, request.SortPriority, excludeId: id);
                if (validation != null)
                {
                    return Task.FromResult(validation);
                }

                enumPriority.Name = request.Name.Trim();
                enumPriority.SortPriority = request.SortPriority;
                enumPriority.Updated = DateTime.UtcNow;
                enumPriority.UpdatedBy = userId;

                database.Update(enumPriority);

                return Task.FromResult<IActionResult>(Ok(ToResponse(enumPriority)));
            });
        }

        [HttpDelete("enum-priorities/{id:guid}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public Task<IActionResult> DeleteEnumPriority(Guid id)
        {
            return ExecuteAsync((database, _) =>
            {
                var enumPriority = database.SingleOrDefault<EnumPriorityDto>(
                    "SELECT * FROM ocPowerSortEnumPriority WHERE Id = @0", id);

                if (enumPriority == null)
                {
                    return Task.FromResult<IActionResult>(NotFound(new { error = "Enum priority not found" }));
                }

                database.Delete(enumPriority);
                return Task.FromResult<IActionResult>(NoContent());
            });
        }

        /// <summary>
        /// Validates name and priority, including uniqueness against other rows.
        /// </summary>
        private IActionResult? ValidateRequest(IUmbracoDatabase database, string name, int sortPriority, Guid? excludeId)
        {
            if (string.IsNullOrWhiteSpace(name))
            {
                return BadRequest(new { error = "Name is required" });
            }

            if (sortPriority < 0)
            {
                return BadRequest(new { error = "Sort priority must be 0 or greater" });
            }

            var trimmedName = name.Trim();
            var exclusion = excludeId.HasValue ? " AND Id != @1" : string.Empty;
            var args = excludeId.HasValue ? new object[] { sortPriority, excludeId.Value } : new object[] { sortPriority };

            var existingWithSamePriority = database.SingleOrDefault<EnumPriorityDto>(
                "SELECT * FROM ocPowerSortEnumPriority WHERE SortPriority = @0" + exclusion, args);

            if (existingWithSamePriority != null)
            {
                return BadRequest(new { error = $"Sort priority {sortPriority} is already in use by '{existingWithSamePriority.Name}'" });
            }

            args = excludeId.HasValue ? new object[] { trimmedName, excludeId.Value } : new object[] { trimmedName };

            var existingWithSameName = database.SingleOrDefault<EnumPriorityDto>(
                "SELECT * FROM ocPowerSortEnumPriority WHERE Name = @0" + exclusion, args);

            if (existingWithSameName != null)
            {
                return BadRequest(new { error = $"Name '{trimmedName}' is already in use" });
            }

            return null;
        }

        private EnumPriorityResponse ToResponse(EnumPriorityDto ep) => new()
        {
            Id = ep.Id,
            Name = ep.Name,
            SortPriority = ep.SortPriority,
            Created = ep.Created,
            CreatedByName = GetUserName(ep.CreatedBy),
            Updated = ep.Updated,
            UpdatedByName = GetUserName(ep.UpdatedBy)
        };

        private string GetUserName(int userId)
        {
            var user = userService.GetUserById(userId);
            return user?.Name ?? "Unknown";
        }
    }
}
