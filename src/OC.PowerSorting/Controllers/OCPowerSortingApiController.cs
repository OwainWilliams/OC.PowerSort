using System.Net.Http.Json;
using System.Text.Json;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using NPoco;
using OC.PowerSorting.Models;
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



        private const string MENU_ITEMS_KEY = "PowerSortMenuItems_";

        public OCPowerSortingApiController(
            IBackOfficeSecurityAccessor backOfficeSecurityAccessor,
            IUmbracoDatabaseFactory databaseFactory,
            IHttpClientFactory httpClientFactory,
            IEntityService entityService,
            IContentService contentService)
        {
            _backOfficeSecurityAccessor = backOfficeSecurityAccessor;
            _databaseFactory = databaseFactory;
            _httpClientFactory = httpClientFactory;
            _entityService = entityService;
            _contentService = contentService;
        }



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

        [HttpGet("children/{id:guid}")]
        public IActionResult GetChildren(Guid id)
        {
            var user = _backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser;
            if (user == null)
                return Unauthorized();

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
                        Icon = content?.ContentType.Icon
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

        // Response models matching the Management API structure
        public class DocumentTreeResponse
        {
            public int Total { get; set; }
            public List<DocumentTreeItem> Items { get; set; }
        }

        public class DocumentTreeItem
        {
            public Guid Id { get; set; }
            public DocumentTypeReference DocumentType { get; set; }
            public List<DocumentVariant> Variants { get; set; }
            public bool HasChildren { get; set; }
            public bool IsTrashed { get; set; }
            public DateTime CreateDate { get; set; }
        }

        public class DocumentTypeReference
        {
            public Guid Id { get; set; }
            public string Icon { get; set; }
        }

        public class DocumentVariant
        {
            public string Name { get; set; }
            public string State { get; set; }
            public string Culture { get; set; }
        }

    }

}
