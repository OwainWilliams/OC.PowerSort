import { LitElement, html, css, property } from '@umbraco-cms/backoffice/external/lit';
import { UmbElementMixin } from '@umbraco-cms/backoffice/element-api';
import { UMB_AUTH_CONTEXT } from '@umbraco-cms/backoffice/auth';
import type {
  ScheduleResponse,
  CreateScheduleRequest,
  UpdateScheduleRequest
} from '../types/index.js';
import { ScheduleApiClient } from '../api/schedule-api.client.js';
import './schedule-dialog.element.js';

export default class ScheduleManagementElement extends UmbElementMixin(LitElement) {
  @property({ type: String, attribute: false, reflect: false })
  public parentId: string = '';

  @property({ type: String })
  private parentNodeName: string = '';

  @property({ type: Array })
  private schedules: ScheduleResponse[] = [];

  @property({ type: Boolean })
  private loading: boolean = false;

  @property({ type: String })
  private error: string = '';

  @property({ type: String })
  private authToken: string = '';

  @property({ type: Boolean })
  private showCreateDialog: boolean = false;

  @property({ type: Object })
  private editingSchedule: ScheduleResponse | null = null;

  private scheduleApi?: ScheduleApiClient;

  async connectedCallback() {
    super.connectedCallback();
    
    // Extract parent ID from route
    const path = window.location.pathname;
    const segments = path.split('/').filter(Boolean);
    const maybeGuid = segments[segments.length - 1];
    
    if (this.isGuid(maybeGuid)) {
      this.parentId = maybeGuid;
    }
    
    await this.setupAuthContext();
    this.scheduleApi = new ScheduleApiClient(() => this.getAuthToken());
    
    if (this.parentId) {
      await this.loadParentInfo();
      await this.loadSchedules();
    }
  }

