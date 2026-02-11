import { P as o, A as u, U as g } from "./shared.styles-BdnPOy5W.js";
import { LitElement as m, css as y, html as l, property as c, state as n } from "@umbraco-cms/backoffice/external/lit";
import { U as b } from "./ui.mixin-C1ziC5Yq.js";
class z {
  constructor(e) {
    this.getAuthToken = e;
  }
  async makeRequest(e, i = {}) {
    const s = await this.getAuthToken(), r = new Headers(i.headers);
    return r.set("Content-Type", "application/json"), s && r.set("Authorization", `Bearer ${s}`), fetch(e, {
      ...i,
      headers: r
    });
  }
  async getSchedules(e) {
    const i = e ? `${o.API_BASE}${o.ENDPOINTS.SCHEDULES}?parentId=${e}` : `${o.API_BASE}${o.ENDPOINTS.SCHEDULES}`, s = await this.makeRequest(i);
    return u.handleResponse(s);
  }
  async getSchedule(e) {
    const i = await this.makeRequest(
      `${o.API_BASE}${o.ENDPOINTS.SCHEDULES}/${e}`
    );
    return u.handleResponse(i);
  }
  async createSchedule(e) {
    const i = await this.makeRequest(
      `${o.API_BASE}${o.ENDPOINTS.SCHEDULES}`,
      {
        method: "POST",
        body: JSON.stringify(e)
      }
    );
    return u.handleResponse(i);
  }
  async updateSchedule(e, i) {
    const s = await this.makeRequest(
      `${o.API_BASE}${o.ENDPOINTS.SCHEDULES}/${e}`,
      {
        method: "PUT",
        body: JSON.stringify(i)
      }
    );
    return u.handleResponse(s);
  }
  async deleteSchedule(e) {
    const i = await this.makeRequest(
      `${o.API_BASE}${o.ENDPOINTS.SCHEDULES}/${e}`,
      { method: "DELETE" }
    );
    await u.handleResponse(i);
  }
  async getActiveSchedules(e) {
    const i = await this.makeRequest(
      `${o.API_BASE}${o.ENDPOINTS.SCHEDULES_ACTIVE}/${e}`
    );
    return u.handleResponse(i);
  }
}
var f = Object.defineProperty, a = (p, e, i, s) => {
  for (var r = void 0, d = p.length - 1, v; d >= 0; d--)
    (v = p[d]) && (r = v(e, i, r) || r);
  return r && f(e, i, r), r;
};
const h = class h extends b(
  g(m)
) {
  constructor() {
    super(...arguments), this.parentId = "", this.schedule = null, this.contentId = "", this.contentName = "", this.selectedContentId = "", this.selectedContentName = "", this.targetPosition = 0, this.startDateTime = "", this.endDateTime = "", this.priority = 0, this.priorityOptions = [], this.loadingPriorities = !0, this.noPriorityOptionsFound = !1, this.error = "";
  }
  async connectedCallback() {
    if (super.connectedCallback(), console.log("[Schedule Dialog] Connected with parentId:", this.parentId), await Promise.all([this.loadPriorityOptions()]), this.schedule)
      this.selectedContentId = this.schedule.contentId, this.selectedContentName = this.schedule.contentName, this.targetPosition = this.schedule.targetPosition, this.startDateTime = this.toLocalDateTimeString(
        this.schedule.startDateTime
      ), this.endDateTime = this.toLocalDateTimeString(this.schedule.endDateTime), this.priority = this.schedule.priority;
    else {
      const e = /* @__PURE__ */ new Date(), i = new Date(e);
      i.setDate(i.getDate() + 1), this.selectedContentId = this.contentId, this.selectedContentName = this.contentName, this.startDateTime = this.toLocalDateTimeString(e.toISOString()), this.endDateTime = this.toLocalDateTimeString(i.toISOString()), this.targetPosition = 0, this.priorityOptions.length > 0 && (this.priority = this.priorityOptions[0].value);
    }
  }
  async loadPriorityOptions() {
    this.loadingPriorities = !0, this.noPriorityOptionsFound = !1;
    try {
      const e = await this.makeAuthenticatedRequest(
        `${o.API_BASE}/enum-priorities`
      ), s = (await u.handleResponse(
        e
      )).items || [];
      s.length > 0 ? (this.priorityOptions = s.sort((r, d) => r.sortPriority - d.sortPriority).map((r) => ({
        value: r.sortPriority,
        label: r.name
      })), !this.schedule && this.priority === 0 && (this.priority = this.priorityOptions[0].value)) : this.noPriorityOptionsFound = !0;
    } catch (e) {
      console.error("[Schedule Dialog] Error loading priority options:", e), this.noPriorityOptionsFound = !0;
    } finally {
      this.loadingPriorities = !1;
    }
  }
  toLocalDateTimeString(e) {
    const i = new Date(e), s = i.getTimezoneOffset();
    return new Date(i.getTime() - s * 60 * 1e3).toISOString().slice(0, 16);
  }
  toISOString(e) {
    return new Date(e).toISOString();
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
    return l`
      <div class="dialog" @click=${(e) => e.stopPropagation()}>
        <div class="dialog-header">
          <h3>
            <uui-icon name="icon-calendar"></uui-icon>
            Edit Schedule for ${this.selectedContentName}
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

        ${this.error ? l`
                <div class="error-message">
                  <uui-icon name="icon-alert"></uui-icon>
                  ${this.error}
                </div>
              ` : ""}

        <div class="grid">
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
              label="Position to boost to"
              .value=${this.targetPosition.toString()}
              @change=${(e) => this.targetPosition = parseInt(e.target.value) || 0}
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
                  @change=${(e) => this.startDateTime = e.target.value}
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
                  @change=${(e) => this.endDateTime = e.target.value}
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
              ${this.loadingPriorities ? l`
                      <div class="priority-loading">
                        <uui-loader></uui-loader>
                        Loading priority options...
                      </div>
                    ` : this.noPriorityOptionsFound ? l`
                        <div class="no-priority-options">
                          <uui-icon name="icon-alert"></uui-icon>
                          No priority options have been configured yet
                        </div>
                      ` : l`
                        <div class="priority-radio-group">
                          ${this.priorityOptions.map(
      (e) => l`
                              <uui-label
                                class="priority-radio-option ${this.priority === e.value ? "selected" : ""}"
                                @click="${(i) => {
        i.preventDefault(), this.priority = e.value;
      }}"
                              >
                                <input
                                  type="radio"
                                  name="priority"
                                  value="${e.value}"
                                  .checked="${this.priority === e.value}"
                                />
                                <div class="priority-radio-content">
                                  <div class="priority-radio-details">
                                    <div class="priority-radio-label">
                                      ${e.label}
                                    </div>
                                    <div class="priority-radio-value">
                                      Priority Weight: ${e.value}
                                    </div>
                                  </div>
                                  <div
                                    class="priority-level-badge priority-${this.getPriorityLevel(
        e.value
      )}"
                                  >
                                    ${this.getPriorityLevelText(e.value)}
                                  </div>
                                </div>
                              </uui-label>
                            `
    )}
                        </div>
                      `}
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
};
h.styles = y`
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
      display: flex;
      justify-content: center;
      align-items: center;
      border-radius: 24px;
      width: 45px;
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
  `;
let t = h;
a([
  c({ type: String })
], t.prototype, "parentId");
a([
  c({ type: Object })
], t.prototype, "schedule");
a([
  c({ type: String })
], t.prototype, "contentId");
a([
  c({ type: String })
], t.prototype, "contentName");
a([
  n()
], t.prototype, "selectedContentId");
a([
  n()
], t.prototype, "selectedContentName");
a([
  n()
], t.prototype, "targetPosition");
a([
  n()
], t.prototype, "startDateTime");
a([
  n()
], t.prototype, "endDateTime");
a([
  n()
], t.prototype, "priority");
a([
  n()
], t.prototype, "priorityOptions");
a([
  n()
], t.prototype, "loadingPriorities");
a([
  n()
], t.prototype, "noPriorityOptionsFound");
a([
  n()
], t.prototype, "error");
customElements.define("schedule-dialog", t);
export {
  z as S
};
//# sourceMappingURL=schedule-dialog.element-LyV9gH3v.js.map
