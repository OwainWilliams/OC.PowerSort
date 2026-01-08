import { LitElement as v, css as h, html as n, property as d } from "@umbraco-cms/backoffice/external/lit";
import { U as g, P as i, A as p } from "./api-response.utils-UvM8kS4m.js";
import { UmbDocumentItemRepository as b } from "@umbraco-cms/backoffice/document";
var I = Object.defineProperty, c = (u, e, t, o) => {
  for (var s = void 0, r = u.length - 1, m; r >= 0; r--)
    (m = u[r]) && (s = m(e, t, s) || s);
  return s && I(e, t, s), s;
};
const l = class l extends g(v) {
  constructor() {
    super(), this.selectedNodeId = null, this.selectedNodeName = "", this.menuItems = [], this.saveMessage = "", this.selectedNodeId = null, this.selectedNodeName = "", this.menuItems = [], this.saveMessage = "";
  }
  async connectedCallback() {
    super.connectedCallback(), this.documentItemRepository = new b(this), await this.loadMenuItemsFromDb();
  }
  async loadMenuItemsFromDb() {
    try {
      const e = await this.makeAuthenticatedRequest(
        `${i.API_BASE}${i.ENDPOINTS.MENU_ITEMS}`
      ), t = await p.handleResponse(e);
      this.menuItems = t.items || [];
    } catch (e) {
      console.error("Error loading menu items from database:", e);
      const t = localStorage.getItem(i.STORAGE_KEYS.MENU_ITEMS);
      this.menuItems = t ? JSON.parse(t) : [];
    }
  }
  async saveMenuItemsToDb() {
    try {
      const e = await this.makeAuthenticatedRequest(
        `${i.API_BASE}${i.ENDPOINTS.MENU_ITEMS}`,
        {
          method: "POST",
          body: JSON.stringify({ items: this.menuItems })
        }
      );
      await p.handleResponse(e), localStorage.setItem(i.STORAGE_KEYS.MENU_ITEMS, JSON.stringify(this.menuItems)), window.dispatchEvent(new CustomEvent("powerSortMenuUpdated", {
        detail: { menuItems: this.menuItems }
      }));
    } catch (e) {
      console.error("Error saving menu items to database:", e), localStorage.setItem(i.STORAGE_KEYS.MENU_ITEMS, JSON.stringify(this.menuItems)), window.dispatchEvent(new CustomEvent("powerSortMenuUpdated", {
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
    let s = t.detail?.selection || o.selection || o.value;
    if (console.log("Final selection:", s), s && Array.isArray(s) && s.length > 0) {
      const r = typeof s[0] == "string" ? s[0] : s[0].unique || s[0].id;
      console.log("Selected node ID:", r), await this.fetchNodeDetails(r);
    } else typeof s == "string" ? await this.fetchNodeDetails(s) : s && Array.isArray(s) && s.length === 0 ? this.clearSelection() : console.warn("Could not extract selection from event");
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
    this.menuItems.some((s) => s.id === e.unique) ? (console.log("Menu item already exists"), this.saveMessage = `"${e.name}" is already in the menu`, setTimeout(() => {
      this.saveMessage = "", this.requestUpdate();
    }, 3e3)) : (this.menuItems = [...this.menuItems, t], this.saveMenuItemsToDb(), console.log("Menu item added:", t));
  }
  removeMenuItem(e) {
    const t = this.menuItems.find((o) => o.id === e);
    this.menuItems = this.menuItems.filter((o) => o.id !== e), this.saveMenuItemsToDb(), console.log("Menu item removed:", e), this.saveMessage = `✓ "${t?.name}" removed from menu`, setTimeout(() => {
      this.saveMessage = "", this.requestUpdate();
    }, 3e3);
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
    return n`
      <div class="dashboard-container">
        <div class="dashboard-header">
          <h1>Power Sort Dashboard</h1>
          <p>Select content nodes to add them as menu items in the sidebar</p>
        </div>

        <div class="content-picker-section">
          <h2>Select Content Node</h2>
          <div class="content-picker-wrapper">
            <label class="picker-label">Content Picker</label>
            <span class="picker-description">
              Choose a content item from your site to add to the Power Sort menu
            </span>
            
            <umb-input-document
              @change=${this.handleContentSelected}
              max="1"
              min="0">
            </umb-input-document>

            <div class="action-buttons">
              <uui-button
                look="primary"
                color="positive"
                label="Add to Menu"
                @click=${this.addSelectedNodeToMenu}
                ?disabled=${!this.selectedNodeName}>
                <uui-icon name="icon-add"></uui-icon>
                Add to Menu
              </uui-button>
              
              <uui-button
                look="outline"
                label="Clear Selection"
                @click=${this.clearSelection}
                ?disabled=${!this.selectedNodeName}>
                <uui-icon name="icon-delete"></uui-icon>
                Clear Selection
              </uui-button>
            </div>
          </div>

          ${this.saveMessage ? n`
            <div class="save-message">
              ${this.saveMessage}
            </div>
          ` : ""}

          ${this.selectedNodeName ? n`
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

        <div class="menu-items-section">
          <h2>Active Menu Items (${this.menuItems.length})</h2>
          
          ${this.menuItems.length > 0 ? n`
            <div class="info-box">
              <strong>💡 How to use:</strong>
              Click on any menu item in the sidebar (left panel) to view and sort its children.
            </div>
            <div class="menu-items-list">
              ${this.menuItems.map((e) => n`
                <div class="menu-item">
                  <uui-icon name="${e.icon}"></uui-icon>
                  <div class="menu-item-content">
                    <span class="menu-item-name">${e.name}</span>
                    <span class="menu-item-id">${e.id}</span>
                  </div>
                  <uui-button 
                    label="Remove"
                    look="outline"
                    color="danger"
                    @click=${() => this.removeMenuItem(e.id)}>
                    <uui-icon name="icon-trash"></uui-icon>
                    Remove
                  </uui-button>
                </div>
              `)}
            </div>
          ` : n`
            <div class="no-items">
              <p>No menu items added yet.</p>
              <p>Use the content picker above to select a node and click "Add to Menu".</p>
            </div>
          `}
        </div>
      </div>
    `;
  }
};
l.styles = h`
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
let a = l;
c([
  d({ type: String })
], a.prototype, "selectedNodeId");
c([
  d({ type: String })
], a.prototype, "selectedNodeName");
c([
  d({ type: Array })
], a.prototype, "menuItems");
c([
  d({ type: String })
], a.prototype, "saveMessage");
customElements.define("power-sort-dashboard", a);
export {
  a as default
};
//# sourceMappingURL=powersort.element-BTLQhpA1.js.map
