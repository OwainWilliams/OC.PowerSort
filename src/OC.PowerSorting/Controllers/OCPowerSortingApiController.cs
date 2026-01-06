using System.Net.Http.Json;
using System.Text.Json;
using Asp.Versioning;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using OC.PowerSorting.DTOs;
using OC.PowerSorting.Models;
using OC.PowerSorting.Models.Requests;
using OC.PowerSorting.Models.Responses;
using Umbraco.Cms.Api.Management.Controllers;
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
    public class OCPowerSortingApiController : ManagementApiControllerBase
    {
        private readonly IBackOfficeSecurityAccessor _backOfficeSecurityAccessor;
        private readonly IUmbracoDatabaseFactory _databaseFactory;
        private readonly IEntityService _entityService;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IContentService _contentService;
        private readonly IUserService _userService;

        private const string MENU_ITEMS_KEY = "PowerSortMenuItems_";

        public OCPowerSortingApiController(
            IBackOfficeSecurityAccessor backOfficeSecurityAccessor,
            IUmbracoDatabaseFactory databaseFactory,
            IHttpClientFactory httpClientFactory,
            IEntityService entityService,
            IContentService contentService,
            IUserService userService)
        {
            _backOfficeSecurityAccessor = backOfficeSecurityAccessor;
            _databaseFactory = databaseFactory;
            _httpClientFactory = httpClientFactory;
            _entityService = entityService;
            _contentService = contentService;
            _userService = userService;
        }

        #region Menu Items Endpoints

        [HttpGet("menu-items")]
        [ProducesResponseType<MenuItemsResponse>(StatusCodes.Status200OK)]
        public IActionResult GetMenuItems()
        {
            try
            {
                var currentUser = _backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser;
                if (currentUser == null)
                {
                    return Unauthorized();
                }

                var key = MENU_ITEMS_KEY + currentUser.Id;

                using var database = _databaseFactory.CreateDatabase();
                var keyValueRow = database.SingleOrDefault<KeyValueDto>(
                    "SELECT * FROM umbracoKeyValue WHERE [key] = @0", key);

                if (keyValueRow == null || string.IsNullOrEmpty(keyValueRow.Value))
                {
                    return Ok(new MenuItemsResponse { Items = new List<MenuItemModel>() });
                }

                var items = JsonSerializer.Deserialize<List<MenuItemModel>>(keyValueRow.Value);
                return Ok(new MenuItemsResponse { Items = items ?? new List<MenuItemModel>() });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message, stackTrace = ex.StackTrace });
            }
        }

        [HttpPost("menu-items")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public IActionResult SaveMenuItems([FromBody] MenuItemsResponse request)
        {
            try
            {
                var currentUser = _backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser;
                if (currentUser == null)
                {
                    return Unauthorized();
                }

                var key = MENU_ITEMS_KEY + currentUser.Id;
                var value = JsonSerializer.Serialize(request.Items);

                using var database = _databaseFactory.CreateDatabase();

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

                return Ok(new { success = true, itemCount = request.Items.Count });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message, stackTrace = ex.StackTrace });
            }
        }

        #endregion

        #region Children and Sorting Endpoints

        [HttpGet("children/{id:guid}")]
        public IActionResult GetChildren(Guid id)
        {
            var user = _backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser;
            if (user == null)
            {
                return Unauthorized();
            }
            

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

        [HttpPut("sort/document")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public IActionResult SortDocument([FromBody] SortDocumentRequest request)
        {
            try
            {
                var user = _backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser;
                if (user == null)
                {
                    return Unauthorized();
                }

                if (request.Parent?.Id == null)
                {
                    return BadRequest(new { error = "Parent ID is required" });
                }

                if (request.Sorting == null || !request.Sorting.Any())
                {
                    return BadRequest(new { error = "Sorting array is required" });
                }

                // Get parent content
                var parentContent = _contentService.GetById(request.Parent.Id);
                if (parentContent == null)
                {
                    return NotFound(new { error = "Parent document not found" });
                }

                // Update sort order for each child
                foreach (var sortItem in request.Sorting)
                {
                    var childContent = _contentService.GetById(sortItem.Id);
                    if (childContent != null && childContent.ParentId == parentContent.Id)
                    {
                        childContent.SortOrder = sortItem.SortOrder;
                        _contentService.Save(childContent);
                    }
                }

                return Ok(new { success = true, message = "Sort order updated successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message, stackTrace = ex.StackTrace });
            }
        }

        #endregion

        #region Schedule Endpoints

        [HttpGet("schedules")]
        [ProducesResponseType<ScheduleListResponse>(StatusCodes.Status200OK)]
        public IActionResult GetSchedules([FromQuery] Guid? parentId = null, [FromQuery] bool activeOnly = false)
        {
            try
            {
                var user = _backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser;
                if (user == null)
                {
                    return Unauthorized();
                }

                using var database = _databaseFactory.CreateDatabase();
                
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

                var items = schedules.Select(s =>
                {
                    var content = _contentService.GetById(s.ContentId);
                    var parent = _contentService.GetById(s.ParentId);
                    var creator = _userService.GetUserById(s.CreatedBy);

                    return new ScheduleResponse
                    {
                        Id = s.Id,
                        ContentId = s.ContentId,
                        ContentName = content?.Name ?? "Unknown",
                        ParentId = s.ParentId,
                        ParentName = parent?.Name ?? "Unknown",
                        TargetPosition = s.TargetPosition,
                        StartDateTime = s.StartDateTime,
                        EndDateTime = s.EndDateTime,
                        IsActive = s.IsActive,
                        IsCurrentlyActive = s.IsActive && now >= s.StartDateTime && now < s.EndDateTime,
                        Priority = s.Priority,
                        Created = s.Created,
                        CreatedByName = creator?.Name ?? "Unknown"
                    };
                }).ToList();

                return Ok(new ScheduleListResponse
                {
                    Total = items.Count,
                    Items = items
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message, stackTrace = ex.StackTrace });
            }
        }

        [HttpGet("schedules/{id:guid}")]
        [ProducesResponseType<ScheduleResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public IActionResult GetSchedule(Guid id)
        {
            try
            {
                var user = _backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser;
                if (user == null)
                {
                    return Unauthorized();
                }

                using var database = _databaseFactory.CreateDatabase();
                var schedule = database.SingleOrDefault<SortScheduleDto>(
                    "SELECT * FROM ocPowerSortingSchedule WHERE Id = @0", id);

                if (schedule == null)
                {
                    return NotFound(new { error = "Schedule not found" });
                }

                var content = _contentService.GetById(schedule.ContentId);
                var parent = _contentService.GetById(schedule.ParentId);
                var creator = _userService.GetUserById(schedule.CreatedBy);
                var now = DateTime.UtcNow;

                var response = new ScheduleResponse
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

                return Ok(response);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message, stackTrace = ex.StackTrace });
            }
        }

        [HttpPost("schedules")]
        [ProducesResponseType<ScheduleResponse>(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public IActionResult CreateSchedule([FromBody] CreateScheduleRequest request)
        {
            try
            {
                var user = _backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser;
                if (user == null)
                {
                    return Unauthorized();
                }

                // Validation
                if (request.StartDateTime >= request.EndDateTime)
                {
                    return BadRequest(new { error = "End date must be after start date" });
                }

                if (request.TargetPosition < 0)
                {
                    return BadRequest(new { error = "Target position must be non-negative" });
                }

                // Verify content exists
                var content = _contentService.GetById(request.ContentId);
                if (content == null)
                {
                    return BadRequest(new { error = "Content not found" });
                }

                var parent = _contentService.GetById(request.ParentId);
                if (parent == null)
                {
                    return BadRequest(new { error = "Parent not found" });
                }

                // Verify content is child of parent
                if (content.ParentId != parent.Id)
                {
                    return BadRequest(new { error = "Content is not a child of the specified parent" });
                }

                using var database = _databaseFactory.CreateDatabase();
                var schedule = new SortScheduleDto
                {
                    Id = Guid.NewGuid(),
                    ContentId = request.ContentId,
                    ParentId = request.ParentId,
                    TargetPosition = request.TargetPosition,
                    StartDateTime = request.StartDateTime,
                    EndDateTime = request.EndDateTime,
                    IsActive = false, // Will be activated by background service
                    Priority = request.Priority,
                    Created = DateTime.UtcNow,
                    CreatedBy = user.Id
                };

                database.Insert(schedule);

                var response = new ScheduleResponse
                {
                    Id = schedule.Id,
                    ContentId = schedule.ContentId,
                    ContentName = content.Name ?? "Unknown",
                    ParentId = schedule.ParentId,
                    ParentName = parent.Name ?? "Unknown",
                    TargetPosition = schedule.TargetPosition,
                    StartDateTime = schedule.StartDateTime,
                    EndDateTime = schedule.EndDateTime,
                    IsActive = schedule.IsActive,
                    IsCurrentlyActive = false,
                    Priority = schedule.Priority,
                    Created = schedule.Created,
                    CreatedByName = user.Name?? "Unknown"
                };

                return CreatedAtAction(nameof(GetSchedule), new { id = schedule.Id }, response);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message, stackTrace = ex.StackTrace });
            }
        }

        [HttpPut("schedules/{id:guid}")]
        [ProducesResponseType<ScheduleResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public IActionResult UpdateSchedule(Guid id, [FromBody] UpdateScheduleRequest request)
        {
            try
            {
                var user = _backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser;
                if (user == null)
                {
                    return Unauthorized();
                }

                // Validation
                if (request.StartDateTime >= request.EndDateTime)
                {
                    return BadRequest(new { error = "End date must be after start date" });
                }

                if (request.TargetPosition < 0)
                {
                    return BadRequest(new { error = "Target position must be non-negative" });
                }

                using var database = _databaseFactory.CreateDatabase();
                var schedule = database.SingleOrDefault<SortScheduleDto>(
                    "SELECT * FROM ocPowerSortingSchedule WHERE Id = @0", id);

                if (schedule == null)
                {
                    return NotFound(new { error = "Schedule not found" });
                }

                schedule.TargetPosition = request.TargetPosition;
                schedule.StartDateTime = request.StartDateTime;
                schedule.EndDateTime = request.EndDateTime;
                schedule.Priority = request.Priority;

                database.Update(schedule);

                var content = _contentService.GetById(schedule.ContentId);
                var parent = _contentService.GetById(schedule.ParentId);
                var creator = _userService.GetUserById(schedule.CreatedBy);
                var now = DateTime.UtcNow;

                var response = new ScheduleResponse
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

                return Ok(response);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message, stackTrace = ex.StackTrace });
            }
        }

        [HttpDelete("schedules/{id:guid}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public IActionResult DeleteSchedule(Guid id)
        {
            try
            {
                var user = _backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser;
                if (user == null)
                {
                    return Unauthorized();
                }

                using var database = _databaseFactory.CreateDatabase();
                var schedule = database.SingleOrDefault<SortScheduleDto>(
                    "SELECT * FROM ocPowerSortingSchedule WHERE Id = @0", id);

                if (schedule == null)
                {
                    return NotFound(new { error = "Schedule not found" });
                }

                database.Delete(schedule);

                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message, stackTrace = ex.StackTrace });
            }
        }

        [HttpGet("schedules/active/{parentId:guid}")]
        [ProducesResponseType<List<ActiveScheduleInfo>>(StatusCodes.Status200OK)]
        public IActionResult GetActiveSchedules(Guid parentId)
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

                var activeSchedules = database.Fetch<SortScheduleDto>(
                    @"SELECT * FROM ocPowerSortingSchedule 
                      WHERE ParentId = @0 
                      AND IsActive = 1 
                      AND StartDateTime <= @1 
                      AND EndDateTime > @1
                      ORDER BY Priority DESC, StartDateTime ASC",
                    parentId, now);

                var result = activeSchedules.Select(s => new ActiveScheduleInfo
                {
                    ScheduleId = s.Id,
                    ContentId = s.ContentId,
                    TargetPosition = s.TargetPosition,
                    EndDateTime = s.EndDateTime,
                    Priority = s.Priority
                }).ToList();

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message, stackTrace = ex.StackTrace });
            }
        }

        #endregion

        #region Default Sort Order Endpoints

        [HttpGet("default-sort-order/{parentId:guid}")]
        [ProducesResponseType<DefaultSortOrderResponse>(StatusCodes.Status200OK)]
        public IActionResult GetDefaultSortOrder(Guid parentId)
        {
            try
            {
                var user = _backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser;
                if (user == null)
                {
                    return Unauthorized();
                }

                using var database = _databaseFactory.CreateDatabase();
                
                var defaultOrders = database.Fetch<DefaultSortOrderDto>(
                    "SELECT * FROM ocPowerSortingDefaultOrder WHERE ParentId = @0 ORDER BY SortOrder",
                    parentId);

                var parent = _contentService.GetById(parentId);

                if (defaultOrders.Any())
                {
                    var first = defaultOrders.First();
                    return Ok(new DefaultSortOrderResponse
                    {
                        ParentId = parentId,
                        ParentName = parent?.Name ?? "Unknown",
                        ItemCount = defaultOrders.Count,
                        Created = first.Created,
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
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message, stackTrace = ex.StackTrace });
            }
        }

        [HttpPost("default-sort-order/save")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public IActionResult SaveCurrentAsDefault([FromBody] SaveDefaultSortOrderRequest request)
        {
            try
            {
                var user = _backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser;
                if (user == null)
                {
                    return Unauthorized();
                }

                var parent = _contentService.GetById(request.ParentId);
                if (parent == null)
                {
                    return NotFound(new { error = "Parent not found" });
                }

                // Get current children in their current sort order
                var children = _contentService.GetPagedChildren(parent.Id, 0, int.MaxValue, out _)
                    .OrderBy(c => c.SortOrder)
                    .ToList();

                using var database = _databaseFactory.CreateDatabase();

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
                        CreatedBy = user.Id,
                        Updated = now
                    });
                }

                return Ok(new
                {
                    success = true,
                    message = $"Saved default sort order for {children.Count} items",
                    itemCount = children.Count
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message, stackTrace = ex.StackTrace });
            }
        }

        [HttpPost("default-sort-order/restore/{parentId:guid}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public IActionResult RestoreDefaultSortOrder(Guid parentId)
        {
            try
            {
                var user = _backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser;
                if (user == null)
                {
                    return Unauthorized();
                }

                var parent = _contentService.GetById(parentId);
                if (parent == null)
                {
                    return NotFound(new { error = "Parent not found" });
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
                    message = $"Restored default sort order",
                    totalItems = defaultOrders.Count,
                    updatedItems = updatedCount
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message, stackTrace = ex.StackTrace });
            }
        }

        [HttpDelete("default-sort-order/{parentId:guid}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        public IActionResult ClearDefaultSortOrder(Guid parentId)
        {
            try
            {
                var user = _backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser;
                if (user == null)
                {
                    return Unauthorized();
                }

                using var database = _databaseFactory.CreateDatabase();
                database.Execute(
                    "DELETE FROM ocPowerSortingDefaultOrder WHERE ParentId = @0",
                    parentId);

                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message, stackTrace = ex.StackTrace });
            }
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
