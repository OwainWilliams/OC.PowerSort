import { LitElement as f, css as y, html as o, property as s } from "@umbraco-cms/backoffice/external/lit";
import { U as b, A as p, P as m } from "./api-response.utils-UvM8kS4m.js";
import { V as D, D as S } from "./validation.utils-BWAQMB43.js";
import { S as T } from "./schedule-api.client-DzFC1bFz.js";
var w = Object.defineProperty, d = (l, e, t, i) => {
  for (var a = void 0, u = l.length - 1, h; u >= 0; u--)
    (h = l[u]) && (a = h(e, t, a) || a);
  return a && w(e, t, a), a;
};
const g = class g extends b(f) {
  constructor() {
    super(...arguments), this.parentId = "", this.schedule = null, this.selectedContentId = "", this.selectedContentName = "", this.targetPosition = 0, this.startDateTime = "", this.endDateTime = "", this.priority = 0, this.error = "";
  }
  async connectedCallback() {
    if (super.connectedCallback(), this.schedule)
      this.selectedContentId = this.schedule.contentId, this.selectedContentName = this.schedule.contentName, this.targetPosition = this.schedule.targetPosition, this.startDateTime = this.toLocalDateTimeString(this.schedule.startDateTime), this.endDateTime = this.toLocalDateTimeString(this.schedule.endDateTime), this.priority = this.schedule.priority;
    else {
      const e = /* @__PURE__ */ new Date(), t = new Date(e);
      t.setDate(t.getDate() + 1), this.startDateTime = this.toLocalDateTimeString(e.toISOString()), this.endDateTime = this.toLocalDateTimeString(t.toISOString()), this.targetPosition = 0, this.priority = 0;
    }
  }
  toLocalDateTimeString(e) {
    const t = new Date(e), i = t.getTimezoneOffset();
    return new Date(t.getTime() - i * 60 * 1e3).toISOString().slice(0, 16);
  }
  toISOString(e) {
    return new Date(e).toISOString();
  }
  async handleContentSelected(e) {
    const t = e.target;
    let i = t.selection || t.value;
    if (i && Array.isArray(i) && i.length > 0) {
      const a = typeof i[0] == "string" ? i[0] : i[0].unique || i[0].id;
      this.selectedContentId = a, this.selectedContentName = i[0].name || i[0].variants?.[0]?.name || "Selected Content", console.log("[PowerSort Debug] Content selected:", {
        contentId: this.selectedContentId,
        contentName: this.selectedContentName,
        expectedParentId: this.parentId,
        selection: i[0]
      });
    }
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
    const e = new Date(this.startDateTime), t = new Date(this.endDateTime);
    if (e >= t) {
      this.error = "End date must be after start date";
      return;
    }
    console.log("[PowerSort Debug] Saving schedule with parent ID:", this.parentId), this.dispatchEvent(
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
          ${this.schedule ? o`
                <div class="selected-content">
                  <strong>${this.selectedContentName}</strong>
                  <div class="description">Cannot change content when editing</div>
                </div>
              ` : o`
                <umb-input-document
                  @change=${this.handleContentSelected}
                  max="1"
                  min="0"
                  .filter=${`parent:${this.parentId}`}>
                </umb-input-document>
                ${this.selectedContentName ? o`
                      <div class="selected-content">
                        <uui-icon name="icon-check"></uui-icon>
                        Selected: <strong>${this.selectedContentName}</strong>
                      </div>
                    ` : ""}
                <div class="description">Select the content item to boost</div>
              `}
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
            Priority (Optional)
          </label>
          <uui-input
            type="number"
            .value=${this.priority.toString()}
            @change=${(e) => this.priority = parseInt(e.target.value) || 0}
            min="0">
          </uui-input>
          <div class="description">
            Higher priority schedules take precedence (default: 0)
          </div>
        </div>

        <div class="dialog-actions">
          <uui-button look="outline" label="Cancel" @click=${this.handleCancel}>
            Cancel
          </uui-button>
          <uui-button
            look="primary"
            color="positive"
            label="Save"
            @click=${this.handleSave}>
            <uui-icon name="icon-check"></uui-icon>
            ${this.schedule ? "Update" : "Create"} Schedule
          </uui-button>
        </div>
      </div>
    `;
  }
};
g.styles = y`
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
      max-width: 600px;
      width: 90%;
      max-height: 80vh;
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
    .form-field uui-input {
      width: 100%;
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
    }
  `;
let r = g;
d([
  s({ type: String })
], r.prototype, "parentId");
d([
  s({ type: Object })
], r.prototype, "schedule");
d([
  s({ type: String })
], r.prototype, "selectedContentId");
d([
  s({ type: String })
], r.prototype, "selectedContentName");
d([
  s({ type: Number })
], r.prototype, "targetPosition");
d([
  s({ type: String })
], r.prototype, "startDateTime");
d([
  s({ type: String })
], r.prototype, "endDateTime");
d([
  s({ type: Number })
], r.prototype, "priority");
d([
  s({ type: String })
], r.prototype, "error");
customElements.define("schedule-dialog", r);
var C = Object.defineProperty, c = (l, e, t, i) => {
  for (var a = void 0, u = l.length - 1, h; u >= 0; u--)
    (h = l[u]) && (a = h(e, t, a) || a);
  return a && C(e, t, a), a;
};
const v = class v extends b(f) {
  constructor() {
    super(...arguments), this.parentId = "", this.parentNodeName = "", this.schedules = [], this.loading = !1, this.error = "", this.showCreateDialog = !1, this.editingSchedule = null;
  }
  async connectedCallback() {
    super.connectedCallback(), this.parentId = D.extractGuidFromPath() || "", this.scheduleApi = new T(() => this.getAuthToken()), this.parentId && (await this.loadParentInfo(), await this.loadSchedules());
  }
  async loadParentInfo() {
    if (this.parentId)
      try {
        const e = await this.makeAuthenticatedRequest(
          `/umbraco/management/api/v1/document/${this.parentId}`
        ), t = await p.handleResponse(e);
        this.parentNodeName = t.variants?.[0]?.name || "Unknown Node";
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
    const t = e.detail;
    console.log("[PowerSort Debug] Schedule save attempt:", {
      isEditing: !!this.editingSchedule,
      formData: t,
      parentIdFromRoute: this.parentId,
      parentNodeName: this.parentNodeName
    });
    try {
      if (this.editingSchedule) {
        const i = {
          targetPosition: t.targetPosition,
          startDateTime: t.startDateTime,
          endDateTime: t.endDateTime,
          priority: t.priority || m.DEFAULTS.PRIORITY
        };
        console.log("[PowerSort Debug] Update request:", i), await this.scheduleApi.updateSchedule(this.editingSchedule.id, i);
      } else {
        const i = {
          contentId: t.contentId,
          parentId: this.parentId,
          targetPosition: t.targetPosition,
          startDateTime: t.startDateTime,
          endDateTime: t.endDateTime,
          priority: t.priority || m.DEFAULTS.PRIORITY
        };
        console.log("[PowerSort Debug] Create request:", i), await this.scheduleApi.createSchedule(i);
      }
      this.closeDialog(), await this.loadSchedules();
    } catch (i) {
      console.error("[PowerSort Debug] Error saving schedule:", i), i instanceof Error && i.message.includes("API Error") ? this.error = `Failed to save schedule: ${i.message}` : this.error = "Failed to save schedule";
    }
  }
  async handleDeleteSchedule(e) {
    if (this.scheduleApi && p.confirmAction(m.MESSAGES.CONFIRM_DELETE))
      try {
        await this.scheduleApi.deleteSchedule(e), await this.loadSchedules();
      } catch (t) {
        p.showError(t, "Failed to delete schedule");
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
    const t = /* @__PURE__ */ new Date(), i = new Date(e.startDateTime), a = new Date(e.endDateTime);
    return t < i ? o`
        <uui-badge color="default" look="secondary">
          <uui-icon name="icon-time"></uui-icon>
          Scheduled
        </uui-badge>
      ` : t >= a ? o`
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
v.styles = y`
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
let n = v;
c([
  s({ type: String, attribute: !1, reflect: !1 })
], n.prototype, "parentId");
c([
  s({ type: String })
], n.prototype, "parentNodeName");
c([
  s({ type: Array })
], n.prototype, "schedules");
c([
  s({ type: Boolean })
], n.prototype, "loading");
c([
  s({ type: String })
], n.prototype, "error");
c([
  s({ type: Boolean })
], n.prototype, "showCreateDialog");
c([
  s({ type: Object })
], n.prototype, "editingSchedule");
customElements.define("power-sort-schedules", n);
export {
  n as default
};
//# sourceMappingURL=schedules.element-BMNdcyWy.js.map
