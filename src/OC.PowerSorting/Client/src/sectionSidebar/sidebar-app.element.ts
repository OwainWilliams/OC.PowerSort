import { LitElement, html, customElement, css, state } from '@umbraco-cms/backoffice/external/lit';
import { UmbAuthMixin } from '../mixins/auth.mixin.js';
import { RouteUtils } from '../utils/validation.utils.js';
import { PowerSortConstants } from '../utils/constants.js';
import { ApiResponseHandler } from '../utils/api-response.utils.js';
import type { MenuItem } from '../types/index.js';
import { UMB_SECTION_CONTEXT } from '@umbraco-cms/backoffice/section';

@customElement('oc-powersorting-sidebar-app')
export class OcPowersortingSidebarAppElement extends UmbAuthMixin(LitElement) {
  @state()
  private menuItems: MenuItem[] = [];

  // @ts-expect-error TS6133: stored for future use
  #sectionContext?: typeof UMB_SECTION_CONTEXT.TYPE;

  constructor() {
    super();
    // Listen for menu updates
    window.addEventListener('powerSortMenuUpdated', this.handleMenuUpdate.bind(this));
  }

  async connectedCallback() {
    super.connectedCallback(); // Auth setup handled by mixin
    await this.setupSectionContext();
    await this.loadMenuItemsFromDb();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('powerSortMenuUpdated', this.handleMenuUpdate.bind(this));
  }

  private async setupSectionContext(): Promise<void> {
    return new Promise((resolve) => {
      this.consumeContext(UMB_SECTION_CONTEXT, (context: any) => {
        this.#sectionContext = context;
        resolve();
      })
        .asPromise({ preventTimeout: true })
        .catch(() => {
          console.warn('Section context not available');
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
        `${PowerSortConstants.API_BASE}${PowerSortConstants.ENDPOINTS.MENU_ITEMS}`
      );

      const data = await ApiResponseHandler.handleResponse<{items: MenuItem[]}>(response);
      this.menuItems = data.items || [];
    } catch (error) {
      console.error('Error loading menu items from database:', error);
      this.loadMenuItems();
    }
  }

  private loadMenuItems() {
    const saved = localStorage.getItem(PowerSortConstants.STORAGE_KEYS.MENU_ITEMS);
    this.menuItems = saved ? JSON.parse(saved) : [];
  }

  private handleMenuItemClick(nodeId: string) {
    RouteUtils.navigateTo(RouteUtils.getDashboardPath('children', nodeId));
  }

  static styles = css`
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

  render() {
    return html`
      <div class="sidebar-header">
        <h3>Power Sort Nodes</h3>
      </div>
      <div class="menu-list">
        ${this.menuItems.length > 0 ? html`
          ${this.menuItems.map(item => html`
            <uui-menu-item
              label="${item.name}"
              @click=${() => this.handleMenuItemClick(item.id)}>
              <uui-icon slot="icon" name="${item.icon}"></uui-icon>
            </uui-menu-item>
          `)}
        ` : html`
          <div class="no-items">
            No menu items yet.<br>
            Add nodes from the dashboard.
          </div>
        `}
      </div>
    `;
  }
}

export default OcPowersortingSidebarAppElement;

declare global {
  interface HTMLElementTagNameMap {
    'oc-powersorting-sidebar-app': OcPowersortingSidebarAppElement;
  }
}

