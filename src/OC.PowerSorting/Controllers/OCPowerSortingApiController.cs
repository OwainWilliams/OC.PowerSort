using System.Net.Http.Json;
using System.Text.Json;
using Asp.Versioning;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using OC.PowerSorting.Controllers.Base;
using OC.PowerSorting.DTOs;
using OC.PowerSorting.FlagProvider;
using OC.PowerSorting.Models;
using OC.PowerSorting.Models.Requests;
using OC.PowerSorting.Models.Responses;
using OC.PowerSorting.Services;
using Umbraco.Cms.Api.Management.Routing;
using Umbraco.Cms.Api.Management.Services.Flags;
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
                if (authResult != null) throw new UnauthorizedAccessException();

                var parent = contentService.GetById(request.ParentId);
                if (parent == null)
                {
                    throw new ArgumentException("Parent not found");
                }

                // Get current children in their current sort order
                var children = contentService.GetPagedChildren(parent.Id, 0, int.MaxValue, out _)
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
                var parent = contentService.GetById(parentId);
                if (parent == null)
                {
                    return BadRequest(new { error = "Parent not found" });
                }

                using var database = databaseFactory.CreateDatabase();

                // Get default order
                var defaultOrders = database.Fetch<DefaultSortOrderDto>(
                    "SELECT * FROM ocPowerSortingDefaultOrder WHERE ParentId = @0 ORDER BY SortOrder",
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
                    "DELETE FROM ocPowerSortingDefaultOrder WHERE ParentId = @0",
                    parentId);

                return NoContent();
            });
        }

        #endregion

        #region Enum Priority Endpoints

        [HttpGet("enum-priorities")]
        [ProducesResponseType<EnumPriorityListResponse>(StatusCodes.Status200OK)]
        public IActionResult GetEnumPriorities([FromQuery] int skip = 0, [FromQuery] int take = 100)
        {
            return ExecuteDatabaseOperation(database =>
            {
                var authResult = ValidateUserAccess(out _);
                if (authResult != null) throw new UnauthorizedAccessException();

                var sql = "SELECT * FROM ocPowerSortingEnumPriority ORDER BY SortPriority ASC, Name ASC";
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
                if (authResult != null) throw new UnauthorizedAccessException();

                var enumPriority = database.SingleOrDefault<EnumPriorityDto>(
                    "SELECT * FROM ocPowerSortingEnumPriority WHERE Id = @0", id);

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
                if (authResult != null) throw new UnauthorizedAccessException();

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
                    "SELECT * FROM ocPowerSortingEnumPriority WHERE SortPriority = @0", request.SortPriority);

                if (existingWithSamePriority != null)
                {
                    throw new ArgumentException($"Sort priority {request.SortPriority} is already in use by '{existingWithSamePriority.Name}'");
                }

                // Check if name already exists
                var existingWithSameName = database.SingleOrDefault<EnumPriorityDto>(
                    "SELECT * FROM ocPowerSortingEnumPriority WHERE Name = @0", request.Name.Trim());

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
                if (authResult != null) throw new UnauthorizedAccessException();

                var enumPriority = database.SingleOrDefault<EnumPriorityDto>(
                    "SELECT * FROM ocPowerSortingEnumPriority WHERE Id = @0", id);

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
                    "SELECT * FROM ocPowerSortingEnumPriority WHERE SortPriority = @0 AND Id != @1", 
                    request.SortPriority, id);

                if (existingWithSamePriority != null)
                {
                    throw new ArgumentException($"Sort priority {request.SortPriority} is already in use by '{existingWithSamePriority.Name}'");
                }

                // Check if name already exists (excluding current record)
                var existingWithSameName = database.SingleOrDefault<EnumPriorityDto>(
                    "SELECT * FROM ocPowerSortingEnumPriority WHERE Name = @0 AND Id != @1", 
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
                if (authResult != null) throw new UnauthorizedAccessException();

                var enumPriority = database.SingleOrDefault<EnumPriorityDto>(
                    "SELECT * FROM ocPowerSortingEnumPriority WHERE Id = @0", id);

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

        #endregion

        #region Manual Schedule Processing (for testing)

        [HttpPost("schedules/process-now")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> ProcessSchedulesNow()
        {
            try
            {
                var user = backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser;
                if (user == null)
                {
                    return Unauthorized();
                }

                using var database = databaseFactory.CreateDatabase();
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
                    var parent = contentService.GetById(parentId);
                    
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

                    var children = contentService.GetPagedChildren(parent.Id, 0, int.MaxValue, out _)
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

        #region Flag Testing (Remove in production)

        [HttpGet("test-flags/{documentId:guid}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> TestFlags(Guid documentId)
        {
            try
            {
                using var database = databaseFactory.CreateDatabase();
                
                // Test flag service directly
                var flagService = HttpContext.RequestServices.GetRequiredService<ISortingFlagService>();
                
                var flagInfo = await flagService.GetFlagInfoBatchAsync(new[] { documentId });
                var singleInfo = flagInfo.ContainsKey(documentId) ? flagInfo[documentId] : null;

                return Ok(new
                {
                    documentId = documentId,
                    flagInfo = singleInfo,
                    serviceRegistered = true,
                    message = "Flag service test completed"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message, stackTrace = ex.StackTrace });
            }
        }

        [HttpPost("test-create-flags/{parentId:guid}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> CreateTestFlags(Guid parentId)
        {
            try
            {
                var authResult = ValidateUserAccess(out var userId);
                if (authResult != null) return authResult;

                using var database = databaseFactory.CreateDatabase();

                // Create a test schedule to trigger the HasSchedule flag
                var testSchedule = new SortScheduleDto
                {
                    Id = Guid.NewGuid(),
                    ContentId = parentId, // Use parent as test content
                    ParentId = parentId,
                    TargetPosition = 0,
                    StartDateTime = DateTime.UtcNow.AddMinutes(-5), // Started 5 minutes ago
                    EndDateTime = DateTime.UtcNow.AddHours(1), // Ends in 1 hour
                    IsActive = true,
                    Priority = 1,
                    Created = DateTime.UtcNow,
                    CreatedBy = userId
                };

                database.Insert(testSchedule);

                // Create test default order to trigger HasDefaultOrder flag
                var children = contentService.GetPagedChildren(contentService.GetById(parentId)?.Id ?? -1, 0, 5, out _);
                foreach (var child in children.Take(3))
                {
                    database.Insert(new DefaultSortOrderDto
                    {
                        Id = Guid.NewGuid(),
                        ParentId = parentId,
                        ContentId = child.Key,
                        SortOrder = child.SortOrder,
                        Created = DateTime.UtcNow,
                        CreatedBy = userId,
                        Updated = DateTime.UtcNow
                    });
                }

                return Ok(new
                {
                    success = true,
                    message = "Test flags created",
                    testScheduleId = testSchedule.Id,
                    testChildrenWithDefaultOrder = children.Count(),
                    instructions = "Now refresh the Umbraco backoffice tree to see if flags appear"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message, stackTrace = ex.StackTrace });
            }
        }

        #endregion

        #region Flag Diagnostics (Remove in production)

        [HttpGet("diagnostics/flag-provider")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public IActionResult DiagnoseFlagProvider()
        {
            try
            {
                // Get all registered IFlagProvider implementations
                var flagProviders = HttpContext.RequestServices.GetServices<IFlagProvider>().ToList();
                var sortingFlagProvider = flagProviders.OfType<SortingFlagProvider>().FirstOrDefault();
                
                // Get flag service
                var flagService = HttpContext.RequestServices.GetService<ISortingFlagService>();
                
                // Get static diagnostics from the provider
                var diagnostics = SortingFlagProvider.GetDiagnostics();
                
                // Get the expected flag values
                var expectedFlags = new
                {
                    CustomSorted = Constants.Conventions.Flags.CustomSorted,
                    HasSchedule = Constants.Conventions.Flags.HasSchedule,
                    HasDefaultOrder = Constants.Conventions.Flags.HasDefaultOrder
                };

                return Ok(new
                {
                    flagProviderDiagnostics = new
                    {
                        totalFlagProvidersRegistered = flagProviders.Count,
                        flagProviderTypes = flagProviders.Select(fp => fp.GetType().FullName).ToList(),
                        sortingFlagProviderFound = sortingFlagProvider != null,
                        instancesCreated = diagnostics.instances,
                        canProvideFlagsCalls = diagnostics.canProvideFlags,
                        populateFlagsCalls = diagnostics.populateFlags
                    },
                    flagServiceDiagnostics = new
                    {
                        serviceRegistered = flagService != null,
                        serviceType = flagService?.GetType().FullName
                    },
                    expectedFlagValues = expectedFlags,
                    timestamp = DateTime.UtcNow,
                    instructions = new[]
                    {
                        "1. If sortingFlagProviderFound is false, the provider is not registered correctly",
                        "2. If instancesCreated is 0, the provider was never instantiated by DI",
                        "3. If canProvideFlagsCalls is 0, Umbraco never asked this provider if it can provide flags",
                        "4. If populateFlagsCalls is 0, Umbraco never asked this provider to populate flags",
                        "5. Navigate in the Content tree to trigger flag population, then call this endpoint again",
                        "6. Check Umbraco logs for [PowerSort] entries with LogLevel Warning"
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message, stackTrace = ex.StackTrace });
            }
        }

        [HttpGet("diagnostics/test-flag-population/{documentId:guid}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> TestFlagPopulation(Guid documentId)
        {
            try
            {
                // Get the flag provider directly
                var flagProviders = HttpContext.RequestServices.GetServices<IFlagProvider>().ToList();
                var sortingFlagProvider = flagProviders.OfType<SortingFlagProvider>().FirstOrDefault();
                
                if (sortingFlagProvider == null)
                {
                    return Ok(new
                    {
                        error = "SortingFlagProvider not found in DI container",
                        registeredProviders = flagProviders.Select(fp => fp.GetType().FullName).ToList()
                    });
                }

                // Get flag service for comparison
                var flagService = HttpContext.RequestServices.GetRequiredService<ISortingFlagService>();
                var flagInfo = await flagService.GetFlagInfoBatchAsync(new[] { documentId });
                var singleInfo = flagInfo.ContainsKey(documentId) ? flagInfo[documentId] : null;

                // Test CanProvideFlags for different types
                var canProvideForTreeItem = sortingFlagProvider.CanProvideFlags<Umbraco.Cms.Api.Management.ViewModels.Tree.DocumentTreeItemResponseModel>();
                var canProvideForCollectionItem = sortingFlagProvider.CanProvideFlags<Umbraco.Cms.Api.Management.ViewModels.Document.Collection.DocumentCollectionResponseModel>();
                var canProvideForDocumentItem = sortingFlagProvider.CanProvideFlags<Umbraco.Cms.Api.Management.ViewModels.Document.Item.DocumentItemResponseModel>();

                return Ok(new
                {
                    documentId = documentId,
                    flagServiceResults = singleInfo,
                    canProvideFlags = new
                    {
                        DocumentTreeItemResponseModel = canProvideForTreeItem,
                        DocumentCollectionResponseModel = canProvideForCollectionItem,
                        DocumentItemResponseModel = canProvideForDocumentItem
                    },
                    expectedFlagStrings = new
                    {
                        CustomSorted = Constants.Conventions.Flags.CustomSorted,
                        HasSchedule = Constants.Conventions.Flags.HasSchedule,
                        HasDefaultOrder = Constants.Conventions.Flags.HasDefaultOrder
                    },
                    diagnosticCounters = SortingFlagProvider.GetDiagnostics(),
                    timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message, stackTrace = ex.StackTrace });
            }
        }

        #endregion

        #region Recent Flags Diagnostics (Remove in production)

        [HttpGet("diagnostics/recent-flags")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public IActionResult GetRecentFlags()
        {
            try
            {
                var recentFlags = SortingFlagProvider.GetRecentFlagsAdded();
                var diagnostics = SortingFlagProvider.GetDiagnostics();
                
                return Ok(new
                {
                    diagnosticCounters = new
                    {
                        instancesCreated = diagnostics.instances,
                        canProvideFlagsCalls = diagnostics.canProvideFlags,
                        populateFlagsCalls = diagnostics.populateFlags
                    },
                    recentFlagsAdded = recentFlags,
                    expectedFlagStrings = new
                    {
                        CustomSorted = Constants.Conventions.Flags.CustomSorted,
                        HasSchedule = Constants.Conventions.Flags.HasSchedule,
                        HasDefaultOrder = Constants.Conventions.Flags.HasDefaultOrder
                    },
                    timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message, stackTrace = ex.StackTrace });
            }
        }

        #endregion

        #region Schedule Diagnostics

        [HttpGet("diagnostics/schedule-check/{documentId:guid}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public IActionResult DiagnoseScheduleForDocument(Guid documentId)
        {
            try
            {
                using var database = databaseFactory.CreateDatabase();
                var now = DateTime.UtcNow;

                // Get all schedules for this document using the typed DTO
                var allSchedules = database.Fetch<SortScheduleDto>(
                    @"SELECT * FROM ocPowerSortingSchedule 
                      WHERE ContentId = @0 OR ParentId = @0
                      ORDER BY Created DESC",
                    documentId);

                // Get active schedules specifically
                var activeSchedules = database.Fetch<SortScheduleDto>(
                    @"SELECT * FROM ocPowerSortingSchedule 
                      WHERE (ContentId = @0 OR ParentId = @0)
                      AND IsActive = 1 
                      AND StartDateTime <= @1 
                      AND EndDateTime > @1",
                    documentId, now);

                // Also get ALL schedules in the table for debugging
                var totalScheduleCount = database.ExecuteScalar<int>("SELECT COUNT(*) FROM ocPowerSortingSchedule");
                var activeScheduleCount = database.ExecuteScalar<int>(
                    "SELECT COUNT(*) FROM ocPowerSortingSchedule WHERE IsActive = 1");

                return Ok(new
                {
                    documentId = documentId,
                    currentUtcTime = now,
                    tableStats = new
                    {
                        totalSchedulesInTable = totalScheduleCount,
                        activeSchedulesInTable = activeScheduleCount
                    },
                    schedulesForDocument = new
                    {
                        totalFound = allSchedules.Count,
                        activeFound = activeSchedules.Count,
                        allSchedules = allSchedules.Select(s => new
                        {
                            id = s.Id,
                            contentId = s.ContentId,
                            parentId = s.ParentId,
                            targetPosition = s.TargetPosition,
                            startDateTime = s.StartDateTime,
                            endDateTime = s.EndDateTime,
                            isActive = s.IsActive,
                            priority = s.Priority,
                            isCurrentlyInRange = s.StartDateTime <= now && s.EndDateTime > now,
                            documentIsContentId = s.ContentId == documentId,
                            documentIsParentId = s.ParentId == documentId
                        }).ToList(),
                        activeSchedules = activeSchedules.Select(s => new
                        {
                            id = s.Id,
                            contentId = s.ContentId,
                            parentId = s.ParentId
                        }).ToList()
                    },
                    expectedFlagResult = activeSchedules.Count > 0
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message, stackTrace = ex.StackTrace });
            }
        }

        [HttpGet("diagnostics/parent-child-relationship/{contentId:guid}/{parentId:guid}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public IActionResult DiagnoseParentChildRelationship(Guid contentId, Guid parentId)
        {
            try
            {
                var content = contentService.GetById(contentId);
                var parent = contentService.GetById(parentId);

                if (content == null)
                {
                    return Ok(new
                    {
                        contentId = contentId,
                        parentId = parentId,
                        error = "Content not found",
                        contentExists = false
                    });
                }

                if (parent == null)
                {
                    return Ok(new
                    {
                        contentId = contentId,
                        parentId = parentId,
                        error = "Parent not found",
                        parentExists = false,
                        content = new
                        {
                            id = content.Id,
                            key = content.Key,
                            name = content.Name,
                            parentId = content.ParentId
                        }
                    });
                }

                // Get actual parent if content has one
                var actualParent = content.ParentId > 0 ? contentService.GetById(content.ParentId) : null;

                return Ok(new
                {
                    contentId = contentId,
                    parentId = parentId,
                    content = new
                    {
                        id = content.Id,
                        key = content.Key,
                        name = content.Name,
                        parentId = content.ParentId,
                        isAtRoot = content.ParentId == -1
                    },
                    expectedParent = new
                    {
                        id = parent.Id,
                        key = parent.Key,
                        name = parent.Name
                    },
                    actualParent = actualParent == null ? null : new
                    {
                        id = actualParent.Id,
                        key = actualParent.Key,
                        name = actualParent.Name
                    },
                    validation = new
                    {
                        isValidRelationship = content.ParentId == parent.Id,
                        contentParentMatches = content.ParentId == parent.Id,
                        reasonIfInvalid = content.ParentId == -1 ? 
                            "Content is at root level" : 
                            content.ParentId != parent.Id ? 
                                $"Content parent ID {content.ParentId} does not match expected parent ID {parent.Id}" :
                                "Valid relationship"
                    }
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
