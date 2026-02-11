import { html as u, css as h, state as v, customElement as b } from "@umbraco-cms/backoffice/external/lit";
import { R as l } from "./validation.utils-QQX9Ru6J.js";
import { c as I, P as i, A as S, p as f } from "./shared.styles-BdnPOy5W.js";
import { UMB_SECTION_CONTEXT as E } from "@umbraco-cms/backoffice/section";
var w = Object.defineProperty, M = Object.getOwnPropertyDescriptor, m = (e) => {
  throw TypeError(e);
}, p = (e, t, o, a) => {
  for (var r = a > 1 ? void 0 : a ? M(t, o) : t, s = e.length - 1, c; s >= 0; s--)
    (c = e[s]) && (r = (a ? c(t, o, r) : c(r)) || r);
  return a && r && w(t, o, r), r;
}, g = (e, t, o) => t.has(e) || m("Cannot " + o), y = (e, t, o) => t.has(e) ? m("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, o), _ = (e, t, o, a) => (g(e, t, "write to private field"), t.set(e, o), o), d;
let n = class extends I {
  constructor() {
    super(), this.menuItems = [], y(this, d), window.addEventListener(
      "powerSortMenuUpdated",
      this.handleMenuUpdate.bind(this)
    );
  }
  async connectedCallback() {
    super.connectedCallback(), await this.setupSectionContext(), await this.loadMenuItemsFromDb();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), window.removeEventListener(
      "powerSortMenuUpdated",
      this.handleMenuUpdate.bind(this)
    );
  }
  async setupSectionContext() {
    return new Promise((e) => {
      this.consumeContext(E, (t) => {
        _(this, d, t), e();
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
        `${i.API_BASE}${i.ENDPOINTS.MENU_ITEMS}`
      ), t = await S.handleResponse(e);
      this.menuItems = t.items || [];
    } catch (e) {
      console.error("Error loading menu items from database:", e), this.loadMenuItems();
    }
  }
  loadMenuItems() {
    const e = localStorage.getItem(
      i.STORAGE_KEYS.MENU_ITEMS
    );
    this.menuItems = e ? JSON.parse(e) : [];
  }
  handleMenuItemClick(e) {
    l.navigateTo(l.getDashboardPath("children", e));
  }
  async removeMenuItem(e, t) {
    const a = e.currentTarget?.closest(".js-popover"), r = this.menuItems.find(
      (s) => s.id === t
    );
    try {
      (await this.makeAuthenticatedRequest(
        `${i.API_BASE}${i.ENDPOINTS.MENU_ITEMS}/${t}`,
        {
          method: "DELETE"
        }
      )).ok || console.error("Failed to delete menu item from server");
    } catch (s) {
      console.error("Error deleting menu item:", s);
    }
    this.menuItems = this.menuItems.filter((s) => s.id !== t), this.saveMenuItemsToDb(this.menuItems), console.log("Menu item removed:", t), this.saveMessage = `✓ "${r?.name}" removed from menu and schedules cancelled`, a?.setAttribute("close", "true"), setTimeout(() => {
      this.saveMessage = "", this.requestUpdate();
    }, 3e3);
  }
  render() {
    return u`
      <div class="sidebar-header">
        <h3>Power Sort Nodes</h3>
      </div>
      <div class="menu-list">
        ${this.menuItems.length > 0 ? u`
              ${this.menuItems.map(
      (e) => u`
          <div class="js-menu-item relative">
            <uui-menu-item 
              label="${e.name}"
              @click=${() => this.handleMenuItemClick(e.id)}
              <uui-icon slot="icon" name="${e.icon}"></uui-icon>
              <uui-action-bar slot="actions">
                <uui-button label="open popover" class="" popovertarget="my-popover">
                  <uui-icon-registry-essential>
                    <uui-icon name="delete"> </uui-icon>
                  </uui-icon-registry-essential>
                </uui-button>
              </uui-action-bar>
            </uui-menu-item>
               
            <uui-popover-container id="my-popover" class="js-popover popover" placement="right-end">
              Are you sure you want to delete?
              <uui-button class="ml-1" label="delete menu item" look="primary" color="danger" @click=${(t) => this.removeMenuItem(t, e.id)}>
                Yes
              </uui-button>
            </uui-popover-container>
          `
    )}
            ` : u`
              <div class="no-items">
                No menu items yet.<br />
                Add nodes from the dashboard.
              </div>
            `}
      </div>
    `;
  }
};
d = /* @__PURE__ */ new WeakMap();
n.styles = [
  f,
  h`
      powerSortSharedStyles :host {
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

      .hidden {
        display: none;
      }

      .relative {
        position: relative;
      }

      .ml-1 {
        margin-left: 16px;
      }
    `
];
p([
  v()
], n.prototype, "menuItems", 2);
n = p([
  b("oc-powersort-sidebar-app")
], n);
const x = n;
export {
  n as OcPowerSortSidebarAppElement,
  x as default
};
//# sourceMappingURL=sidebar-app.element-DxTD6g5s.js.map
