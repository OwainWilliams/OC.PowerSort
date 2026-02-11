import { LitElement as w, html as c, customElement as f, css as S, property as h, state as b } from "@umbraco-cms/backoffice/external/lit";
import { U as I, c as N, P as d, A as v, p as k } from "./shared.styles-BdnPOy5W.js";
import { UmbDocumentPickerInputContext as x, UmbDocumentItemRepository as z } from "@umbraco-cms/backoffice/document";
var _ = Object.getOwnPropertyDescriptor, y = (o) => {
  throw TypeError(o);
}, E = (o, e, t, r) => {
  for (var i = r > 1 ? void 0 : r ? _(e, t) : e, s = o.length - 1, n; s >= 0; s--)
    (n = o[s]) && (i = n(i) || i);
  return i;
}, M = (o, e, t) => e.has(o) || y("Cannot " + t), p = (o, e, t) => (M(o, e, "read from private field"), t ? t.call(o) : e.get(o)), C = (o, e, t) => e.has(o) ? y("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(o) : e.set(o, t), u;
let g = class extends I(w) {
  constructor() {
    super(...arguments), C(this, u, new x(this));
  }
  async _openPicker() {
    try {
      await p(this, u).openPicker();
      const e = p(this, u).getSelection();
      console.debug("[custom-document-picker] resolved selection:", e), this.dispatchEvent(new CustomEvent("selection-changed", {
        detail: { selection: e },
        bubbles: !0,
        composed: !0
      }));
    } catch (o) {
      console.warn("[custom-document-picker] openPicker error or closed:", o);
    }
    p(this, u).setSelection([]);
  }
  render() {
    return c`
      <uui-button
        look="primary"
        label="Select document"
        @click=${this._openPicker}>
        Select parent nodes
      </uui-button>
    `;
  }
};
u = /* @__PURE__ */ new WeakMap();
g = E([
  f("custom-document-picker")
], g);
var A = Object.defineProperty, l = (o, e, t, r) => {
  for (var i = void 0, s = o.length - 1, n; s >= 0; s--)
    (n = o[s]) && (i = n(e, t, i) || i);
  return i && A(e, t, i), i;
};
const m = class m extends N {
  constructor() {
    super(), this.selectedNodeId = null, this.selectedNodeName = "", this.menuItems = [], this.currentView = "main", this.routeNodeId = "", this.selectedNodeId = null, this.selectedNodeName = "", this.menuItems = [];
  }
  async connectedCallback() {
    super.connectedCallback(), this.documentItemRepository = new z(this), this.detectCurrentView(), window.addEventListener("hashchange", () => this.detectCurrentView()), window.addEventListener("popstate", () => this.detectCurrentView()), await this.loadMenuItemsFromDb();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), window.removeEventListener("hashchange", () => this.detectCurrentView()), window.removeEventListener("popstate", () => this.detectCurrentView());
  }
  detectCurrentView() {
    const e = window.location.hash;
    if (e.includes("children/")) {
      this.currentView = "children";
      const t = e.match(/children\/([a-f0-9-]+)/i);
      this.routeNodeId = t ? t[1] : "", this.requestUpdate();
    } else if (e.includes("schedules/")) {
      this.currentView = "schedules";
      const t = e.match(/schedules\/([a-f0-9-]+)/i);
      this.routeNodeId = t ? t[1] : "", this.requestUpdate();
    } else e.includes("priorities") ? (this.currentView = "priorities", this.requestUpdate()) : (this.currentView = "main", this.requestUpdate());
  }
  async loadMenuItemsFromDb() {
    try {
      const e = await this.makeAuthenticatedRequest(
        `${d.API_BASE}${d.ENDPOINTS.MENU_ITEMS}`
      ), t = await v.handleResponse(e);
      this.menuItems = t.items || [];
    } catch (e) {
      console.error("Error loading menu items from database:", e);
      const t = localStorage.getItem(
        d.STORAGE_KEYS.MENU_ITEMS
      );
      this.menuItems = t ? JSON.parse(t) : [];
    }
  }
  async saveMenuItemsToDb() {
    try {
      const e = await this.makeAuthenticatedRequest(
        `${d.API_BASE}${d.ENDPOINTS.MENU_ITEMS}`,
        {
          method: "POST",
          body: JSON.stringify({ items: this.menuItems })
        }
      );
      await v.handleResponse(e), localStorage.setItem(
        d.STORAGE_KEYS.MENU_ITEMS,
        JSON.stringify(this.menuItems)
      ), window.dispatchEvent(
        new CustomEvent("powerSortMenuUpdated", {
          detail: { menuItems: this.menuItems }
        })
      );
    } catch (e) {
      console.error("Error saving menu items to database:", e), localStorage.setItem(
        d.STORAGE_KEYS.MENU_ITEMS,
        JSON.stringify(this.menuItems)
      ), window.dispatchEvent(
        new CustomEvent("powerSortMenuUpdated", {
          detail: { menuItems: this.menuItems }
        })
      );
    }
  }
  // This method handles the selection event with full node data
  async handleContentSelected(e) {
    console.log("Content selected event:", e);
    const t = e;
    console.log("Custom event detail:", t.detail);
    const r = e.target;
    console.log("Picker element:", r), console.log("Picker selection:", r.selection), console.log("Picker value:", r.value);
    let i = t.detail?.selection || r.selection || r.value;
    console.log("Final selection:", i), i && Array.isArray(i) && i.length > 0 ? i.forEach(async (s) => {
      const n = typeof s == "string" ? s : s.unique || s.id;
      await this.fetchNodeDetails(n), this.addSelectedNodeToMenu();
    }) : typeof i == "string" ? await this.fetchNodeDetails(i) : i && Array.isArray(i) && i.length === 0 ? this.clearSelection() : console.warn("Could not extract selection from event");
  }
  async fetchNodeDetails(e) {
    try {
      if (!this.documentItemRepository) {
        console.error("Document repository not initialized");
        return;
      }
      const { data: t } = await this.documentItemRepository.requestItems([e]);
      if (t && t.length > 0) {
        const r = t[0];
        this.selectedNodeId = r.unique, this.selectedNodeName = r.variants?.[0]?.name || "Unnamed Node", console.log("Fetched node details:", r), this.saveSelection(), this.saveMessage = "";
      } else
        console.error("No node data returned"), this.saveMessage = "Failed to load node details";
    } catch (t) {
      console.error("Error fetching node details:", t), this.saveMessage = "Error loading node details";
    }
  }
  addSelectedNodeToMenu() {
    if (!this.selectedNodeId || !this.selectedNodeName)
      return;
    const e = {
      unique: this.selectedNodeId,
      name: this.selectedNodeName
    };
    this.addMenuItemForNode(e), this.saveMessage = `✓ "${this.selectedNodeName}" added to sidebar menu!`, setTimeout(() => {
      this.saveMessage = "", this.requestUpdate();
    }, 3e3);
  }
  addMenuItemForNode(e) {
    const t = {
      id: e.unique,
      name: e.name || "Unnamed Node",
      icon: "icon-document"
    };
    this.menuItems.some(
      (i) => i.id === e.unique
    ) ? (console.log("Menu item already exists"), this.saveMessage = `"${e.name}" is already in the menu`, setTimeout(() => {
      this.saveMessage = "", this.requestUpdate();
    }, 3e3)) : (this.menuItems = [...this.menuItems, t], this.saveMenuItemsToDb(), console.log("Menu item added:", t));
  }
  clearSelection() {
    this.selectedNodeId = null, this.selectedNodeName = "", localStorage.removeItem("powerSortSelectedNodeName"), localStorage.removeItem("powerSortSelectedNodeId"), localStorage.removeItem("powerSortLastSelectedTime"), this.requestUpdate();
  }
  saveSelection() {
    this.selectedNodeName && this.selectedNodeId && (localStorage.setItem("powerSortSelectedNodeName", this.selectedNodeName), localStorage.setItem("powerSortSelectedNodeId", this.selectedNodeId), localStorage.setItem(
      "powerSortLastSelectedTime",
      (/* @__PURE__ */ new Date()).toISOString()
    ));
  }
  restoreSelection() {
    const e = localStorage.getItem("powerSortSelectedNodeName"), t = localStorage.getItem("powerSortSelectedNodeId");
    e && t && (this.selectedNodeName = e, this.selectedNodeId = t, this.requestUpdate());
  }
  toggleAccordion() {
    const e = this.renderRoot.querySelector(
      "uui-symbol-expand"
    ), t = this.renderRoot.querySelector(".accordion__content");
    t && (t.classList.toggle("hidden"), e.toggleAttribute("open"));
  }
  render() {
    switch (this.currentView) {
      case "children":
        return this.renderChildrenView();
      case "schedules":
        return this.renderSchedulesView();
      case "priorities":
        return this.renderPrioritiesView();
      default:
        return this.renderMainView();
    }
  }
  renderMainView() {
    return c`
      <div class="dashboard-container">
        <div class="dashboard-header">
          <div>
            <h1 aria-describedby="plugin-description">Power Sort Dashboard</h1>
            <p id="plugin-description">
              A plugin to enable scheduled sorting of child nodes
            </p>
          </div>
        </div>

        <div class="dashboard__grid">
          <uui-box>
            <h2>Select Parent Node</h2>
            <custom-document-picker
              @selection-changed=${this.handleContentSelected}
            >
            </custom-document-picker>
          </uui-box>
          <uui-box>
            <h2>Manage Priority Settings</h2>
            <uui-button
              look="primary"
              color="positive"
              label="Manage Enum Priorities"
              @click=${() => window.location.hash = "priorities"}
            >
              <uui-icon name="icon-ordered-list"></uui-icon>
              Manage Priorities
            </uui-button></uui-box
          >
        </div>
        <section class="accordion">
          <button @click="${this.toggleAccordion}" class="accordion__header">
            <div class="header__container">
              <h2>Step-by-Step Guide</h2>
              <uui-icon name="info"></uui-icon>
            </div>
            <uui-symbol-expand></uui-symbol-expand>
          </button>
          <div class="accordion__content hidden">
            <div class="step__intro">
              <strong>
                Power Sort takes the hassle out of setting your content
                priorities, enabling you to automate the sort order of list
                items and prioritize based on your needs.
              </strong>
              <p>
                Whether you want to keep your content fresh by automatically
                pushing new items to the top, or you need to set specific
                priorities for certain items, Power Sort has you covered.
              </p>
              <p>
                With its intuitive interface and powerful scheduling
                capabilities, you can ensure your content is always organized
                just the way you want it.
              </p>
            </div>
            <div class="step">
              <h3>Step 1: Select the parent listing node you want to sort</h3>
              <p>
                Use the content picker to select the parent node of the listing
                items you want to sort. A parent node will always appear with
                items listed beneath it
              </p>
              <custom-document-picker
                @selection-changed=${this.handleContentSelected}
              >
              </custom-document-picker>
            </div>

            <div class="step">
              <h3>Step 2: Manage your selected nodes in the left hand menu</h3>
              <p>
                All added parent nodes will appear in the left-hand menu. From
                here, you can click on a node to manage its child nodes and
                sorting schedules. You can also remove nodes from the menu if
                you no longer want to manage them.
              </p>
            </div>
            <div class="step">
              <h3>Step 4: Update Child Node Schedules</h3>
              <p>
                The scheduling interface provides you with all list items, in
                their current order. There are a number of actions you can take
                in this view:
              </p>

              <ul>
                <li>
                  <strong
                    >Drag and drop items to establish the default order</strong
                  >
                  <p>
                    When you have your preferred order, click 'save default
                    order' and this will be stored as a default you can return
                    to by clicking 'restore default'
                  </p>
                </li>
                <li>
                  <strong>Add a new schedule to an item</strong>
                  <p>
                    Each item will have an 'add schedule' button. Clicking this
                    will open a dialogue where you can set the date range, the
                    target position and it's overall priority. An item can have
                    multiple schedules, and you can edit or delete these at any
                    time.
                  </p>
                </li>
                <li>
                  <strong>View an item's current schedule</strong>
                  <p>
                    Clicking 'View Schedules' will show you all active and
                    upcoming schedules, with the opportunity to edit or delete.
                  </p>
                </li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    `;
  }
  renderChildrenView() {
    return import("./children.element-BVv9PQI4.js"), c`
      <power-sort-children-dashboard
        .id=${this.routeNodeId}
      ></power-sort-children-dashboard>
    `;
  }
  renderSchedulesView() {
    return import("./schedules.element-RJGlesr0.js"), c`
      <power-sort-schedules
        .parentId=${this.routeNodeId}
      ></power-sort-schedules>
    `;
  }
  renderPrioritiesView() {
    return import("./priority-section-view.element-DsjGyR48.js"), c`
      <power-sort-enum-priorities-dashboard></power-sort-enum-priorities-dashboard>
    `;
  }
};
m.styles = [
  k,
  S`
      :host {
        display: block;
        padding: var(--uui-size-space-5);
      }

      .dashboard-header {
        display: flex;
        flex-direction: column;
        margin-bottom: var(--uui-size-space-6);
        padding: var(--uui-size-space-6);
        background: var(--uui-color-surface);
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
      }

      .dashboard-header h1 {
        margin: 0 0 var(--uui-size-space-4) 0;
        font-size: var(--uui-type-h3-size);
      }

      .dashboard-header p {
        color: var(--uui-color-text-alt);
        margin: 0;
      }

      .content-picker-section {
        margin-bottom: var(--uui-size-space-6);
      }

      .content-picker-section h2 {
        font-size: var(--uui-type-h5-size);
        margin-bottom: var(--uui-size-space-3);
        margin-block-start: 0;
        margin-block-end: 0;
      }

      .content-picker-wrapper {
        background: var(--uui-color-surface);
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
        padding: var(--uui-size-space-4);
      }

      .picker-label {
        display: block;
        font-weight: 500;
        margin-bottom: var(--uui-size-space-2);
        color: var(--uui-color-text);
      }

      .picker-description {
        display: block;
        font-size: var(--uui-type-small-size);
        color: var(--uui-color-text-alt);
        margin-bottom: var(--uui-size-space-3);
      }

      .selected-info {
        margin-top: var(--uui-size-space-4);
        padding: var(--uui-size-space-4);
        background: var(--uui-color-positive-emphasis);
        border-radius: var(--uui-border-radius);
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-3);
      }

      .selected-info uui-icon {
        color: var(--uui-color-positive);
      }

      .save-message {
        margin-top: var(--uui-size-space-3);
        padding: var(--uui-size-space-3);
        background: var(--uui-color-positive);
        color: white;
        border-radius: var(--uui-border-radius);
        text-align: center;
        animation: fadeIn 0.3s ease-in;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .menu-items-section {
        margin-top: var(--uui-size-space-6);
      }

      .menu-items-section h2 {
        font-size: var(--uui-type-h5-size);
        margin-bottom: var(--uui-size-space-3);
      }

      .menu-items-list {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-3);
      }

      .menu-item {
        display: flex;
        align-items: center;
        padding: var(--uui-size-space-4);
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
        background: var(--uui-color-surface);
        gap: var(--uui-size-space-3);
      }

      .menu-item uui-icon {
        color: var(--uui-color-text-alt);
      }

      .menu-item-content {
        flex: 1;
        display: flex;
        flex-direction: column;
      }

      .menu-item-name {
        font-weight: bold;
      }

      .menu-item-id {
        font-size: var(--uui-type-small-size);
        color: var(--uui-color-text-alt);
      }

      .no-items {
        padding: var(--uui-size-space-6);
        text-align: center;
        color: var(--uui-color-text-alt);
        font-style: italic;
        background: var(--uui-color-surface);
        border: 1px dashed var(--uui-color-border);
        border-radius: var(--uui-border-radius);
      }

      .action-buttons {
        display: flex;
        gap: var(--uui-size-space-3);
        margin-top: var(--uui-size-space-3);
      }

      .info-box {
        margin-top: var(--uui-size-space-4);
        padding: var(--uui-size-space-4);
        background: var(--uui-color-surface);
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
        font-size: var(--uui-type-small-size);
      }

      .info-box strong {
        display: block;
        margin-bottom: var(--uui-size-space-2);
      }

      .dashboard__grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--uui-size-space-5);
        margin-bottom: var(--uui-size-space-6);

        h2 {
          margin: 0 0 var(--uui-size-space-4) 0;
        }
      }

      .accordion {
        background: var(--uui-color-surface);
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
        margin-top: var(--uui-size-space-6);
      }

      .accordion__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        background-color: var(--uui-color-surface);
        border-bottom: 1px solid var(--uui-color-border);
        border-top: none;
        border-left: none;
        border-right: none;
        padding: var(--uui-size-space-4);
        cursor: pointer;

        h2 {
          margin: 0;
        }
      }

      .accordion__content {
        padding: var(--uui-size-space-6);
        width: 50%;
      }

      .header__container {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-2);
      }

      uui-icon[name="info"] {
        height: 22px;
        width: 22px;
        color: var(--uui-color-primary);
      }
      .step {
        margin-bottom: 45px;

        custom-document-picker {
          margin-top: var(--uui-size-space-4);
        }

        ::marker {
          color: var(--uui-color-primary);
          font-size: 1.5em;
        }
      }

      .step__intro {
        border: 3px solid var(--uui-palette-violet-blue-light);
        border-radius: var(--uui-border-radius);
        padding: var(--uui-size-space-4);
        margin-bottom: 45px;
        margin-top: var(--uui-size-space-5);
      }

      .hidden {
        display: none;
      }
    `
];
let a = m;
l([
  h({ type: String })
], a.prototype, "selectedNodeId");
l([
  h({ type: String })
], a.prototype, "selectedNodeName");
l([
  h({ type: Array })
], a.prototype, "menuItems");
l([
  b()
], a.prototype, "currentView");
l([
  b()
], a.prototype, "routeNodeId");
customElements.define("power-sort-dashboard", a);
export {
  a as default
};
//# sourceMappingURL=powersort.element-C_SMHDNg.js.map
