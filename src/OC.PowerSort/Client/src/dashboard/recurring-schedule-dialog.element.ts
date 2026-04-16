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
  CreateRecurringScheduleRequest,
  UpdateRecurringScheduleRequest,
  RecurrenceType,
  MonthlyPatternType,
} from "../types/recurring-schedule.types.js";
import type { NodeChild, EnumPriorityListResponse } from "../types/index.js";
import { PowerSortConstants } from "../utils/constants.js";
import { ApiResponseHandler } from "../utils/api-response.utils.js";

interface PriorityOption {
  value: number;
  label: string;
}

export default class RecurringScheduleDialogElement extends UmbUiMixin(
  UmbAuthMixin(LitElement),
) {
  @property({ type: String })
  public parentId: string = "";

  @property({ type: Object })
  public schedule: RecurringSchedule | null = null;

  @state()
  private contentId: string = "";

  @state()
  private contentName: string = "";

  @state()
  private targetPosition: number = 0;

  @state()
  private priority: number = 100;

  @state()
  private boostDurationHours: number = 24;

  @state()
  private recurrenceType: RecurrenceType = "Weekly";

  @state()
  private interval: number = 1;

  @state()
  private daysOfWeek: number[] = [1]; // Monday

  @state()
  private monthlyPatternType: MonthlyPatternType = "DayOfMonth";

  @state()
  private dayOfMonth: number = 1;

  @state()
  private weekOfMonth: number = 1;

  @state()
  private dayOfWeek: number = 1;

  @state()
  private startDate: string = "";

  @state()
  private endDate: string = "";

  @state()
  private maxOccurrences: number | undefined = undefined;

  @state()
  private useEndDate: boolean = false;

  @state()
  private useMaxOccurrences: boolean = false;

  @state()
  private error: string = "";

  @state()
  private nodeChildren: NodeChild[] = [];

  @state()
  private loadingChildren: boolean = false;

  @state()
  private priorityOptions: PriorityOption[] = [];

  @state()
  private loadingPriorities: boolean = true;

  @state()
  private noPriorityOptionsFound: boolean = false;

  private apiClient: RecurringScheduleApiClient | null = null;

  async connectedCallback() {
    super.connectedCallback();
    this.apiClient = new RecurringScheduleApiClient(() =>
      this.getAuthToken(),
    );

    // Load children and priority options
    await Promise.all([
      !this.schedule ? this.loadChildren() : Promise.resolve(),
      this.loadPriorityOptions()
    ]);

    if (this.schedule) {
      // Editing existing schedule
      this.loadScheduleData();
    } else {
      // New schedule - set defaults
      const now = new Date();
      this.startDate = this.toLocalDateString(now.toISOString());
    }
  }

  private async loadChildren() {
    if (!this.parentId) return;

    this.loadingChildren = true;

    try {
      const response = await this.makeAuthenticatedRequest(
        `${PowerSortConstants.API_BASE}${PowerSortConstants.ENDPOINTS.CHILDREN}/${this.parentId}`,
      );

      const data = await ApiResponseHandler.handleResponse<{
        children: NodeChild[];
      }>(response);

      this.nodeChildren = data.children || [];

      // Select first child by default if no content selected
      if (!this.contentId && this.nodeChildren.length > 0) {
        this.contentId = this.nodeChildren[0].id;
        this.contentName = this.nodeChildren[0].name;
      }
    } catch (err: any) {
      console.error("[RecurringScheduleDialog] Error loading children:", err);
      this.error = "Failed to load children";
    } finally {
      this.loadingChildren = false;
    }
  }

  private loadScheduleData() {
    if (!this.schedule) return;

    this.contentId = this.schedule.contentId;
    this.contentName = this.schedule.contentName;
    this.targetPosition = this.schedule.targetPosition;
    this.priority = this.schedule.priority;
    this.boostDurationHours = this.schedule.boostDurationHours;
    this.recurrenceType = this.schedule.pattern.type;
    this.interval = this.schedule.pattern.interval;
    this.startDate = this.toLocalDateString(this.schedule.pattern.startDate);

    if (this.schedule.pattern.endDate) {
      this.useEndDate = true;
      this.endDate = this.toLocalDateString(this.schedule.pattern.endDate);
    }

    if (this.schedule.pattern.maxOccurrences) {
      this.useMaxOccurrences = true;
      this.maxOccurrences = this.schedule.pattern.maxOccurrences;
    }

    if (this.recurrenceType === "Weekly" && this.schedule.pattern.daysOfWeek) {
      this.daysOfWeek = this.schedule.pattern.daysOfWeek;
    }

    if (
      this.recurrenceType === "Monthly" &&
      this.schedule.pattern.monthlyPattern
    ) {
      this.monthlyPatternType = this.schedule.pattern.monthlyPattern.type;
      if (this.schedule.pattern.monthlyPattern.dayOfMonth) {
        this.dayOfMonth = this.schedule.pattern.monthlyPattern.dayOfMonth;
      }
      if (this.schedule.pattern.monthlyPattern.weekOfMonth) {
        this.weekOfMonth = this.schedule.pattern.monthlyPattern.weekOfMonth;
      }
      if (this.schedule.pattern.monthlyPattern.dayOfWeek !== undefined) {
        this.dayOfWeek = this.schedule.pattern.monthlyPattern.dayOfWeek;
      }
    }
  }

  private toLocalDateString(isoString: string): string {
    const date = new Date(isoString);
    return date.toISOString().slice(0, 10);
  }

  private async loadPriorityOptions(): Promise<void> {
    this.loadingPriorities = true;
    this.noPriorityOptionsFound = false;

    try {
      const response = await this.makeAuthenticatedRequest(
        `${PowerSortConstants.API_BASE}/enum-priorities`,
      );

      const data = (await ApiResponseHandler.handleResponse(
        response,
      )) as EnumPriorityListResponse;
      const priorities = data.items || [];

      if (priorities.length > 0) {
        this.priorityOptions = priorities
          .sort((a, b) => a.sortPriority - b.sortPriority)
          .map((priority) => ({
            value: priority.sortPriority,
            label: priority.name,
          }));

        // Set default priority if not editing and no priority set
        if (!this.schedule && this.priority === 100) {
          this.priority = this.priorityOptions[0].value;
        }
      } else {
        this.noPriorityOptionsFound = true;
      }
    } catch (error) {
      console.error(
        "[RecurringScheduleDialog] Error loading priority options:",
        error,
      );
      this.noPriorityOptionsFound = true;
    } finally {
      this.loadingPriorities = false;
    }
  }

  private getPriorityLevel(priority: number): string {
    if (priority >= 500) return "high";
    if (priority >= 200) return "medium";
    return "low";
  }

  private getPriorityLevelText(priority: number): string {
    if (priority >= 500) return "High";
    if (priority >= 200) return "Medium";
    return "Low";
  }

  private handleRecurrenceTypeChange(e: Event) {
    const select = e.target as HTMLSelectElement;
    this.recurrenceType = select.value as RecurrenceType;
  }

  private handleDayOfWeekToggle(day: number) {
    if (this.daysOfWeek.includes(day)) {
      this.daysOfWeek = this.daysOfWeek.filter((d) => d !== day);
    } else {
      this.daysOfWeek = [...this.daysOfWeek, day].sort();
    }
  }

  private handleClose() {
    this.dispatchEvent(new CustomEvent("close"));
  }

  private async handleSave() {
    if (!this.contentId) {
      this.error = "Please select content to boost";
      return;
    }

    if (!this.apiClient) return;

    try {
      const request = this.buildRequest();

      if (this.schedule) {
        // Update existing
        await this.apiClient.updateRecurringSchedule(
          this.schedule.id,
          request as UpdateRecurringScheduleRequest,
        );
        console.log("[RecurringScheduleDialog] Updated successfully");
      } else {
        // Create new
        await this.apiClient.createRecurringSchedule(
          request as CreateRecurringScheduleRequest,
        );
        console.log("[RecurringScheduleDialog] Created successfully");
      }

      this.dispatchEvent(new CustomEvent("save"));
    } catch (err: any) {
      this.error = err.message || "Failed to save recurring schedule";
      alert(`Error: ${this.error}`);
      console.error("[RecurringScheduleDialog] Save error:", err);
    }
  }

  private buildRequest():
    | CreateRecurringScheduleRequest
    | UpdateRecurringScheduleRequest {
    const pattern: any = {
      type: this.recurrenceType,
      interval: this.interval,
      startDate: new Date(this.startDate).toISOString(),
    };

    if (this.useEndDate && this.endDate) {
      pattern.endDate = new Date(this.endDate).toISOString();
    }

    if (this.useMaxOccurrences && this.maxOccurrences) {
      pattern.maxOccurrences = this.maxOccurrences;
    }

    if (this.recurrenceType === "Weekly") {
      pattern.daysOfWeek = this.daysOfWeek;
    } else if (this.recurrenceType === "Monthly") {
      pattern.monthlyPattern = {
        type: this.monthlyPatternType,
      };

      if (this.monthlyPatternType === "DayOfMonth") {
        pattern.monthlyPattern.dayOfMonth = this.dayOfMonth;
      } else {
        pattern.monthlyPattern.weekOfMonth = this.weekOfMonth;
        pattern.monthlyPattern.dayOfWeek = this.dayOfWeek;
      }
    }

    const base = {
      targetPosition: this.targetPosition,
      priority: this.priority,
      pattern: pattern,
      boostDurationHours: this.boostDurationHours,
    };

    if (this.schedule) {
      return {
        ...base,
        isEnabled: this.schedule.isEnabled,
      };
    } else {
      return {
        ...base,
        contentId: this.contentId,
        parentId: this.parentId,
      };
    }
  }

  static styles = [
    css`
      :host {
        display: block;
      }

      .dialog-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      }

      .dialog {
        background: var(--uui-color-surface);
        border-radius: var(--uui-border-radius);
        max-width: 700px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: var(--uui-shadow-depth-5);
      }

      .dialog-header {
        padding: var(--uui-size-space-5);
        border-bottom: 1px solid var(--uui-color-border);
      }

      .dialog-header h2 {
        margin: 0;
        font-size: var(--uui-type-h4-size);
      }

      .dialog-body {
        padding: var(--uui-size-space-5);
      }

      .form-group {
        margin-bottom: var(--uui-size-space-4);
      }

      .form-group label {
        display: block;
        margin-bottom: var(--uui-size-space-2);
        font-weight: 600;
      }

      .form-group uui-input,
      .form-group select {
        width: 100%;
      }

      .form-group.inline {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-2);
        flex-wrap: nowrap;
      }

      .form-group.inline label {
        display: inline-block;
        margin-bottom: 0;
        white-space: nowrap;
        font-weight: 600;
        flex-shrink: 0;
      }

      .form-group.inline uui-input,
      .form-group.inline select {
        width: auto;
        flex-shrink: 0;
      }

      .form-group.inline .interval-text {
        white-space: nowrap;
        flex-shrink: 0;
      }

      .form-group select {
        padding: var(--uui-size-space-2);
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
        background: var(--uui-color-surface);
        color: var(--uui-color-text);
        font-family: inherit;
        font-size: inherit;
      }

      .days-of-week {
        display: flex;
        gap: var(--uui-size-space-2);
        flex-wrap: wrap;
      }

      .day-button {
        min-width: 60px;
      }

      .day-button.selected {
        background: var(--uui-color-selected);
      }

      .end-options {
        margin-top: var(--uui-size-space-3);
      }

      .end-option {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-2);
        margin-bottom: var(--uui-size-space-2);
      }

      .dialog-footer {
        padding: var(--uui-size-space-5);
        border-top: 1px solid var(--uui-color-border);
        display: flex;
        justify-content: flex-end;
        gap: var(--uui-size-space-3);
      }

      .error-message {
        padding: var(--uui-size-space-3);
        background: var(--uui-color-danger-emphasis);
        color: var(--uui-color-danger-contrast);
        border-radius: var(--uui-border-radius);
        margin-bottom: var(--uui-size-space-3);
      }

      .preview-section {
        margin-top: var(--uui-size-space-4);
        padding: var(--uui-size-space-4);
        background: var(--uui-color-surface-alt);
        border-radius: var(--uui-border-radius);
      }

      .preview-section h3 {
        margin-top: 0;
        font-size: var(--uui-type-h6-size);
      }

      .preview-list {
        list-style: none;
        padding: 0;
        margin: 0;
      }

      .preview-item {
        padding: var(--uui-size-space-2);
        border-bottom: 1px solid var(--uui-color-border);
      }

      .preview-item:last-child {
        border-bottom: none;
      }

      .priority-radio-group {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-2);
      }

      .priority-radio-option {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-2);
        padding: var(--uui-size-space-3);
        border: 2px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
        background: var(--uui-color-surface);
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .priority-radio-option:hover {
        border-color: var(--uui-color-selected);
        background: var(--uui-color-selected-alt);
      }

      .priority-radio-option.selected {
        border-color: var(--uui-color-selected);
        background: var(--uui-color-selected-alt);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .priority-radio-option input[type="radio"] {
        margin: 0;
        accent-color: var(--uui-color-selected);
      }

      .priority-radio-content {
        flex: 1;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .priority-radio-details {
        display: flex;
        flex-direction: column;
      }

      .priority-radio-label {
        font-weight: 600;
        color: var(--uui-color-text);
        margin-bottom: var(--uui-size-space-1);
      }

      .priority-radio-value {
        font-size: var(--uui-type-small-size);
        color: var(--uui-color-text-alt);
      }

    .priority-level-badge {
      display: flex;
      justify-content: center;
      align-items: center;
      border-radius: 24px;
      width: 70px;
      height: 32px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

      .priority-level-badge.priority-high {
        background: var(--uui-color-danger);
        color: white;
      }

      .priority-level-badge.priority-medium {
        background: var(--uui-color-warning);
        color: white;
      }

      .priority-level-badge.priority-low {
        background: var(--uui-color-positive);
        color: white;
      }

      .priority-loading,
      .no-priority-options {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-2);
        padding: var(--uui-size-space-3);
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
        background: var(--uui-color-surface-emphasis);
      }

      .no-priority-options {
        color: var(--uui-color-text-alt);
        background: var(--uui-color-warning-emphasis);
      }

      .description {
        font-size: var(--uui-type-small-size);
        color: var(--uui-color-text-alt);
        margin-top: var(--uui-size-space-1);
        margin-bottom: var(--uui-size-space-2);
      }

      .nested-schedule-table {
        width: 100%;
        border-collapse: collapse;
      }

      .nested-schedule-table thead {
        font-size: var(--uui-size-4);
        background: var(--uui-palette-mine-grey-light);
        color: var(--uui-palette-white-light);
        font-weight: normal;
      }

      .nested-schedule-table th {
        padding: var(--uui-size-space-2) var(--uui-size-space-3);
      }

      .nested-schedule-table td {
        padding: var(--uui-size-space-2) var(--uui-size-space-3);
        text-align: center;
      }

      .nested-schedule-table tbody tr {
        background: var(--uui-palette-white);
      }

      .nested-schedule-table tbody tr:hover {
        background: var(--uui-palette-white-dark);
      }
    `,
  ];

  render() {
    return html`
      <div class="dialog-overlay" @click=${this.handleClose}>
        <div class="dialog" @click=${(e: Event) => e.stopPropagation()}>
          <div class="dialog-header">
            <h2>
              ${this.schedule ? "Edit" : "Create"} Recurring Schedule
            </h2>
          </div>

          <div class="dialog-body">
            ${this.error
        ? html`<div class="error-message">${this.error}</div>`
        : ""}

            <div class="form-group">
              <label for="contentSelect">Content to Boost</label>
              ${!this.schedule ? html`${this.loadingChildren
        ? html`<uui-loader></uui-loader>` : this.nodeChildren.length === 0
          ? html`<div>No children found</div>` : html`
                            <select
                              id="contentSelect"
                              style="width: auto; min-width: 200px;"
                              @change=${(e: Event) => {
              const select = e.target as HTMLSelectElement;
              this.contentId = select.value;
              const selectedChild = this.nodeChildren.find(
                (c) => c.id === select.value,
              );
              this.contentName = selectedChild?.name || "";
            }}
                            >
                              ${this.nodeChildren.map(
              (child) => html`
                                  <option
                                    value="${child.id}"
                                    ?selected=${this.contentId === child.id}
                                  >
                                    ${child.name}
                                  </option>
                                `,
            )}
                            </select>
                          `}
                  `
        : html`<div><strong>${this.contentName}</strong></div>`}
            </div>

            <div class="form-group">
              <label for="targetPosition">Target Position</label>
              <uui-input
                type="number"
                id="targetPosition"
                label="Target Position"
                .value=${this.targetPosition.toString()}
                @input=${(e: Event) =>
      (this.targetPosition = parseInt(
        (e.target as HTMLInputElement).value,
      ))}
              ></uui-input>
            </div>



            <div class="form-group">
              <label for="boostDuration">Boost Duration (hours)</label>
              <uui-input
                type="number"
                id="boostDuration"
                label="Boost Duration (hours)"
                .value=${this.boostDurationHours.toString()}
                @input=${(e: Event) =>
      (this.boostDurationHours = parseInt(
        (e.target as HTMLInputElement).value,
      ))}
              ></uui-input>
            </div>

            <div class="form-group inline">
              <label for="recurrenceType">How often to repeat</label>
              <select
                id="recurrenceType"
                style="width: auto; min-width: 150px;"
                @change=${this.handleRecurrenceTypeChange}
              >
                <option
                  value="Daily"
                  ?selected=${this.recurrenceType === "Daily"}
                >
                  Daily
                </option>
                <option
                  value="Weekly"
                  ?selected=${this.recurrenceType === "Weekly"}
                >
                  Weekly
                </option>
                <option
                  value="Monthly"
                  ?selected=${this.recurrenceType === "Monthly"}
                >
                  Monthly
                </option>
              </select>
            </div>

            <div class="form-group inline">
              <label for="interval">Every</label>
              <uui-input
                type="number"
                id="interval"
                label="Interval"
                min="1"
                style="width: 80px;"
                .value=${this.interval.toString()}
                @input=${(e: Event) =>
      (this.interval = parseInt(
        (e.target as HTMLInputElement).value,
      ))}
              ></uui-input>
              <span class="interval-text">
                ${this.recurrenceType === "Daily"
        ? "day(s)"
        : this.recurrenceType === "Weekly"
          ? "week(s)"
          : "month(s)"}
              </span>
            </div>

            ${this.recurrenceType === "Weekly"
        ? this.renderWeeklyOptions()
        : ""}
            ${this.recurrenceType === "Monthly"
        ? this.renderMonthlyOptions()
        : ""}

            <div class="form-group">
              <label for="startDate">Start Date</label>
              <uui-input
                type="date"
                id="startDate"
                label="Start Date"
                .value=${this.startDate}
                @input=${(e: Event) =>
        (this.startDate = (e.target as HTMLInputElement).value)}
              ></uui-input>
            </div>
            ${this.renderEndOptions()}


              <div class="form-group">
              <label for="priority">
                <uui-icon name="icon-settings"></uui-icon>
                Priority
              </label>
              <div class="description">
                Choose the priority level for this schedule
              </div>
              ${this.loadingPriorities
        ? html`
                    <div class="priority-loading">
                      <uui-loader></uui-loader>
                      Loading priority options...
                    </div>
                  `
        : this.noPriorityOptionsFound
          ? html`
                      <div class="no-priority-options">
                        <uui-icon name="icon-alert"></uui-icon>
                        No priority options have been configured yet
                      </div>
                    `
          : html`
                      <div class="priority-radio-group">
                        ${this.priorityOptions.map(
            (option) => html`
                            <uui-label
                              class="priority-radio-option ${this.priority ===
                option.value
                ? "selected"
                : ""}"
                              @click=${(e: Event) => {
                e.preventDefault();
                this.priority = option.value;
              }}
                            >
                              <input
                                type="radio"
                                name="priority"
                                value=${option.value}"
                                .checked=${this.priority === option.value}
                              />
                              <div class="priority-radio-content">
                                <div class="priority-radio-details">
                                  <div class="priority-radio-label">
                                    ${option.label}
                                  </div>
                                  <div class="priority-radio-value">
                                    Priority Weight: ${option.value}
                                  </div>
                                </div>
                                <div
                                  class="priority-level-badge priority-${this.getPriorityLevel(
                option.value,
              )}"
                                >
                                  ${this.getPriorityLevelText(option.value)}
                                </div>
                              </div>
                            </uui-label>
                          `,
          )}
                      </div>
                    `}
            </div>


          </div>



          <div class="dialog-footer">
            <uui-button look="secondary" label="Cancel" @click=${this.handleClose}>
              Cancel
            </uui-button>
            <uui-button look="primary" color="positive" label="Save" @click=${this.handleSave}>
              ${this.schedule ? "Update" : "Create"}
            </uui-button>
          </div>
        </div>
      </div>
    `;
  }

  private renderWeeklyOptions() {
    return html`
      <div class="form-group">
        <label>Days of Week</label>
        <div class="days-of-week">
          ${RecurringScheduleHelpers.DAYS_OF_WEEK.map(
      (day) => html`
              <uui-button
                class="day-button ${this.daysOfWeek.includes(day.value)
          ? "selected"
          : ""}"
                look="${this.daysOfWeek.includes(day.value)
          ? "primary"
          : "secondary"}"
                label="${day.label}"
                @click=${() => this.handleDayOfWeekToggle(day.value)}
              >
                ${day.short}
              </uui-button>
            `,
    )}
        </div>
      </div>
    `;
  }

  private renderMonthlyOptions() {
    return html`
      <div class="form-group">
        <label>Monthly Pattern</label>
        <select
          @change=${(e: Event) =>
      (this.monthlyPatternType = (e.target as HTMLSelectElement)
        .value as MonthlyPatternType)}
        >
          <option
            value="DayOfMonth"
            ?selected=${this.monthlyPatternType === "DayOfMonth"}
          >
            Day of Month
          </option>
          <option
            value="DayOfWeek"
            ?selected=${this.monthlyPatternType === "DayOfWeek"}
          >
            Day of Week
          </option>
        </select>
      </div>

      ${this.monthlyPatternType === "DayOfMonth"
        ? html`
            <div class="form-group">
              <label for="dayOfMonth">Day of Month (1-31)</label>
              <uui-input
                type="number"
                id="dayOfMonth"
                label="Day of Month"
                min="1"
                max="31"
                .value=${this.dayOfMonth.toString()}
                @input=${(e: Event) =>
          (this.dayOfMonth = parseInt(
            (e.target as HTMLInputElement).value,
          ))}
              ></uui-input>
            </div>
          `
        : html`
            <div class="form-group">
              <label for="weekOfMonth">Week of Month</label>
              <select
                id="weekOfMonth"
                @change=${(e: Event) =>
          (this.weekOfMonth = parseInt(
            (e.target as HTMLSelectElement).value,
          ))}
              >
                ${RecurringScheduleHelpers.WEEK_OF_MONTH.map(
            (week) => html`
                    <option
                      value="${week.value}"
                      ?selected=${this.weekOfMonth === week.value}
                    >
                      ${week.label}
                    </option>
                  `,
          )}
              </select>
            </div>

            <div class="form-group">
              <label for="dayOfWeekMonthly">Day of Week</label>
              <select
                id="dayOfWeekMonthly"
                @change=${(e: Event) =>
          (this.dayOfWeek = parseInt(
            (e.target as HTMLSelectElement).value,
          ))}
              >
                ${RecurringScheduleHelpers.DAYS_OF_WEEK.map(
            (day) => html`
                    <option
                      value="${day.value}"
                      ?selected=${this.dayOfWeek === day.value}
                    >
                      ${day.label}
                    </option>
                  `,
          )}
              </select>
            </div>
          `}
    `;
  }

  private renderEndOptions() {
    return html`
      <div class="end-options">
        <div class="end-option">
          <uui-checkbox
            label="No end date (runs indefinitely)"
            .checked=${!this.useEndDate && !this.useMaxOccurrences}
            @change=${() => {
        this.useEndDate = false;
        this.useMaxOccurrences = false;
      }}
          ></uui-checkbox>
          <label>No end date (runs indefinitely)</label>
        </div>

        <div class="end-option">
          <uui-checkbox
            label="End by"
            .checked=${this.useEndDate}
            @change=${(e: Event) => {
        this.useEndDate = (e.target as HTMLInputElement).checked;
        if (this.useEndDate) this.useMaxOccurrences = false;
      }}
          ></uui-checkbox>
          <label>End by:</label>
          ${this.useEndDate
        ? html`
                <uui-input
                  type="date"
                  label="End Date"
                  .value=${this.endDate}
                  @input=${(e: Event) =>
            (this.endDate = (e.target as HTMLInputElement).value)}
                ></uui-input>
              `
        : ""}
        </div>

        <div class="end-option">
          <uui-checkbox
            label="After occurrences"
            .checked=${this.useMaxOccurrences}
            @change=${(e: Event) => {
        this.useMaxOccurrences = (e.target as HTMLInputElement).checked;
        if (this.useMaxOccurrences) this.useEndDate = false;
      }}
          ></uui-checkbox>
          <label>After:</label>
          ${this.useMaxOccurrences
        ? html`
                <uui-input
                  type="number"
                  label="Max Occurrences"
                  min="1"
                  .value=${this.maxOccurrences?.toString() || "1"}
                  @input=${(e: Event) =>
          (this.maxOccurrences = parseInt(
            (e.target as HTMLInputElement).value,
          ))}
                ></uui-input>
                <span>occurrences</span>
              `
        : ""}
        </div>
      </div>
    `;
  }
}

customElements.define(
  "recurring-schedule-dialog",
  RecurringScheduleDialogElement,
);
