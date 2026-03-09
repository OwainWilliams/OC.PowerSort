using Microsoft.AspNetCore.Mvc;
using Umbraco.Cms.Api.Management.Controllers;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Security;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Infrastructure.Persistence;

namespace OC.PowerSort.Controllers.Base
{
    /// <summary>
    /// Base controller that provides common functionality for Power Sorting API controllers
    /// Eliminates code duplication across API endpoints
    /// </summary>
    public abstract class PowerSortControllerBase : ManagementApiControllerBase
    {
        protected readonly IBackOfficeSecurityAccessor backOfficeSecurityAccessor;
        protected readonly IUmbracoDatabaseFactory databaseFactory;
        protected readonly IContentService contentService;
        protected readonly IUserService userService;

        protected PowerSortControllerBase(
            IBackOfficeSecurityAccessor backOfficeSecurityAccessor,
            IUmbracoDatabaseFactory databaseFactory,
            IContentService contentService,
            IUserService userService)
        {
            this.backOfficeSecurityAccessor = backOfficeSecurityAccessor;
            this.databaseFactory = databaseFactory;
            this.contentService = contentService;
            this.userService = userService;
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
        /// Execute database operation with consistent error handling
        /// </summary>
        protected async Task<IActionResult> ExecuteDatabaseOperation<T>(
            Func<IUmbracoDatabase, Task<T>> operation,
            string? successMessage = null)
        {
            var authResult = ValidateUserAccess(out _);
            if (authResult != null)
            {
                return authResult;
            }

            try
            {
                using var database = databaseFactory.CreateDatabase();
                var result = await operation(database);

                return successMessage != null
                    ? Ok(new { success = true, message = successMessage, data = result })
                    : Ok(result);
            }
            catch (Exception ex)
            {
                return HandleException(ex);
            }
        }

        /// <summary>
        /// Execute database operation synchronously with consistent error handling
        /// </summary>
        protected IActionResult ExecuteDatabaseOperation<T>(
            Func<IUmbracoDatabase, T> operation,
            string? successMessage = null)
        {
            var authResult = ValidateUserAccess(out _);
            if (authResult != null)
            {
                return authResult;
            }

            try
            {
                using var database = databaseFactory.CreateDatabase();
                var result = operation(database);

                return successMessage != null
                    ? Ok(new { success = true, message = successMessage, data = result })
                    : Ok(result);
            }
            catch (Exception ex)
            {
                return HandleException(ex);
            }
        }

        /// <summary>
        /// Execute operation with user context and consistent error handling
        /// </summary>
        protected async Task<IActionResult> ExecuteWithUserContext<T>(
            Func<int, Task<T>> operation,
            string? successMessage = null)
        {
            var authResult = ValidateUserAccess(out var userId);
            if (authResult != null)
            {
                return authResult;
            }

            try
            {
                var result = await operation(userId);

                return successMessage != null
                    ? Ok(new { success = true, message = successMessage, data = result })
                    : Ok(result);
            }
            catch (Exception ex)
            {
                return HandleException(ex);
            }
        }

        /// <summary>
        /// Validate that content exists and return it, or return error result
        /// </summary>
        protected IActionResult? ValidateContentExists(Guid contentId, out IContent? content, string errorMessage = "Content not found")
        {
            content = contentService.GetById(contentId);
            if (content == null)
            {
                return BadRequest(new { error = errorMessage });
            }
            return null;
        }

        /// <summary>
        /// Validate parent-child relationship
        /// </summary>
        protected IActionResult? ValidateParentChildRelationship(IContent content, Guid expectedParentId)
        {
            try
            {
                var expectedParent = contentService.GetById(expectedParentId);
                if (expectedParent == null)
                {
                    Console.WriteLine($"[PowerSort] ValidateParentChildRelationship: Expected parent {expectedParentId} not found");
                    return BadRequest(new { error = "Parent not found" });
                }

                // Check if content has a parent (ParentId -1 means root level)
                if (content.ParentId == -1)
                {
                    Console.WriteLine($"[PowerSort] ValidateParentChildRelationship: Content {content.Key} is at root level, expected parent {expectedParent.Key}");
                    return BadRequest(new { error = "Content is at root level and cannot be a child of the specified parent" });
                }

                if (content.ParentId != expectedParent.Id)
                {
                    // Get the actual parent for better error reporting
                    var actualParent = contentService.GetById(content.ParentId);
                    Console.WriteLine($"[PowerSort] ValidateParentChildRelationship: Content {content.Key} ('{content.Name}') has parent {content.ParentId} ({actualParent?.Key}:'{actualParent?.Name}'), expected parent {expectedParent.Id} ({expectedParent.Key}:'{expectedParent.Name}')");

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

                Console.WriteLine($"[PowerSort] ValidateParentChildRelationship: Content {content.Key} is correctly a child of parent {expectedParent.Key}");
                return null;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[PowerSort] ValidateParentChildRelationship exception: {ex.Message}");
                return StatusCode(500, new { error = "Failed to validate parent-child relationship", details = ex.Message });
            }
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
        /// Consistent exception handling
        /// </summary>
        protected IActionResult HandleException(Exception ex, string? customMessage = null)
        {
            // Log the exception (could be injected logger)
            Console.WriteLine($"Controller error: {ex.Message}");

            var message = customMessage ?? ex.Message;

            return StatusCode(500, new
            {
                error = message,
                stackTrace = ex.StackTrace
            });
        }

        /// <summary>
        /// Create standardized success response
        /// </summary>
        protected IActionResult SuccessResult(string message, object? data = null)
        {
            return Ok(new { success = true, message, data });
        }

        /// <summary>
        /// Create standardized created response
        /// </summary>
        protected IActionResult CreatedResult<T>(string actionName, object routeValues, T data, string? message = null)
        {
            return CreatedAtAction(actionName, routeValues, new
            {
                success = true,
                message = message ?? "Created successfully",
                data
            });
        }

        /// <summary>
        /// Get children with error handling
        /// </summary>
        protected async Task<(IActionResult? error, List<IContent> children)> GetParentChildrenSafe(Guid parentId)
        {
            var validationResult = ValidateContentExists(parentId, out var parent, "Parent not found");
            if (validationResult != null)
            {
                return (validationResult, new List<IContent>());
            }

            try
            {
                var children = contentService.GetPagedChildren(parent!.Id, 0, int.MaxValue, out _)
                    .OrderBy(c => c.SortOrder)
                    .ToList();

                return (null, children);
            }
            catch (Exception ex)
            {
                return (HandleException(ex, "Failed to load children"), new List<IContent>());
            }
        }
    }
}
