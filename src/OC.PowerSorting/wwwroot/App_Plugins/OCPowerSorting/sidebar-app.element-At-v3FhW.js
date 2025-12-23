import { LitElement as p, html as n, css as v, state as h, customElement as w } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as f } from "@umbraco-cms/backoffice/element-api";
import { UMB_AUTH_CONTEXT as l } from "@umbraco-cms/backoffice/auth";
import { UMB_SECTION_CONTEXT as g } from "@umbraco-cms/backoffice/section";
var b = Object.defineProperty, C = Object.getOwnPropertyDescriptor, m = (e) => {
  throw TypeError(e);
}, i = (e, t, r, o) => {
  for (var s = o > 1 ? void 0 : o ? C(t, r) : t, c = e.length - 1, u; c >= 0; c--)
    (u = e[c]) && (s = (o ? u(t, r, s) : u(s)) || s);
  return o && s && b(t, r, s), s;
}, x = (e, t, r) => t.has(e) || m("Cannot " + r), y = (e, t, r) => t.has(e) ? m("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, r), k = (e, t, r, o) => (x(e, t, "write to private field"), t.set(e, r), r), d;
let a = class extends f(p) {
  constructor() {
    super(), this.menuItems = [], this.hasError = !1, this.errorMessage = "", this.authToken = "", y(this, d), window.addEventListener("powerSortMenuUpdated", this.handleMenuUpdate.bind(this));
  }
  connectedCallback() {
    super.connectedCallback(), this.setupContexts();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), window.removeEventListener("powerSortMenuUpdated", this.handleMenuUpdate.bind(this));
  }
  async setupContexts() {
    try {
      await this.setupAuthContext(), await this.setupSectionContext(), await this.loadMenuItemsFromDb();
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
  async setupSectionContext() {
    return new Promise((e) => {
      this.consumeContext(g, (t) => {
        k(this, d, t), e();
      }).asPromise({ preventTimeout: !0 }).catch(() => {
        console.warn("Section context not available"), e();
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
    const r = await this.getAuthToken(), o = new Headers(t.headers);
    return o.set("Content-Type", "application/json"), r && o.set("Authorization", `Bearer ${r}`), fetch(e, {
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
    const t = `/umbraco/section/power-sort/dashboard/power-sort-children/${e}`;
    history.pushState(null, "", t), window.dispatchEvent(new PopStateEvent("popstate"));
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
d = /* @__PURE__ */ new WeakMap();
a.styles = v`
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
  h()
], a.prototype, "menuItems", 2);
i([
  h()
], a.prototype, "hasError", 2);
i([
  h()
], a.prototype, "errorMessage", 2);
a = i([
  w("oc-powersorting-sidebar-app")
], a);
const T = a;
export {
  a as OcPowersortingSidebarAppElement,
  T as default
};
//# sourceMappingURL=sidebar-app.element-At-v3FhW.js.map
