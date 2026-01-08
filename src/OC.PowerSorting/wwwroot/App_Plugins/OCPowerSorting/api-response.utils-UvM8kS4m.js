import { UmbElementMixin as u } from "@umbraco-cms/backoffice/element-api";
import { UMB_AUTH_CONTEXT as n } from "@umbraco-cms/backoffice/auth";
const l = (c) => {
  class t extends u(c) {
    constructor() {
      super(...arguments), this.authToken = "", this.hasError = !1, this.errorMessage = "";
    }
    /**
     * Setup authentication context and get initial token
     */
    async setupAuthContext() {
      return new Promise((e) => {
        this.consumeContext(n, async (r) => {
          try {
            const o = r?.getOpenApiConfiguration?.();
            o?.token && (this.authToken = await o.token()), e();
          } catch (o) {
            console.error("Failed to setup auth context:", o), this.hasError = !0, this.errorMessage = "Failed to authenticate", e();
          }
        }).asPromise({ preventTimeout: !0 }).catch(() => {
          console.error("Auth context not available"), this.hasError = !0, this.errorMessage = "Failed to access authentication context", e();
        });
      });
    }
    /**
     * Get current authentication token, refreshing if necessary
     */
    async getAuthToken() {
      try {
        let e = this.authToken;
        if (!e) {
          const r = await this.getContext(n);
          if (r) {
            const o = r.getOpenApiConfiguration?.();
            o?.token && (e = await o.token() ?? "", e !== "" && (this.authToken = e));
          }
        }
        return e;
      } catch (e) {
        return console.error("Failed to get auth token:", e), "";
      }
    }
    /**
     * Make an authenticated HTTP request
     */
    async makeAuthenticatedRequest(e, r = {}) {
      const o = await this.getAuthToken(), a = new Headers(r.headers);
      return a.set("Content-Type", "application/json"), o && a.set("Authorization", `Bearer ${o}`), fetch(e, {
        ...r,
        headers: a
      });
    }
    /**
     * Handle common authentication setup in connectedCallback
     */
    async connectedCallback() {
      super.connectedCallback(), await this.setupAuthContext();
    }
  }
  return t;
}, s = class s {
};
s.API_BASE = "/umbraco/management/api/v1/oc/power-sorting", s.ENDPOINTS = {
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
}, s.MESSAGES = {
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
}, s.STORAGE_KEYS = {
  MENU_ITEMS: "powerSortMenuItems",
  SELECTED_NODE_NAME: "powerSortSelectedNodeName",
  SELECTED_NODE_ID: "powerSortSelectedNodeId",
  LAST_SELECTED_TIME: "powerSortLastSelectedTime"
}, s.SCHEDULE_STATUS = {
  ACTIVE: "active",
  SCHEDULED: "scheduled",
  EXPIRED: "expired",
  PENDING: "pending"
}, s.ICONS = {
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
}, s.CSS_CLASSES = {
  LOADING: "power-sort-loading",
  ERROR: "power-sort-error",
  SUCCESS: "power-sort-success",
  ACTIVE: "power-sort-active",
  HIDDEN: "power-sort-hidden"
}, s.DEFAULTS = {
  PRIORITY: 0,
  TAKE_SIZE: 100,
  TIMEOUT: 5e3
};
let E = s;
class T {
  /**
   * Handle API response with consistent error handling
   */
  static async handleResponse(t) {
    if (!t.ok) {
      let i = `API Error (${t.status})`;
      try {
        const e = await t.json();
        i = e.error || e.message || i;
      } catch {
        i = await t.text() || i;
      }
      throw new Error(i);
    }
    return t.status === 204 ? {} : t.json();
  }
  /**
   * Show user-friendly error message
   */
  static showError(t, i = "") {
    const e = t instanceof Error ? t.message : "An unexpected error occurred", r = i ? `${i}: ${e}` : e;
    console.error(r, t), alert(r);
  }
  /**
   * Show success message
   */
  static showSuccess(t) {
    console.log("Success:", t), alert(t);
  }
  /**
   * Confirm action with user
   */
  static confirmAction(t) {
    return confirm(t);
  }
}
export {
  T as A,
  E as P,
  l as U
};
//# sourceMappingURL=api-response.utils-UvM8kS4m.js.map
