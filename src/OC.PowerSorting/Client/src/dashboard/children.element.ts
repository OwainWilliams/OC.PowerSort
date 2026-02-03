import { LitElement, html, css, customElement, state, property } from '@umbraco-cms/backoffice/external/lit';
import { UmbAuthMixin } from '../mixins/auth.mixin.js';
import { UmbUiMixin } from '../mixins/ui.mixin.js';
import { RouteUtils } from '../utils/validation.utils.js';
import { PowerSortConstants } from '../utils/constants.js';
import { ApiResponseHandler } from '../utils/api-response.utils.js';
import { powerSortSharedStyles } from '../styles/shared.styles.js';
import type { NodeChild, ActiveScheduleInfo } from '../types/index.js';
import { ScheduleApiClient } from '../api/schedule-api.client.js';

@customElement('power-sort-children-dashboard')
export default class PowerSortChildrenDashboardElement extends UmbUiMixin(UmbAuthMixin(LitElement)) {
  @property({ type: String, attribute: false, reflect: false })
  id: string = '';

  @state()
  private parentNodeName: string = '';

  @state()
  private nodeChildren: NodeChild[] = [];

  @state()
  private activeSchedules: ActiveScheduleInfo[] = [];

  @state()
  private hasDefaultOrder: boolean = false;

  @state()
  private defaultOrderInfo: any = null;

  @state()
  private loading: boolean = false;

  @state()
  private error: string = '';

  private scheduleApi?: ScheduleApiClient;

  async connectedCallback() {
    super.connectedCallback(); // This now handles auth setup via mixin
    
    // Initialize schedule API
    this.scheduleApi = new ScheduleApiClient(() => this.getAuthToken());

    // Don't extract ID from route here - it's passed as a property from parent dashboard
    // The updated() lifecycle method will handle loading when the id property is set
    
    // If ID is already set (shouldn't happen on first connect), load data
    if (this.id) {
      await this.loadNodeChildren();
      await this.loadActiveSchedules();
      await this.loadDefaultOrderInfo();
    }
  }

  private async loadDefaultOrderInfo() {
    if (!this.id) return;

    try {
      const response = await this.makeAuthenticatedRequest(
        `${PowerSortConstants.API_BASE}${PowerSortConstants.ENDPOINTS.DEFAULT_SORT_ORDER}/${this.id}`
      );

      const data = await ApiResponseHandler.handleResponse(response) as any;
      this.defaultOrderInfo = data;
      this.hasDefaultOrder = data.isSet;
    } catch (error) {
      console.error('Error loading default order info:', error);
    }
  }

  private async saveAsDefaultOrder() {
    if (!this.id) return;

    if (!ApiResponseHandler.confirmAction(PowerSortConstants.MESSAGES.CONFIRM_SAVE_DEFAULT)) {
      return;
    }

    try {
      const response = await this.makeAuthenticatedRequest(
        `${PowerSortConstants.API_BASE}${PowerSortConstants.ENDPOINTS.DEFAULT_SORT_ORDER_SAVE}`,
        {
          method: 'POST',
          body: JSON.stringify({ parentId: this.id })
        }
      );

      await ApiResponseHandler.handleResponse(response);
      await this.loadDefaultOrderInfo();
      ApiResponseHandler.showSuccess('Current sort order saved as default!');
    } catch (error) {
      ApiResponseHandler.showError(error, 'Failed to save default order');
    }
  }

  private async restoreDefaultOrder() {
    if (!this.id) return;

    if (!ApiResponseHandler.confirmAction(PowerSortConstants.MESSAGES.CONFIRM_RESTORE_DEFAULT)) {
      return;
    }

    try {
      const response = await this.makeAuthenticatedRequest(
        `${PowerSortConstants.API_BASE}${PowerSortConstants.ENDPOINTS.DEFAULT_SORT_ORDER_RESTORE}/${this.id}`,
        { method: 'POST' }
      );

      await ApiResponseHandler.handleResponse(response);
      await this.loadNodeChildren();
      ApiResponseHandler.showSuccess('Default sort order restored!');
    } catch (error) {
      ApiResponseHandler.showError(error, 'Failed to restore default order');
    }
  }

  private async clearDefaultOrder() {
    if (!this.id) return;

    if (!ApiResponseHandler.confirmAction(PowerSortConstants.MESSAGES.CONFIRM_CLEAR_DEFAULT)) {
      return;
    }

    try {
      const response = await this.makeAuthenticatedRequest(
        `${PowerSortConstants.API_BASE}${PowerSortConstants.ENDPOINTS.DEFAULT_SORT_ORDER}/${this.id}`,
        { method: 'DELETE' }
      );

      await ApiResponseHandler.handleResponse(response);
      await this.loadDefaultOrderInfo();
      ApiResponseHandler.showSuccess('Default sort order cleared!');
    } catch (error) {
      ApiResponseHandler.showError(error, 'Failed to clear default order');
    }
  }

