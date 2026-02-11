using System.Text.Json;
using Asp.Versioning;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using OC.PowerSort.Controllers.Base;
using OC.PowerSort.DTOs;
using OC.PowerSort.Models;
using OC.PowerSort.Services;
using Umbraco.Cms.Api.Management.Routing;
using Umbraco.Cms.Core.Security;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Infrastructure.Persistence;

namespace OC.PowerSort.Controllers
{
    [ApiVersion("1.0")]
    [VersionedApiBackOfficeRoute("oc/power-sort")]
    [ApiExplorerSettings(GroupName = Constants.ApiName)]
    public class MenuItemsApiController : PowerSortControllerBase
    {
       
        private const string MENU_ITEMS_KEY = "PowerSortMenuItems_";
        private readonly ScheduleService _scheduleService;

        public MenuItemsApiController(
            IBackOfficeSecurityAccessor backOfficeSecurityAccessor,
            IUmbracoDatabaseFactory databaseFactory,
            IContentService contentService,
            IUserService userService,
            ScheduleService scheduleService)
            : base(backOfficeSecurityAccessor, databaseFactory, contentService, userService)
        {
            _scheduleService = scheduleService;
        }

        #region Menu Items Endpoints

        [HttpGet("menu-items")]
        [ProducesResponseType<MenuItemsResponse>(StatusCodes.Status200OK)]
        public IActionResult GetMenuItems()
        {
            return ExecuteDatabaseOperation(database =>
            {
                var authResult = ValidateUserAccess(out var userId);
                if (authResult != null)
                    throw new UnauthorizedAccessException();

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
                if (authResult != null)
                    throw new UnauthorizedAccessException();

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

        /// <summary>
        /// Deletes a menu item and cancels all schedules where this node is the parent.
        /// This ensures that when a parent node is removed from the PowerSort menu,
        /// all scheduled sorting for its children is also cancelled.
        /// </summary>
        [HttpDelete("menu-items/{parentId:guid}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public IActionResult DeleteMenuItem(Guid parentId)
        {
            var authResult = ValidateUserAccess(out var userId);
            if (authResult != null)
                return authResult;

            try
            {
                // Cancel all schedules where this node is the parent
                _scheduleService.CancelSchedulesForParent(parentId);

                // Also cancel any schedules where this node itself is scheduled
                _scheduleService.CancelScheduleByGuid(parentId);

                return Ok(new { success = true, message = "Menu item removed and all associated schedules cancelled" });
            }
            catch (Exception ex)
            {
                return HandleException(ex);
            }
        }

        #endregion
    }
}
