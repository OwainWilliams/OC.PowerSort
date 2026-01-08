import { LitElement as h, html as o, css as v, state as b, customElement as w } from "@umbraco-cms/backoffice/external/lit";
import { U as _, P as c, A as f } from "./api-response.utils-UvM8kS4m.js";
import { R as u } from "./validation.utils-BWAQMB43.js";
import { UMB_SECTION_CONTEXT as I } from "@umbraco-cms/backoffice/section";
var E = Object.defineProperty, S = Object.getOwnPropertyDescriptor, m = (e) => {
  throw TypeError(e);
}, p = (e, t, a, r) => {
  for (var s = r > 1 ? void 0 : r ? S(t, a) : t, i = e.length - 1, d; i >= 0; i--)
    (d = e[i]) && (s = (r ? d(t, a, s) : d(s)) || s);
  return r && s && E(t, a, s), s;
}, M = (e, t, a) => t.has(e) || m("Cannot " + a), g = (e, t, a) => t.has(e) ? m("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, a), C = (e, t, a, r) => (M(e, t, "write to private field"), t.set(e, a), a), l;
let n = class extends _(h) {
  constructor() {
    super(), this.menuItems = [], g(this, l), window.addEventListener("powerSortMenuUpdated", this.handleMenuUpdate.bind(this));
  }
  async connectedCallback() {
    super.connectedCallback(), await this.setupSectionContext(), await this.loadMenuItemsFromDb();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), window.removeEventListener("powerSortMenuUpdated", this.handleMenuUpdate.bind(this));
  }
  async setupSectionContext() {
    return new Promise((e) => {
      this.consumeContext(I, (t) => {
        C(this, l, t), e();
      }).asPromise({ preventTimeout: !0 }).catch(() => {
        console.warn("Section context not available"), e();
      });
    });
  }
  handleMenuUpdate(e) {
    const t = e;
    t.detail?.menuItems && (this.menuItems = t.detail.menuItems);
  }
  async loadMenuItemsFromDb() {
    try {
      const e = await this.makeAuthenticatedRequest(
        `${c.API_BASE}${c.ENDPOINTS.MENU_ITEMS}`
      ), t = await f.handleResponse(e);
      this.menuItems = t.items || [];
    } catch (e) {
      console.error("Error loading menu items from database:", e), this.loadMenuItems();
    }
  }
  loadMenuItems() {
    const e = localStorage.getItem(c.STORAGE_KEYS.MENU_ITEMS);
    this.menuItems = e ? JSON.parse(e) : [];
  }
  handleMenuItemClick(e) {
    u.navigateTo(u.getDashboardPath("children", e));
  }
  render() {
    return o`
      <div class="sidebar-header">
        <h3>Power Sort Nodes</h3>
      </div>
      <div class="menu-list">
        ${this.menuItems.length > 0 ? o`
          ${this.menuItems.map((e) => o`
            <uui-menu-item
              label="${e.name}"
              @click=${() => this.handleMenuItemClick(e.id)}>
              <uui-icon slot="icon" name="${e.icon}"></uui-icon>
            </uui-menu-item>
          `)}
        ` : o`
          <div class="no-items">
            No menu items yet.<br>
            Add nodes from the dashboard.
          </div>
        `}
      </div>
    `;
  }
};
l = /* @__PURE__ */ new WeakMap();
n.styles = v`
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
p([
  b()
], n.prototype, "menuItems", 2);
n = p([
  w("oc-powersorting-sidebar-app")
], n);
const O = n;
export {
  n as OcPowersortingSidebarAppElement,
  O as default
};
//# sourceMappingURL=sidebar-app.element-Bn37fnKH.js.map
