import {
  LitElement,
  html,
  css,
  property,
  state,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbAuthMixin } from "../mixins/auth.mixin.js";
import { UmbUiMixin } from "../mixins/ui.mixin.js";
import { PowerSortConstants } from "../utils/constants.js";
import { ApiResponseHandler } from "../utils/api-response.utils.js";
import { RecurringScheduleApiClient } from "../api/recurring-schedule-api.client.js";
import { RecurringScheduleHelpers } from "../types/recurring-schedule.types.js";
import type {
  ScheduleResponse,
  EnumPriorityListResponse,
} from "../types/index.js";
import type {
  RecurrenceType,
  MonthlyPatternType,
} from "../types/recurring-schedule.types.js";

interface PriorityOption {
  value: number;
  label: string;
}

export default class ScheduleDialogElement extends UmbUiMixin(
  UmbAuthMixin(LitElement),
) {
  @property({ type: String })
  public parentId: string = "";

  @property({ type: Object })
  public schedule: ScheduleResponse | null = null;

  @property({ type: String })
  public contentId: string = "";

  @property({ type: String })
  public contentName: string = "";

  @state()
  private selectedContentId: string = "";

  @state()
  private selectedContentName: string = "";

  @state()
  private targetPosition: number = 0;

  @state()
  private startDateTime: string = "";

  @state()
  private endDateTime: string = "";

  @state()
  private priority: number = 0;

  @state()
  private priorityOptions: PriorityOption[] = [];

  @state()
  private loadingPriorities: boolean = true;

  @state()
  private noPriorityOptionsFound: boolean = false;

  @state()
  private error: string = "";

  @state()
  private scheduleType: "one-time" | "recurring" = "one-time";

  // Recurring schedule properties
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
  private recurringStartDate: string = "";

  @state()
  private recurringEndDate: string = "";

  @state()
  private maxOccurrences: number | undefined = undefined;

  @state()
  private useEndDate: boolean = false;

  @state()
  private useMaxOccurrences: boolean = false;

  private recurringApiClient: RecurringScheduleApiClient | null = null;

  async connectedCallback() {
    super.connectedCallback();

    console.log("[Schedule Dialog] Connected with parentId:", this.parentId);

    // Initialize recurring schedule API client
    this.recurringApiClient = new RecurringScheduleApiClient(() =>
      this.getAuthToken(),
    );

    // Load priority options and children
    await Promise.all([this.loadPriorityOptions()]);

    if (this.schedule) {
      // Editing existing one-time schedule
      this.scheduleType = "one-time";
      this.selectedContentId = this.schedule.contentId;
      this.selectedContentName = this.schedule.contentName;
      this.targetPosition = this.schedule.targetPosition;
      this.startDateTime = this.toLocalDateTimeString(
        this.schedule.startDateTime,
      );
      this.endDateTime = this.toLocalDateTimeString(this.schedule.endDateTime);
      this.priority = this.schedule.priority;
    } else {
      // New schedule - set defaults
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      this.selectedContentId = this.contentId;
      this.selectedContentName = this.contentName;
      this.startDateTime = this.toLocalDateTimeString(now.toISOString());
      this.endDateTime = this.toLocalDateTimeString(tomorrow.toISOString());
      this.targetPosition = 0;

      // Set recurring start date default
      this.recurringStartDate = now.toISOString().slice(0, 10);

      // Set default priority after priorities are loaded
      if (this.priorityOptions.length > 0) {
        this.priority = this.priorityOptions[0].value;
      }
    }
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
        if (!this.schedule && this.priority === 0) {
          this.priority = this.priorityOptions[0].value;
        }
      } else {
        this.noPriorityOptionsFound = true;
      }
    } catch (error) {
      console.error("[Schedule Dialog] Error loading priority options:", error);
      this.noPriorityOptionsFound = true;
    } finally {
      this.loadingPriorities = false;
    }
  }

  private toLocalDateTimeString(isoString: string): string {
    const date = new Date(isoString);
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60 * 1000);
    return localDate.toISOString().slice(0, 16);
  }

  private toISOString(localDateTimeString: string): string {
    return new Date(localDateTimeString).toISOString();
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

  private async handleSave() {
    this.error = "";

    // Validation
    if (!this.schedule && !this.selectedContentId) {
      this.error = "Please select a content item";
      return;
    }

    if (this.targetPosition < 0) {
      this.error = "Target position must be non-negative";
      return;
    }

    if (this.scheduleType === "one-time") {
      await this.saveOneTimeSchedule();
    } else {
      await this.saveRecurringSchedule();
    }
  }

  private async saveOneTimeSchedule() {
    if (!this.startDateTime || !this.endDateTime) {
      this.error = "Start and end dates are required";
      return;
    }

    const start = new Date(this.startDateTime);
    const end = new Date(this.endDateTime);

    if (start >= end) {
      this.error = "End date must be after start date";
      return;
    }

    // Dispatch save event
    this.dispatchEvent(
      new CustomEvent("save", {
        detail: {
          contentId: this.selectedContentId,
          targetPosition: this.targetPosition,
          startDateTime: this.toISOString(this.startDateTime),
          endDateTime: this.toISOString(this.endDateTime),
          priority: this.priority,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private async saveRecurringSchedule() {
    if (!this.recurringApiClient) {
      this.error = "API client not initialized";
      return;
    }

    // Build recurrence pattern
    const pattern: any = {
      type: this.recurrenceType,
      interval: this.interval,
      startDate: new Date(this.recurringStartDate).toISOString(),
    };

    if (this.useEndDate && this.recurringEndDate) {
      pattern.endDate = new Date(this.recurringEndDate).toISOString();
    }

    if (this.useMaxOccurrences && this.maxOccurrences) {
      pattern.maxOccurrences = this.maxOccurrences;
    }

    if (this.recurrenceType === "Weekly") {
      if (this.daysOfWeek.length === 0) {
        this.error = "Please select at least one day of the week";
        return;
      }
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

    try {
      await this.recurringApiClient.createRecurringSchedule({
        contentId: this.selectedContentId,
        parentId: this.parentId,
        targetPosition: this.targetPosition,
        priority: this.priority,
        pattern: pattern,
        boostDurationHours: this.boostDurationHours,
      });

      console.log("[ScheduleDialog] Recurring schedule created successfully");

      // Dispatch save event to close dialog and refresh
      this.dispatchEvent(
        new CustomEvent("save", {
          detail: { isRecurring: true },
          bubbles: true,
          composed: true,
        }),
      );
    } catch (err: any) {
      this.error = err.message || "Failed to create recurring schedule";
      console.error("[ScheduleDialog] Error creating recurring schedule:", err);
    }
  }

  private handleCancel() {
    this.dispatchEvent(
      new CustomEvent("cancel", {
        bubbles: true,
        composed: true,
      }),
    );
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

  private renderRecurringOptions() {
    return html`
      <div class="form-group">
        <label for="boostDuration">
          <uui-icon name="icon-refresh"></uui-icon>
          Boost Duration (hours)
        </label>
        <div class="description">How long each boost lasts</div>
        <uui-input
          type="number"
          id="boostDuration"
          label="Boost Duration (hours)"
          min="1"
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
          <option value="Daily" ?selected=${this.recurrenceType === "Daily"}>
            Daily
          </option>
          <option value="Weekly" ?selected=${this.recurrenceType === "Weekly"}>
            Weekly
          </option>
          <option value="Monthly" ?selected=${this.recurrenceType === "Monthly"}>
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
            (this.interval = parseInt((e.target as HTMLInputElement).value))}
        ></uui-input>
        <span class="interval-text">
          ${this.recurrenceType === "Daily"
            ? "day(s)"
            : this.recurrenceType === "Weekly"
              ? "week(s)"
              : "month(s)"}
        </span>
      </div>
       
      ${this.recurrenceType === "Weekly" ? this.renderWeeklyOptions() : ""}
      ${this.recurrenceType === "Monthly" ? this.renderMonthlyOptions() : ""}

      <div class="form-group">
        <label for="startDate">Start Date</label>
        <uui-input
          type="date"
          id="startDate"
          label="Start Date"
          .value=${this.recurringStartDate}
          @input=${(e: Event) =>
            (this.recurringStartDate = (e.target as HTMLInputElement).value)}
        ></uui-input>
      </div>

      ${this.renderEndOptions()}
    `;
  }

  private renderWeeklyOptions() {
    return html`
      <div class="form-group">
        <label>Days of Week</label>
        <div
          style="display: flex; gap: var(--uui-size-space-2); flex-wrap: wrap; margin-top: var(--uui-size-space-2);"
        >
          ${RecurringScheduleHelpers.DAYS_OF_WEEK.map(
            (day) => html`
              <uui-button
                look="${this.daysOfWeek.includes(day.value)
                  ? "primary"
                  : "secondary"}"
                label="${day.label}"
                compact
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
              <label for="dayOfWeekSelect">Day of Week</label>
              <select
                id="dayOfWeekSelect"
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
      <div class="form-group">
        <label>End Options</label>
        <div class="end-options">
          <div class="end-option">
            <input
              type="radio"
              name="endOption"
              ?checked=${!this.useEndDate && !this.useMaxOccurrences}
              @change=${() => {
                this.useEndDate = false;
                this.useMaxOccurrences = false;
              }}
            />
            <span>No end date (runs indefinitely)</span>
          </div>

          <div class="end-option">
            <input
              type="radio"
              name="endOption"
              ?checked=${this.useEndDate}
              @change=${() => {
                this.useEndDate = true;
                this.useMaxOccurrences = false;
              }}
            />
            <span>End by:</span>
            ${this.useEndDate
              ? html`
                  <uui-input
                    type="date"
                    label="End Date"
                    .value=${this.recurringEndDate}
                    @input=${(e: Event) =>
                      (this.recurringEndDate = (
                        e.target as HTMLInputElement
                      ).value)}
                    style="flex: 1;"
                  ></uui-input>
                `
              : ""}
          </div>

          <div class="end-option">
            <input
              type="radio"
              name="endOption"
              ?checked=${this.useMaxOccurrences}
              @change=${() => {
                this.useEndDate = false;
                this.useMaxOccurrences = true;
              }}
            />
            <span>After:</span>
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
                    style="width: 100px;"
                  ></uui-input>
                  <span>occurrences</span>
                `
              : ""}
          </div>
        </div>
      </div>
    `;
  }

  static styles = css`
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
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .dialog-header h3 {
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

    .description {
      font-size: var(--uui-type-small-size);
      color: var(--uui-color-text-alt);
      margin-top: var(--uui-size-space-1);
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
      background: var(--uui-color-danger-emphasis);
      color: var(--uui-color-danger-contrast);
      padding: var(--uui-size-space-3);
      border-radius: var(--uui-border-radius);
      margin-bottom: var(--uui-size-space-3);
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .end-options {
      margin-top: var(--uui-size-space-2);
    }

    .end-option {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      margin-bottom: var(--uui-size-space-2);
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
      border-radius: var(--uui-border-radius);
      font-size: var(--uui-type-small-size);
      color: var(--uui-color-text-alt);
    }

    /* Priority Radio Button Styles */
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

    .flex {
      display: flex;
    }

    .schedule-type-toggle {
      padding: var(--uui-size-space-4);
      border-bottom: 1px solid var(--uui-color-border);
      display: flex;
      justify-content: center;
      background: var(--uui-color-surface-alt);
    }

    .schedule-type-toggle uui-button-group {
      width: 100%;
      max-width: 400px;
    }
  `;

  render() {
    return html`
      <div class="dialog-overlay" @click=${this.handleCancel}>
        <div class="dialog" @click=${(e: Event) => e.stopPropagation()}>
          <div class="dialog-header">
            <h3>
              <uui-icon name="icon-calendar"></uui-icon>
              ${this.schedule ? "Edit" : "Create"} Schedule for ${this.selectedContentName}
            </h3>
            <uui-button
              look="outline"
              label="Close"
              compact
              @click=${this.handleCancel}
            >
              <uui-icon name="icon-delete"></uui-icon>
            </uui-button>
          </div>

          ${!this.schedule
            ? html`
                <div class="schedule-type-toggle">
                  <uui-button-group>
                    <uui-button
                      look="${this.scheduleType === "one-time"
                        ? "primary"
                        : "outline"}"
                      label="One-time Schedule"
                      @click=${() => (this.scheduleType = "one-time")}
                    >
                      <uui-icon name="icon-calendar"></uui-icon>
                      One-time
                    </uui-button>
                    <uui-button
                      look="${this.scheduleType === "recurring"
                        ? "primary"
                        : "outline"}"
                      label="Recurring Schedule"
                      @click=${() => (this.scheduleType = "recurring")}
                    >
                      <uui-icon name="icon-refresh"></uui-icon>
                      Recurring
                    </uui-button>
                  </uui-button-group>
                </div>
              `
            : ""}

          <div class="dialog-body">
            ${this.error
              ? html`<div class="error-message">${this.error}</div>`
              : ""}

            <div class="form-group">
              <label for="targetPosition">
                <uui-icon name="icon-navigation-up"></uui-icon>
                Target Position
              </label>
              <div class="description">
                Position to boost the content to (0 = first)
              </div>
              <uui-input
                type="number"
                id="targetPosition"
                label="Target Position"
                .value=${this.targetPosition.toString()}
                @input=${(e: Event) =>
                  (this.targetPosition = parseInt(
                    (e.target as HTMLInputElement).value,
                  ) || 0)}
                min="0"
              >
              </uui-input>
            </div>

            ${this.scheduleType === "one-time"
              ? html`
                  <div class="form-group">
                    <label for="startDateTime">
                      <uui-icon name="icon-calendar-alt"></uui-icon>
                      Start Date & Time
                    </label>
                    <div class="description">When the schedule becomes active</div>
                    <uui-input
                      type="datetime-local"
                      id="startDateTime"
                      label="Start Date & Time"
                      .value=${this.startDateTime}
                      @input=${(e: Event) =>
                        (this.startDateTime = (
                          e.target as HTMLInputElement
                        ).value)}
                    ></uui-input>
                  </div>

                  <div class="form-group">
                    <label for="endDateTime">
                      <uui-icon name="icon-calendar-alt"></uui-icon>
                      End Date & Time
                    </label>
                    <div class="description">When the schedule expires</div>
                    <uui-input
                      type="datetime-local"
                      id="endDateTime"
                      label="End Date & Time"
                      .value=${this.endDateTime}
                      @input=${(e: Event) =>
                        (this.endDateTime = (
                          e.target as HTMLInputElement
                        ).value)}
                    ></uui-input>
                  </div>
                `
              : this.renderRecurringOptions()}

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
                                value="${option.value}"
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
            <uui-button
              look="secondary"
              label="Cancel"
              @click=${this.handleCancel}
            >
              Cancel
            </uui-button>
            <uui-button
              look="primary"
              color="positive"
              label="Save"
              @click=${this.handleSave}
              ?disabled=${this.loadingPriorities}
            >
              <uui-icon name="icon-check"></uui-icon>
              ${this.schedule ? "Update" : "Create"} Schedule
            </uui-button>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define("schedule-dialog", ScheduleDialogElement);
