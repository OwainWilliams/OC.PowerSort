var b = (o) => {
  throw TypeError(o);
};
var D = (o, t, e) => t.has(o) || b("Cannot " + e);
var S = (o, t, e) => (D(o, t, "read from private field"), e ? e.call(o) : t.get(o)), T = (o, t, e) => t.has(o) ? b("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(o) : t.set(o, e), w = (o, t, e, a) => (D(o, t, "write to private field"), a ? a.call(o, e) : t.set(o, e), e);
import { LitElement as C, css as $, html as s, property as r } from "@umbraco-cms/backoffice/external/lit";
import { U as z, A as m, P as g } from "./api-response.utils-pb7E4RWv.js";
import { V as I, D as k } from "./validation.utils-BWAQMB43.js";
import { S as x } from "./schedule-api.client-CYpzemIY.js";
import { UmbElementMixin as P } from "@umbraco-cms/backoffice/element-api";
import { UmbDocumentItemRepository as N } from "@umbraco-cms/backoffice/document";
var E = Object.defineProperty, l = (o, t, e, a) => {
  for (var i = void 0, d = o.length - 1, u; d >= 0; d--)
    (u = o[d]) && (i = u(t, e, i) || i);
  return i && E(t, e, i), i;
}, p;
const v = class v extends P(C) {
  constructor() {
    super(...arguments);
    T(this, p);
    this.parentId = "", this.schedule = null, this.selectedContentId = "", this.selectedContentName = "", this.targetPosition = 0, this.startDateTime = "", this.endDateTime = "", this.priority = 0, this.error = "", w(this, p, new N(this));
  }
  connectedCallback() {
    if (super.connectedCallback(), this.schedule)
      this.selectedContentId = this.schedule.contentId, this.selectedContentName = this.schedule.contentName, this.targetPosition = this.schedule.targetPosition, this.startDateTime = this.toLocalDateTimeString(this.schedule.startDateTime), this.endDateTime = this.toLocalDateTimeString(this.schedule.endDateTime), this.priority = this.schedule.priority;
    else {
      const e = /* @__PURE__ */ new Date(), a = new Date(e);
      a.setDate(a.getDate() + 1), this.startDateTime = this.toLocalDateTimeString(e.toISOString()), this.endDateTime = this.toLocalDateTimeString(a.toISOString()), this.targetPosition = 0, this.priority = 0;
    }
  }
  toLocalDateTimeString(e) {
    const a = new Date(e), i = a.getTimezoneOffset();
    return new Date(a.getTime() - i * 60 * 1e3).toISOString().slice(0, 16);
  }
  toISOString(e) {
    return new Date(e).toISOString();
  }
  async handleContentSelected(e) {
    const a = e.target;
    let i = a.selection || a.value;
    if (i && Array.isArray(i) && i.length > 0) {
      const d = typeof i[0] == "string" ? i[0] : i[0].unique || i[0].id;
      try {
        const { data: u } = await S(this, p).requestItems([d]);
        if (u && u.length > 0) {
          const y = u[0];
          this.selectedContentId = y.unique, this.selectedContentName = y.variants?.[0]?.name || "Unnamed Node";
        }
      } catch (u) {
        console.error("Error fetching node details:", u), this.error = "Error loading content details";
      }
    }
  }
  handleSave() {
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
    const e = new Date(this.startDateTime), a = new Date(this.endDateTime);
    if (e >= a) {
      this.error = "End date must be after start date";
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
  render() {
    return s`
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

        ${this.error ? s`
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
          ${this.schedule ? s`
                <div class="selected-content">
                  <strong>${this.selectedContentName}</strong>
                  <div class="description">Cannot change content when editing</div>
                </div>
              ` : s`
                <umb-input-document
                  @change=${this.handleContentSelected}
                  max="1"
                  min="0">
                </umb-input-document>
                ${this.selectedContentName ? s`
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
p = new WeakMap(), v.styles = $`
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
let n = v;
l([
  r({ type: String })
], n.prototype, "parentId");
l([
  r({ type: Object })
], n.prototype, "schedule");
l([
  r({ type: String })
], n.prototype, "selectedContentId");
l([
  r({ type: String })
], n.prototype, "selectedContentName");
l([
  r({ type: Number })
], n.prototype, "targetPosition");
l([
  r({ type: String })
], n.prototype, "startDateTime");
l([
  r({ type: String })
], n.prototype, "endDateTime");
l([
  r({ type: Number })
], n.prototype, "priority");
l([
  r({ type: String })
], n.prototype, "error");
customElements.define("schedule-dialog", n);
var A = Object.defineProperty, h = (o, t, e, a) => {
  for (var i = void 0, d = o.length - 1, u; d >= 0; d--)
    (u = o[d]) && (i = u(t, e, i) || i);
  return i && A(t, e, i), i;
};
const f = class f extends z(C) {
  constructor() {
    super(...arguments), this.parentId = "", this.parentNodeName = "", this.schedules = [], this.loading = !1, this.error = "", this.showCreateDialog = !1, this.editingSchedule = null;
  }
  async connectedCallback() {
    super.connectedCallback(), this.parentId = I.extractGuidFromPath() || "", this.scheduleApi = new x(() => this.getAuthToken()), this.parentId && (await this.loadParentInfo(), await this.loadSchedules());
  }
  async loadParentInfo() {
    if (this.parentId)
      try {
        const t = await this.makeAuthenticatedRequest(
          `/umbraco/management/api/v1/document/${this.parentId}`
        ), e = await m.handleResponse(t);
        this.parentNodeName = e.variants?.[0]?.name || "Unknown Node";
      } catch (t) {
        console.error("Error loading parent info:", t);
      }
  }
  async loadSchedules() {
    if (!(!this.scheduleApi || !this.parentId)) {
      this.loading = !0, this.error = "";
      try {
        const t = await this.scheduleApi.getSchedules(this.parentId);
        this.schedules = t.items;
      } catch (t) {
        console.error("Error loading schedules:", t), this.error = "Failed to load schedules";
      } finally {
        this.loading = !1;
      }
    }
  }
  openCreateDialog() {
    this.showCreateDialog = !0, this.editingSchedule = null;
  }
  openEditDialog(t) {
    this.editingSchedule = t, this.showCreateDialog = !0;
  }
  closeDialog() {
    this.showCreateDialog = !1, this.editingSchedule = null;
  }
  async handleSaveSchedule(t) {
    if (!this.scheduleApi) return;
    const e = t.detail;
    try {
      if (this.editingSchedule) {
        const a = {
          targetPosition: e.targetPosition,
          startDateTime: e.startDateTime,
          endDateTime: e.endDateTime,
          priority: e.priority || g.DEFAULTS.PRIORITY
        };
        await this.scheduleApi.updateSchedule(this.editingSchedule.id, a);
      } else {
        const a = {
          contentId: e.contentId,
          parentId: this.parentId,
          targetPosition: e.targetPosition,
          startDateTime: e.startDateTime,
          endDateTime: e.endDateTime,
          priority: e.priority || g.DEFAULTS.PRIORITY
        };
        await this.scheduleApi.createSchedule(a);
      }
      this.closeDialog(), await this.loadSchedules();
    } catch (a) {
      console.error("Error saving schedule:", a), this.error = "Failed to save schedule";
    }
  }
  async handleDeleteSchedule(t) {
    if (this.scheduleApi && m.confirmAction(g.MESSAGES.CONFIRM_DELETE))
      try {
        await this.scheduleApi.deleteSchedule(t), await this.loadSchedules();
      } catch (e) {
        m.showError(e, "Failed to delete schedule");
      }
  }
  formatDateTime(t) {
    return k.formatDateTime(t);
  }
  getStatusBadge(t) {
    if (t.isCurrentlyActive)
      return s`
        <uui-badge color="positive" look="primary">
          <uui-icon name="icon-check"></uui-icon>
          Active Now
        </uui-badge>
      `;
    const e = /* @__PURE__ */ new Date(), a = new Date(t.startDateTime), i = new Date(t.endDateTime);
    return e < a ? s`
        <uui-badge color="default" look="secondary">
          <uui-icon name="icon-time"></uui-icon>
          Scheduled
        </uui-badge>
      ` : e >= i ? s`
        <uui-badge color="default" look="outline">
          <uui-icon name="icon-delete"></uui-icon>
          Expired
        </uui-badge>
      ` : s`
      <uui-badge color="warning" look="secondary">
        <uui-icon name="icon-calendar"></uui-icon>
        Pending
      </uui-badge>
    `;
  }
  render() {
    return s`
      <div class="schedule-container">
        <div class="header">
          <h2>
            <uui-icon name="icon-calendar"></uui-icon>
            Sorting Schedules
            ${this.parentNodeName ? s` - ${this.parentNodeName}` : ""}
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

        ${this.error ? s`
              <div class="error-message">
                <uui-icon name="icon-alert"></uui-icon>
                ${this.error}
              </div>
            ` : ""}

        ${this.loading ? s`
              <div class="loading-spinner">
                <uui-loader></uui-loader>
              </div>
            ` : this.schedules.length === 0 ? s`
              <div class="empty-state">
                <uui-icon name="icon-calendar" style="font-size: 48px; opacity: 0.3;"></uui-icon>
                <p>No schedules configured yet.</p>
                <p>Create a schedule to boost content to a specific position during a time period.</p>
              </div>
            ` : s`
              <div class="schedule-list">
                ${this.schedules.map(
      (t) => s`
                    <div
                      class="schedule-card ${t.isCurrentlyActive ? "active" : ""}">
                      ${this.getStatusBadge(t)}

                      <div class="schedule-info">
                        <div class="schedule-title">${t.contentName}</div>
                        <div class="schedule-details">
                          Position: <strong>${t.targetPosition}</strong>
                          ${t.priority > 0 ? s`
                                <span class="priority-badge">
                                  <uui-icon name="icon-navigation-up"></uui-icon>
                                  Priority: ${t.priority}
                                </span>
                              ` : ""}
                        </div>
                        <div class="schedule-details">
                          Created by ${t.createdByName} on
                          ${this.formatDateTime(t.created)}
                        </div>
                      </div>

                      <div class="schedule-dates">
                        <div>
                          <uui-icon name="icon-calendar-alt"></uui-icon>
                          Start: ${this.formatDateTime(t.startDateTime)}
                        </div>
                        <div>
                          <uui-icon name="icon-calendar-alt"></uui-icon>
                          End: ${this.formatDateTime(t.endDateTime)}
                        </div>
                      </div>

                      <div class="schedule-actions">
                        <uui-button
                          look="outline"
                          label="Edit"
                          @click=${() => this.openEditDialog(t)}>
                          <uui-icon name="icon-edit"></uui-icon>
                        </uui-button>
                        <uui-button
                          look="outline"
                          color="danger"
                          label="Delete"
                          @click=${() => this.handleDeleteSchedule(t.id)}>
                          <uui-icon name="icon-trash"></uui-icon>
                        </uui-button>
                      </div>
                    </div>
                  `
    )}
              </div>
            `}
      </div>

      ${this.showCreateDialog ? s`
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
f.styles = $`
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
let c = f;
h([
  r({ type: String, attribute: !1, reflect: !1 })
], c.prototype, "parentId");
h([
  r({ type: String })
], c.prototype, "parentNodeName");
h([
  r({ type: Array })
], c.prototype, "schedules");
h([
  r({ type: Boolean })
], c.prototype, "loading");
h([
  r({ type: String })
], c.prototype, "error");
h([
  r({ type: Boolean })
], c.prototype, "showCreateDialog");
h([
  r({ type: Object })
], c.prototype, "editingSchedule");
customElements.define("power-sort-schedules", c);
export {
  c as default
};
//# sourceMappingURL=schedules.element-BUjuXvxq.js.map
