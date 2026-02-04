import { html as n, css as h, state as v, customElement as b } from "@umbraco-cms/backoffice/external/lit";
import { R as l } from "./validation.utils-BMdJXB5x.js";
import { c as g, P as c, A as I } from "./crud.mixin-WeBWptlA.js";
import { UMB_SECTION_CONTEXT as f } from "@umbraco-cms/backoffice/section";
var w = Object.defineProperty, M = Object.getOwnPropertyDescriptor, m = (e) => {
  throw TypeError(e);
}, p = (e, t, o, r) => {
  for (var s = r > 1 ? void 0 : r ? M(t, o) : t, a = e.length - 1, u; a >= 0; a--)
    (u = e[a]) && (s = (r ? u(t, o, s) : u(s)) || s);
  return r && s && w(t, o, s), s;
}, x = (e, t, o) => t.has(e) || m("Cannot " + o), S = (e, t, o) => t.has(e) ? m("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, o), _ = (e, t, o, r) => (x(e, t, "write to private field"), t.set(e, o), o), d;
let i = class extends g {
  constructor() {
    super(), this.menuItems = [], S(this, d), window.addEventListener("powerSortMenuUpdated", this.handleMenuUpdate.bind(this));
  }
  async connectedCallback() {
    super.connectedCallback(), await this.setupSectionContext(), await this.loadMenuItemsFromDb();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), window.removeEventListener("powerSortMenuUpdated", this.handleMenuUpdate.bind(this));
  }
  async setupSectionContext() {
    return new Promise((e) => {
      this.consumeContext(f, (t) => {
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
        `${c.API_BASE}${c.ENDPOINTS.MENU_ITEMS}`
      ), t = await I.handleResponse(e);
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
    l.navigateTo(l.getDashboardPath("children", e));
  }
  removeMenuItem(e, t) {
    const r = e.currentTarget?.closest(".js-popover"), s = this.menuItems.find((a) => a.id === t);
    this.menuItems = this.menuItems.filter((a) => a.id !== t), this.saveMenuItemsToDb(this.menuItems), console.log("Menu item removed:", t), this.saveMessage = `✓ "${s?.name}" removed from menu`, r?.setAttribute("close", "true"), setTimeout(() => {
      this.saveMessage = "", this.requestUpdate();
    }, 3e3);
  }
  render() {
    return n`
      <div class="sidebar-header">
        <h3>Power Sort Nodes</h3>
      </div>
      <div class="menu-list">
        ${this.menuItems.length > 0 ? n`
          ${this.menuItems.map((e) => n`
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
i.styles = h`
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

    
  .popover {
    color: var(--uui-palette-maroon-flush-dark);
    background-color: var(--uui-color-surface-emphasis);
    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
    padding: 8px !important;
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
  `;
p([
  v()
], i.prototype, "menuItems", 2);
i = p([
  b("oc-powersort-sidebar-app")
], i);
const T = i;
export {
  i as OcPowerSortSidebarAppElement,
  T as default
};
//# sourceMappingURL=sidebar-app.element-BwvtbaCw.js.map
