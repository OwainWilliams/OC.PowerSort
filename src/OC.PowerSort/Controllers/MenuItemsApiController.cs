using System.Text.Json;
using Asp.Versioning;
using Umbraco.Cms.Core.Security.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using OC.PowerSort.Controllers.Base;
using OC.PowerSort.DTOs;
using OC.PowerSort.Interfaces;
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
    public class MenuItemsApiController : PowerSortControllerBase
    {
        private const string MENU_ITEMS_KEY = "PowerSortMenuItems_";
        private readonly IScheduleService _scheduleService;

        public MenuItemsApiController(
            IBackOfficeSecurityAccessor backOfficeSecurityAccessor,
            IUmbracoDatabaseFactory databaseFactory,
            IContentService contentService,
            IUserService userService,
            IContentPermissionAuthorizer contentPermissionAuthorizer,
            ILogger<MenuItemsApiController> logger,
            IScheduleService scheduleService)
            : base(backOfficeSecurityAccessor, databaseFactory, contentService, userService, contentPermissionAuthorizer, logger)
        {
            _scheduleService = scheduleService;
        }

        #region Menu Items Endpoints

        [HttpGet("menu-items")]
        [ProducesResponseType<MenuItemsResponse>(StatusCodes.Status200OK)]
        public Task<IActionResult> GetMenuItems()
        {
            return ExecuteAsync((database, userId) =>
            {
                var key = MENU_ITEMS_KEY + userId;
                var keyValueRow = database.SingleOrDefault<KeyValueDto>(
                    "SELECT * FROM umbracoKeyValue WHERE [key] = @0", key);

                if (keyValueRow == null || string.IsNullOrEmpty(keyValueRow.Value))
                {
                    return Task.FromResult<IActionResult>(Ok(new MenuItemsResponse { Items = new List<MenuItemModel>() }));
                }

                var items = JsonSerializer.Deserialize<List<MenuItemModel>>(keyValueRow.Value);
                return Task.FromResult<IActionResult>(Ok(new MenuItemsResponse { Items = items ?? new List<MenuItemModel>() }));
            });
        }

        [HttpPost("menu-items")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public Task<IActionResult> SaveMenuItems([FromBody] MenuItemsResponse request)
        {
            return ExecuteAsync((database, userId) =>
            {
                var key = MENU_ITEMS_KEY + userId;
                var value = JsonSerializer.Serialize(request.Items);

                var existing = database.SingleOrDefault<KeyValueDto>(
                    "SELECT * FROM umbracoKeyValue WHERE [key] = @0", key);

                if (existing != null)
                {
                    existing.Value = value;
                    existing.Updated = DateTime.UtcNow;
                    database.Update(existing);
                }
                else
                {
                    database.Insert(new KeyValueDto
                    {
                        Key = key,
                        Value = value,
                        Updated = DateTime.UtcNow
                    });
                }

                return Task.FromResult<IActionResult>(Ok(new { success = true, itemCount = request.Items.Count }));
            });
        }

        /// <summary>
        /// Deletes a menu item and cancels all schedules where this node is the parent.
        /// This ensures that when a parent node is removed from the PowerSort menu,
        /// all scheduled sorting for its children is also cancelled.
        /// </summary>
        [HttpDelete("menu-items/{parentId:guid}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public Task<IActionResult> DeleteMenuItem(Guid parentId)
        {
            return ExecuteAsync(async _ =>
            {
                // Cancelling schedules changes how the parent's children are sorted, so require sort permission.
                var forbidden = await AuthorizeContentAsync(ActionSort.ActionLetter, parentId);
                if (forbidden != null)
                    return forbidden;

                // Cancel all schedules where this node is the parent
                _scheduleService.CancelSchedulesForParent(parentId);

                // Also cancel any schedules where this node itself is scheduled
                _scheduleService.CancelSchedule(parentId);

                return Ok(new { success = true, message = "Menu item removed and all associated schedules cancelled" });
            });
        }

        #endregion
    }
}