  private isGuid(value: string): boolean {
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value);
  }

  private async loadParentInfo() {
    if (!this.parentId) return;

    try {
      const response = await this.makeAuthenticatedRequest(
        `/umbraco/management/api/v1/document/${this.parentId}`
      );
      
      if (response.ok) {
        const data = await response.json();
        this.parentNodeName = data.variants?.[0]?.name || 'Unknown Node';
      }
    } catch (error) {
      console.error('Error loading parent info:', error);
    }
  }

  private async makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const token = await this.getAuthToken();
    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');
    
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return fetch(url, { ...options, headers });
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
          resolve();
        }
      })
        .asPromise({ preventTimeout: true })
        .catch(() => resolve());
    });
  }

  private async getAuthToken(): Promise<string> {
    if (this.authToken) {
      return this.authToken;
    }

    try {
      const authContext = await this.getContext(UMB_AUTH_CONTEXT);
      if (authContext) {
        const config = authContext.getOpenApiConfiguration?.();
        if (config?.token) {
          const token = await config.token();
          if (token) {
            this.authToken = token;
            return token;
          }
        }
      }
    } catch (error) {
      console.error('Failed to get auth token:', error);
    }

    return '';
  }

  private async loadSchedules() {
    if (!this.scheduleApi || !this.parentId) return;

    this.loading = true;
    this.error = '';

    try {
      const response = await this.scheduleApi.getSchedules(this.parentId);
      this.schedules = response.items;
    } catch (error) {
      console.error('Error loading schedules:', error);
      this.error = 'Failed to load schedules';
    } finally {
      this.loading = false;
    }
  }

  private openCreateDialog() {
    this.showCreateDialog = true;
    this.editingSchedule = null;
  }

  private openEditDialog(schedule: ScheduleResponse) {
    this.editingSchedule = schedule;
    this.showCreateDialog = true;
  }

  private closeDialog() {
    this.showCreateDialog = false;
    this.editingSchedule = null;
  }

  private async handleSaveSchedule(event: CustomEvent) {
    if (!this.scheduleApi) return;

    const formData = event.detail;

    try {
      if (this.editingSchedule) {
        // Update existing
        const request: UpdateScheduleRequest = {
          targetPosition: formData.targetPosition,
          startDateTime: formData.startDateTime,
          endDateTime: formData.endDateTime,
          priority: formData.priority || 0
        };

        await this.scheduleApi.updateSchedule(this.editingSchedule.id, request);
      } else {
        // Create new
        const request: CreateScheduleRequest = {
          contentId: formData.contentId,
          parentId: this.parentId,
          targetPosition: formData.targetPosition,
          startDateTime: formData.startDateTime,
          endDateTime: formData.endDateTime,
          priority: formData.priority || 0
        };

        await this.scheduleApi.createSchedule(request);
      }

      this.closeDialog();
      await this.loadSchedules();
    } catch (error) {
      console.error('Error saving schedule:', error);
      this.error = 'Failed to save schedule';
    }
  }

  private async handleDeleteSchedule(scheduleId: string) {
    if (!this.scheduleApi) return;

    if (!confirm('Are you sure you want to delete this schedule?')) {
      return;
    }

    try {
      await this.scheduleApi.deleteSchedule(scheduleId);
      await this.loadSchedules();
    } catch (error) {
      console.error('Error deleting schedule:', error);
      this.error = 'Failed to delete schedule';
    }
  }

  private formatDateTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  private getStatusBadge(schedule: ScheduleResponse) {
    if (schedule.isCurrentlyActive) {
      return html`
        <uui-badge color="positive" look="primary">
          <uui-icon name="icon-check"></uui-icon>
          Active Now
        </uui-badge>
      `;
    }

    const now = new Date();
    const start = new Date(schedule.startDateTime);
    const end = new Date(schedule.endDateTime);

    if (now < start) {
      return html`
        <uui-badge color="default" look="secondary">
          <uui-icon name="icon-time"></uui-icon>
          Scheduled
        </uui-badge>
      `;
    }

    if (now >= end) {
      return html`
        <uui-badge color="default" look="outline">
          <uui-icon name="icon-delete"></uui-icon>
          Expired
        </uui-badge>
      `;
    }

    return html`
      <uui-badge color="warning" look="secondary">
        <uui-icon name="icon-calendar"></uui-icon>
        Pending
      </uui-badge>
    `;
  }

  static styles = css`
    :host {
      display: block;
      padding: var(--uui-size-space-5);
    }

    .schedule-container {
      max-width: 1200px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--uui-size-space-5);
    }

    .header h2 {
      margin: 0;
      font-size: var(--uui-type-h4-size);
    }

    .schedule-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .schedule-card {
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-4);
      display: grid;
      grid-template-columns: auto 1fr auto auto;
      gap: var(--uui-size-space-4);
      align-items: center;
    }

    .schedule-card.active {
      border-color: var(--uui-color-positive);
      background: var(--uui-color-positive-emphasis);
    }

    .schedule-info {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .schedule-title {
      font-weight: 600;
      font-size: var(--uui-type-default-size);
    }

    .schedule-details {
      font-size: var(--uui-type-small-size);
      color: var(--uui-color-text-alt);
    }

    .schedule-dates {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
      font-size: var(--uui-type-small-size);
    }

    .schedule-actions {
      display: flex;
      gap: var(--uui-size-space-2);
    }

    .empty-state {
      text-align: center;
      padding: var(--uui-size-space-8);
      color: var(--uui-color-text-alt);
    }

    .error-message {
      background: var(--uui-color-danger-emphasis);
      color: var(--uui-color-danger);
      padding: var(--uui-size-space-3);
      border-radius: var(--uui-border-radius);
      margin-bottom: var(--uui-size-space-4);
    }

    .loading-spinner {
      display: flex;
      justify-content: center;
      padding: var(--uui-size-space-8);
    }

    .priority-badge {
      display: inline-flex;
      align-items: center;
      gap: var(--uui-size-space-1);
      padding: var(--uui-size-space-1) var(--uui-size-space-2);
      background: var(--uui-color-surface-emphasis);
      border-radius: var(--uui-border-radius);
      font-size: var(--uui-type-small-size);
    }
  `;

  render() {
    return html`
      <div class="schedule-container">
        <div class="header">
          <h2>
            <uui-icon name="icon-calendar"></uui-icon>
            Sorting Schedules
            ${this.parentNodeName ? html` - ${this.parentNodeName}` : ''}
          </h2>
          <uui-button
            look="primary"
            color="positive"
            label="Create Schedule"
            @click=${this.openCreateDialog}>
            <uui-icon name="icon-add"></uui-icon>
            Create Schedule
          </uui-button>
        </div>

        ${this.error
          ? html`
              <div class="error-message">
                <uui-icon name="icon-alert"></uui-icon>
                ${this.error}
              </div>
            `
          : ''}

        ${this.loading
          ? html`
              <div class="loading-spinner">
                <uui-loader></uui-loader>
              </div>
            `
          : this.schedules.length === 0
          ? html`
              <div class="empty-state">
                <uui-icon name="icon-calendar" style="font-size: 48px; opacity: 0.3;"></uui-icon>
                <p>No schedules configured yet.</p>
                <p>Create a schedule to boost content to a specific position during a time period.</p>
              </div>
            `
          : html`
              <div class="schedule-list">
                ${this.schedules.map(
                  (schedule) => html`
                    <div
                      class="schedule-card ${schedule.isCurrentlyActive
                        ? 'active'
                        : ''}">
                      ${this.getStatusBadge(schedule)}

                      <div class="schedule-info">
                        <div class="schedule-title">${schedule.contentName}</div>
                        <div class="schedule-details">
                          Position: <strong>${schedule.targetPosition}</strong>
                          ${schedule.priority > 0
                            ? html`
                                <span class="priority-badge">
                                  <uui-icon name="icon-navigation-up"></uui-icon>
                                  Priority: ${schedule.priority}
                                </span>
                              `
                            : ''}
                        </div>
                        <div class="schedule-details">
                          Created by ${schedule.createdByName} on
                          ${this.formatDateTime(schedule.created)}
                        </div>
                      </div>

                      <div class="schedule-dates">
                        <div>
                          <uui-icon name="icon-calendar-alt"></uui-icon>
                          Start: ${this.formatDateTime(schedule.startDateTime)}
                        </div>
                        <div>
                          <uui-icon name="icon-calendar-alt"></uui-icon>
                          End: ${this.formatDateTime(schedule.endDateTime)}
                        </div>
                      </div>

                      <div class="schedule-actions">
                        <uui-button
                          look="outline"
                          label="Edit"
                          @click=${() => this.openEditDialog(schedule)}>
                          <uui-icon name="icon-edit"></uui-icon>
                        </uui-button>
                        <uui-button
                          look="outline"
                          color="danger"
                          label="Delete"
                          @click=${() => this.handleDeleteSchedule(schedule.id)}>
                          <uui-icon name="icon-trash"></uui-icon>
                        </uui-button>
                      </div>
                    </div>
                  `
                )}
              </div>
            `}
      </div>

      ${this.showCreateDialog
        ? html`
            <schedule-dialog
              .parentId=${this.parentId}
              .schedule=${this.editingSchedule}
              @save=${this.handleSaveSchedule}
              @cancel=${this.closeDialog}>
            </schedule-dialog>
          `
        : ''}
    `;
  }
}

customElements.define('power-sort-schedules', ScheduleManagementElement);
