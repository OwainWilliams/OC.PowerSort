import { LitElement as f, html as c, customElement as N, css as I, property as p, state as w } from "@umbraco-cms/backoffice/external/lit";
import { U as S, c as y, P as d, A as v } from "./crud.mixin-CKRlkSCY.js";
import { UmbDocumentPickerInputContext as k, UmbDocumentItemRepository as z } from "@umbraco-cms/backoffice/document";
var x = Object.getOwnPropertyDescriptor, b = (s) => {
  throw TypeError(s);
}, E = (s, e, t, o) => {
  for (var i = o > 1 ? void 0 : o ? x(e, t) : e, r = s.length - 1, n; r >= 0; r--)
    (n = s[r]) && (i = n(i) || i);
  return i;
}, M = (s, e, t) => e.has(s) || b("Cannot " + t), m = (s, e, t) => (M(s, e, "read from private field"), t ? t.call(s) : e.get(s)), C = (s, e, t) => e.has(s) ? b("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(s) : e.set(s, t), u;
let g = class extends S(f) {
  constructor() {
    super(...arguments), C(this, u, new k(this));
  }
  async _openPicker() {
    try {
      await m(this, u).openPicker();
      const e = m(this, u).getSelection();
      console.debug("[custom-document-picker] resolved selection:", e), this.dispatchEvent(new CustomEvent("selection-changed", {
        detail: { selection: e },
        bubbles: !0,
        composed: !0
      }));
    } catch (s) {
      console.warn("[custom-document-picker] openPicker error or closed:", s);
    }
    m(this, u).setSelection([]);
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
  N("custom-document-picker")
], g);
var _ = Object.defineProperty, l = (s, e, t, o) => {
  for (var i = void 0, r = s.length - 1, n; r >= 0; r--)
    (n = s[r]) && (i = n(e, t, i) || i);
  return i && _(e, t, i), i;
};
const h = class h extends y {
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
      const t = localStorage.getItem(d.STORAGE_KEYS.MENU_ITEMS);
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
      await v.handleResponse(e), localStorage.setItem(d.STORAGE_KEYS.MENU_ITEMS, JSON.stringify(this.menuItems)), window.dispatchEvent(new CustomEvent("powerSortMenuUpdated", {
        detail: { menuItems: this.menuItems }
      }));
    } catch (e) {
      console.error("Error saving menu items to database:", e), localStorage.setItem(d.STORAGE_KEYS.MENU_ITEMS, JSON.stringify(this.menuItems)), window.dispatchEvent(new CustomEvent("powerSortMenuUpdated", {
        detail: { menuItems: this.menuItems }
      }));
    }
  }
  // This method handles the selection event with full node data
  async handleContentSelected(e) {
    console.log("Content selected event:", e);
    const t = e;
    console.log("Custom event detail:", t.detail);
    const o = e.target;
    console.log("Picker element:", o), console.log("Picker selection:", o.selection), console.log("Picker value:", o.value);
    let i = t.detail?.selection || o.selection || o.value;
    console.log("Final selection:", i), i && Array.isArray(i) && i.length > 0 ? i.forEach(async (r) => {
      const n = typeof r == "string" ? r : r.unique || r.id;
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
        const o = t[0];
        this.selectedNodeId = o.unique, this.selectedNodeName = o.variants?.[0]?.name || "Unnamed Node", console.log("Fetched node details:", o), this.saveSelection(), this.saveMessage = "";
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
    this.menuItems.some((i) => i.id === e.unique) ? (console.log("Menu item already exists"), this.saveMessage = `"${e.name}" is already in the menu`, setTimeout(() => {
      this.saveMessage = "", this.requestUpdate();
    }, 3e3)) : (this.menuItems = [...this.menuItems, t], this.saveMenuItemsToDb(), console.log("Menu item added:", t));
  }
  clearSelection() {
    this.selectedNodeId = null, this.selectedNodeName = "", localStorage.removeItem("powerSortSelectedNodeName"), localStorage.removeItem("powerSortSelectedNodeId"), localStorage.removeItem("powerSortLastSelectedTime"), this.requestUpdate();
  }
  saveSelection() {
    this.selectedNodeName && this.selectedNodeId && (localStorage.setItem("powerSortSelectedNodeName", this.selectedNodeName), localStorage.setItem("powerSortSelectedNodeId", this.selectedNodeId), localStorage.setItem("powerSortLastSelectedTime", (/* @__PURE__ */ new Date()).toISOString()));
  }
  restoreSelection() {
    const e = localStorage.getItem("powerSortSelectedNodeName"), t = localStorage.getItem("powerSortSelectedNodeId");
    e && t && (this.selectedNodeName = e, this.selectedNodeId = t, this.requestUpdate());
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
          <h1 aria-describedby="plugin-description">Power Sort Dashboard</h1>
          <h2 id="plugin-description">A plugin to enable scheduled sorting of child nodes</h2>
          
          <div style="margin-top: var(--uui-size-space-4);">
            <uui-button
              look="outline"
              color="default"
              label="Manage Enum Priorities"
              @click=${() => window.location.hash = "priorities"}>
              <uui-icon name="icon-ordered-list"></uui-icon>
              Manage Priorities
            </uui-button>
          </div>
        </div>

        <div class="content-picker-section">
          <h2>Select Content Node</h2>
          <div class="content-picker-wrapper">
            <label class="picker-label">Content Picker</label>
            <span class="picker-description">
              Select the parent nodes to add to the left hand menu to enable sorting
            </span>
            
         <custom-document-picker @selection-changed=${this.handleContentSelected}>
         </custom-document-picker>
            </div>
          </div>

          ${this.saveMessage ? c`
            <div class="save-message">
              ${this.saveMessage}
            </div>
          ` : ""}

          ${this.selectedNodeName ? c`
            <div class="selected-info">
              <uui-icon name="icon-check"></uui-icon>
              <div>
                <div><strong>${this.selectedNodeName}</strong></div>
                <div style="font-size: var(--uui-type-small-size); color: var(--uui-color-text-alt);">
                  ID: ${this.selectedNodeId}
                </div>
                <div style="font-size: var(--uui-type-small-size); color: var(--uui-color-text-alt); margin-top: var(--uui-size-space-1);">
                  Last selected: ${new Date(localStorage.getItem("powerSortLastSelectedTime") || Date.now()).toLocaleString()}
                </div>
              </div>
            </div>
          ` : ""}
        </div>
      </div>
    `;
  }
  renderChildrenView() {
    return import("./children.element-CbxZTB3r.js"), c`
      <power-sort-children-dashboard .id=${this.routeNodeId}></power-sort-children-dashboard>
    `;
  }
  renderSchedulesView() {
    return import("./schedules.element-D2ZbVfvJ.js"), c`
      <power-sort-schedules .parentId=${this.routeNodeId}></power-sort-schedules>
    `;
  }
  renderPrioritiesView() {
    return import("./priority-section-view.element-DKX4g8T5.js"), c`
      <power-sort-enum-priorities-dashboard></power-sort-enum-priorities-dashboard>
    `;
  }
};
h.styles = I`
    :host {
      display: block;
      padding: var(--uui-size-space-5);
    }

    .dashboard-container {
      max-width: 800px;
      margin: 0 auto;
    }

    .dashboard-header {
      margin-bottom: var(--uui-size-space-6);
    }

    .dashboard-header h1 {
      margin: 0 0 var(--uui-size-space-2) 0;
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
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
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
  `;
let a = h;
l([
  p({ type: String })
], a.prototype, "selectedNodeId");
l([
  p({ type: String })
], a.prototype, "selectedNodeName");
l([
  p({ type: Array })
], a.prototype, "menuItems");
l([
  w()
], a.prototype, "currentView");
l([
  w()
], a.prototype, "routeNodeId");
customElements.define("power-sort-dashboard", a);
export {
  a as default
};
//# sourceMappingURL=powersort.element-Bkbi62iq.js.map
