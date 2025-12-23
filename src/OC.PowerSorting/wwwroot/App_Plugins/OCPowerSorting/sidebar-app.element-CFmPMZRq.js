import { LitElement as h, html as n, css as m, state as d, customElement as p } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as b } from "@umbraco-cms/backoffice/element-api";
import { UMB_AUTH_CONTEXT as l } from "@umbraco-cms/backoffice/auth";
var g = Object.defineProperty, f = Object.getOwnPropertyDescriptor, i = (e, t, r, o) => {
  for (var s = o > 1 ? void 0 : o ? f(t, r) : t, u = e.length - 1, c; u >= 0; u--)
    (c = e[u]) && (s = (o ? c(t, r, s) : c(s)) || s);
  return o && s && g(t, r, s), s;
};
let a = class extends b(h) {
  constructor() {
    super(), this.menuItems = [], this.hasError = !1, this.errorMessage = "", this.authToken = "", window.addEventListener("powerSortMenuUpdated", this.handleMenuUpdate.bind(this));
  }
  connectedCallback() {
    super.connectedCallback(), this.setupContexts();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), window.removeEventListener("powerSortMenuUpdated", this.handleMenuUpdate.bind(this));
  }
  async setupContexts() {
    try {
      await this.setupAuthContext(), await this.loadMenuItemsFromDb();
    } catch (e) {
      console.error("Failed to setup contexts:", e), this.hasError = !0, this.errorMessage = "Failed to initialize sidebar";
    }
  }
  async setupAuthContext() {
    return new Promise((e) => {
      this.consumeContext(l, async (t) => {
        try {
          const r = t?.getOpenApiConfiguration?.();
          r?.token && (this.authToken = await r.token()), e();
        } catch (r) {
          console.error("Failed to setup auth context:", r), this.hasError = !0, this.errorMessage = "Failed to authenticate", e();
        }
      }).asPromise({ preventTimeout: !0 }).catch(() => {
        console.error("Auth context not available"), this.hasError = !0, this.errorMessage = "Failed to access authentication context", e();
      });
    });
  }
  async getAuthToken() {
    try {
      let e = this.authToken;
      if (!e) {
        const t = await this.getContext(l);
        if (t) {
          const r = t.getOpenApiConfiguration?.();
          r?.token && (e = await r.token() ?? "", e !== "" && (this.authToken = e));
        }
      }
      return e;
    } catch (e) {
      return console.error("Failed to get auth token:", e), "";
    }
  }
  async makeAuthenticatedRequest(e, t = {}) {
    const r = await this.getAuthToken(), o = {
      "Content-Type": "application/json"
    };
    return r && (o.Authorization = `Bearer ${r}`), fetch(e, {
      ...t,
      headers: o
    });
  }
  handleMenuUpdate(e) {
    const t = e;
    t.detail?.menuItems && (this.menuItems = t.detail.menuItems);
  }
  async loadMenuItemsFromDb() {
    try {
      const e = await this.makeAuthenticatedRequest("/umbraco/management/api/v1/oc/power-sorting/menu-items", {
        method: "GET"
      });
      if (!e.ok) {
        console.error("Failed to load menu items:", e.status), this.loadMenuItems();
        return;
      }
      const t = await e.json();
      this.menuItems = t.items || [];
    } catch (e) {
      console.error("Error loading menu items from database:", e), this.loadMenuItems();
    }
  }
  loadMenuItems() {
    const e = localStorage.getItem("powerSortMenuItems");
    this.menuItems = e ? JSON.parse(e) : [];
  }
  handleMenuItemClick(e) {
    window.location.hash = `/section/power-sort/dashboard/power-sort-children/${e}`;
  }
  render() {
    return n`
      ${this.hasError ? n`
        <div class="error-alert">${this.errorMessage}</div>
      ` : ""}
      
      <div class="sidebar-header">
        <h3>Power Sort Nodes</h3>
      </div>
      <div class="menu-list">
        ${this.menuItems.length > 0 ? n`
          ${this.menuItems.map((e) => n`
            <uui-menu-item
              label="${e.name}"
              @click=${() => this.handleMenuItemClick(e.id)}>
              <uui-icon slot="icon" name="${e.icon}"></uui-icon>
            </uui-menu-item>
          `)}
        ` : n`
          <div class="no-items">
            No menu items yet.<br>
            Add nodes from the dashboard.
          </div>
        `}
      </div>
    `;
  }
};
a.styles = m`
    :host {
      display: block;
    }

    .sidebar-header {
      padding: var(--uui-size-space-4);
      border-bottom: 1px solid var(--uui-color-border);
    }

    .sidebar-header h3 {
      margin: 0;
      font-size: var(--uui-type-h5-size);
      color: var(--uui-color-text);
    }

    .menu-list {
      padding: var(--uui-size-space-2);
    }

    .no-items {
      padding: var(--uui-size-space-4);
      text-align: center;
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
      font-style: italic;
    }

    .error-alert {
      background-color: #f8d7da;
      border: 1px solid #f5c6cb;
      color: #721c24;
      padding: 0.75rem 1.25rem;
      margin: 1rem;
      border-radius: 0.25rem;
    }
  `;
i([
  d()
], a.prototype, "menuItems", 2);
i([
  d()
], a.prototype, "hasError", 2);
i([
  d()
], a.prototype, "errorMessage", 2);
a = i([
  p("oc-powersorting-sidebar-app")
], a);
const k = a;
export {
  a as OcPowersortingSidebarAppElement,
  k as default
};
//# sourceMappingURL=sidebar-app.element-CFmPMZRq.js.map
