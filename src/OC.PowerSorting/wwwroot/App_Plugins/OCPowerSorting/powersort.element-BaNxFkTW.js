import { LitElement as S, html as l, customElement as N, css as b, property as m } from "@umbraco-cms/backoffice/external/lit";
import { U as I, P as n, A as v } from "./api-response.utils-CwOHzmUr.js";
import { UmbDocumentPickerInputContext as y, UmbDocumentItemRepository as k } from "@umbraco-cms/backoffice/document";
import { c as w } from "./crud.mixin-C3UrAXbX.js";
var z = Object.getOwnPropertyDescriptor, f = (o) => {
  throw TypeError(o);
}, x = (o, e, t, i) => {
  for (var s = i > 1 ? void 0 : i ? z(e, t) : e, a = o.length - 1, r; a >= 0; a--)
    (r = o[a]) && (s = r(s) || s);
  return s;
}, E = (o, e, t) => e.has(o) || f("Cannot " + t), u = (o, e, t) => (E(o, e, "read from private field"), t ? t.call(o) : e.get(o)), M = (o, e, t) => e.has(o) ? f("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(o) : e.set(o, t), d;
let g = class extends I(S) {
  constructor() {
    super(...arguments), M(this, d, new y(this));
  }
  async _openPicker() {
    try {
      await u(this, d).openPicker();
      const e = u(this, d).getSelection();
      console.debug("[custom-document-picker] resolved selection:", e), this.dispatchEvent(new CustomEvent("selection-changed", {
        detail: { selection: e },
        bubbles: !0,
        composed: !0
      }));
    } catch (o) {
      console.warn("[custom-document-picker] openPicker error or closed:", o);
    }
    u(this, d).setSelection([]);
  }
  render() {
    return l`
      <uui-button
        look="primary"
        label="Select document"
        @click=${this._openPicker}>
        Select parent nodes
      </uui-button>
    `;
  }
};
d = /* @__PURE__ */ new WeakMap();
g = x([
  N("custom-document-picker")
], g);
var _ = Object.defineProperty, p = (o, e, t, i) => {
  for (var s = void 0, a = o.length - 1, r; a >= 0; a--)
    (r = o[a]) && (s = r(e, t, s) || s);
  return s && _(e, t, s), s;
};
const h = class h extends w {
  constructor() {
    super(), this.selectedNodeId = null, this.selectedNodeName = "", this.menuItems = [], this.selectedNodeId = null, this.selectedNodeName = "", this.menuItems = [];
  }
  async connectedCallback() {
    super.connectedCallback(), this.documentItemRepository = new k(this), await this.loadMenuItemsFromDb();
  }
  async loadMenuItemsFromDb() {
    try {
      const e = await this.makeAuthenticatedRequest(
        `${n.API_BASE}${n.ENDPOINTS.MENU_ITEMS}`
      ), t = await v.handleResponse(e);
      this.menuItems = t.items || [];
    } catch (e) {
      console.error("Error loading menu items from database:", e);
      const t = localStorage.getItem(n.STORAGE_KEYS.MENU_ITEMS);
      this.menuItems = t ? JSON.parse(t) : [];
    }
  }
  async saveMenuItemsToDb() {
    try {
      const e = await this.makeAuthenticatedRequest(
        `${n.API_BASE}${n.ENDPOINTS.MENU_ITEMS}`,
        {
          method: "POST",
          body: JSON.stringify({ items: this.menuItems })
        }
      );
      await v.handleResponse(e), localStorage.setItem(n.STORAGE_KEYS.MENU_ITEMS, JSON.stringify(this.menuItems)), window.dispatchEvent(new CustomEvent("powerSortMenuUpdated", {
        detail: { menuItems: this.menuItems }
      }));
    } catch (e) {
      console.error("Error saving menu items to database:", e), localStorage.setItem(n.STORAGE_KEYS.MENU_ITEMS, JSON.stringify(this.menuItems)), window.dispatchEvent(new CustomEvent("powerSortMenuUpdated", {
        detail: { menuItems: this.menuItems }
      }));
    }
  }
  // This method handles the selection event with full node data
  async handleContentSelected(e) {
    console.log("Content selected event:", e);
    const t = e;
    console.log("Custom event detail:", t.detail);
    const i = e.target;
    console.log("Picker element:", i), console.log("Picker selection:", i.selection), console.log("Picker value:", i.value);
    let s = t.detail?.selection || i.selection || i.value;
    console.log("Final selection:", s), s && Array.isArray(s) && s.length > 0 ? s.forEach(async (a) => {
      const r = typeof a == "string" ? a : a.unique || a.id;
      await this.fetchNodeDetails(r), this.addSelectedNodeToMenu();
    }) : typeof s == "string" ? await this.fetchNodeDetails(s) : s && Array.isArray(s) && s.length === 0 ? this.clearSelection() : console.warn("Could not extract selection from event");
  }
  async fetchNodeDetails(e) {
    try {
      if (!this.documentItemRepository) {
        console.error("Document repository not initialized");
        return;
      }
      const { data: t } = await this.documentItemRepository.requestItems([e]);
      if (t && t.length > 0) {
        const i = t[0];
        this.selectedNodeId = i.unique, this.selectedNodeName = i.variants?.[0]?.name || "Unnamed Node", console.log("Fetched node details:", i), this.saveSelection(), this.saveMessage = "";
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
    this.menuItems.some((s) => s.id === e.unique) ? (console.log("Menu item already exists"), this.saveMessage = `"${e.name}" is already in the menu`, setTimeout(() => {
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
    return l`
      <div class="dashboard-container">
        <div class="dashboard-header">
          <h1 aria-describedby="plugin-description">Power Sort Dashboard</h1>
          <h2 id="plugin-description">A plugin to enable scheduled sorting of child nodes</h2>
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

          ${this.saveMessage ? l`
            <div class="save-message">
              ${this.saveMessage}
            </div>
          ` : ""}

          ${this.selectedNodeName ? l`
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
};
h.styles = b`
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
let c = h;
p([
  m({ type: String })
], c.prototype, "selectedNodeId");
p([
  m({ type: String })
], c.prototype, "selectedNodeName");
p([
  m({ type: Array })
], c.prototype, "menuItems");
customElements.define("power-sort-dashboard", c);
export {
  c as default
};
//# sourceMappingURL=powersort.element-BaNxFkTW.js.map
