using Asp.Versioning;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using OC.PowerSort.Controllers.Base;
using OC.PowerSort.Models;
using OC.PowerSort.Models.Requests;
using Umbraco.Cms.Api.Management.Routing;
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
            IUserService userService)
            : base(backOfficeSecurityAccessor, databaseFactory, contentService, userService)
        {
            _entityService = entityService;

        }

        [HttpGet("children/{id:guid}")]
        public IActionResult GetChildren(Guid id)
        {
            var authResult = ValidateUserAccess(out _);
            if (authResult != null)
            {
                return authResult;
            }


            try
            {
                // Get child entities in correct sort order
                var children = _entityService.GetChildren(id, UmbracoObjectTypes.Document);

                var result = children.Select((child, index) =>
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
                });

                return Ok(new
                {
                    Total = result.Count(),
                    Items = result
                });
            }
            catch (Exception ex)
            {
                return HandleException(ex);
            }
        }

        [HttpPut("sort/document")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public IActionResult SortDocument([FromBody] SortDocumentRequest request)
        {
            var authResult = ValidateUserAccess(out _);
            if (authResult != null)
            { return authResult; }

            if (request.Parent?.Id == null)
            {
                return BadRequest(new { error = "Parent ID is required" });
            }

            if (request.Sorting == null || !request.Sorting.Any())
            {
                return BadRequest(new { error = "Sorting array is required" });
            }

            try
            {
                // Validate parent exists
                var validationResult = ValidateContentExists(request.Parent.Id, out var parentContent);
                if (validationResult != null)
                    return validationResult;

                // Update sort order for each child
                foreach (var sortItem in request.Sorting)
                {
                    var childContent = contentService.GetById(sortItem.Id);
                    if (childContent != null && childContent.ParentId == parentContent!.Id)
                    {
                        childContent.SortOrder = sortItem.SortOrder;
                        contentService.Save(childContent);
                    }
                }

                return SuccessResult("Sort order updated successfully");
            }
            catch (Exception ex)
            {
                return HandleException(ex);
            }
        }
        #region Default Sort Order Endpoints

        [HttpGet("default-sort-order/{parentId:guid}")]
        [ProducesResponseType<DefaultSortOrderResponse>(StatusCodes.Status200OK)]
        public IActionResult GetDefaultSortOrder(Guid parentId)
        {
            return ExecuteDatabaseOperation(database =>
            {
                var defaultOrders = database.Fetch<DefaultSortOrderDto>(
                    "SELECT * FROM ocPowerSortDefaultOrder WHERE ParentId = @0 ORDER BY SortOrder",
                    parentId);

                var parent = contentService.GetById(parentId);

                if (defaultOrders.Any())
                {
                    var first = defaultOrders.First();
                    return new DefaultSortOrderResponse
                    {
                        ParentId = parentId,
                        ParentName = parent?.Name ?? "Unknown",
                        ItemCount = defaultOrders.Count,
                        Created = first.Created,
                        Updated = defaultOrders.Max(d => d.Updated),
                        IsSet = true
                    };
                }

                return new DefaultSortOrderResponse
                {
                    ParentId = parentId,
                    ParentName = parent?.Name ?? "Unknown",
                    ItemCount = 0,
                    Created = DateTime.MinValue,
                    Updated = DateTime.MinValue,
                    IsSet = false
                };
            });
        }

        [HttpPost("default-sort-order/save")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public IActionResult SaveCurrentAsDefault([FromBody] SaveDefaultSortOrderRequest request)
        {
            return ExecuteDatabaseOperation(database =>
            {
                var authResult = ValidateUserAccess(out var userId);
                if (authResult != null)
                {
                    throw new UnauthorizedAccessException();
                }

                var parent = contentService.GetById(request.ParentId);
                if (parent != null)
                {
                    // Get current children in their current sort order
                    var children = contentService.GetPagedChildren(parent.Id, 0, int.MaxValue, out _)
                        .OrderBy(c => c.SortOrder)
                        .ToList();

                    // Delete existing default order for this parent
                    database.Execute(
                        "DELETE FROM ocPowerSortDefaultOrder WHERE ParentId = @0",
                        request.ParentId);

                    // Save current order as default
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

                    return new
                    {
                        success = true,
                        message = $"Saved default sort order for {children.Count} items",
                        itemCount = children.Count
                    };
                }

                throw new ArgumentException("Parent not found");
            });
        }

        [HttpPost("default-sort-order/restore/{parentId:guid}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> RestoreDefaultSortOrder(Guid parentId)
        {
            var authResult = ValidateUserAccess(out var userId);
            if (authResult != null)
            {
                return authResult;
            }

            try
            {
                var parent = contentService.GetById(parentId);
                if (parent == null)
                {
                    return BadRequest(new { error = "Parent not found" });
                }

                using var database = databaseFactory.CreateDatabase();

                // Get default order
                var defaultOrders = database.Fetch<DefaultSortOrderDto>(
                    "SELECT * FROM ocPowerSortDefaultOrder WHERE ParentId = @0 ORDER BY SortOrder",
                    parentId);

                if (!defaultOrders.Any())
                {
                    return BadRequest(new { error = "No default sort order has been saved for this parent" });
                }

                // Get current children
                var children = contentService.GetPagedChildren(parent.Id, 0, int.MaxValue, out _)
                    .ToDictionary(c => c.Key, c => c);

                var updatedCount = 0;

                // Apply default order
                foreach (var defaultOrder in defaultOrders)
                {
                    if (children.TryGetValue(defaultOrder.ContentId, out var child))
                    {
                        if (child.SortOrder != defaultOrder.SortOrder)
                        {
                            child.SortOrder = defaultOrder.SortOrder;
                            contentService.Save(child);
                            updatedCount++;
                        }
                    }
                }

                return Ok(new
                {
                    success = true,
                    message = "Restored default sort order",
                    totalItems = defaultOrders.Count,
                    updatedItems = updatedCount
                });
            }
            catch (Exception ex)
            {
                return HandleException(ex);
            }
        }

        [HttpDelete("default-sort-order/{parentId:guid}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        public IActionResult ClearDefaultSortOrder(Guid parentId)
        {
            return ExecuteDatabaseOperation(database =>
            {
                database.Execute(
                    "DELETE FROM ocPowerSortDefaultOrder WHERE ParentId = @0",
                    parentId);

                return NoContent();
            });
        }

        #endregion


    }
}
