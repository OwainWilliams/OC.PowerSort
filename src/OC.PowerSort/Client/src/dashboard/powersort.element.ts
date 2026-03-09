import {
  html,
  css,
  property,
  state,
} from "@umbraco-cms/backoffice/external/lit";
import { PowerSortConstants } from "../utils/constants.js";
import { ApiResponseHandler } from "../utils/api-response.utils.js";
import type { MenuItem } from "../types/index.js";
import { UmbDocumentItemRepository } from "@umbraco-cms/backoffice/document";
import crudMixin from "../mixins/crud.mixin.js";
import { powerSortSharedStyles } from "../styles/shared.styles.js";
import "../components/document-picker.js";

export default class PowerSortDashboardElement extends crudMixin {
  @property({ type: String })
  private selectedNodeId: string | null = null;

  @property({ type: String })
  private selectedNodeName: string = "";

  @property({ type: Array })
  private menuItems: MenuItem[] = [];

  @state()
  private currentView: "main" | "children" | "schedules" | "priorities" =
    "main";

  @state()
  private routeNodeId: string = "";

  @state()
  private _childrenModuleLoaded = false;

  @state()
  private _prioritiesModuleLoaded = false;

  private documentItemRepository?: UmbDocumentItemRepository;

  constructor() {
    super();
    this.selectedNodeId = null;
    this.selectedNodeName = "";
    this.menuItems = [];
    
    // Preload modules asynchronously
    this._loadModules();
  }

  private async _loadModules() {
    // Load both modules in parallel (we only need the side effects, not the exports)
    await Promise.all([
      import("./children.element.js"),
      import("../section/priority-section-view.element.js")
    ]);
    
    this._childrenModuleLoaded = true;
    this._prioritiesModuleLoaded = true;
  }

  async connectedCallback() {
    super.connectedCallback(); // Auth setup handled by mixin

    // Initialize repository after element is connected
    this.documentItemRepository = new UmbDocumentItemRepository(this);

    // Determine which view to show based on route
    this.detectCurrentView();

    // Listen for popstate event to update view
    window.addEventListener("popstate", () => this.detectCurrentView());

    await this.loadMenuItemsFromDb();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("popstate", () => this.detectCurrentView());
  }

  private detectCurrentView() {
    const hash = window.location.hash;
    // Check if we're on a children route (hash: #children/:id)
    if (hash.includes("children/")) {
      this.currentView = "children";
      // Extract ID from hash
      const matches = hash.match(/children\/([a-f0-9-]+)/i);
      this.routeNodeId = matches ? matches[1] : "";
    }
    // Check if we're on the priorities route (hash: #priorities)
    else if (hash.includes("priorities")) {
      this.currentView = "priorities";
      this.requestUpdate();
    }
    // Default to main view
    else {
      this.currentView = "main";
      this.requestUpdate();
    }
  }

  async loadMenuItemsFromDb() {
    try {
      const response = await this.makeAuthenticatedRequest(
        `${PowerSortConstants.API_BASE}${PowerSortConstants.ENDPOINTS.MENU_ITEMS}`,
      );

      const data = await ApiResponseHandler.handleResponse<{
        items: MenuItem[];
      }>(response);
      this.menuItems = data.items || [];
    } catch (error) {
      console.error("Error loading menu items from database:", error);
      const saved = localStorage.getItem(
        PowerSortConstants.STORAGE_KEYS.MENU_ITEMS,
      );
      this.menuItems = saved ? JSON.parse(saved) : [];
    }
  }

  async saveMenuItemsToDb() {
    try {
      const response = await this.makeAuthenticatedRequest(
        `${PowerSortConstants.API_BASE}${PowerSortConstants.ENDPOINTS.MENU_ITEMS}`,
        {
          method: "POST",
          body: JSON.stringify({ items: this.menuItems }),
        },
      );

      await ApiResponseHandler.handleResponse(response);

      // Save to localStorage as backup
      localStorage.setItem(
        PowerSortConstants.STORAGE_KEYS.MENU_ITEMS,
        JSON.stringify(this.menuItems),
      );

      // Dispatch update event
      window.dispatchEvent(
        new CustomEvent("powerSortMenuUpdated", {
          detail: { menuItems: this.menuItems },
        }),
      );
    } catch (error) {
      console.error("Error saving menu items to database:", error);

      // Fallback to localStorage
      localStorage.setItem(
        PowerSortConstants.STORAGE_KEYS.MENU_ITEMS,
        JSON.stringify(this.menuItems),
      );
      window.dispatchEvent(
        new CustomEvent("powerSortMenuUpdated", {
          detail: { menuItems: this.menuItems },
        }),
      );
    }
  }

  static styles = [
    powerSortSharedStyles,
    css`
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
    `,
  ];

