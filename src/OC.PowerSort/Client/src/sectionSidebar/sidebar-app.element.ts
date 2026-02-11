import {
  html,
  customElement,
  css,
  state,
} from "@umbraco-cms/backoffice/external/lit";
import { RouteUtils } from "../utils/validation.utils.js";
import { PowerSortConstants } from "../utils/constants.js";
import { ApiResponseHandler } from "../utils/api-response.utils.js";
import type { MenuItem } from "../types/index.js";
import { UMB_SECTION_CONTEXT } from "@umbraco-cms/backoffice/section";
import crudMixin from "../mixins/crud.mixin.js";
import { powerSortSharedStyles } from "../styles/shared.styles.js";

@customElement("oc-powersort-sidebar-app")
export class OcPowerSortSidebarAppElement extends crudMixin {
  @state()
  private menuItems: MenuItem[] = [];

  // @ts-expect-error TS6133: stored for future use
  #sectionContext?: typeof UMB_SECTION_CONTEXT.TYPE;

  constructor() {
    super();
    // Listen for menu updates
    window.addEventListener(
      "powerSortMenuUpdated",
      this.handleMenuUpdate.bind(this),
    );
  }

  async connectedCallback() {
    super.connectedCallback(); // Auth setup handled by mixin
    await this.setupSectionContext();
    await this.loadMenuItemsFromDb();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener(
      "powerSortMenuUpdated",
      this.handleMenuUpdate.bind(this),
    );
  }

  private async setupSectionContext(): Promise<void> {
    return new Promise((resolve) => {
      this.consumeContext(UMB_SECTION_CONTEXT, (context: any) => {
        this.#sectionContext = context;
        resolve();
      })
        .asPromise({ preventTimeout: true })
        .catch(() => {
          console.warn("Section context not available");
          resolve();
        });
    });
  }

  private handleMenuUpdate(event: Event) {
    const customEvent = event as CustomEvent;
    if (customEvent.detail?.menuItems) {
      this.menuItems = customEvent.detail.menuItems;
    }
  }

  private async loadMenuItemsFromDb() {
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
      this.loadMenuItems();
    }
  }

  private loadMenuItems() {
    const saved = localStorage.getItem(
      PowerSortConstants.STORAGE_KEYS.MENU_ITEMS,
    );
    this.menuItems = saved ? JSON.parse(saved) : [];
  }

  private handleMenuItemClick(nodeId: string) {
    const path = RouteUtils.getDashboardPath("children", nodeId);
    RouteUtils.navigateTo(path);
  }

  private removeMenuItem(e: Event, id: any) {
    const item = e.currentTarget as HTMLElement;
    const popover = item?.closest(".js-popover");

    const itemToRemove = this.menuItems.find(
      (item: MenuItem) => item.id === id,
    );
    this.menuItems = this.menuItems.filter((item: MenuItem) => item.id !== id);
    this.saveMenuItemsToDb(this.menuItems);
    console.log("Menu item removed:", id);

    // Show feedback
    this.saveMessage = `✓ "${itemToRemove?.name}" removed from menu`;
    popover?.setAttribute("close", "true");
    setTimeout(() => {
      this.saveMessage = "";
      this.requestUpdate();
    }, 3000);
  }

  static styles = [
    powerSortSharedStyles,
    css`
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
    `,
  ];

  render() {
    return html`
      <div class="sidebar-header">
        <h3>Power Sort Nodes</h3>
      </div>
      <div class="menu-list">
        ${this.menuItems.length > 0
          ? html`
              ${this.menuItems.map(
                (item) => html`
          <div class="js-menu-item relative">
            <uui-menu-item 
              label="${item.name}"
              @click=${() => this.handleMenuItemClick(item.id)}
              <uui-icon slot="icon" name="${item.icon}"></uui-icon>
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
              <uui-button class="ml-1" label="delete menu item" look="primary" color="danger" @click=${(e: Event) => this.removeMenuItem(e, item.id)}>
                Yes
              </uui-button>
            </uui-popover-container>
          `,
              )}
            `
          : html`
              <div class="no-items">
                No menu items yet.<br />
                Add nodes from the dashboard.
              </div>
            `}
      </div>
    `;
  }
}

export default OcPowerSortSidebarAppElement;

declare global {
  interface HTMLElementTagNameMap {
    "oc-powersort-sidebar-app": OcPowerSortSidebarAppElement;
  }
}
