import { LitElement, html, customElement, css, state } from '@umbraco-cms/backoffice/external/lit';
import { UmbElementMixin } from '@umbraco-cms/backoffice/element-api';
import type { MenuItem } from '../types/index.js';
import { UMB_AUTH_CONTEXT } from '@umbraco-cms/backoffice/auth';

@customElement('oc-powersorting-sidebar-app')
export class OcPowersortingSidebarAppElement extends UmbElementMixin(LitElement) {
  @state()
  private menuItems: MenuItem[] = [];

  @state()
  private hasError: boolean = false;

  @state()
  private errorMessage: string = '';

  private authToken: string = '';

  constructor() {
    super();
    // Listen for menu updates
    window.addEventListener('powerSortMenuUpdated', this.handleMenuUpdate.bind(this));
  }

  connectedCallback() {
    super.connectedCallback();
    this.setupContexts();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('powerSortMenuUpdated', this.handleMenuUpdate.bind(this));
  }

  private async setupContexts() {
    try {
      await this.setupAuthContext();
      await this.loadMenuItemsFromDb();
    } catch (error) {
      console.error('Failed to setup contexts:', error);
      this.hasError = true;
      this.errorMessage = 'Failed to initialize sidebar';
    }
  }

  private async setupAuthContext(): Promise<void> {
    return new Promise((resolve) => {
      this.consumeContext(UMB_AUTH_CONTEXT, async (authContext: any) => {
        try {
          const config = authContext?.getOpenApiConfiguration?.();
          if (config?.token) {
            this.authToken = await config.token();
          }
          resolve();
        } catch (error) {
          console.error('Failed to setup auth context:', error);
          this.hasError = true;
          this.errorMessage = 'Failed to authenticate';
          resolve();
        }
      })
        .asPromise({ preventTimeout: true })
        .catch(() => {
          console.error('Auth context not available');
          this.hasError = true;
          this.errorMessage = 'Failed to access authentication context';
          resolve();
        });
    });
  }

  private async getAuthToken(): Promise<string> {
    try {
      let token = this.authToken;
      
      if (!token) {
        const authContext = await this.getContext(UMB_AUTH_CONTEXT);
        if (authContext) {
          const config = authContext.getOpenApiConfiguration?.();
          if (config?.token) {
            token = await config.token() ?? '';
            if (token !== '') {
              this.authToken = token;
            }
          }
        }
      }
      
      return token;
    } catch (error) {
      console.error('Failed to get auth token:', error);
      return '';
    }
  }

  private async makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const token = await this.getAuthToken();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return fetch(url, {
      ...options,
      headers,
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
      const response = await this.makeAuthenticatedRequest('/umbraco/management/api/v1/oc/power-sorting/menu-items', {
        method: 'GET',
      });
      
      if (!response.ok) {
        console.error('Failed to load menu items:', response.status);
        this.loadMenuItems();
        return;
      }

      const data = await response.json();
      this.menuItems = data.items || [];
    } catch (error) {
      console.error('Error loading menu items from database:', error);
      this.loadMenuItems();
    }
  }

  private loadMenuItems() {
    const saved = localStorage.getItem('powerSortMenuItems');
    this.menuItems = saved ? JSON.parse(saved) : [];
  }

  private handleMenuItemClick(nodeId: string) {
    // Navigate to the children dashboard for this node
    window.location.hash = `/section/power-sort/dashboard/power-sort-children/${nodeId}`;
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
      ${this.hasError ? html`
        <div class="error-alert">${this.errorMessage}</div>
      ` : ''}
      
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

