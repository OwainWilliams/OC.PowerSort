/**
 * Validation utilities for common operations
 */
export class ValidationUtils {
  private static readonly GUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

  /**
   * Check if a string is a valid GUID
   */
  static isGuid(value: string): boolean {
    return this.GUID_REGEX.test(value);
  }

  /**
   * Extract GUID from URL path segments
   */
  static extractGuidFromPath(path: string = window.location.pathname): string | null {
    const segments = path.split('/').filter(Boolean);
    const maybeGuid = segments[segments.length - 1];
    return this.isGuid(maybeGuid) ? maybeGuid : null;
  }

  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Check if date range is valid (start before end)
   */
  static isValidDateRange(startDate: Date | string, endDate: Date | string): boolean {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return start < end;
  }
}

/**
 * URL and routing utilities
 */
export class RouteUtils {
  /**
   * Navigate using Umbraco's routing system
   */
  static navigateTo(path: string): void {
    history.pushState(null, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  /**
   * Generate dashboard path for Power Sort sections
   */
  static getDashboardPath(dashboardType: 'children' | 'schedules', id: string): string {
    return `/umbraco/section/power-sort/dashboard/power-sort-${dashboardType}/${id}`;
  }
}

/**
 * Date formatting utilities
 */
export class DateUtils {
  /**
   * Format date to local string
   */
  static formatDateTime(dateString: string | Date): string {
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  /**
   * Format date for input fields (YYYY-MM-DDTHH:mm)
   */
  static formatForInput(dateString: string | Date): string {
    const date = new Date(dateString);
    return date.toISOString().slice(0, 16);
  }

  /**
   * Get current UTC time
   */
  static now(): Date {
    return new Date();
  }

  /**
   * Check if date is in the past
   */
  static isInPast(dateString: string | Date): boolean {
    return new Date(dateString) < new Date();
  }

  /**
   * Check if date is in the future
   */
  static isInFuture(dateString: string | Date): boolean {
    return new Date(dateString) > new Date();
  }
}
