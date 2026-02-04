using System;
using System.Collections.Generic;
using System.Text;
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
    public class EnumPriorityApiController : PowerSortControllerBase
    {
        private readonly IEntityService _entityService;
        private readonly IHttpClientFactory _httpClientFactory;


        public EnumPriorityApiController(
            IBackOfficeSecurityAccessor backOfficeSecurityAccessor,
            IUmbracoDatabaseFactory databaseFactory,
            IHttpClientFactory httpClientFactory,
            IEntityService entityService,
            IContentService contentService,
            IUserService userService)
            : base(backOfficeSecurityAccessor, databaseFactory, contentService, userService)
        {
            _entityService = entityService;
            _httpClientFactory = httpClientFactory;
        }


        [HttpGet("enum-priorities")]
        [ProducesResponseType<EnumPriorityListResponse>(StatusCodes.Status200OK)]
        public IActionResult GetEnumPriorities([FromQuery] int skip = 0, [FromQuery] int take = 100)
        {
            return ExecuteDatabaseOperation(database =>
            {
                var authResult = ValidateUserAccess(out _);
                if (authResult != null)
                    throw new UnauthorizedAccessException();

                var sql = "SELECT * FROM ocPowerSortEnumPriority ORDER BY SortPriority ASC, Name ASC";
                var enumPriorities = database.Fetch<EnumPriorityDto>(sql);

                var items = enumPriorities.Skip(skip).Take(take).Select(ep => new EnumPriorityResponse
                {
                    Id = ep.Id,
                    Name = ep.Name,
                    SortPriority = ep.SortPriority,
                    Created = ep.Created,
                    CreatedByName = GetUserName(ep.CreatedBy),
                    Updated = ep.Updated,
                    UpdatedByName = GetUserName(ep.UpdatedBy)
                }).ToList();

                return new EnumPriorityListResponse
                {
                    Total = enumPriorities.Count,
                    Items = items
                };
            });
        }

        [HttpGet("enum-priorities/{id:guid}")]
        [ProducesResponseType<EnumPriorityResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public IActionResult GetEnumPriority(Guid id)
        {
            return ExecuteDatabaseOperation(database =>
            {
                var authResult = ValidateUserAccess(out _);
                if (authResult != null)
                    throw new UnauthorizedAccessException();

                var enumPriority = database.SingleOrDefault<EnumPriorityDto>(
                    "SELECT * FROM ocPowerSortEnumPriority WHERE Id = @0", id);

                if (enumPriority == null)
                {
                    throw new KeyNotFoundException("Enum priority not found");
                }

                return new EnumPriorityResponse
                {
                    Id = enumPriority.Id,
                    Name = enumPriority.Name,
                    SortPriority = enumPriority.SortPriority,
                    Created = enumPriority.Created,
                    CreatedByName = GetUserName(enumPriority.CreatedBy),
                    Updated = enumPriority.Updated,
                    UpdatedByName = GetUserName(enumPriority.UpdatedBy)
                };
            });
        }

        [HttpPost("enum-priorities")]
        [ProducesResponseType<EnumPriorityResponse>(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public IActionResult CreateEnumPriority([FromBody] CreateEnumPriorityRequest request)
        {
            return ExecuteDatabaseOperation(database =>
            {
                var authResult = ValidateUserAccess(out var userId);
                if (authResult != null)
                    throw new UnauthorizedAccessException();

                // Validation
                if (string.IsNullOrWhiteSpace(request.Name))
                {
                    throw new ArgumentException("Name is required");
                }

                if (request.SortPriority < 0)
                {
                    throw new ArgumentException("Sort priority must be 0 or greater");
                }

                // Check if weight already exists
                var existingWithSamePriority = database.SingleOrDefault<EnumPriorityDto>(
                    "SELECT * FROM ocPowerSortEnumPriority WHERE SortPriority = @0", request.SortPriority);

                if (existingWithSamePriority != null)
                {
                    throw new ArgumentException($"Sort priority {request.SortPriority} is already in use by '{existingWithSamePriority.Name}'");
                }

                // Check if name already exists
                var existingWithSameName = database.SingleOrDefault<EnumPriorityDto>(
                    "SELECT * FROM ocPowerSortEnumPriority WHERE Name = @0", request.Name.Trim());

                if (existingWithSameName != null)
                {
                    throw new ArgumentException($"Name '{request.Name.Trim()}' is already in use");
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

                return new EnumPriorityResponse
                {
                    Id = enumPriority.Id,
                    Name = enumPriority.Name,
                    SortPriority = enumPriority.SortPriority,
                    Created = enumPriority.Created,
                    CreatedByName = GetUserName(enumPriority.CreatedBy),
                    Updated = enumPriority.Updated,
                    UpdatedByName = GetUserName(enumPriority.UpdatedBy)
                };
            });
        }

        [HttpPut("enum-priorities/{id:guid}")]
        [ProducesResponseType<EnumPriorityResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public IActionResult UpdateEnumPriority(Guid id, [FromBody] UpdateEnumPriorityRequest request)
        {
            return ExecuteDatabaseOperation(database =>
            {
                var authResult = ValidateUserAccess(out var userId);
                if (authResult != null)
                    throw new UnauthorizedAccessException();

                var enumPriority = database.SingleOrDefault<EnumPriorityDto>(
                    "SELECT * FROM ocPowerSortEnumPriority WHERE Id = @0", id);

                if (enumPriority == null)
                {
                    throw new KeyNotFoundException("Enum priority not found");
                }

                // Validation
                if (string.IsNullOrWhiteSpace(request.Name))
                {
                    throw new ArgumentException("Name is required");
                }

                if (request.SortPriority < 0)
                {
                    throw new ArgumentException("Sort priority must be 0 or greater");
                }

                // Check if weight already exists (excluding current record)
                var existingWithSamePriority = database.SingleOrDefault<EnumPriorityDto>(
                    "SELECT * FROM ocPowerSortEnumPriority WHERE SortPriority = @0 AND Id != @1",
                    request.SortPriority, id);

                if (existingWithSamePriority != null)
                {
                    throw new ArgumentException($"Sort priority {request.SortPriority} is already in use by '{existingWithSamePriority.Name}'");
                }

                // Check if name already exists (excluding current record)
                var existingWithSameName = database.SingleOrDefault<EnumPriorityDto>(
                    "SELECT * FROM ocPowerSortEnumPriority WHERE Name = @0 AND Id != @1",
                    request.Name.Trim(), id);

                if (existingWithSameName != null)
                {
                    throw new ArgumentException($"Name '{request.Name.Trim()}' is already in use");
                }

                enumPriority.Name = request.Name.Trim();
                enumPriority.SortPriority = request.SortPriority;
                enumPriority.Updated = DateTime.UtcNow;
                enumPriority.UpdatedBy = userId;

                database.Update(enumPriority);

                return new EnumPriorityResponse
                {
                    Id = enumPriority.Id,
                    Name = enumPriority.Name,
                    SortPriority = enumPriority.SortPriority,
                    Created = enumPriority.Created,
                    CreatedByName = GetUserName(enumPriority.CreatedBy),
                    Updated = enumPriority.Updated,
                    UpdatedByName = GetUserName(enumPriority.UpdatedBy)
                };
            });
        }

        [HttpDelete("enum-priorities/{id:guid}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public IActionResult DeleteEnumPriority(Guid id)
        {
            return ExecuteDatabaseOperation(database =>
            {
                var authResult = ValidateUserAccess(out _);
                if (authResult != null)
                    throw new UnauthorizedAccessException();

                var enumPriority = database.SingleOrDefault<EnumPriorityDto>(
                    "SELECT * FROM ocPowerSortEnumPriority WHERE Id = @0", id);

                if (enumPriority == null)
                {
                    throw new KeyNotFoundException("Enum priority not found");
                }

                database.Delete(enumPriority);
                return NoContent();
            });
        }

        /// <summary>
        /// Helper method to get user name by ID
        /// </summary>
        private string GetUserName(int userId)
        {
            var user = userService.GetUserById(userId);
            return user?.Name ?? "Unknown";
        }


    }
}
