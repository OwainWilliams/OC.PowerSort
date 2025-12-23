import { LitElement, html, css, customElement, state, property } from '@umbraco-cms/backoffice/external/lit';
import { UmbElementMixin } from '@umbraco-cms/backoffice/element-api';
import type { NodeChild } from '../types/index.js';
import { UMB_AUTH_CONTEXT } from '@umbraco-cms/backoffice/auth';

@customElement('power-sort-children-dashboard')
export default class PowerSortChildrenDashboardElement extends UmbElementMixin(LitElement) {
  @property({ type: String, attribute: false, reflect: false })
  id: string = '';

  @state()
  private parentNodeName: string = '';

  @state()
  private nodeChildren: NodeChild[] = [];

  @state()
  private loading: boolean = false;

  @state()
  private error: string = '';


  @property({ type: Boolean })
  public hasError: boolean = false;


  @property({ type: String })
  public errorMessage: string = '';

  @property({ type: String })
  private authToken: string = '';


  constructor() {
    super();
  }

  private isGuid(value: string): boolean {
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value);
  }

  async connectedCallback() {
    super.connectedCallback();
    this.setupContexts();

    const path = window.location.pathname;
    const segments = path.split('/').filter(Boolean);
    const maybeGuid = segments[segments.length - 1];

    if (this.isGuid(maybeGuid)) {
      this.id = maybeGuid;
      this.loadNodeChildren();
    }

    // The id will be set via the router before this is called
    if (this.id) {
      await this.loadNodeChildren();
    }
  }

  private async setupContexts() {
    try {
      await this.setupAuthContext();
      //  await this.setupWorkspaceContext();
    } catch (error) {
      console.error('Failed to setup contexts:', error);
      this.hasError = true;
      this.errorMessage = 'Failed to initialize editor contexts';
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


  private async makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const token = await this.getAuthToken();

    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return fetch(url as unknown as RequestInfo, {
      ...options,
      headers
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
            if (token != '') {
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


  async updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);

    // If id changes, reload children
    if (changedProperties.has('id') && this.id) {
      await this.loadNodeChildren();
    }
  }

  async loadNodeChildren() {
    if (!this.id) return;

    this.loading = true;
    this.error = '';

    try {
      // Use your custom endpoint
      const response = await this.makeAuthenticatedRequest(`/umbraco/management/api/v1/oc/power-sorting/children/${this.id}`);

      if (!response.ok) {
        throw new Error('Failed to load children');
      }

      const data = await response.json();

      // Get parent node info
      const parentResponse = await this.makeAuthenticatedRequest(`/umbraco/management/api/v1/document/${this.id}`);
      if (parentResponse.ok) {
        const parentData = await parentResponse.json();
        this.parentNodeName = parentData.variants?.[0]?.name || 'Unknown Node';
      }

      // Transform the response to our NodeChild format
      this.nodeChildren = data.items?.map((item: any) => ({
        id: item.id,
        name: item.name,
        sortOrder: item.sortOrder,
        contentTypeAlias: item.documentType?.id, // You might want to fetch the alias separately
        icon: item.documentType?.icon || 'icon-document'
      })) || [];

    } catch (err) {
      this.error = err instanceof Error ? err.message : 'An error occurred';
      console.error('Error loading children:', err);
    } finally {
      this.loading = false;
    }
  }

  async updateSortOrder() {
    if (!this.id) return;

    try {
      // Build the sorting array from current node children order
      const sorting = this.nodeChildren.map((child, index) => ({
        id: child.id,
        sortOrder: index
      }));

      // Use the Umbraco sort endpoint
      const response = await this.makeAuthenticatedRequest(`/umbraco/management/api/v1/sort/document`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parent: { id: this.id },
          sorting: sorting
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update sort order');
      }

      // Reload children to reflect changes
      await this.loadNodeChildren();
    } catch (err) {
      console.error('Error updating sort order:', err);
      this.error = 'Failed to update sort order';
    }
  }

  handleDragStart(event: DragEvent, child: NodeChild) {
    event.dataTransfer!.effectAllowed = 'move';
    event.dataTransfer!.setData('text/plain', child.id);

    // Add visual feedback
    (event.target as HTMLElement).style.opacity = '0.5';
  }

  handleDragEnd(event: DragEvent) {
    // Reset opacity
    (event.target as HTMLElement).style.opacity = '1';
  }

  handleDragOver(event: DragEvent) {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
  }

  async handleDrop(event: DragEvent, targetChild: NodeChild) {
    event.preventDefault();

    const draggedId = event.dataTransfer!.getData('text/plain');
    const draggedChild = this.nodeChildren.find(c => c.id === draggedId);

    if (!draggedChild || draggedId === targetChild.id) return;

    // Find indices
    const draggedIndex = this.nodeChildren.findIndex(c => c.id === draggedId);
    const targetIndex = this.nodeChildren.findIndex(c => c.id === targetChild.id);

    // Reorder the array
    const newOrder = [...this.nodeChildren];
    const [removed] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, removed);

    // Update local state
    this.nodeChildren = newOrder.map((child, index) => ({
      ...child,
      sortOrder: index
    }));

    // Save to server
    await this.updateSortOrder();
  }

  static styles = css`
    :host {
      display: block;
      padding: var(--uui-size-space-5);
    }

    .dashboard-container {
      max-width: 1200px;
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

    .loading,
    .error,
    .no-children {
      padding: var(--uui-size-space-6);
      text-align: center;
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
    }

    .error {
      color: var(--uui-color-danger);
      border-color: var(--uui-color-danger);
    }

    .children-table {
      width: 100%;
      border-collapse: collapse;
      background: var(--uui-color-surface);
      border-radius: var(--uui-border-radius);
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .children-table thead {
      background: var(--uui-color-surface-alt);
    }

    .children-table th {
      padding: var(--uui-size-space-4);
      text-align: left;
      font-weight: 600;
      border-bottom: 2px solid var(--uui-color-border);
    }

    .children-table td {
      padding: var(--uui-size-space-4);
      border-bottom: 1px solid var(--uui-color-border);
    }

    .children-table tbody tr {
      cursor: move;
      transition: all 0.2s;
    }

    .children-table tbody tr:hover {
      background: var(--uui-color-surface-emphasis);
    }

    .children-table tbody tr:active {
      opacity: 0.5;
    }

    .children-table tbody tr:last-child td {
      border-bottom: none;
    }

    .node-icon {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
    }

    .sort-order-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 32px;
      height: 32px;
      padding: 0 var(--uui-size-space-2);
      background: var(--uui-color-positive-emphasis);
      border-radius: var(--uui-border-radius);
      font-weight: 600;
      color: var(--uui-color-positive);
    }

    .drag-handle {
      color: var(--uui-color-text-alt);
      cursor: grab;
    }

    .drag-handle:active {
      cursor: grabbing;
    }
  `;

  render() {
    if (this.loading) {
      return html`
        <div class="dashboard-container">
          <div class="loading">
            <uui-loader></uui-loader>
            <p>Loading children...</p>
          </div>
        </div>
      `;
    }

    if (this.error) {
      return html`
        <div class="dashboard-container">
          <div class="error">
            <uui-icon name="icon-alert"></uui-icon>
            <p>${this.error}</p>
            <uui-button @click=${this.loadNodeChildren}>
              Retry
            </uui-button>
          </div>
        </div>
      `;
    }

    return html`
      <div class="dashboard-container">
        <div class="dashboard-header">
          <h1>Sort Children of: ${this.parentNodeName}</h1>
          <p>Drag and drop rows to reorder child nodes</p>
        </div>

        ${this.nodeChildren.length > 0 ? html`
          <table class="children-table">
            <thead>
              <tr>
                <th width="50"></th>
                <th>Name</th>
                <th>Content Type</th>
                <th width="120">Sort Order</th>
              </tr>
            </thead>
            <tbody>
              ${this.nodeChildren.map(child => html`
                <tr 
                  draggable="true"
                  @dragstart=${(e: DragEvent) => this.handleDragStart(e, child)}
                  @dragend=${this.handleDragEnd}
                  @dragover=${this.handleDragOver}
                  @drop=${(e: DragEvent) => this.handleDrop(e, child)}>
                  <td>
                    <uui-icon class="drag-handle" name="icon-navigation"></uui-icon>
                  </td>
                  <td>
                    <div class="node-icon">
                      <uui-icon name="${child.icon || 'icon-document'}"></uui-icon>
                      <strong>${child.name}</strong>
                    </div>
                  </td>
                  <td>${child.contentTypeAlias || 'N/A'}</td>
                  <td>
                    <span class="sort-order-badge">${child.sortOrder}</span>
                  </td>
                </tr>
              `)}
            </tbody>
          </table>
        ` : html`
          <div class="no-children">
            <uui-icon name="icon-folder"></uui-icon>
            <p>This node has no children.</p>
          </div>
        `}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'power-sort-children-dashboard': PowerSortChildrenDashboardElement;
  }
}
