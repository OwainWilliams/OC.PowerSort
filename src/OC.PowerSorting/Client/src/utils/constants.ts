/**
 * Shared constants for Power Sorting package
 */
export class PowerSortConstants {
  // API Base URL
  static readonly API_BASE = '/umbraco/management/api/v1/oc/power-sorting';

  // API Endpoints
  static readonly ENDPOINTS = {
    MENU_ITEMS: '/menu-items',
    CHILDREN: '/children',
    SORT_DOCUMENT: '/sort/document',
    SCHEDULES: '/schedules',
    SCHEDULES_ACTIVE: '/schedules/active',
    DEFAULT_SORT_ORDER: '/default-sort-order',
    DEFAULT_SORT_ORDER_SAVE: '/default-sort-order/save',
    DEFAULT_SORT_ORDER_RESTORE: '/default-sort-order/restore',
    PROCESS_NOW: '/schedules/process-now',
    ENUM_PRIORITIES: '/enum-priorities'
  } as const;

  // UI Messages
  static readonly MESSAGES = {
    LOADING: 'Loading...',
    ERROR_GENERIC: 'An error occurred',
    ERROR_AUTHENTICATION: 'Authentication failed',
    ERROR_NETWORK: 'Network error occurred',
    SUCCESS_SAVED: 'Successfully saved',
    SUCCESS_DELETED: 'Successfully deleted',
    SUCCESS_UPDATED: 'Successfully updated',
    CONFIRM_DELETE: 'Are you sure you want to delete this item?',
    CONFIRM_CLEAR_DEFAULT: 'Clear the saved default sort order? You won\'t be able to restore it anymore.',
    CONFIRM_RESTORE_DEFAULT: 'Restore the default sort order? This will override the current order.',
    CONFIRM_SAVE_DEFAULT: 'Save the current sort order as the default? This will be restored when all schedules expire.'
  } as const;

  // Local Storage Keys
  static readonly STORAGE_KEYS = {
    MENU_ITEMS: 'powerSortMenuItems',
    SELECTED_NODE_NAME: 'powerSortSelectedNodeName',
    SELECTED_NODE_ID: 'powerSortSelectedNodeId',
    LAST_SELECTED_TIME: 'powerSortLastSelectedTime'
  } as const;

  // Schedule Status Types
  static readonly SCHEDULE_STATUS = {
    ACTIVE: 'active',
    SCHEDULED: 'scheduled',
    EXPIRED: 'expired',
    PENDING: 'pending'
  } as const;

  // Icon Names
  static readonly ICONS = {
    CALENDAR: 'icon-calendar',
    DOCUMENT: 'icon-document',
    SORT: 'icon-sort',
    ADD: 'icon-add',
    EDIT: 'icon-edit',
    DELETE: 'icon-delete',
    TRASH: 'icon-trash',
    CHECK: 'icon-check',
    ALERT: 'icon-alert',
    TIME: 'icon-time',
    SAVE: 'icon-save',
    UNDO: 'icon-undo',
    NAVIGATION: 'icon-navigation',
    BOOKMARK: 'icon-bookmark',
    LOCK: 'icon-lock',
    SETTINGS: 'icon-settings'
  } as const;

  // CSS Classes
  static readonly CSS_CLASSES = {
    LOADING: 'power-sort-loading',
    ERROR: 'power-sort-error',
    SUCCESS: 'power-sort-success',
    ACTIVE: 'power-sort-active',
    HIDDEN: 'power-sort-hidden'
  } as const;

  // Default Values
  static readonly DEFAULTS = {
    PRIORITY: 0,
    TAKE_SIZE: 100,
    TIMEOUT: 5000
  } as const;
}

/**
 * Build full API URL
 */
export function buildApiUrl(endpoint: string): string {
  return `${PowerSortConstants.API_BASE}${endpoint}`;
}

/**
 * Get endpoint with parameters
 */
export function buildEndpointUrl(endpoint: string, params: Record<string, string> = {}): string {
  const url = new URL(buildApiUrl(endpoint), window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });
  return url.pathname + url.search;
}
