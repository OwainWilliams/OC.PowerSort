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
import type {
  ScheduleResponse,
  EnumPriorityListResponse,
} from "../types/index.js";

interface PriorityOption {
  value: number;
  label: string;
}

interface ChildContent {
  id: string;
  name: string;
  parentId: string;
}

export default class ScheduleDialogElement extends UmbUiMixin(
  UmbAuthMixin(LitElement),
) {
  @property({ type: String })
  public parentId: string = "";

  @property({ type: Object })
  public schedule: ScheduleResponse | null = null;

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
  private availableChildren: ChildContent[] = [];

  @state()
  private loadingChildren: boolean = false;

  @state()
  private error: string = "";

  async connectedCallback() {
    super.connectedCallback();

    console.log("[Schedule Dialog] Connected with parentId:", this.parentId);

    // Load priority options and children
    await Promise.all([
      this.loadPriorityOptions(),
      this.loadAvailableChildren(),
    ]);

    if (this.schedule) {
      // Editing existing schedule
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

      this.startDateTime = this.toLocalDateTimeString(now.toISOString());
      this.endDateTime = this.toLocalDateTimeString(tomorrow.toISOString());
      this.targetPosition = 0;

      // Set default priority after priorities are loaded
      if (this.priorityOptions.length > 0) {
        this.priority = this.priorityOptions[0].value;
      }
    }
  }

  private async loadAvailableChildren(): Promise<void> {
    if (!this.parentId) {
      console.warn(
        "[Schedule Dialog] No parentId provided for loading children",
      );
      return;
    }

    this.loadingChildren = true;

    try {
      console.log(
        "[Schedule Dialog] Loading children for parent:",
        this.parentId,
      );

      const response = await this.makeAuthenticatedRequest(
        `${PowerSortConstants.API_BASE}${PowerSortConstants.ENDPOINTS.CHILDREN}/${this.parentId}`,
      );

      const data = (await ApiResponseHandler.handleResponse(response)) as any;

      this.availableChildren = (data.items || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        parentId: this.parentId,
      }));

      console.log("[Schedule Dialog] Loaded children:", this.availableChildren);
    } catch (error) {
      console.error("[Schedule Dialog] Error loading children:", error);
      this.availableChildren = [];
    } finally {
      this.loadingChildren = false;
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

  private handleChildrenDropdownChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const selectedId = select.value;

    if (selectedId) {
      const selectedChild = this.availableChildren.find(
        (c) => c.id === selectedId,
      );
      if (selectedChild) {
        this.selectedContentId = selectedChild.id;
        this.selectedContentName = selectedChild.name;
        this.error = "";

        console.log("[Schedule Dialog] Selected from dropdown:", selectedChild);
      }
    } else {
      this.selectedContentId = "";
      this.selectedContentName = "";
    }
  }

  private handlePriorityChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.priority = parseInt(input.value);
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

    // Double-check that selected content is a child of parent (for new schedules)
    if (!this.schedule) {
      const isValidChild = this.availableChildren.some(
        (child) => child.id === this.selectedContentId,
      );
      if (!isValidChild) {
        this.error = "Selected content is not a valid child of the parent";
        return;
      }
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

  private handleCancel() {
    this.dispatchEvent(
      new CustomEvent("cancel", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  private renderContentSelector() {
    if (this.loadingChildren) {
      return html`
        <div class="loading-content">
          <uui-loader></uui-loader>
          Loading available content...
        </div>
      `;
    }

    if (this.availableChildren.length === 0) {
      return html`
        <div class="no-content">
          <uui-icon name="icon-alert"></uui-icon>
          No child content found for the selected parent.
        </div>
      `;
    }

    // Provide both dropdown and document picker options
    return html`
      <div class="content-selector-options">
        <!-- Dropdown selector (guaranteed to show only children) -->
        <div class="selector-option">
          ${!this.schedule
            ? html`
                <uui-label class="selector-label">
                  <uui-icon name="icon-list"></uui-icon>
                  Select from available children:
                </uui-label>
              `
            : ""}
          <select
            class="children-dropdown"
            @change=${this.handleChildrenDropdownChange}
            .value=${this.selectedContentId}
            .disabled=${this.schedule}
          >
            <option value="">-- Select a child item --</option>
            ${this.availableChildren.map(
              (child) => html`
                <option
                  value="${child.id}"
                  ?selected="${child.id === this.selectedContentId}"
                >
                  ${child.name}
                </option>
              `,
            )}
          </select>
        </div>
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      --uui-input-height: var(--uui-size-11, 33px);
      --uui-select-height: var(--uui-size-11, 33px);
    }

    .grid {
      display: grid;
      grid-template-columns: 220px 1fr;
      grid-column-gap: var(--uui-size-layout-2);
      grid-row-gap: 36px;
    }

    .dialog {
      background: var(--uui-color-surface);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-6);
      max-width: 650px;
      width: 90%;
      max-height: 85vh;
      overflow-y: auto;
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--uui-size-14);
    }

    .dialog-header h3 {
      margin: 0;
      font-size: var(--uui-type-h4-size);
    }

    .form-field {
      margin-bottom: var(--uui-size-space-6);
    }

    .form-field label {
      display: block;
      font-weight: 500;
      margin-bottom: var(--uui-size-space-2);
    }

    .form-field input,
    .form-field uui-input,
    .form-field select {
      width: 100%;
    }

    .form-field select {
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-surface);
      color: var(--uui-color-text);
      font-family: inherit;
      font-size: inherit;
    }

    .form-field select:focus {
      outline: none;
      border-color: var(--uui-color-focus);
      box-shadow: 0 0 0 2px var(--uui-color-focus-outline);
    }

    .description {
      font-size: var(--uui-type-small-size);
      color: var(--uui-color-text-alt);
      margin-top: var(--uui-size-space-1);
      padding-left: 20px;
    }

    .dialog-actions {
      display: flex;
      gap: var(--uui-size-space-3);
      justify-content: flex-end;
      margin-top: var(--uui-size-space-5);
    }

    .error-message {
      background: var(--uui-color-danger-emphasis);
      color: var(--uui-color-danger);
      padding: var(--uui-size-space-3);
      border-radius: var(--uui-border-radius);
      margin-bottom: var(--uui-size-space-4);
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .date-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--uui-size-space-3);
    }

    .selected-content {
      padding: var(--uui-size-space-3);
      background: var(--uui-color-positive-emphasis);
      border-radius: var(--uui-border-radius);
      margin-top: var(--uui-size-space-2);
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .loading-content,
    .no-content {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-surface-emphasis);
    }

    .no-content {
      color: var(--uui-color-warning);
      background: var(--uui-color-warning-emphasis);
    }

    .content-selector-options {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    .selector-option {
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface-emphasis);
    }

    .selector-label {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      font-weight: 600;
      margin-bottom: var(--uui-size-space-2);
      color: var(--uui-color-text);
    }

    .children-dropdown {
      width: 100%;
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-surface);
      color: var(--uui-color-text);
      font-family: inherit;
      font-size: inherit;
    }

    .children-dropdown:focus {
      outline: none;
      border-color: var(--uui-color-focus);
      box-shadow: 0 0 0 2px var(--uui-color-focus-outline);
    }

    .picker-note {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-1);
      font-size: var(--uui-type-small-size);
      color: var(--uui-color-text-alt);
      margin-top: var(--uui-size-space-1);
    }

    .loading {
      opacity: 0.6;
      pointer-events: none;
    }

    .priority-loading {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-2);
      color: var(--uui-color-text-alt);
    }

    .no-priority-options {
      padding: var(--uui-size-space-3);
      background: var(--uui-color-warning-emphasis);
      color: var(--uui-color-warning);
      border-radius: var(--uui-border-radius);
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .priority-info {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      margin-top: var(--uui-size-space-2);
      padding: var(--uui-size-space-2);
      background: var(--uui-color-surface-alt);
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
      display: inline-block;
      padding: 4px var(--uui-size-space-2);
      border-radius: 12px;
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
  `;

  render() {
    return html`
      <div class="dialog" @click=${(e: Event) => e.stopPropagation()}>
        <div class="dialog-header">
          <h3>
            <uui-icon name="icon-calendar"></uui-icon>
            ${this.schedule ? `Edit Schedule for ${this.selectedContentName}` : "Create Schedule"}
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

        ${
          this.error
            ? html`
                <div class="error-message">
                  <uui-icon name="icon-alert"></uui-icon>
                  ${this.error}
                </div>
              `
            : ""
        }

        <div class="grid">
          <uui-label>
            <uui-icon name="icon-document"></uui-icon>
            Content to Boost
          </uui-label>
          ${this.renderContentSelector()}

          <div class="adsf">
            <uui-label>
              <uui-icon name="icon-navigation-up"></uui-icon>
              Target Position
            </uui-label>
            <div class="description">
              Position to boost the content to (0 = first)
            </div>
            </div>
            <uui-input
              type="number"
              .value=${this.targetPosition.toString()}
              @change=${(e: any) =>
                (this.targetPosition = parseInt(e.target.value) || 0)}
              min="0"
            >
            </uui-input>
<div>
                <uui-label>
                  <uui-icon name="icon-calendar-alt"></uui-icon>
                  Start Date & Time
                </uui-label>
                                <div class="description">When the schedule becomes active</div>

                </div>
                <uui-input
                  pristine=""
                  label="Label"
                  placeholder="Placeholder"
                  type="datetime-local"
                  .value=${this.startDateTime}
                  @change=${(e: any) => (this.startDateTime = e.target.value)}
                ></uui-input>
                <div>
                <uui-label>
                  <uui-icon name="icon-calendar-alt"></uui-icon>
                  End Date & Time
                </uui-label>
                <div class="description">When the schedule expires</div>
                  </div>

                <uui-input
                  pristine=""
                  label="Label"
                  placeholder="Placeholder"
                  type="datetime-local"
                  .value=${this.endDateTime}
                  @change=${(e: any) => (this.endDateTime = e.target.value)}
                ></uui-input>
              <div>
              <uui-label>
                <uui-icon name="icon-settings"></uui-icon>
                Priority
              </uui-label>
                            <div class="description">
                Choose the priority level for this schedule
              </div>
              </div>
              ${
                this.loadingPriorities
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
                              >
                                <input
                                  type="radio"
                                  name="priority"
                                  value="${option.value}"
                                  ?checked="${this.priority === option.value}"
                                  @change="${this.handlePriorityChange}"
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
                        <div class="priority-info">
                          <uui-icon name="icon-info"></uui-icon>
                          ${this.priorityOptions.length} priority
                          option${this.priorityOptions.length !== 1 ? "s" : ""}
                          available
                        </div>
                      `
              }
          </div>


            <div class="dialog-actions">
              <uui-button
                look="outline"
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
                ?disabled=${this.loadingPriorities || this.loadingChildren}
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