  private async loadActiveSchedules() {
    if (!this.id || !this.scheduleApi) return;

    try {
      this.activeSchedules = await this.scheduleApi.getActiveSchedules(this.id);
    } catch (error) {
      console.error('Error loading active schedules:', error);
      // Don't show error to user, just log it
    }
  }

  private getScheduleForChild(childId: string): ActiveScheduleInfo | undefined {
    return this.activeSchedules.find(s => s.contentId === childId);
  }

  private navigateToSchedules() {
    RouteUtils.navigateTo(RouteUtils.getDashboardPath('schedules', this.id));
  }

  async updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);

    // If id changes, reload all data
    if (changedProperties.has('id') && this.id) {
      await this.loadNodeChildren();
      await this.loadActiveSchedules();
      await this.loadDefaultOrderInfo();
    }
  }

  async loadNodeChildren() {
    if (!this.id) return;

    this.loading = true;
    this.error = '';

    try {
      const response = await this.makeAuthenticatedRequest(
        `${PowerSortConstants.API_BASE}${PowerSortConstants.ENDPOINTS.CHILDREN}/${this.id}`
      );

      const data = await ApiResponseHandler.handleResponse(response) as any;

      // Load parent info
      const parentResponse = await this.makeAuthenticatedRequest(`/umbraco/management/api/v1/document/${this.id}`);
      if (parentResponse.ok) {
        const parentData = await parentResponse.json();
        this.parentNodeName = parentData.variants?.[0]?.name || 'Unknown Node';
      }

      this.nodeChildren = data.items?.map((item: any) => ({
        id: item.id,
        name: item.name,
        sortOrder: item.sortOrder,
        contentTypeAlias: item.documentType?.id,
        icon: item.documentType?.icon || PowerSortConstants.ICONS.DOCUMENT
      })) || [];

      // Load active schedules after children are loaded
      await this.loadActiveSchedules();

    } catch (error) {
      this.error = error instanceof Error ? error.message : PowerSortConstants.MESSAGES.ERROR_GENERIC;
      console.error('Error loading children:', error);
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

      const response = await this.makeAuthenticatedRequest(
        `${PowerSortConstants.API_BASE}${PowerSortConstants.ENDPOINTS.SORT_DOCUMENT}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            parent: { id: this.id },
            sorting: sorting
          })
        }
      );

      await ApiResponseHandler.handleResponse(response);
      await this.loadNodeChildren();
    } catch (error) {
      this.error = 'Failed to update sort order';
      ApiResponseHandler.showError(error, 'Sort order update failed');
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

  private renderDefaultOrderBanner() {
    if (!this.hasDefaultOrder) return '';

    const content = html`
      <uui-icon class="icon" name="${PowerSortConstants.ICONS.BOOKMARK}"></uui-icon>
      <div class="content">
        <strong>Default Order Saved</strong>
        <p style="margin: var(--uui-size-space-1) 0 0 0; font-size: var(--uui-type-small-size);">
          ${this.defaultOrderInfo?.itemCount || 0} items • 
          Last updated: ${new Date(this.defaultOrderInfo?.updated).toLocaleDateString()}
          ${this.activeSchedules.length === 0 
            ? ' • Will restore automatically when schedules expire'
            : ''}
        </p>
      </div>
    `;

    const actions = html`
      <uui-button
        look="outline"
        label="Clear"
        compact
        @click=${this.clearDefaultOrder}>
        <uui-icon name="${PowerSortConstants.ICONS.DELETE}"></uui-icon>
      </uui-button>
    `;

    return this.renderInfoBanner('default', content, actions);
  }

  private renderActiveScheduleBanner(hasActiveSchedules: boolean) {
    if (!hasActiveSchedules) return '';

    const content = html`
      <uui-icon name="${PowerSortConstants.ICONS.CALENDAR}" style="color: var(--uui-color-positive); font-size: 24px;"></uui-icon>
      <div class="content">
        <strong>Active Schedules</strong>
        <p style="margin: var(--uui-size-space-1) 0 0 0; font-size: var(--uui-type-small-size);">
          ${this.activeSchedules.length} schedule${this.activeSchedules.length === 1 ? '' : 's'} currently active.
          Some items are automatically sorted to specific positions.
        </p>
      </div>
    `;

    const actions = html`
      <uui-button
        look="outline"
        label="View Schedules"
        @click=${this.navigateToSchedules}>
        View Details
      </uui-button>
    `;

    return this.renderInfoBanner('positive', content, actions);
  }

  private renderChildrenTable() {
    if (this.nodeChildren.length === 0) {
      return this.renderEmptyState('This node has no children.', PowerSortConstants.ICONS.DOCUMENT);
    }

    return html`
      <table class="data-table">
        <thead>
          <tr>
            <th width="50"></th>
            <th>Name</th>
            <th>Content Type</th>
            <th width="120">Sort Order</th>
          </tr>
        </thead>
        <tbody>
          ${this.nodeChildren.map(child => {
            const schedule = this.getScheduleForChild(child.id);
            return html`
              <tr 
                draggable="true"
                @dragstart=${(e: DragEvent) => this.handleDragStart(e, child)}
                @dragend=${this.handleDragEnd}
                @dragover=${this.handleDragOver}
                @drop=${(e: DragEvent) => this.handleDrop(e, child)}>
                <td>
                  <uui-icon class="drag-handle" name="${PowerSortConstants.ICONS.NAVIGATION}"></uui-icon>
                </td>
                <td>
                  <div class="node-icon">
                    <uui-icon name="${child.icon || PowerSortConstants.ICONS.DOCUMENT}"></uui-icon>
                    <strong>${child.name}</strong>
                    ${schedule
                      ? html`
                          <span class="scheduled-badge" title="Boosted to position ${schedule.targetPosition} (Priority: ${schedule.priority})">
                            <uui-icon name="icon-calendar-alt"></uui-icon>
                            Scheduled
                          </span>
                        `
                      : ''}
                  </div>
                </td>
                <td>${child.contentTypeAlias || 'N/A'}</td>
                <td>
                  <span class="sort-order-badge">${child.sortOrder}</span>
                </td>
              </tr>
            `;
          })}
        </tbody>
      </table>
    `;
  }

  static styles = [
    powerSortSharedStyles,
    css`
      :host {
        display: block;
        padding: var(--uui-size-space-5);
      }

      .children-table {
        cursor: move;
      }

      .children-table tbody tr {
        cursor: move;
      }

      .children-table tbody tr:active {
        opacity: 0.5;
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
      }

      .drag-handle {
        color: var(--uui-color-text-alt);
        cursor: grab;
      }

      .drag-handle:active {
        cursor: grabbing;
      }

      .scheduled-badge {
        display: inline-flex;
        align-items: center;
        gap: var(--uui-size-space-1);
        padding: var(--uui-size-space-1) var(--uui-size-space-2);
        background: var(--uui-color-positive);
        color: white;
        border-radius: var(--uui-border-radius);
        font-size: var(--uui-type-small-size);
        font-weight: 600;
        margin-left: var(--uui-size-space-2);
      }
    `
  ];

  render() {
    if (this.loading) {
      return this.renderLoadingState('Loading children...');
    }

    if (this.error) {
      return this.renderErrorState(this.error, () => this.loadNodeChildren());
    }

    const hasActiveSchedules = this.activeSchedules.length > 0;

    return html`
      <div class="dashboard-container">
        <div class="dashboard-header">
          <div class="header-content">
            <h1>Sort Children of: ${this.parentNodeName}</h1>
            <p>Drag and drop rows to reorder child nodes</p>
          </div>
          <div class="header-actions">
            ${this.hasDefaultOrder
              ? html`
                  <uui-button
                    look="outline"
                    color="default"
                    label="Restore Default Order"
                    @click=${this.restoreDefaultOrder}>
                    <uui-icon name="${PowerSortConstants.ICONS.UNDO}"></uui-icon>
                    Restore Default
                  </uui-button>
                `
              : ''}
            <uui-button
              look="outline"
              color="default"
              label="Save as Default"
              @click=${this.saveAsDefaultOrder}>
              <uui-icon name="${PowerSortConstants.ICONS.SAVE}"></uui-icon>
              Save as Default
            </uui-button>
            <uui-button
              look="primary"
              color="default"
              label="Manage Schedules"
              @click=${this.navigateToSchedules}>
              <uui-icon name="${PowerSortConstants.ICONS.CALENDAR}"></uui-icon>
              Manage Schedules
            </uui-button>
          </div>
        </div>

        ${this.renderDefaultOrderBanner()}
        ${this.renderActiveScheduleBanner(hasActiveSchedules)}
        ${this.renderChildrenTable()}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'power-sort-children-dashboard': PowerSortChildrenDashboardElement;
  }
}
