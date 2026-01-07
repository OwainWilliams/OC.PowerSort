using Microsoft.AspNetCore.Mvc;
using Umbraco.Cms.Api.Management.Controllers;
using Umbraco.Cms.Api.Management.Routing;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Security;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Infrastructure.Persistence;

namespace OC.PowerSorting.Controllers.Base
{
    /// <summary>
    /// Base controller that provides common functionality for Power Sorting API controllers
    /// Eliminates code duplication across API endpoints
    /// </summary>
    public abstract class PowerSortingControllerBase : ManagementApiControllerBase
    {
        protected readonly IBackOfficeSecurityAccessor _backOfficeSecurityAccessor;
        protected readonly IUmbracoDatabaseFactory _databaseFactory;
        protected readonly IContentService _contentService;
        protected readonly IUserService _userService;

        protected PowerSortingControllerBase(
            IBackOfficeSecurityAccessor backOfficeSecurityAccessor,
            IUmbracoDatabaseFactory databaseFactory,
            IContentService contentService,
            IUserService userService)
        {
            _backOfficeSecurityAccessor = backOfficeSecurityAccessor;
            _databaseFactory = databaseFactory;
            _contentService = contentService;
            _userService = userService;
        }

        /// <summary>
        /// Get current authenticated user or return unauthorized result
        /// </summary>
        protected IActionResult? ValidateUserAccess(out int userId)
        {
            userId = 0;
            var currentUser = _backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser;
            
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
            if (authResult != null) return authResult;

            try
            {
                using var database = _databaseFactory.CreateDatabase();
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
            if (authResult != null) return authResult;

            try
            {
                using var database = _databaseFactory.CreateDatabase();
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
            if (authResult != null) return authResult;

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
            content = _contentService.GetById(contentId);
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
            var expectedParent = _contentService.GetById(expectedParentId);
            if (content.ParentId != expectedParent?.Id)
            {
                return BadRequest(new { error = "Content is not a child of the specified parent" });
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
        /// Consistent exception handling
        /// </summary>
        protected IActionResult HandleException(Exception ex, string? customMessage = null)
        {
            // Log the exception (could be injected logger)
            Console.WriteLine($"Controller error: {ex.Message}");
            
            var message = customMessage ?? ex.Message;
            
            return StatusCode(500, new { 
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
            return CreatedAtAction(actionName, routeValues, new { 
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
                var children = _contentService.GetPagedChildren(parent!.Id, 0, int.MaxValue, out _)
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
