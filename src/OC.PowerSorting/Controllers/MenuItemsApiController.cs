using System.Text.Json;
using Asp.Versioning;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using OC.PowerSorting.Controllers.Base;
using OC.PowerSorting.DTOs;
using OC.PowerSorting.Models;
using Umbraco.Cms.Api.Management.Routing;
using Umbraco.Cms.Core.Security;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Infrastructure.Persistence;

namespace OC.PowerSorting.Controllers
{
    [ApiVersion("1.0")]
    [VersionedApiBackOfficeRoute("oc/power-sorting")]
    [ApiExplorerSettings(GroupName = Constants.ApiName)]
    public class MenuItemsApiController : PowerSortingControllerBase
    {
       
        private const string MENU_ITEMS_KEY = "PowerSortMenuItems_";


        public MenuItemsApiController(
            IBackOfficeSecurityAccessor backOfficeSecurityAccessor,
            IUmbracoDatabaseFactory databaseFactory,
            IContentService contentService,
            IUserService userService)
            : base(backOfficeSecurityAccessor, databaseFactory, contentService, userService)
        {
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

        #endregion
    }
}
