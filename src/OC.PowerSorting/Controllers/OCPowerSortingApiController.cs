using System.Net.Http.Json;
using System.Text.Json;
using Asp.Versioning;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using OC.PowerSorting.Controllers.Base;
using OC.PowerSorting.DTOs;
using OC.PowerSorting.Models;
using OC.PowerSorting.Models.Requests;
using OC.PowerSorting.Models.Responses;
using Umbraco.Cms.Api.Management.Routing;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Security;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Infrastructure.Persistence;


namespace OC.PowerSorting.Controllers
{
    [ApiVersion("1.0")]
    [VersionedApiBackOfficeRoute("oc/power-sorting")]
    [ApiExplorerSettings(GroupName = Constants.ApiName)]
    public class OCPowerSortingApiController : PowerSortingControllerBase
    {
        private readonly IEntityService _entityService;
        private readonly IHttpClientFactory _httpClientFactory;
        private const string MENU_ITEMS_KEY = "PowerSortMenuItems_";

        public OCPowerSortingApiController(
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

        #region Menu Items Endpoints

        [HttpGet("menu-items")]
        [ProducesResponseType<MenuItemsResponse>(StatusCodes.Status200OK)]
        public IActionResult GetMenuItems()
        {
            return ExecuteDatabaseOperation(database =>
            {
                var authResult = ValidateUserAccess(out var userId);
                if (authResult != null) throw new UnauthorizedAccessException();

                var key = MENU_ITEMS_KEY + userId;
                var keyValueRow = database.SingleOrDefault<KeyValueDto>(
                    "SELECT * FROM umbracoKeyValue WHERE [key] = @0", key);

                if (keyValueRow == null || string.IsNullOrEmpty(keyValueRow.Value))
                {
                    return new MenuItemsResponse { Items = new List<MenuItemModel>() };
                }

                var items = JsonSerializer.Deserialize<List<MenuItemModel>>(keyValueRow.Value);
                return new MenuItemsResponse { Items = items ?? new List<MenuItemModel>() };
            });
        }

        [HttpPost("menu-items")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public IActionResult SaveMenuItems([FromBody] MenuItemsResponse request)
        {
            return ExecuteDatabaseOperation(database =>
            {
                var authResult = ValidateUserAccess(out var userId);
                if (authResult != null) throw new UnauthorizedAccessException();

                var key = MENU_ITEMS_KEY + userId;
                var value = JsonSerializer.Serialize(request.Items);

                // Check if key exists
                var existing = database.SingleOrDefault<KeyValueDto>(
                    "SELECT * FROM umbracoKeyValue WHERE [key] = @0", key);

                if (existing != null)
                {
                    // Update existing
                    existing.Value = value;
                    existing.Updated = DateTime.UtcNow;
                    database.Update(existing);
                }
                else
                {
                    // Insert new
                    database.Insert(new KeyValueDto
                    {
                        Key = key,
                        Value = value,
                        Updated = DateTime.UtcNow
                    });
                }

                return new { success = true, itemCount = request.Items.Count };
            });
        }

        #endregion

        #region Children and Sorting Endpoints

        [HttpGet("children/{id:guid}")]
        public IActionResult GetChildren(Guid id)
        {
            var authResult = ValidateUserAccess(out _);
            if (authResult != null) return authResult;

            try
            {
                // Get child entities in correct sort order
                var children = _entityService.GetChildren(id, UmbracoObjectTypes.Document);

                var result = children.Select((child, index) =>
                {
                    var content = _contentService.GetById(child.Id);
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
            if (authResult != null) return authResult;

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
                if (validationResult != null) return validationResult;

                // Update sort order for each child
                foreach (var sortItem in request.Sorting)
                {
                    var childContent = _contentService.GetById(sortItem.Id);
                    if (childContent != null && childContent.ParentId == parentContent!.Id)
                    {
                        childContent.SortOrder = sortItem.SortOrder;
                        _contentService.Save(childContent);
                    }
                }

                return SuccessResult("Sort order updated successfully");
            }
            catch (Exception ex)
            {
                return HandleException(ex);
            }
        }

        #endregion

        #region Schedule Endpoints

        [HttpGet("schedules")]
        [ProducesResponseType<ScheduleListResponse>(StatusCodes.Status200OK)]
        public IActionResult GetSchedules([FromQuery] Guid? parentId = null, [FromQuery] bool activeOnly = false)
        {
            return ExecuteDatabaseOperation(database =>
            {
                var sql = "SELECT * FROM ocPowerSortingSchedule WHERE 1=1";
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
                    "SELECT * FROM ocPowerSortingSchedule WHERE Id = @0", id);

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
            if (authResult != null) return authResult;

            // Validation
            var dateValidation = ValidateDateRange(request.StartDateTime, request.EndDateTime);
            if (dateValidation != null) return dateValidation;

            var positionValidation = ValidateTargetPosition(request.TargetPosition);
            if (positionValidation != null) return positionValidation;

            // Verify content exists and relationship
            var contentValidation = ValidateContentExists(request.ContentId, out var content);
            if (contentValidation != null) return contentValidation;

            var parentValidation = ValidateContentExists(request.ParentId, out var parent, "Parent not found");
            if (parentValidation != null) return parentValidation;

            var relationshipValidation = ValidateParentChildRelationship(content!, request.ParentId);
            if (relationshipValidation != null) return relationshipValidation;

            try
            {
                using var database = _databaseFactory.CreateDatabase();
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
            var content = _contentService.GetById(schedule.ContentId);
            var parent = _contentService.GetById(schedule.ParentId);
            var creator = _userService.GetUserById(schedule.CreatedBy);

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
            if (authResult != null) return authResult;

            // Validation
            var dateValidation = ValidateDateRange(request.StartDateTime, request.EndDateTime);
            if (dateValidation != null) return dateValidation;

            var positionValidation = ValidateTargetPosition(request.TargetPosition);
            if (positionValidation != null) return positionValidation;

            return ExecuteDatabaseOperation(database =>
            {
                var schedule = database.SingleOrDefault<SortScheduleDto>(
                    "SELECT * FROM ocPowerSortingSchedule WHERE Id = @0", id);

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
                    "SELECT * FROM ocPowerSortingSchedule WHERE Id = @0", id);

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
                    @"SELECT * FROM ocPowerSortingSchedule 
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

        #endregion

        #region Default Sort Order Endpoints

        [HttpGet("default-sort-order/{parentId:guid}")]
        [ProducesResponseType<DefaultSortOrderResponse>(StatusCodes.Status200OK)]
        public IActionResult GetDefaultSortOrder(Guid parentId)
        {
            return ExecuteDatabaseOperation(database =>
            {
                var defaultOrders = database.Fetch<DefaultSortOrderDto>(
                    "SELECT * FROM ocPowerSortingDefaultOrder WHERE ParentId = @0 ORDER BY SortOrder",
                    parentId);

                var parent = _contentService.GetById(parentId);

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
                if (authResult != null) throw new UnauthorizedAccessException();

                var parent = _contentService.GetById(request.ParentId);
                if (parent == null)
                {
                    throw new ArgumentException("Parent not found");
                }

                // Get current children in their current sort order
                var children = _contentService.GetPagedChildren(parent.Id, 0, int.MaxValue, out _)
                    .OrderBy(c => c.SortOrder)
                    .ToList();

                // Delete existing default order for this parent
                database.Execute(
                    "DELETE FROM ocPowerSortingDefaultOrder WHERE ParentId = @0",
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
            });
        }

        [HttpPost("default-sort-order/restore/{parentId:guid}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> RestoreDefaultSortOrder(Guid parentId)
        {
            var authResult = ValidateUserAccess(out var userId);
            if (authResult != null) return authResult;

            try
            {
                var parent = _contentService.GetById(parentId);
                if (parent == null)
                {
                    return BadRequest(new { error = "Parent not found" });
                }

                using var database = _databaseFactory.CreateDatabase();

                // Get default order
                var defaultOrders = database.Fetch<DefaultSortOrderDto>(
                    "SELECT * FROM ocPowerSortingDefaultOrder WHERE ParentId = @0 ORDER BY SortOrder",
                    parentId);

                if (!defaultOrders.Any())
                {
                    return BadRequest(new { error = "No default sort order has been saved for this parent" });
                }

                // Get current children
                var children = _contentService.GetPagedChildren(parent.Id, 0, int.MaxValue, out _)
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
                            _contentService.Save(child);
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
                    "DELETE FROM ocPowerSortingDefaultOrder WHERE ParentId = @0",
                    parentId);

                return NoContent();
            });
        }

        #endregion

        #region Manual Schedule Processing (for testing)

        [HttpPost("schedules/process-now")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> ProcessSchedulesNow()
        {
            try
            {
                var user = _backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser;
                if (user == null)
                {
                    return Unauthorized();
                }

                using var database = _databaseFactory.CreateDatabase();
                var now = DateTime.UtcNow;

                // Get all schedules that should be active
                var activeSchedules = database.Fetch<SortScheduleDto>(
                    @"SELECT * FROM ocPowerSortingSchedule 
                      WHERE StartDateTime <= @0 
                      AND EndDateTime > @0",
                    now);

                // Group by parent
                var schedulesByParent = activeSchedules.GroupBy(s => s.ParentId);
                var processedParents = new List<object>();

                foreach (var parentGroup in schedulesByParent)
                {
                    var parentId = parentGroup.Key;
                    var parent = _contentService.GetById(parentId);
                    
                    if (parent == null)
                    {
                        processedParents.Add(new
                        {
                            ParentId = parentId,
                            Error = "Parent not found",
                            Schedules = parentGroup.Count()
                        });
                        continue;
                    }

                    var children = _contentService.GetPagedChildren(parent.Id, 0, int.MaxValue, out _)
                        .OrderBy(c => c.SortOrder)
                        .ToList();

                    var schedulesApplied = new List<object>();

                    foreach (var schedule in parentGroup.OrderByDescending(s => s.Priority))
                    {
                        var content = children.FirstOrDefault(c => c.Key == schedule.ContentId);
                        
                        schedulesApplied.Add(new
                        {
                            ScheduleId = schedule.Id,
                            schedule.ContentId,
                            ContentName = content?.Name ?? "Not Found",
                            schedule.TargetPosition,
                            CurrentPosition = children.FindIndex(c => c.Key == schedule.ContentId),
                            schedule.IsActive,
                            schedule.Priority
                        });
                    }

                    processedParents.Add(new
                    {
                        ParentId = parentId,
                        ParentName = parent.Name,
                        ChildCount = children.Count,
                        ScheduleCount = parentGroup.Count(),
                        Schedules = schedulesApplied
                    });
                }

                return Ok(new
                {
                    CurrentTime = now,
                    ProcessedParents = processedParents.Count,
                    TotalSchedules = activeSchedules.Count,
                    Details = processedParents,
                    Message = "This is a diagnostic endpoint. The actual processing happens in the background service every minute."
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message, stackTrace = ex.StackTrace });
            }
        }

        #endregion

    }

}
