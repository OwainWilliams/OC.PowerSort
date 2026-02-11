import { LitElement as g, html as a, css as m, property as s } from "@umbraco-cms/backoffice/external/lit";
import { U as v, A as d, P as l } from "./shared.styles-BdnPOy5W.js";
import { D as f } from "./validation.utils-QQX9Ru6J.js";
import { S as y } from "./schedule-dialog.element-LyV9gH3v.js";
var b = Object.defineProperty, n = (h, e, i, t) => {
  for (var o = void 0, u = h.length - 1, p; u >= 0; u--)
    (p = h[u]) && (o = p(e, i, o) || o);
  return o && b(e, i, o), o;
};
const c = class c extends v(g) {
  constructor() {
    super(...arguments), this.parentId = "", this.parentNodeName = "", this.schedules = [], this.loading = !1, this.error = "", this.showCreateDialog = !1, this.editingSchedule = null;
  }
  async connectedCallback() {
    super.connectedCallback(), this.scheduleApi = new y(() => this.getAuthToken()), this.parentId && (await this.loadParentInfo(), await this.loadSchedules());
  }
  async updated(e) {
    super.updated(e), e.has("parentId") && this.parentId && (await this.loadParentInfo(), await this.loadSchedules());
  }
  async loadParentInfo() {
    if (this.parentId)
      try {
        const e = await this.makeAuthenticatedRequest(
          `/umbraco/management/api/v1/document/${this.parentId}`
        ), i = await d.handleResponse(e);
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
        const t = {
          targetPosition: i.targetPosition,
          startDateTime: i.startDateTime,
          endDateTime: i.endDateTime,
          priority: i.priority || l.DEFAULTS.PRIORITY
        };
        console.log("[PowerSort Debug] Update request:", t), await this.scheduleApi.updateSchedule(this.editingSchedule.id, t);
      } else {
        const t = {
          contentId: i.contentId,
          parentId: this.parentId,
          targetPosition: i.targetPosition,
          startDateTime: i.startDateTime,
          endDateTime: i.endDateTime,
          priority: i.priority || l.DEFAULTS.PRIORITY
        };
        console.log("[PowerSort Debug] Create request:", t), await this.scheduleApi.createSchedule(t);
      }
      this.closeDialog(), await this.loadSchedules();
    } catch (t) {
      console.error("[PowerSort Debug] Error saving schedule:", t), t instanceof Error && t.message.includes("API Error") ? this.error = `Failed to save schedule: ${t.message}` : this.error = "Failed to save schedule";
    }
  }
  async handleDeleteSchedule(e) {
    if (this.scheduleApi && d.confirmAction(l.MESSAGES.CONFIRM_DELETE))
      try {
        await this.scheduleApi.deleteSchedule(e), await this.loadSchedules();
      } catch (i) {
        d.showError(i, "Failed to delete schedule");
      }
  }
  formatDateTime(e) {
    return f.formatDateTime(e);
  }
  getStatusBadge(e) {
    if (e.isCurrentlyActive)
      return a`
        <uui-badge color="positive" look="primary">
          <uui-icon name="icon-check"></uui-icon>
          Active Now
        </uui-badge>
      `;
    const i = /* @__PURE__ */ new Date(), t = new Date(e.startDateTime), o = new Date(e.endDateTime);
    return i < t ? a`
        <uui-badge color="default" look="secondary">
          <uui-icon name="icon-time"></uui-icon>
          Scheduled
        </uui-badge>
      ` : i >= o ? a`
        <uui-badge color="default" look="outline">
          <uui-icon name="icon-delete"></uui-icon>
          Expired
        </uui-badge>
      ` : a`
      <uui-badge color="warning" look="secondary">
        <uui-icon name="icon-calendar"></uui-icon>
        Pending
      </uui-badge>
    `;
  }
  render() {
    return a`
      <div class="schedule-container">
        <div class="header">
          <h2>
            <uui-icon name="icon-calendar"></uui-icon>
            Sorting Schedules
            ${this.parentNodeName ? a` - ${this.parentNodeName}` : ""}
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

        ${this.error ? a`
              <div class="error-message">
                <uui-icon name="icon-alert"></uui-icon>
                ${this.error}
              </div>
            ` : ""}

        ${this.loading ? a`
              <div class="loading-spinner">
                <uui-loader></uui-loader>
              </div>
            ` : this.schedules.length === 0 ? a`
              <div class="empty-state">
                <uui-icon name="icon-calendar" style="font-size: 48px; opacity: 0.3;"></uui-icon>
                <p>No schedules configured yet.</p>
                <p>Create a schedule to boost content to a specific position during a time period.</p>
              </div>
            ` : a`
              <div class="schedule-list">
                ${this.schedules.map(
      (e) => a`
                    <div
                      class="schedule-card ${e.isCurrentlyActive ? "active" : ""}">
                      ${this.getStatusBadge(e)}

                      <div class="schedule-info">
                        <div class="schedule-title">${e.contentName}</div>
                        <div class="schedule-details">
                          Position: <strong>${e.targetPosition}</strong>
                          ${e.priority > 0 ? a`
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

      ${this.showCreateDialog ? a`
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
c.styles = m`
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
let r = c;
n([
  s({ type: String, attribute: !1, reflect: !1 })
], r.prototype, "parentId");
n([
  s({ type: String })
], r.prototype, "parentNodeName");
n([
  s({ type: Array })
], r.prototype, "schedules");
n([
  s({ type: Boolean })
], r.prototype, "loading");
n([
  s({ type: String })
], r.prototype, "error");
n([
  s({ type: Boolean })
], r.prototype, "showCreateDialog");
n([
  s({ type: Object })
], r.prototype, "editingSchedule");
customElements.define("power-sort-schedules", r);
export {
  r as default
};
//# sourceMappingURL=schedules.element-RJGlesr0.js.map
