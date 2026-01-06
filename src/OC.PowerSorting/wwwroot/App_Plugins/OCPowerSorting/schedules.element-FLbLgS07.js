var f = (o) => {
  throw TypeError(o);
};
var y = (o, e, t) => e.has(o) || f("Cannot " + t);
var b = (o, e, t) => (y(o, e, "read from private field"), t ? t.call(o) : e.get(o)), D = (o, e, t) => e.has(o) ? f("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(o) : e.set(o, t), S = (o, e, t, i) => (y(o, e, "write to private field"), i ? i.call(o, t) : e.set(o, t), t);
import { LitElement as w, css as k, html as r, property as s } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as C } from "@umbraco-cms/backoffice/element-api";
import { UMB_AUTH_CONTEXT as T } from "@umbraco-cms/backoffice/auth";
import { S as $ } from "./schedule-api.client-CYpzemIY.js";
import { UmbDocumentItemRepository as z } from "@umbraco-cms/backoffice/document";
var x = Object.defineProperty, l = (o, e, t, i) => {
  for (var a = void 0, d = o.length - 1, u; d >= 0; d--)
    (u = o[d]) && (a = u(e, t, a) || a);
  return a && x(e, t, a), a;
}, p;
const m = class m extends C(w) {
  constructor() {
    super(...arguments);
    D(this, p);
    this.parentId = "", this.schedule = null, this.selectedContentId = "", this.selectedContentName = "", this.targetPosition = 0, this.startDateTime = "", this.endDateTime = "", this.priority = 0, this.error = "", S(this, p, new z(this));
  }
  connectedCallback() {
    if (super.connectedCallback(), this.schedule)
      this.selectedContentId = this.schedule.contentId, this.selectedContentName = this.schedule.contentName, this.targetPosition = this.schedule.targetPosition, this.startDateTime = this.toLocalDateTimeString(this.schedule.startDateTime), this.endDateTime = this.toLocalDateTimeString(this.schedule.endDateTime), this.priority = this.schedule.priority;
    else {
      const t = /* @__PURE__ */ new Date(), i = new Date(t);
      i.setDate(i.getDate() + 1), this.startDateTime = this.toLocalDateTimeString(t.toISOString()), this.endDateTime = this.toLocalDateTimeString(i.toISOString()), this.targetPosition = 0, this.priority = 0;
    }
  }
  toLocalDateTimeString(t) {
    const i = new Date(t), a = i.getTimezoneOffset();
    return new Date(i.getTime() - a * 60 * 1e3).toISOString().slice(0, 16);
  }
  toISOString(t) {
    return new Date(t).toISOString();
  }
  async handleContentSelected(t) {
    const i = t.target;
    let a = i.selection || i.value;
    if (a && Array.isArray(a) && a.length > 0) {
      const d = typeof a[0] == "string" ? a[0] : a[0].unique || a[0].id;
      try {
        const { data: u } = await b(this, p).requestItems([d]);
        if (u && u.length > 0) {
          const v = u[0];
          this.selectedContentId = v.unique, this.selectedContentName = v.variants?.[0]?.name || "Unnamed Node";
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
    const t = new Date(this.startDateTime), i = new Date(this.endDateTime);
    if (t >= i) {
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
    return r`
      <div class="dialog" @click=${(t) => t.stopPropagation()}>
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

        ${this.error ? r`
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
          ${this.schedule ? r`
                <div class="selected-content">
                  <strong>${this.selectedContentName}</strong>
                  <div class="description">Cannot change content when editing</div>
                </div>
              ` : r`
                <umb-input-document
                  @change=${this.handleContentSelected}
                  max="1"
                  min="0">
                </umb-input-document>
                ${this.selectedContentName ? r`
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
            @change=${(t) => this.targetPosition = parseInt(t.target.value) || 0}
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
              @change=${(t) => this.startDateTime = t.target.value} />
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
              @change=${(t) => this.endDateTime = t.target.value} />
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
            @change=${(t) => this.priority = parseInt(t.target.value) || 0}
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
p = new WeakMap(), m.styles = k`
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
let n = m;
l([
  s({ type: String })
], n.prototype, "parentId");
l([
  s({ type: Object })
], n.prototype, "schedule");
l([
  s({ type: String })
], n.prototype, "selectedContentId");
l([
  s({ type: String })
], n.prototype, "selectedContentName");
l([
  s({ type: Number })
], n.prototype, "targetPosition");
l([
  s({ type: String })
], n.prototype, "startDateTime");
l([
  s({ type: String })
], n.prototype, "endDateTime");
l([
  s({ type: Number })
], n.prototype, "priority");
l([
  s({ type: String })
], n.prototype, "error");
customElements.define("schedule-dialog", n);
var I = Object.defineProperty, h = (o, e, t, i) => {
  for (var a = void 0, d = o.length - 1, u; d >= 0; d--)
    (u = o[d]) && (a = u(e, t, a) || a);
  return a && I(e, t, a), a;
};
const g = class g extends C(w) {
  constructor() {
    super(...arguments), this.parentId = "", this.parentNodeName = "", this.schedules = [], this.loading = !1, this.error = "", this.authToken = "", this.showCreateDialog = !1, this.editingSchedule = null;
  }
  async connectedCallback() {
    super.connectedCallback();
    const t = window.location.pathname.split("/").filter(Boolean), i = t[t.length - 1];
    this.isGuid(i) && (this.parentId = i), await this.setupAuthContext(), this.scheduleApi = new $(() => this.getAuthToken()), this.parentId && (await this.loadParentInfo(), await this.loadSchedules());
  }
  isGuid(e) {
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(e);
  }
  async loadParentInfo() {
    if (this.parentId)
      try {
        const e = await this.makeAuthenticatedRequest(
          `/umbraco/management/api/v1/document/${this.parentId}`
        );
        if (e.ok) {
          const t = await e.json();
          this.parentNodeName = t.variants?.[0]?.name || "Unknown Node";
        }
      } catch (e) {
        console.error("Error loading parent info:", e);
      }
  }
  async makeAuthenticatedRequest(e, t = {}) {
    const i = await this.getAuthToken(), a = new Headers(t.headers);
    return a.set("Content-Type", "application/json"), i && a.set("Authorization", `Bearer ${i}`), fetch(e, { ...t, headers: a });
  }
  async setupAuthContext() {
    return new Promise((e) => {
      this.consumeContext(T, async (t) => {
        try {
          const i = t?.getOpenApiConfiguration?.();
          i?.token && (this.authToken = await i.token()), e();
        } catch (i) {
          console.error("Failed to setup auth context:", i), e();
        }
      }).asPromise({ preventTimeout: !0 }).catch(() => e());
    });
  }
  async getAuthToken() {
    if (this.authToken)
      return this.authToken;
    try {
      const e = await this.getContext(T);
      if (e) {
        const t = e.getOpenApiConfiguration?.();
        if (t?.token) {
          const i = await t.token();
          if (i)
            return this.authToken = i, i;
        }
      }
    } catch (e) {
      console.error("Failed to get auth token:", e);
    }
    return "";
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
    try {
      if (this.editingSchedule) {
        const i = {
          targetPosition: t.targetPosition,
          startDateTime: t.startDateTime,
          endDateTime: t.endDateTime,
          priority: t.priority || 0
        };
        await this.scheduleApi.updateSchedule(this.editingSchedule.id, i);
      } else {
        const i = {
          contentId: t.contentId,
          parentId: this.parentId,
          targetPosition: t.targetPosition,
          startDateTime: t.startDateTime,
          endDateTime: t.endDateTime,
          priority: t.priority || 0
        };
        await this.scheduleApi.createSchedule(i);
      }
      this.closeDialog(), await this.loadSchedules();
    } catch (i) {
      console.error("Error saving schedule:", i), this.error = "Failed to save schedule";
    }
  }
  async handleDeleteSchedule(e) {
    if (this.scheduleApi && confirm("Are you sure you want to delete this schedule?"))
      try {
        await this.scheduleApi.deleteSchedule(e), await this.loadSchedules();
      } catch (t) {
        console.error("Error deleting schedule:", t), this.error = "Failed to delete schedule";
      }
  }
  formatDateTime(e) {
    return new Date(e).toLocaleString();
  }
  getStatusBadge(e) {
    if (e.isCurrentlyActive)
      return r`
        <uui-badge color="positive" look="primary">
          <uui-icon name="icon-check"></uui-icon>
          Active Now
        </uui-badge>
      `;
    const t = /* @__PURE__ */ new Date(), i = new Date(e.startDateTime), a = new Date(e.endDateTime);
    return t < i ? r`
        <uui-badge color="default" look="secondary">
          <uui-icon name="icon-time"></uui-icon>
          Scheduled
        </uui-badge>
      ` : t >= a ? r`
        <uui-badge color="default" look="outline">
          <uui-icon name="icon-delete"></uui-icon>
          Expired
        </uui-badge>
      ` : r`
      <uui-badge color="warning" look="secondary">
        <uui-icon name="icon-calendar"></uui-icon>
        Pending
      </uui-badge>
    `;
  }
  render() {
    return r`
      <div class="schedule-container">
        <div class="header">
          <h2>
            <uui-icon name="icon-calendar"></uui-icon>
            Sorting Schedules
            ${this.parentNodeName ? r` - ${this.parentNodeName}` : ""}
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

        ${this.error ? r`
              <div class="error-message">
                <uui-icon name="icon-alert"></uui-icon>
                ${this.error}
              </div>
            ` : ""}

        ${this.loading ? r`
              <div class="loading-spinner">
                <uui-loader></uui-loader>
              </div>
            ` : this.schedules.length === 0 ? r`
              <div class="empty-state">
                <uui-icon name="icon-calendar" style="font-size: 48px; opacity: 0.3;"></uui-icon>
                <p>No schedules configured yet.</p>
                <p>Create a schedule to boost content to a specific position during a time period.</p>
              </div>
            ` : r`
              <div class="schedule-list">
                ${this.schedules.map(
      (e) => r`
                    <div
                      class="schedule-card ${e.isCurrentlyActive ? "active" : ""}">
                      ${this.getStatusBadge(e)}

                      <div class="schedule-info">
                        <div class="schedule-title">${e.contentName}</div>
                        <div class="schedule-details">
                          Position: <strong>${e.targetPosition}</strong>
                          ${e.priority > 0 ? r`
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

      ${this.showCreateDialog ? r`
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
g.styles = k`
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
let c = g;
h([
  s({ type: String, attribute: !1, reflect: !1 })
], c.prototype, "parentId");
h([
  s({ type: String })
], c.prototype, "parentNodeName");
h([
  s({ type: Array })
], c.prototype, "schedules");
h([
  s({ type: Boolean })
], c.prototype, "loading");
h([
  s({ type: String })
], c.prototype, "error");
h([
  s({ type: String })
], c.prototype, "authToken");
h([
  s({ type: Boolean })
], c.prototype, "showCreateDialog");
h([
  s({ type: Object })
], c.prototype, "editingSchedule");
customElements.define("power-sort-schedules", c);
export {
  c as default
};
//# sourceMappingURL=schedules.element-FLbLgS07.js.map
