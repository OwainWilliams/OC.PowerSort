using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Api.Management.Controllers;
using Umbraco.Cms.Core.Actions;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Security;
using Umbraco.Cms.Core.Security.Authorization;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Infrastructure.Persistence;

namespace OC.PowerSort.Controllers.Base
{
    /// <summary>
    /// Base controller that provides common functionality for Power Sorting API controllers:
    /// current-user resolution, content permission checks, database access and consistent error handling.
    /// </summary>
    public abstract class PowerSortControllerBase : ManagementApiControllerBase
    {
        protected readonly IBackOfficeSecurityAccessor backOfficeSecurityAccessor;
        protected readonly IUmbracoDatabaseFactory databaseFactory;
        protected readonly IContentService contentService;
        protected readonly IUserService userService;
        protected readonly IContentPermissionAuthorizer contentPermissionAuthorizer;
        protected readonly ILogger logger;

        protected PowerSortControllerBase(
            IBackOfficeSecurityAccessor backOfficeSecurityAccessor,
            IUmbracoDatabaseFactory databaseFactory,
            IContentService contentService,
            IUserService userService,
            IContentPermissionAuthorizer contentPermissionAuthorizer,
            ILogger logger)
        {
            this.backOfficeSecurityAccessor = backOfficeSecurityAccessor;
            this.databaseFactory = databaseFactory;
            this.contentService = contentService;
            this.userService = userService;
            this.contentPermissionAuthorizer = contentPermissionAuthorizer;
            this.logger = logger;
        }

        /// <summary>
        /// Get current authenticated user or return unauthorized result
        /// </summary>
        protected IActionResult? ValidateUserAccess(out int userId)
        {
            userId = 0;
            var currentUser = backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser;

            if (currentUser == null)
            {
                return Unauthorized();
            }

            userId = currentUser.Id;
            return null;
        }

        /// <summary>
        /// Runs an operation for the current user with a database connection and consistent error handling.
        /// The operation returns the action result directly, so status codes such as 404 or 204 are preserved.
        /// </summary>
        protected async Task<IActionResult> ExecuteAsync(Func<IUmbracoDatabase, int, Task<IActionResult>> operation)
        {
            var authResult = ValidateUserAccess(out var userId);
            if (authResult != null)
            {
                return authResult;
            }

            try
            {
                using var database = databaseFactory.CreateDatabase();
                return await operation(database, userId);
            }
            catch (Exception ex)
            {
                return HandleException(ex);
            }
        }

        /// <summary>
        /// Runs an operation for the current user with consistent error handling (no database connection).
        /// </summary>
        protected async Task<IActionResult> ExecuteAsync(Func<int, Task<IActionResult>> operation)
        {
            var authResult = ValidateUserAccess(out var userId);
            if (authResult != null)
            {
                return authResult;
            }

            try
            {
                return await operation(userId);
            }
            catch (Exception ex)
            {
                return HandleException(ex);
            }
        }

        /// <summary>
        /// Checks that the current back-office user has the given content permission (for example
        /// <see cref="ActionSort.ActionLetter"/> or <see cref="ActionBrowse.ActionLetter"/>) on a content node,
        /// using the same authorizer Umbraco's own management API uses.
        /// Returns a 401 when there is no user, a 403 when the user is not allowed, otherwise null.
        /// </summary>
        protected async Task<IActionResult?> AuthorizeContentAsync(string actionLetter, Guid contentKey)
        {
            var currentUser = backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser;
            if (currentUser == null)
            {
                return Unauthorized();
            }

            var denied = await contentPermissionAuthorizer.IsDeniedAsync(currentUser, contentKey, actionLetter);
            if (!denied)
            {
                return null;
            }

            logger.LogWarning(
                "User {UserId} was denied permission {Action} on content {ContentKey}",
                currentUser.Id, actionLetter, contentKey);

            return Forbid();
        }

        /// <summary>
        /// Validate that content exists and return it, or return error result
        /// </summary>
        protected IActionResult? ValidateContentExists(Guid contentId, out IContent? content, string errorMessage = "Content not found")
        {
            content = contentService.GetById(contentId);
            if (content == null)
            {
                return NotFound(new { error = errorMessage });
            }
            return null;
        }

