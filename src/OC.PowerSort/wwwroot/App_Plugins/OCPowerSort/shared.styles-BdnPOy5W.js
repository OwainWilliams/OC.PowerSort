import { LitElement as d, property as l, css as p } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as E } from "@umbraco-cms/backoffice/element-api";
import { UMB_AUTH_CONTEXT as u } from "@umbraco-cms/backoffice/auth";
const i = class i {
};
i.API_BASE = "/umbraco/management/api/v1/oc/power-sort", i.ENDPOINTS = {
  MENU_ITEMS: "/menu-items",
  CHILDREN: "/children",
  SORT_DOCUMENT: "/sort/document",
  SCHEDULES: "/schedules",
  SCHEDULES_ACTIVE: "/schedules/active",
  DEFAULT_SORT_ORDER: "/default-sort-order",
  DEFAULT_SORT_ORDER_SAVE: "/default-sort-order/save",
  DEFAULT_SORT_ORDER_RESTORE: "/default-sort-order/restore",
  PROCESS_NOW: "/schedules/process-now",
  ENUM_PRIORITIES: "/enum-priorities"
}, i.MESSAGES = {
  LOADING: "Loading...",
  ERROR_GENERIC: "An error occurred",
  ERROR_AUTHENTICATION: "Authentication failed",
  ERROR_NETWORK: "Network error occurred",
  SUCCESS_SAVED: "Successfully saved",
  SUCCESS_DELETED: "Successfully deleted",
  SUCCESS_UPDATED: "Successfully updated",
  CONFIRM_DELETE: "Are you sure you want to delete this item?",
  CONFIRM_CLEAR_DEFAULT: "Clear the saved default sort order? You won't be able to restore it anymore.",
  CONFIRM_RESTORE_DEFAULT: "Restore the default sort order? This will override the current order.",
  CONFIRM_SAVE_DEFAULT: "Save the current sort order as the default? This will be restored when all schedules expire."
}, i.STORAGE_KEYS = {
  MENU_ITEMS: "powerSortMenuItems",
  SELECTED_NODE_NAME: "powerSortSelectedNodeName",
  SELECTED_NODE_ID: "powerSortSelectedNodeId",
  LAST_SELECTED_TIME: "powerSortLastSelectedTime"
}, i.SCHEDULE_STATUS = {
  ACTIVE: "active",
  SCHEDULED: "scheduled",
  EXPIRED: "expired",
  PENDING: "pending"
}, i.ICONS = {
  CALENDAR: "icon-calendar",
  DOCUMENT: "icon-document",
  SORT: "icon-sort",
  ADD: "icon-add",
  EDIT: "icon-edit",
  DELETE: "icon-delete",
  TRASH: "icon-trash",
  CHECK: "icon-check",
  ALERT: "icon-alert",
  TIME: "icon-time",
  SAVE: "icon-save",
  UNDO: "icon-undo",
  NAVIGATION: "icon-navigation",
  BOOKMARK: "icon-bookmark",
  LOCK: "icon-lock",
  SETTINGS: "icon-settings"
}, i.CSS_CLASSES = {
  LOADING: "power-sort-loading",
  ERROR: "power-sort-error",
  SUCCESS: "power-sort-success",
  ACTIVE: "power-sort-active",
  HIDDEN: "power-sort-hidden"
}, i.DEFAULTS = {
  PRIORITY: 0,
  TAKE_SIZE: 100,
  TIMEOUT: 5e3
};
let n = i;
function A(s) {
  return `${n.API_BASE}${s}`;
}
class h {
  /**
   * Handle API response with consistent error handling
   */
  static async handleResponse(e) {
    if (!e.ok) {
      let t = `API Error (${e.status})`;
      try {
        const r = await e.json();
        t = r.error || r.message || t;
      } catch {
        t = await e.text() || t;
      }
      throw new Error(t);
    }
    return e.status === 204 ? {} : e.json();
  }
  /**
   * Show user-friendly error message
   */
  static showError(e, t = "") {
    const r = e instanceof Error ? e.message : "An unexpected error occurred", a = t ? `${t}: ${r}` : r;
    console.error(a, e), alert(a);
  }
  /**
   * Show success message
   */
  static showSuccess(e) {
    console.log("Success:", e), alert(e);
  }
  /**
   * Confirm action with user
   */
  static confirmAction(e) {
    return confirm(e);
  }
}
const g = (s) => {
  class e extends E(s) {
    constructor() {
      super(...arguments), this.authToken = "", this.hasError = !1, this.errorMessage = "";
    }
    /**
     * Setup authentication context and get initial token
     */
    async setupAuthContext() {
      return new Promise((r) => {
        this.consumeContext(u, async (a) => {
          try {
            const o = a?.getOpenApiConfiguration?.();
            o?.token && (this.authToken = await o.token()), r();
          } catch (o) {
            console.error("Failed to setup auth context:", o), this.hasError = !0, this.errorMessage = "Failed to authenticate", r();
          }
        }).asPromise({ preventTimeout: !0 }).catch(() => {
          console.error("Auth context not available"), this.hasError = !0, this.errorMessage = "Failed to access authentication context", r();
        });
      });
    }
    /**
     * Get current authentication token, refreshing if necessary
     */
    async getAuthToken() {
      try {
        let r = this.authToken;
        if (!r) {
          const a = await this.getContext(u);
          if (a) {
            const o = a.getOpenApiConfiguration?.();
            o?.token && (r = await o.token() ?? "", r !== "" && (this.authToken = r));
          }
        }
        return r;
      } catch (r) {
        return console.error("Failed to get auth token:", r), "";
      }
    }
    /**
     * Make an authenticated HTTP request
     */
    async makeAuthenticatedRequest(r, a = {}) {
      const o = await this.getAuthToken(), c = new Headers(a.headers);
      return c.set("Content-Type", "application/json"), o && c.set("Authorization", `Bearer ${o}`), fetch(r, {
        ...a,
        headers: c
      });
    }
    /**
     * Handle common authentication setup in connectedCallback
     */
    async connectedCallback() {
      super.connectedCallback(), await this.setupAuthContext();
    }
  }
  return e;
};
var v = Object.defineProperty, b = (s, e, t, r) => {
  for (var a = void 0, o = s.length - 1, c; o >= 0; o--)
    (c = s[o]) && (a = c(e, t, a) || a);
  return a && v(e, t, a), a;
};
class S extends g(d) {
  constructor() {
    super(), this.saveMessage = "", this.saveMessage = "";
  }
  async saveMenuItemsToDb(e) {
    try {
      const t = await this.makeAuthenticatedRequest(
        `${n.API_BASE}${n.ENDPOINTS.MENU_ITEMS}`,
        {
          method: "POST",
          body: JSON.stringify({ items: e })
        }
      );
      await h.handleResponse(t), localStorage.setItem(n.STORAGE_KEYS.MENU_ITEMS, JSON.stringify(e)), window.dispatchEvent(new CustomEvent("powerSortMenuUpdated", {
        detail: { menuItems: e }
      }));
    } catch (t) {
      console.error("Error saving menu items to database:", t), localStorage.setItem(n.STORAGE_KEYS.MENU_ITEMS, JSON.stringify(e)), window.dispatchEvent(new CustomEvent("powerSortMenuUpdated", {
        detail: { menuItems: e }
      }));
    }
  }
}
b([
  l()
], S.prototype, "saveMessage");
const x = p`
  /* Dashboard Layout */
  .dashboard-container {
    max-width: 1200px;
    margin: 0 auto;
  }

  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--uui-size-space-6);
  }

  .header-content h1 {
    margin: 0 0 var(--uui-size-space-2) 0;
    font-size: var(--uui-type-h3-size);
  }

  .header-content p {
    color: var(--uui-color-text-alt);
    margin: 0;
  }

  .header-actions {
    display: flex;
    gap: var(--uui-size-space-3);
  }

  /* Loading and Error States */
  .loading,
  .error,
  .empty-state {
    padding: var(--uui-size-space-6);
    text-align: center;
    background: var(--uui-color-surface);
    border: 1px solid var(--uui-color-border);
    border-radius: var(--uui-border-radius);
  }

  .error {
    color: var(--uui-color-danger);
    border-color: var(--uui-color-danger);
  }

  .loading-spinner {
    display: flex;
    justify-content: center;
    padding: var(--uui-size-space-8);
  }

  .error-message {
    background: var(--uui-color-danger-emphasis);
    color: var(--uui-color-danger);
    padding: var(--uui-size-space-3);
    border-radius: var(--uui-border-radius);
    margin-bottom: var(--uui-size-space-4);
  }

  .success-message {
    background: var(--uui-color-positive-emphasis);
    color: var(--uui-color-positive);
    padding: var(--uui-size-space-3);
    border-radius: var(--uui-border-radius);
    margin-bottom: var(--uui-size-space-4);
  }

  /* Info Banners */
  .info-banner {
    border: 1px solid var(--uui-color-border);
    border-radius: var(--uui-border-radius);
    padding: var(--uui-size-space-3);
    margin-bottom: var(--uui-size-space-4);
    display: flex;
    align-items: center;
    gap: var(--uui-size-space-3);
  }

  .info-banner.default-order {
    background: var(--uui-color-default-emphasis);
  }

  .info-banner.active-schedule {
    background: var(--uui-color-positive-emphasis);
    border-color: var(--uui-color-positive);
  }

  .info-banner .icon {
    font-size: 20px;
  }

  .info-banner .content {
    flex: 1;
  }

  .info-banner .actions {
    display: flex;
    gap: var(--uui-size-space-2);
  }

  /* Cards and Lists */
  .card {
    background: var(--uui-color-surface);
    border: 1px solid var(--uui-color-border);
    border-radius: var(--uui-border-radius);
    padding: var(--uui-size-space-4);
    display: grid;
    gap: var(--uui-size-space-4);
    align-items: center;
  }

  .card.active {
    border-color: var(--uui-color-positive);
    background: var(--uui-color-positive-emphasis);
  }

  .card-list {
    display: flex;
    flex-direction: column;
    gap: var(--uui-size-space-3);
  }

  /* Tables */
  .data-table {
    width: 100%;
    border-collapse: collapse;
    background: var(--uui-color-surface);
    border-radius: var(--uui-border-radius);
    overflow: hidden;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .data-table thead {
    background: var(--uui-color-surface-alt);
  }

  .data-table th {
    padding: var(--uui-size-space-4);
    text-align: left;
    font-weight: 600;
    border-bottom: 2px solid var(--uui-color-border);
  }

  .data-table td {
    padding: var(--uui-size-space-4);
    border-bottom: 1px solid var(--uui-color-border);
  }

  .data-table tbody tr {
    transition: all 0.2s;
  }

  .data-table tbody tr:hover {
    background: var(--uui-color-surface-emphasis);
  }

  .data-table tbody tr:last-child td {
    border-bottom: none;
  }

  /* Badges */
  .badge {
    display: inline-flex;
    align-items: center;
    gap: var(--uui-size-space-1);
    padding: var(--uui-size-space-1) var(--uui-size-space-2);
    border-radius: var(--uui-border-radius);
    font-size: var(--uui-type-small-size);
    font-weight: 600;
  }

  .badge.positive {
    background: var(--uui-color-positive);
    color: white;
  }

  .badge.default {
    background: var(--uui-color-surface-emphasis);
    color: var(--uui-color-text);
  }

  .badge.warning {
    background: var(--uui-color-warning);
    color: white;
  }

  /* Utilities */
  .text-center {
    text-align: center;
  }

  .flex {
    display: flex;
  }

  .flex-column {
    flex-direction: column;
  }

  .items-center {
    align-items: center;
  }

  .gap-2 {
    gap: var(--uui-size-space-2);
  }

  .gap-3 {
    gap: var(--uui-size-space-3);
  }

  .mb-4 {
    margin-bottom: var(--uui-size-space-4);
  }

  .p-4 {
    padding: var(--uui-size-space-4);
  }

  .sr-only:not(:focus):not(:active) {
    clip: rect(0 0 0 0);
    clip-path: inset(50%);
    height: 1px;
    overflow: hidden;
    position: absolute;
    white-space: nowrap;
    width: 1px;
  }

  .popover {
    color: var(--uui-palette-maroon-flush-dark);
    background-color: var(--uui-color-surface-emphasis);
    box-shadow:
      0 10px 15px -3px rgb(0 0 0 / 0.1),
      0 4px 6px -4px rgb(0 0 0 / 0.1);
    padding: 8px !important;
  }


`;
export {
  h as A,
  n as P,
  g as U,
  A as b,
  S as c,
  x as p
};
//# sourceMappingURL=shared.styles-BdnPOy5W.js.map
