using Asp.Versioning;
using Umbraco.Cms.Core.Security.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using OC.PowerSort.Controllers.Base;
using OC.PowerSort.Models;
using OC.PowerSort.Models.Requests;
using Umbraco.Cms.Api.Management.Routing;
using Umbraco.Cms.Core.Actions;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Security;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Infrastructure.Persistence;

namespace OC.PowerSort.Controllers
{
    [ApiVersion("1.0")]
    [VersionedApiBackOfficeRoute("oc/power-sort")]
    [ApiExplorerSettings(GroupName = Constants.ApiName)]
    public class ChildrenAndSortingApiController : PowerSortControllerBase
    {
        private readonly IEntityService _entityService;

        public ChildrenAndSortingApiController(
            IBackOfficeSecurityAccessor backOfficeSecurityAccessor,
            IUmbracoDatabaseFactory databaseFactory,
            IEntityService entityService,
            IContentService contentService,
            IUserService userService,
            IContentPermissionAuthorizer contentPermissionAuthorizer,
            ILogger<ChildrenAndSortingApiController> logger)
            : base(backOfficeSecurityAccessor, databaseFactory, contentService, userService, contentPermissionAuthorizer, logger)
        {
            _entityService = entityService;
        }

        [HttpGet("children/{id:guid}")]
        public Task<IActionResult> GetChildren(Guid id)
        {
            return ExecuteAsync(async _ =>
            {
                var forbidden = await AuthorizeContentAsync(ActionBrowse.ActionLetter, id);
                if (forbidden != null)
                    return forbidden;

                // Get child entities in correct sort order
                var children = _entityService.GetChildren(id, UmbracoObjectTypes.Document).ToList();

                var items = children.Select((child, index) =>
                {
                    var content = contentService.GetById(child.Id);
                    return new
                    {
                        Id = child.Key,
                        Name = content?.Name ?? "Unnamed",
                        SortOrder = index,
                        DocumentType = new
                        {
                            Id = content?.ContentType.Key,
                            content?.ContentType.Icon
                        },
                        child.HasChildren,
                        content?.CreateDate
                    };
                }).ToList();

                return Ok(new
                {
                    Total = items.Count,
                    Items = items
                });
            });
        }

        [HttpPut("sort/document")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public Task<IActionResult> SortDocument([FromBody] SortDocumentRequest request)
        {
            return ExecuteAsync(async userId =>
            {
                if (request.Parent == null || request.Parent.Id == Guid.Empty)
                {
                    return BadRequest(new { error = "Parent ID is required" });
                }

                if (request.Sorting == null || request.Sorting.Count == 0)
                {
                    return BadRequest(new { error = "Sorting array is required" });
                }

                var notFound = ValidateContentExists(request.Parent.Id, out var parent, "Parent not found");
                if (notFound != null)
                    return notFound;

                var forbidden = await AuthorizeContentAsync(ActionSort.ActionLetter, request.Parent.Id);
                if (forbidden != null)
                    return forbidden;

                var orderedKeys = request.Sorting
                    .OrderBy(s => s.SortOrder)
                    .Select(s => s.Id);

                var changed = ApplySortOrder(parent!, orderedKeys, userId);

                return SuccessResult("Sort order updated successfully", new { updatedItems = changed });
            });
        }

        #region Default Sort Order Endpoints

        [HttpGet("default-sort-order/{parentId:guid}")]
        [ProducesResponseType<DefaultSortOrderResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public Task<IActionResult> GetDefaultSortOrder(Guid parentId)
        {
            return ExecuteAsync(async (database, _) =>
            {
                var forbidden = await AuthorizeContentAsync(ActionBrowse.ActionLetter, parentId);
                if (forbidden != null)
                    return forbidden;

                var defaultOrders = database.Fetch<DefaultSortOrderDto>(
                    "SELECT * FROM ocPowerSortDefaultOrder WHERE ParentId = @0 ORDER BY SortOrder",
                    parentId);

                var parent = contentService.GetById(parentId);

                if (defaultOrders.Count > 0)
                {
                    return Ok(new DefaultSortOrderResponse
                    {
                        ParentId = parentId,
                        ParentName = parent?.Name ?? "Unknown",
                        ItemCount = defaultOrders.Count,
                        Created = defaultOrders[0].Created,
                        Updated = defaultOrders.Max(d => d.Updated),
                        IsSet = true
                    });
                }

                return Ok(new DefaultSortOrderResponse
                {
                    ParentId = parentId,
                    ParentName = parent?.Name ?? "Unknown",
                    ItemCount = 0,
                    Created = DateTime.MinValue,
                    Updated = DateTime.MinValue,
                    IsSet = false
                });
            });
        }

        [HttpPost("default-sort-order/save")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public Task<IActionResult> SaveCurrentAsDefault([FromBody] SaveDefaultSortOrderRequest request)
        {
            return ExecuteAsync(async (database, userId) =>
            {
                var notFound = ValidateContentExists(request.ParentId, out var parent, "Parent not found");
                if (notFound != null)
                    return notFound;

                var forbidden = await AuthorizeContentAsync(ActionSort.ActionLetter, request.ParentId);
                if (forbidden != null)
                    return forbidden;

                // Get current children in their current sort order
                var children = GetOrderedChildren(parent!);

                // Replace any existing default order for this parent
                database.Execute(
                    "DELETE FROM ocPowerSortDefaultOrder WHERE ParentId = @0",
                    request.ParentId);

                var now = DateTime.UtcNow;
                foreach (var child in children)
                {
                    database.Insert(new DefaultSortOrderDto
                    {
                        Id = Guid.NewGuid(),
                        ParentId = request.ParentId,
                        ContentId = child.Key,
                        SortOrder = child.SortOrder,
                        Created = now,
                        CreatedBy = userId,
                        Updated = now
                    });
                }

                return Ok(new
                {
                    success = true,
                    message = $"Saved default sort order for {children.Count} items",
                    itemCount = children.Count
                });
            });
        }

        [HttpPost("default-sort-order/restore/{parentId:guid}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public Task<IActionResult> RestoreDefaultSortOrder(Guid parentId)
        {
            return ExecuteAsync(async (database, userId) =>
            {
                var notFound = ValidateContentExists(parentId, out var parent, "Parent not found");
                if (notFound != null)
                    return notFound;

                var forbidden = await AuthorizeContentAsync(ActionSort.ActionLetter, parentId);
                if (forbidden != null)
                    return forbidden;

                var defaultOrders = database.Fetch<DefaultSortOrderDto>(
                    "SELECT * FROM ocPowerSortDefaultOrder WHERE ParentId = @0 ORDER BY SortOrder",
                    parentId);

                if (defaultOrders.Count == 0)
                {
                    return BadRequest(new { error = "No default sort order has been saved for this parent" });
                }

                var updatedCount = ApplySortOrder(parent!, defaultOrders.Select(d => d.ContentId), userId);

                return Ok(new
                {
                    success = true,
                    message = "Restored default sort order",
                    totalItems = defaultOrders.Count,
                    updatedItems = updatedCount
                });
            });
        }

        [HttpDelete("default-sort-order/{parentId:guid}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public Task<IActionResult> ClearDefaultSortOrder(Guid parentId)
        {
            return ExecuteAsync(async (database, _) =>
            {
                var forbidden = await AuthorizeContentAsync(ActionSort.ActionLetter, parentId);
                if (forbidden != null)
                    return forbidden;

                database.Execute(
                    "DELETE FROM ocPowerSortDefaultOrder WHERE ParentId = @0",
                    parentId);

                return NoContent();
            });
        }

        #endregion
    }
}
