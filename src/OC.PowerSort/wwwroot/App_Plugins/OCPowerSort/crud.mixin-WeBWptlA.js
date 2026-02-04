import { LitElement as u, property as d } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as h } from "@umbraco-cms/backoffice/element-api";
import { UMB_AUTH_CONTEXT as E } from "@umbraco-cms/backoffice/auth";
const a = class a {
};
a.API_BASE = "/umbraco/management/api/v1/oc/power-sort", a.ENDPOINTS = {
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
}, a.MESSAGES = {
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
}, a.STORAGE_KEYS = {
  MENU_ITEMS: "powerSortMenuItems",
  SELECTED_NODE_NAME: "powerSortSelectedNodeName",
  SELECTED_NODE_ID: "powerSortSelectedNodeId",
  LAST_SELECTED_TIME: "powerSortLastSelectedTime"
}, a.SCHEDULE_STATUS = {
  ACTIVE: "active",
  SCHEDULED: "scheduled",
  EXPIRED: "expired",
  PENDING: "pending"
}, a.ICONS = {
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
}, a.CSS_CLASSES = {
  LOADING: "power-sort-loading",
  ERROR: "power-sort-error",
  SUCCESS: "power-sort-success",
  ACTIVE: "power-sort-active",
  HIDDEN: "power-sort-hidden"
}, a.DEFAULTS = {
  PRIORITY: 0,
  TAKE_SIZE: 100,
  TIMEOUT: 5e3
};
let n = a;
function N(i) {
  return `${n.API_BASE}${i}`;
}
class l {
  /**
   * Handle API response with consistent error handling
   */
  static async handleResponse(e) {
    if (!e.ok) {
      let o = `API Error (${e.status})`;
      try {
        const t = await e.json();
        o = t.error || t.message || o;
      } catch {
        o = await e.text() || o;
      }
      throw new Error(o);
    }
    return e.status === 204 ? {} : e.json();
  }
  /**
   * Show user-friendly error message
   */
  static showError(e, o = "") {
    const t = e instanceof Error ? e.message : "An unexpected error occurred", r = o ? `${o}: ${t}` : t;
    console.error(r, e), alert(r);
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
const S = (i) => {
  class e extends h(i) {
    constructor() {
      super(...arguments), this.authToken = "", this.hasError = !1, this.errorMessage = "";
    }
    /**
     * Setup authentication context and get initial token
     */
    async setupAuthContext() {
      return new Promise((t) => {
        this.consumeContext(E, async (r) => {
          try {
            const s = r?.getOpenApiConfiguration?.();
            s?.token && (this.authToken = await s.token()), t();
          } catch (s) {
            console.error("Failed to setup auth context:", s), this.hasError = !0, this.errorMessage = "Failed to authenticate", t();
          }
        }).asPromise({ preventTimeout: !0 }).catch(() => {
          console.error("Auth context not available"), this.hasError = !0, this.errorMessage = "Failed to access authentication context", t();
        });
      });
    }
    /**
     * Get current authentication token, refreshing if necessary
     */
    async getAuthToken() {
      try {
        let t = this.authToken;
        if (!t) {
          const r = await this.getContext(E);
          if (r) {
            const s = r.getOpenApiConfiguration?.();
            s?.token && (t = await s.token() ?? "", t !== "" && (this.authToken = t));
          }
        }
        return t;
      } catch (t) {
        return console.error("Failed to get auth token:", t), "";
      }
    }
    /**
     * Make an authenticated HTTP request
     */
    async makeAuthenticatedRequest(t, r = {}) {
      const s = await this.getAuthToken(), c = new Headers(r.headers);
      return c.set("Content-Type", "application/json"), s && c.set("Authorization", `Bearer ${s}`), fetch(t, {
        ...r,
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
var T = Object.defineProperty, A = (i, e, o, t) => {
  for (var r = void 0, s = i.length - 1, c; s >= 0; s--)
    (c = i[s]) && (r = c(e, o, r) || r);
  return r && T(e, o, r), r;
};
class R extends S(u) {
  constructor() {
    super(), this.saveMessage = "", this.saveMessage = "";
  }
  async saveMenuItemsToDb(e) {
    try {
      const o = await this.makeAuthenticatedRequest(
        `${n.API_BASE}${n.ENDPOINTS.MENU_ITEMS}`,
        {
          method: "POST",
          body: JSON.stringify({ items: e })
        }
      );
      await l.handleResponse(o), localStorage.setItem(n.STORAGE_KEYS.MENU_ITEMS, JSON.stringify(e)), window.dispatchEvent(new CustomEvent("powerSortMenuUpdated", {
        detail: { menuItems: e }
      }));
    } catch (o) {
      console.error("Error saving menu items to database:", o), localStorage.setItem(n.STORAGE_KEYS.MENU_ITEMS, JSON.stringify(e)), window.dispatchEvent(new CustomEvent("powerSortMenuUpdated", {
        detail: { menuItems: e }
      }));
    }
  }
}
A([
  d()
], R.prototype, "saveMessage");
export {
  l as A,
  n as P,
  S as U,
  N as b,
  R as c
};
//# sourceMappingURL=crud.mixin-WeBWptlA.js.map