  // This method handles the selection event with full node data
  async handleContentSelected(event: Event) {
    console.log("Content selected event:", event);

    // Try to get the custom event detail
    const customEvent = event as CustomEvent;
    console.log("Custom event detail:", customEvent.detail);

    // The umb-input-document component uses 'selection' property directly on the element
    const picker = event.target as any;
    console.log("Picker element:", picker);
    console.log("Picker selection:", picker.selection);
    console.log("Picker value:", picker.value);

    // Try to get selection from different possible sources
    let selection =
      customEvent.detail?.selection || picker.selection || picker.value;

    console.log("Final selection:", selection);

    if (selection && Array.isArray(selection) && selection.length > 0) {
      // The picker returns an array of IDs, not full objects
      selection.forEach(async (node) => {
        const nodeId = typeof node === "string" ? node : node.unique || node.id;
        await this.fetchNodeDetails(nodeId);
        this.addSelectedNodeToMenu();
      });
    } else if (typeof selection === "string") {
      // Single ID string
      await this.fetchNodeDetails(selection);
    } else if (
      selection &&
      Array.isArray(selection) &&
      selection.length === 0
    ) {
      // Selection was cleared
      this.clearSelection();
    } else {
      console.warn("Could not extract selection from event");
    }
  }

  async fetchNodeDetails(nodeId: string) {
    try {
      if (!this.documentItemRepository) {
        console.error("Document repository not initialized");
        return;
      }

      // Use Umbraco's document item repository to get the document details
      const { data } = await this.documentItemRepository.requestItems([nodeId]);

      if (data && data.length > 0) {
        const nodeData = data[0];
        this.selectedNodeId = nodeData.unique;
        this.selectedNodeName = nodeData.variants?.[0]?.name || "Unnamed Node";

        console.log("Fetched node details:", nodeData);

        // Save the selected node info to localStorage
        this.saveSelection();

        // Clear any previous messages
        this.saveMessage = "";
      } else {
        console.error("No node data returned");
        this.saveMessage = "Failed to load node details";
      }
    } catch (error) {
      console.error("Error fetching node details:", error);
      this.saveMessage = "Error loading node details";
    }
  }

  addSelectedNodeToMenu() {
    if (!this.selectedNodeId || !this.selectedNodeName) {
      return;
    }

    const node = {
      unique: this.selectedNodeId,
      name: this.selectedNodeName,
    };

    this.addMenuItemForNode(node);

    // Show success message
    this.saveMessage = `✓ "${this.selectedNodeName}" added to sidebar menu!`;

    // Clear message after 3 seconds
    setTimeout(() => {
      this.saveMessage = "";
      this.requestUpdate();
    }, 3000);
  }

  addMenuItemForNode(node: { unique: any; name: any }) {
    const newMenuItem: MenuItem = {
      id: node.unique,
      name: node.name || "Unnamed Node",
      icon: "icon-document",
    };

    // Check if already exists
    const exists = this.menuItems.some(
      (item: MenuItem) => item.id === node.unique,
    );

    if (!exists) {
      this.menuItems = [...this.menuItems, newMenuItem];
      this.saveMenuItemsToDb();
      console.log("Menu item added:", newMenuItem);
    } else {
      console.log("Menu item already exists");
      this.saveMessage = `"${node.name}" is already in the menu`;
      setTimeout(() => {
        this.saveMessage = "";
        this.requestUpdate();
      }, 3000);
    }
  }

  clearSelection() {
    this.selectedNodeId = null;
    this.selectedNodeName = "";

    // Clear from localStorage
    localStorage.removeItem("powerSortSelectedNodeName");
    localStorage.removeItem("powerSortSelectedNodeId");
    localStorage.removeItem("powerSortLastSelectedTime");

    // Don't try to set the picker value - let it manage itself
    this.requestUpdate();
  }

  saveSelection() {
    if (this.selectedNodeName && this.selectedNodeId) {
      localStorage.setItem("powerSortSelectedNodeName", this.selectedNodeName);
      localStorage.setItem("powerSortSelectedNodeId", this.selectedNodeId);
      localStorage.setItem(
        "powerSortLastSelectedTime",
        new Date().toISOString(),
      );
    }
  }

  restoreSelection() {
    // Restore the selected node info for display only
    const savedName = localStorage.getItem("powerSortSelectedNodeName");
    const savedId = localStorage.getItem("powerSortSelectedNodeId");

    if (savedName && savedId) {
      this.selectedNodeName = savedName;
      this.selectedNodeId = savedId;
      this.requestUpdate();
    }
  }

  private toggleAccordion() {
    const expandItem = this.renderRoot.querySelector(
      "uui-symbol-expand",
    ) as HTMLElement;

    const content = this.renderRoot.querySelector(".accordion__content");

    if (content) {
      content.classList.toggle("hidden");
      expandItem.toggleAttribute("open");
    }
  }

  render() {
    // Conditionally render based on current view
    switch (this.currentView) {
      case "children":
        return this.renderChildrenView();
      case "priorities":
        return this.renderPrioritiesView();
      default:
        return this.renderMainView();
    }
  }

  private renderMainView() {
    return html`
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
              @click=${() => (window.location.hash = "priorities")}
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

  private renderChildrenView() {
    // Show loader while module is loading
    if (!this._childrenModuleLoaded) {
      return html`<uui-loader></uui-loader>`;
    }
    
    return html`
      <power-sort-children-dashboard
        .id=${this.routeNodeId}
      ></power-sort-children-dashboard>
    `;
  }

  private renderPrioritiesView() {
    // Show loader while module is loading
    if (!this._prioritiesModuleLoaded) {
      return html`<uui-loader></uui-loader>`;
    }
    
    return html`
      <power-sort-enum-priorities-dashboard></power-sort-enum-priorities-dashboard>
    `;
  }
}

customElements.define("power-sort-dashboard", PowerSortDashboardElement);
