import { LitElement, html, css, customElement, state, property } from '@umbraco-cms/backoffice/external/lit';
import { UmbElementMixin } from '@umbraco-cms/backoffice/element-api';
import type { NodeChild } from '../types/index.js';

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

  constructor() {
    super();
  }

  async connectedCallback() {
    super.connectedCallback();
    
    // The id will be set via the router before this is called
    if (this.id) {
      await this.loadNodeChildren();
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
      // Use Umbraco MCP to get document children
      const response = await fetch(`/umbraco/management/api/v1/document/${this.id}/children?skip=0&take=100`);
      
      if (!response.ok) {
        throw new Error('Failed to load children');
      }

      const data = await response.json();
      
      // Get parent node info
      const parentResponse = await fetch(`/umbraco/management/api/v1/document/${this.id}`);
      if (parentResponse.ok) {
        const parentData = await parentResponse.json();
        this.parentNodeName = parentData.variants?.[0]?.name || 'Unknown Node';
      }

      // Transform the response to our NodeChild format
      this.nodeChildren = data.items?.map((item: any) => ({
        id: item.id,
        name: item.variants?.[0]?.name || 'Unnamed',
        sortOrder: item.sortOrder || 0,
        contentTypeAlias: item.documentType?.alias,
        icon: item.documentType?.icon || 'icon-document'
      })) || [];

      // Sort by sortOrder
      this.nodeChildren.sort((a, b) => a.sortOrder - b.sortOrder);

    } catch (err) {
      this.error = err instanceof Error ? err.message : 'An error occurred';
      console.error('Error loading children:', err);
    } finally {
      this.loading = false;
    }
  }

  async updateSortOrder(childId: string, newSortOrder: number) {
    try {
      // Update the sort order via API
      const response = await fetch(`/umbraco/management/api/v1/document/${childId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sortOrder: newSortOrder
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

    // Swap sort orders
    const draggedOrder = draggedChild.sortOrder;
    const targetOrder = targetChild.sortOrder;

    await this.updateSortOrder(draggedId, targetOrder);
    await this.updateSortOrder(targetChild.id, draggedOrder);
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
      transition: background-color 0.2s;
    }

    .children-table tbody tr:hover {
      background: var(--uui-color-surface-emphasis);
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
      cursor: move;
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