        /// <summary>
        /// Validate parent-child relationship
        /// </summary>
        protected IActionResult? ValidateParentChildRelationship(IContent content, Guid expectedParentId)
        {
            var expectedParent = contentService.GetById(expectedParentId);
            if (expectedParent == null)
            {
                logger.LogDebug("Expected parent {ParentKey} not found", expectedParentId);
                return NotFound(new { error = "Parent not found" });
            }

            // Check if content has a parent (ParentId -1 means root level)
            if (content.ParentId == -1)
            {
                logger.LogDebug("Content {ContentKey} is at root level, expected parent {ParentKey}", content.Key, expectedParent.Key);
                return BadRequest(new { error = "Content is at root level and cannot be a child of the specified parent" });
            }

            if (content.ParentId != expectedParent.Id)
            {
                // Get the actual parent for better error reporting
                var actualParent = contentService.GetById(content.ParentId);
                logger.LogDebug(
                    "Content {ContentKey} has parent {ActualParentKey}, expected parent {ExpectedParentKey}",
                    content.Key, actualParent?.Key, expectedParent.Key);

                return BadRequest(new
                {
                    error = "Content is not a child of the specified parent",
                    details = new
                    {
                        contentId = content.Key,
                        contentName = content.Name,
                        actualParentId = actualParent?.Key,
                        actualParentName = actualParent?.Name,
                        expectedParentId = expectedParent.Key,
                        expectedParentName = expectedParent.Name
                    }
                });
            }

            return null;
        }

        /// <summary>
        /// Validate date range (start before end)
        /// </summary>
        protected IActionResult? ValidateDateRange(DateTime startDateTime, DateTime endDateTime)
        {
            if (startDateTime >= endDateTime)
            {
                return BadRequest(new { error = "End date must be after start date" });
            }
            return null;
        }

        /// <summary>
        /// Validate target position is non-negative
        /// </summary>
        protected IActionResult? ValidateTargetPosition(int targetPosition)
        {
            if (targetPosition < 0)
            {
                return BadRequest(new { error = "Target position must be non-negative" });
            }
            return null;
        }

        /// <summary>
        /// Maps exceptions to HTTP responses. Known exception types become 400/401/404; anything else is logged
        /// and returned as a generic 500 without exposing internal details to the client.
        /// </summary>
        protected IActionResult HandleException(Exception ex, string? customMessage = null)
        {
            switch (ex)
            {
                case KeyNotFoundException:
                    return NotFound(new { error = customMessage ?? ex.Message });

                case ArgumentException:
                    return BadRequest(new { error = customMessage ?? ex.Message });

                case UnauthorizedAccessException:
                    return Unauthorized(new { error = customMessage ?? "Unauthorized" });

                default:
                    logger.LogError(ex, "Unhandled error in {Controller}.{Action}",
                        ControllerContext.ActionDescriptor?.ControllerName,
                        ControllerContext.ActionDescriptor?.ActionName);

                    return StatusCode(StatusCodes.Status500InternalServerError, new
                    {
                        error = customMessage ?? "An unexpected error occurred while processing the request."
                    });
            }
        }

        /// <summary>
        /// Create standardized success response
        /// </summary>
        protected IActionResult SuccessResult(string message, object? data = null)
        {
            return Ok(new { success = true, message, data });
        }

        /// <summary>
        /// Loads the children of a parent ordered by their current sort order.
        /// </summary>
        protected List<IContent> GetOrderedChildren(IContent parent)
        {
            return contentService.GetPagedChildren(parent.Id, 0, int.MaxValue, out _)
                .OrderBy(c => c.SortOrder)
                .ToList();
        }

        /// <summary>
        /// Applies a new order to a parent's children using Umbraco's sort API. Children that are not in
        /// <paramref name="orderedKeys"/> keep their relative order and are appended after the ordered ones.
        /// Returns the number of children whose position changed.
        /// </summary>
        protected int ApplySortOrder(IContent parent, IEnumerable<Guid> orderedKeys, int userId)
        {
            var children = GetOrderedChildren(parent);
            var byKey = children.ToDictionary(c => c.Key, c => c);

            var ordered = new List<IContent>();
            var seen = new HashSet<Guid>();

            foreach (var key in orderedKeys)
            {
                if (byKey.TryGetValue(key, out var child) && seen.Add(key))
                {
                    ordered.Add(child);
                }
            }

            ordered.AddRange(children.Where(c => !seen.Contains(c.Key)));

            var changed = ordered.Where((c, index) => c.SortOrder != index).Count();
            if (changed == 0)
            {
                return 0;
            }

            var result = contentService.Sort(ordered, userId);
            if (!result.Success)
            {
                throw new InvalidOperationException($"Sorting children of {parent.Key} failed: {result.Result}");
            }

            return changed;
        }
    }
}
