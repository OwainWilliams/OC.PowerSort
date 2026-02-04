import { LitElement as y, html as o, css as b, property as u, state as n } from "@umbraco-cms/backoffice/external/lit";
import { U as D, P as p, A as v } from "./crud.mixin-CKRlkSCY.js";
import { D as S } from "./validation.utils-BMdJXB5x.js";
import { S as w } from "./schedule-api.client-B7glFSVb.js";
import { U as C } from "./ui.mixin-BO9nAmoy.js";
var z = Object.defineProperty, s = (h, e, i, r) => {
  for (var t = void 0, l = h.length - 1, g; l >= 0; l--)
    (g = h[l]) && (t = g(e, i, t) || t);
  return t && z(e, i, t), t;
};
const m = class m extends C(D(y)) {
  constructor() {
    super(...arguments), this.parentId = "", this.schedule = null, this.selectedContentId = "", this.selectedContentName = "", this.targetPosition = 0, this.startDateTime = "", this.endDateTime = "", this.priority = 0, this.priorityOptions = [], this.loadingPriorities = !0, this.noPriorityOptionsFound = !1, this.availableChildren = [], this.loadingChildren = !1, this.error = "";
  }
  async connectedCallback() {
    if (super.connectedCallback(), console.log("[Schedule Dialog] Connected with parentId:", this.parentId), await Promise.all([
      this.loadPriorityOptions(),
      this.loadAvailableChildren()
    ]), this.schedule)
      this.selectedContentId = this.schedule.contentId, this.selectedContentName = this.schedule.contentName, this.targetPosition = this.schedule.targetPosition, this.startDateTime = this.toLocalDateTimeString(this.schedule.startDateTime), this.endDateTime = this.toLocalDateTimeString(this.schedule.endDateTime), this.priority = this.schedule.priority;
    else {
      const e = /* @__PURE__ */ new Date(), i = new Date(e);
      i.setDate(i.getDate() + 1), this.startDateTime = this.toLocalDateTimeString(e.toISOString()), this.endDateTime = this.toLocalDateTimeString(i.toISOString()), this.targetPosition = 0, this.priorityOptions.length > 0 && (this.priority = this.priorityOptions[0].value);
    }
  }
  async loadAvailableChildren() {
    if (!this.parentId) {
      console.warn("[Schedule Dialog] No parentId provided for loading children");
      return;
    }
    this.loadingChildren = !0;
    try {
      console.log("[Schedule Dialog] Loading children for parent:", this.parentId);
      const e = await this.makeAuthenticatedRequest(
        `${p.API_BASE}${p.ENDPOINTS.CHILDREN}/${this.parentId}`
      ), i = await v.handleResponse(e);
      this.availableChildren = (i.items || []).map((r) => ({
        id: r.id,
        name: r.name,
        parentId: this.parentId
      })), console.log("[Schedule Dialog] Loaded children:", this.availableChildren);
    } catch (e) {
      console.error("[Schedule Dialog] Error loading children:", e), this.availableChildren = [];
    } finally {
      this.loadingChildren = !1;
    }
  }
  async loadPriorityOptions() {
    this.loadingPriorities = !0, this.noPriorityOptionsFound = !1;
    try {
      const e = await this.makeAuthenticatedRequest(
        `${p.API_BASE}/enum-priorities`
      ), r = (await v.handleResponse(e)).items || [];
      r.length > 0 ? (this.priorityOptions = r.sort((t, l) => t.sortPriority - l.sortPriority).map((t) => ({
        value: t.sortPriority,
        label: t.name
      })), !this.schedule && this.priority === 0 && (this.priority = this.priorityOptions[0].value)) : this.noPriorityOptionsFound = !0;
    } catch (e) {
      console.error("[Schedule Dialog] Error loading priority options:", e), this.noPriorityOptionsFound = !0;
    } finally {
      this.loadingPriorities = !1;
    }
  }
  toLocalDateTimeString(e) {
    const i = new Date(e), r = i.getTimezoneOffset();
    return new Date(i.getTime() - r * 60 * 1e3).toISOString().slice(0, 16);
  }
  toISOString(e) {
    return new Date(e).toISOString();
  }
  handleChildrenDropdownChange(e) {
    const r = e.target.value;
    if (r) {
      const t = this.availableChildren.find((l) => l.id === r);
      t && (this.selectedContentId = t.id, this.selectedContentName = t.name, this.error = "", console.log("[Schedule Dialog] Selected from dropdown:", t));
    } else
      this.selectedContentId = "", this.selectedContentName = "";
  }
  handlePriorityChange(e) {
    const i = e.target;
    this.priority = parseInt(i.value);
  }
  getPriorityLevel(e) {
    return e >= 500 ? "high" : e >= 200 ? "medium" : "low";
  }
  getPriorityLevelText(e) {
    return e >= 500 ? "High" : e >= 200 ? "Medium" : "Low";
  }
  async handleSave() {
    if (this.error = "", !this.schedule && !this.selectedContentId) {
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
    const e = new Date(this.startDateTime), i = new Date(this.endDateTime);
    if (e >= i) {
      this.error = "End date must be after start date";
      return;
    }
    if (!this.schedule && !this.availableChildren.some((t) => t.id === this.selectedContentId)) {
      this.error = "Selected content is not a valid child of the parent";
      return;
    }
    this.dispatchEvent(
      new CustomEvent("save", {
        detail: {
          contentId: this.selectedContentId,
          targetPosition: this.targetPosition,
          startDateTime: this.toISOString(this.startDateTime),
          endDateTime: this.toISOString(this.endDateTime),
          priority: this.priority
        },
        bubbles: !0,
        composed: !0
      })
    );
  }
  handleCancel() {
    this.dispatchEvent(
      new CustomEvent("cancel", {
        bubbles: !0,
        composed: !0
      })
    );
  }
  renderContentSelector() {
    return this.schedule ? o`
        <div class="selected-content">
          <strong>${this.selectedContentName}</strong>    
          <div class="description">Cannot change content when editing</div>
        </div>
      ` : this.loadingChildren ? o`
        <div class="loading-content">
          <uui-loader></uui-loader>
          Loading available content...
        </div>
      ` : this.availableChildren.length === 0 ? o`
        <div class="no-content">
          <uui-icon name="icon-alert"></uui-icon>
          No child content found for the selected parent.
        </div>
      ` : o`
      <div class="content-selector-options">
        <!-- Dropdown selector (guaranteed to show only children) -->
        <div class="selector-option">
          <label class="selector-label">
            <uui-icon name="icon-list"></uui-icon>
            Select from available children:
          </label>
          <select 
            class="children-dropdown"
            @change=${this.handleChildrenDropdownChange}
            .value=${this.selectedContentId}>
            <option value="">-- Select a child content --</option>
            ${this.availableChildren.map((e) => o`
              <option 
                value="${e.id}"
                ?selected="${e.id === this.selectedContentId}">
                ${e.name}
              </option>
            `)}
          </select>
        </div>

        ${this.selectedContentName ? o`
          <div class="selected-content">
            <uui-icon name="icon-check"></uui-icon>
            Selected: <strong>${this.selectedContentName}</strong>
          </div>
        ` : ""}
        
      </div>
    `;
  }
  render() {
    return o`
      <div class="dialog" @click=${(e) => e.stopPropagation()}>
        <div class="dialog-header">
          <h3>
            <uui-icon name="icon-calendar"></uui-icon>
            ${this.schedule ? "Edit Schedule" : "Create Schedule"}
          </h3>
          <uui-button
            look="outline"
            label="Close"
            compact
            @click=${this.handleCancel}>
            <uui-icon name="icon-delete"></uui-icon>
          </uui-button>
        </div>

        ${this.error ? o`
              <div class="error-message">
                <uui-icon name="icon-alert"></uui-icon>
                ${this.error}
              </div>
            ` : ""}

        <div class="form-field">
          <label>
            <uui-icon name="icon-document"></uui-icon>
            Content to Boost
          </label>
          ${this.renderContentSelector()}
        </div>

        <div class="form-field">
          <label>
            <uui-icon name="icon-navigation-up"></uui-icon>
            Target Position
          </label>
          <uui-input
            type="number"
            .value=${this.targetPosition.toString()}
            @change=${(e) => this.targetPosition = parseInt(e.target.value) || 0}
            min="0">
          </uui-input>
          <div class="description">Position to boost the content to (0 = first)</div>
        </div>

        <div class="date-grid">
          <div class="form-field">
            <label>
              <uui-icon name="icon-calendar-alt"></uui-icon>
              Start Date & Time
            </label>
            <input
              type="datetime-local"
              .value=${this.startDateTime}
              @change=${(e) => this.startDateTime = e.target.value} />
            <div class="description">When the schedule becomes active</div>
          </div>

          <div class="form-field">
            <label>
              <uui-icon name="icon-calendar-alt"></uui-icon>
              End Date & Time
            </label>
            <input
              type="datetime-local"
              .value=${this.endDateTime}
              @change=${(e) => this.endDateTime = e.target.value} />
            <div class="description">When the schedule expires</div>
          </div>
        </div>

        <div class="form-field">
          <label>
            <uui-icon name="icon-settings"></uui-icon>
            Priority
          </label>
          ${this.loadingPriorities ? o`
                <div class="priority-loading">
                  <uui-loader></uui-loader>
                  Loading priority options...
                </div>
              ` : this.noPriorityOptionsFound ? o`
                <div class="no-priority-options">
                  <uui-icon name="icon-alert"></uui-icon>
                  No priority options have been configured yet
                </div>
              ` : o`
                <div class="priority-radio-group">
                  ${this.priorityOptions.map((e) => o`
                    <label class="priority-radio-option ${this.priority === e.value ? "selected" : ""}">
                      <input
                        type="radio"
                        name="priority"
                        value="${e.value}"
                        ?checked="${this.priority === e.value}"
                        @change="${this.handlePriorityChange}"
                      />
                      <div class="priority-radio-content">
                        <div class="priority-radio-details">
                          <div class="priority-radio-label">${e.label}</div>
                          <div class="priority-radio-value">Priority Weight: ${e.value}</div>
                        </div>
                        <div class="priority-level-badge priority-${this.getPriorityLevel(e.value)}">
                          ${this.getPriorityLevelText(e.value)}
                        </div>
                      </div>
                    </label>
                  `)}
                </div>
                <div class="priority-info">
                  <uui-icon name="icon-info"></uui-icon>
                  ${this.priorityOptions.length} priority option${this.priorityOptions.length !== 1 ? "s" : ""} available
                </div>
              `}
          <div class="description">Choose the priority level for this schedule</div>
        </div>

        <div class="dialog-actions">
          <uui-button look="outline" label="Cancel" @click=${this.handleCancel}>
            Cancel
          </uui-button>
          <uui-button
            look="primary"
            color="positive"
            label="Save"
            @click=${this.handleSave}
            ?disabled=${this.loadingPriorities || this.loadingChildren}>
            <uui-icon name="icon-check"></uui-icon>
            ${this.schedule ? "Update" : "Create"} Schedule
          </uui-button>
        </div>
      </div>
    `;
  }
};
m.styles = b`
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
      margin-bottom: var(--uui-size-space-5);
    }

    .dialog-header h3 {
      margin: 0;
      font-size: var(--uui-type-h4-size);
    }

    .form-field {
      margin-bottom: var(--uui-size-space-4);
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

    .form-field .description {
      font-size: var(--uui-type-small-size);
      color: var(--uui-color-text-alt);
      margin-top: var(--uui-size-space-1);
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
  `;
let a = m;
s([
  u({ type: String })
], a.prototype, "parentId");
s([
  u({ type: Object })
], a.prototype, "schedule");
s([
  n()
], a.prototype, "selectedContentId");
s([
  n()
], a.prototype, "selectedContentName");
s([
  n()
], a.prototype, "targetPosition");
s([
  n()
], a.prototype, "startDateTime");
s([
  n()
], a.prototype, "endDateTime");
s([
  n()
], a.prototype, "priority");
s([
  n()
], a.prototype, "priorityOptions");
s([
  n()
], a.prototype, "loadingPriorities");
s([
  n()
], a.prototype, "noPriorityOptionsFound");
s([
  n()
], a.prototype, "availableChildren");
s([
  n()
], a.prototype, "loadingChildren");
s([
  n()
], a.prototype, "error");
customElements.define("schedule-dialog", a);
var x = Object.defineProperty, c = (h, e, i, r) => {
  for (var t = void 0, l = h.length - 1, g; l >= 0; l--)
    (g = h[l]) && (t = g(e, i, t) || t);
  return t && x(e, i, t), t;
};
const f = class f extends D(y) {
  constructor() {
    super(...arguments), this.parentId = "", this.parentNodeName = "", this.schedules = [], this.loading = !1, this.error = "", this.showCreateDialog = !1, this.editingSchedule = null;
  }
  async connectedCallback() {
    super.connectedCallback(), this.scheduleApi = new w(() => this.getAuthToken()), this.parentId && (await this.loadParentInfo(), await this.loadSchedules());
  }
  async updated(e) {
    super.updated(e), e.has("parentId") && this.parentId && (await this.loadParentInfo(), await this.loadSchedules());
  }
  async loadParentInfo() {
    if (this.parentId)
      try {
        const e = await this.makeAuthenticatedRequest(
          `/umbraco/management/api/v1/document/${this.parentId}`
        ), i = await v.handleResponse(e);
        this.parentNodeName = i.variants?.[0]?.name || "Unknown Node";
      } catch (e) {
        console.error("Error loading parent info:", e);
      }
  }
  async loadSchedules() {
    if (!(!this.scheduleApi || !this.parentId)) {
      this.loading = !0, this.error = "";
      try {
        const e = await this.scheduleApi.getSchedules(this.parentId);
        this.schedules = e.items;
      } catch (e) {
        console.error("Error loading schedules:", e), this.error = "Failed to load schedules";
      } finally {
        this.loading = !1;
      }
    }
  }
  openCreateDialog() {
    this.showCreateDialog = !0, this.editingSchedule = null;
  }
  openEditDialog(e) {
    this.editingSchedule = e, this.showCreateDialog = !0;
  }
  closeDialog() {
    this.showCreateDialog = !1, this.editingSchedule = null;
  }
  async handleSaveSchedule(e) {
    if (!this.scheduleApi) return;
    const i = e.detail;
    console.log("[PowerSort Debug] Schedule save attempt:", {
      isEditing: !!this.editingSchedule,
      formData: i,
      parentIdFromRoute: this.parentId,
      parentNodeName: this.parentNodeName
    });
    try {
      if (this.editingSchedule) {
        const r = {
          targetPosition: i.targetPosition,
          startDateTime: i.startDateTime,
          endDateTime: i.endDateTime,
          priority: i.priority || p.DEFAULTS.PRIORITY
        };
        console.log("[PowerSort Debug] Update request:", r), await this.scheduleApi.updateSchedule(this.editingSchedule.id, r);
      } else {
        const r = {
          contentId: i.contentId,
          parentId: this.parentId,
          targetPosition: i.targetPosition,
          startDateTime: i.startDateTime,
          endDateTime: i.endDateTime,
          priority: i.priority || p.DEFAULTS.PRIORITY
        };
        console.log("[PowerSort Debug] Create request:", r), await this.scheduleApi.createSchedule(r);
      }
      this.closeDialog(), await this.loadSchedules();
    } catch (r) {
      console.error("[PowerSort Debug] Error saving schedule:", r), r instanceof Error && r.message.includes("API Error") ? this.error = `Failed to save schedule: ${r.message}` : this.error = "Failed to save schedule";
    }
  }
  async handleDeleteSchedule(e) {
    if (this.scheduleApi && v.confirmAction(p.MESSAGES.CONFIRM_DELETE))
      try {
        await this.scheduleApi.deleteSchedule(e), await this.loadSchedules();
      } catch (i) {
        v.showError(i, "Failed to delete schedule");
      }
  }
  formatDateTime(e) {
    return S.formatDateTime(e);
  }
  getStatusBadge(e) {
    if (e.isCurrentlyActive)
      return o`
        <uui-badge color="positive" look="primary">
          <uui-icon name="icon-check"></uui-icon>
          Active Now
        </uui-badge>
      `;
    const i = /* @__PURE__ */ new Date(), r = new Date(e.startDateTime), t = new Date(e.endDateTime);
    return i < r ? o`
        <uui-badge color="default" look="secondary">
          <uui-icon name="icon-time"></uui-icon>
          Scheduled
        </uui-badge>
      ` : i >= t ? o`
        <uui-badge color="default" look="outline">
          <uui-icon name="icon-delete"></uui-icon>
          Expired
        </uui-badge>
      ` : o`
      <uui-badge color="warning" look="secondary">
        <uui-icon name="icon-calendar"></uui-icon>
        Pending
      </uui-badge>
    `;
  }
  render() {
    return o`
      <div class="schedule-container">
        <div class="header">
          <h2>
            <uui-icon name="icon-calendar"></uui-icon>
            Sorting Schedules
            ${this.parentNodeName ? o` - ${this.parentNodeName}` : ""}
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

        ${this.error ? o`
              <div class="error-message">
                <uui-icon name="icon-alert"></uui-icon>
                ${this.error}
              </div>
            ` : ""}

        ${this.loading ? o`
              <div class="loading-spinner">
                <uui-loader></uui-loader>
              </div>
            ` : this.schedules.length === 0 ? o`
              <div class="empty-state">
                <uui-icon name="icon-calendar" style="font-size: 48px; opacity: 0.3;"></uui-icon>
                <p>No schedules configured yet.</p>
                <p>Create a schedule to boost content to a specific position during a time period.</p>
              </div>
            ` : o`
              <div class="schedule-list">
                ${this.schedules.map(
      (e) => o`
                    <div
                      class="schedule-card ${e.isCurrentlyActive ? "active" : ""}">
                      ${this.getStatusBadge(e)}

                      <div class="schedule-info">
                        <div class="schedule-title">${e.contentName}</div>
                        <div class="schedule-details">
                          Position: <strong>${e.targetPosition}</strong>
                          ${e.priority > 0 ? o`
                                <span class="priority-badge">
                                  <uui-icon name="icon-navigation-up"></uui-icon>
                                  Priority: ${e.priority}
                                </span>
                              ` : ""}
                        </div>
                        <div class="schedule-details">
                          Created by ${e.createdByName} on
                          ${this.formatDateTime(e.created)}
                        </div>
                      </div>

                      <div class="schedule-dates">
                        <div>
                          <uui-icon name="icon-calendar-alt"></uui-icon>
                          Start: ${this.formatDateTime(e.startDateTime)}
                        </div>
                        <div>
                          <uui-icon name="icon-calendar-alt"></uui-icon>
                          End: ${this.formatDateTime(e.endDateTime)}
                        </div>
                      </div>

                      <div class="schedule-actions">
                        <uui-button
                          look="outline"
                          label="Edit"
                          @click=${() => this.openEditDialog(e)}>
                          <uui-icon name="icon-edit"></uui-icon>
                        </uui-button>
                        <uui-button
                          look="outline"
                          color="danger"
                          label="Delete"
                          @click=${() => this.handleDeleteSchedule(e.id)}>
                          <uui-icon name="icon-trash"></uui-icon>
                        </uui-button>
                      </div>
                    </div>
                  `
    )}
              </div>
            `}
      </div>

      ${this.showCreateDialog ? o`
            <schedule-dialog
              .parentId=${this.parentId}
              .schedule=${this.editingSchedule}
              @save=${this.handleSaveSchedule}
              @cancel=${this.closeDialog}>
            </schedule-dialog>
          ` : ""}
    `;
  }
};
f.styles = b`
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
let d = f;
c([
  u({ type: String, attribute: !1, reflect: !1 })
], d.prototype, "parentId");
c([
  u({ type: String })
], d.prototype, "parentNodeName");
c([
  u({ type: Array })
], d.prototype, "schedules");
c([
  u({ type: Boolean })
], d.prototype, "loading");
c([
  u({ type: String })
], d.prototype, "error");
c([
  u({ type: Boolean })
], d.prototype, "showCreateDialog");
c([
  u({ type: Object })
], d.prototype, "editingSchedule");
customElements.define("power-sort-schedules", d);
export {
  d as default
};
//# sourceMappingURL=schedules.element-D2ZbVfvJ.js.map
