import {
  LitElement,
  html,
  css,
  property,
  state,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbAuthMixin } from "../mixins/auth.mixin.js";
import { UmbUiMixin } from "../mixins/ui.mixin.js";
import { RecurringScheduleApiClient } from "../api/recurring-schedule-api.client.js";
import { RecurringScheduleHelpers } from "../types/recurring-schedule.types.js";
import type {
  RecurringSchedule,
  RecurringScheduleListResponse,
} from "../types/recurring-schedule.types.js";
import { powerSortSharedStyles } from "../styles/shared.styles.js";

export default class RecurringSchedulesViewElement extends UmbUiMixin(
  UmbAuthMixin(LitElement),
) {
  @property({ type: String })
  public parentId: string = "";

  @property({ type: String })
  public parentName: string = "";

  @state()
  private schedules: RecurringSchedule[] = [];

  @state()
  private loading: boolean = true;

  @state()
  private error: string = "";

  @state()
  private showDialog: boolean = false;

  @state()
  private editingSchedule: RecurringSchedule | null = null;

  private apiClient: RecurringScheduleApiClient | null = null;

  async connectedCallback() {
    super.connectedCallback();
    this.apiClient = new RecurringScheduleApiClient(() =>
      this.getAuthToken(),
    );
    await this.loadSchedules();
  }

  private async loadSchedules() {
    if (!this.apiClient) return;

    this.loading = true;
    this.error = "";

    try {
      const response: RecurringScheduleListResponse =
        await this.apiClient.getRecurringSchedules(
          this.parentId || undefined,
          false,
        );
      this.schedules = response.items;
    } catch (err: any) {
      this.error = err.message || "Failed to load recurring schedules";
      console.error("[RecurringSchedules] Load error:", err);
    } finally {
      this.loading = false;
    }
  }



  private handleEdit(schedule: RecurringSchedule) {
    this.editingSchedule = schedule;
    this.showDialog = true;
  }

  private async handleDelete(schedule: RecurringSchedule) {
    if (
      !confirm(
        `Are you sure you want to delete the recurring schedule for "${schedule.contentName}"?`,
      )
    ) {
      return;
    }

    if (!this.apiClient) return;

    try {
      await this.apiClient.deleteRecurringSchedule(schedule.id);
      console.log("[RecurringSchedules] Deleted successfully");
      await this.loadSchedules();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
      console.error("[RecurringSchedules] Delete error:", err);
    }
  }

  private async handleToggle(schedule: RecurringSchedule) {
    if (!this.apiClient) return;

    try {
      await this.apiClient.toggleRecurringSchedule(schedule.id);
      console.log(
        `[RecurringSchedules] ${schedule.isEnabled ? "Disabled" : "Enabled"}`,
      );
      await this.loadSchedules();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
      console.error("[RecurringSchedules] Toggle error:", err);
    }
  }

  private handleDialogClose() {
    this.showDialog = false;
    this.editingSchedule = null;
  }

  private async handleDialogSave() {
    this.showDialog = false;
    this.editingSchedule = null;
    await this.loadSchedules();
  }

  private handleBack() {
    window.history.back();
  }

  private getStatusBadge(schedule: RecurringSchedule) {
    if (!schedule.isEnabled) {
      return html`<uui-badge color="default" look="secondary">Disabled</uui-badge>`;
    }

    if (schedule.nextOccurrence) {
      const nextDate = new Date(schedule.nextOccurrence);
      const now = new Date();
      const diffMs = nextDate.getTime() - now.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

      if (diffHours < 24) {
        return html`<uui-badge color="positive" look="primary">Active</uui-badge>`;
      }
    }

    return html`<uui-badge color="warning" look="secondary">Scheduled</uui-badge>`;
  }

  static styles = [
    powerSortSharedStyles,
    css`
      :host {
        display: block;
        padding: var(--uui-size-space-5);
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--uui-size-space-5);
      }

      .header-left {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-3);
      }

      .header h1 {
        margin: 0;
        font-size: var(--uui-type-h3-size);
      }

      .parent-info {
        color: var(--uui-color-text-alt);
        font-size: var(--uui-type-small-size);
      }

      .schedules-list {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-3);
      }

      .schedule-card {
        background: var(--uui-color-surface);
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
        padding: var(--uui-size-space-4);
      }

      .schedule-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: var(--uui-size-space-3);
      }

      .schedule-info h3 {
        margin: 0 0 var(--uui-size-space-2) 0;
        font-size: var(--uui-type-h5-size);
      }

      .schedule-meta {
        color: var(--uui-color-text-alt);
        font-size: var(--uui-type-small-size);
      }

      .schedule-actions {
        display: flex;
        gap: var(--uui-size-space-2);
      }

      .schedule-details {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: var(--uui-size-space-3);
        padding: var(--uui-size-space-3);
        background: var(--uui-color-surface-alt);
        border-radius: var(--uui-border-radius);
      }

      .detail-item {
        display: flex;
        flex-direction: column;
      }

      .detail-label {
        font-size: var(--uui-type-small-size);
        color: var(--uui-color-text-alt);
        margin-bottom: var(--uui-size-space-1);
      }

      .detail-value {
        font-weight: 600;
        display: block;
      }

      .detail-value uui-badge {
        display: inline-block;
        position: static;
      }

      .empty-state {
        text-align: center;
        padding: var(--uui-size-space-8);
        color: var(--uui-color-text-alt);
      }

      .empty-state uui-icon {
        font-size: 48px;
        margin-bottom: var(--uui-size-space-3);
        opacity: 0.5;
      }

      .loading-state {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: var(--uui-size-space-8);
      }

      .error-state {
        padding: var(--uui-size-space-5);
        background: var(--uui-color-danger-emphasis);
        border-radius: var(--uui-border-radius);
        color: var(--uui-color-danger-contrast);
      }
    `,
  ];

  render() {
    return html`
      <div>
        <div class="header">
          <div class="header-left">
            <uui-button
              look="secondary"
              label="Back"
              @click=${this.handleBack}
            >
              <uui-icon name="icon-arrow-left"></uui-icon>
            </uui-button>
            <div>
              <h1>Recurring Schedules</h1>
              ${this.parentName
                ? html`<div class="parent-info">
                    For: ${this.parentName}
                  </div>`
                : ""}
            </div>
          </div>
         
        </div>

        ${this.loading ? this.renderLoading() : ""}
        ${!this.loading && this.error ? this.renderError() : ""}
        ${!this.loading && !this.error
          ? this.renderSchedulesList()
          : ""}
      </div>

      ${this.showDialog
        ? html`<recurring-schedule-dialog
            .parentId=${this.parentId}
            .schedule=${this.editingSchedule}
            @close=${this.handleDialogClose}
            @save=${this.handleDialogSave}
          ></recurring-schedule-dialog>`
        : ""}
    `;
  }

  private renderLoading() {
    return html`
      <div class="loading-state">
        <uui-loader></uui-loader>
      </div>
    `;
  }

  private renderError() {
    return html`
      <div class="error-state">
        <strong>Error:</strong> ${this.error}
      </div>
    `;
  }

  private renderSchedulesList() {
    if (this.schedules.length === 0) {
      return html`
        <div class="empty-state">
          <uui-icon name="icon-calendar"></uui-icon>
          <h3>No Recurring Schedules</h3>
          <p>Create a recurring schedule to automatically boost content at regular intervals.</p>
         
        </div>
      `;
    }

    return html`
      <div class="schedules-list">
        ${this.schedules.map((schedule) => this.renderScheduleCard(schedule))}
      </div>
    `;
  }

  private renderScheduleCard(schedule: RecurringSchedule) {
    const nextOccurrence = RecurringScheduleHelpers.formatNextOccurrence(
      schedule.nextOccurrence,
    );

    return html`
      <div class="schedule-card">
        <div class="schedule-header">
          <div class="schedule-info">
            <h3>${schedule.contentName}</h3>
            <div class="schedule-meta">
              Priority: ${schedule.priority} | Position: ${schedule.targetPosition}
            </div>
          </div>
          <div class="schedule-actions">
            <uui-button
              look="secondary"
              label="Toggle Enabled"
              @click=${() => this.handleToggle(schedule)}
            >
              <uui-icon
                name="icon-${schedule.isEnabled ? "pause" : "play"}"
              ></uui-icon>
            </uui-button>
            <uui-button
              look="secondary"
              label="Edit"
              @click=${() => this.handleEdit(schedule)}
            >
              <uui-icon name="icon-edit"></uui-icon>
            </uui-button>
            <uui-button
              look="secondary"
              color="danger"
              label="Delete"
              @click=${() => this.handleDelete(schedule)}
            >
              <uui-icon name="icon-delete"></uui-icon>
            </uui-button>
          </div>
        </div>

        <div class="schedule-details">
          <div class="detail-item">
            <div class="detail-label">Status</div>
            <div class="detail-value">${this.getStatusBadge(schedule)}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Pattern</div>
            <div class="detail-value">${schedule.pattern.description}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Duration</div>
            <div class="detail-value">${schedule.boostDurationHours} hours</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Next Occurrence</div>
            <div class="detail-value">${nextOccurrence}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Created</div>
            <div class="detail-value">
              ${new Date(schedule.created).toLocaleDateString()} by
              ${schedule.createdByName}
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define(
  "recurring-schedules-view",
  RecurringSchedulesViewElement,
);
