using System.Text.Json;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using NPoco;
using OC.PowerSorting.Models;
using Umbraco.Cms.Api.Management.Controllers;
using Umbraco.Cms.Api.Management.Routing;
using Umbraco.Cms.Core.Models.Membership;
using Umbraco.Cms.Core.Security;
using Umbraco.Cms.Infrastructure.Persistence;
using Umbraco.Cms.Web.Common.Authorization;

namespace OC.PowerSorting.Controllers
{
    [ApiVersion("1.0")]
    [VersionedApiBackOfficeRoute("oc/power-sorting")]
    [Authorize(Policy = AuthorizationPolicies.SectionAccessContent)]
    [ApiExplorerSettings(GroupName = Constants.ApiName)]
    public class OCPowerSortingApiController : ManagementApiControllerBase
    {
        private readonly IBackOfficeSecurityAccessor _backOfficeSecurityAccessor;
        private readonly IUmbracoDatabaseFactory _databaseFactory;
        private const string MENU_ITEMS_KEY = "PowerSortMenuItems_";

        public OCPowerSortingApiController(
            IBackOfficeSecurityAccessor backOfficeSecurityAccessor,
            IUmbracoDatabaseFactory databaseFactory)
        {
            _backOfficeSecurityAccessor = backOfficeSecurityAccessor;
            _databaseFactory = databaseFactory;
        }

        [HttpGet("ping")]
        [ProducesResponseType<string>(StatusCodes.Status200OK)]
        public string Ping() => "Pong";

        [HttpGet("test-menu")]
        [ProducesResponseType<string>(StatusCodes.Status200OK)]
        public string TestMenu() => "Menu endpoint is working!";

        [HttpGet("whatsTheTimeMrWolf")]
        [ProducesResponseType(typeof(DateTime), 200)]
        public DateTime WhatsTheTimeMrWolf() => DateTime.Now;

        [HttpGet("whatsMyName")]
        [ProducesResponseType<string>(StatusCodes.Status200OK)]
        public string WhatsMyName()
        {
            // So we can see a long request in the dashboard with a spinning progress wheel
            Thread.Sleep(2000);

            var currentUser = _backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser;
            return currentUser?.Name ?? "I have no idea who you are";
        }

        [HttpGet("whoAmI")]
        [ProducesResponseType<IUser>(StatusCodes.Status200OK)]
        public IUser? WhoAmI() => _backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser;

        [HttpGet("menu-items")]
        [AllowAnonymous]
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
        [AllowAnonymous]
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

        // DTO for umbracoKeyValue table
        [TableName("umbracoKeyValue")]
        [PrimaryKey("key", AutoIncrement = false)]
        private class KeyValueDto
        {
            [Column("key")]
            public string Key { get; set; } = string.Empty;
            
            [Column("value")]
            public string Value { get; set; } = string.Empty;
            
            [Column("updated")]
            public DateTime Updated { get; set; }
        }
    }
}
