import { html as o, css as f, LitElement as m, property as S, state as p, customElement as y } from "@umbraco-cms/backoffice/external/lit";
import { P as r, U as O, A as n } from "./api-response.utils-pb7E4RWv.js";
import { V as E, R as g } from "./validation.utils-BWAQMB43.js";
import { S as D } from "./schedule-api.client-CYpzemIY.js";
const A = (e) => {
  class t extends e {
    /**
     * Render loading state with consistent styling
     */
    renderLoadingState(a = r.MESSAGES.LOADING) {
      return o`
        <div class="loading">
          <uui-loader></uui-loader>
          <p>${a}</p>
        </div>
      `;
    }
    /**
     * Render error state with optional retry action
     */
    renderErrorState(a, i) {
      return o`
        <div class="error">
          <uui-icon name="${r.ICONS.ALERT}"></uui-icon>
          <p>${a}</p>
          ${i ? o`<uui-button @click=${i}>Retry</uui-button>` : ""}
        </div>
      `;
    }
    /**
     * Render empty state with icon and message
     */
    renderEmptyState(a, i = r.ICONS.DOCUMENT) {
      return o`
        <div class="empty-state">
          <uui-icon name="${i}" style="font-size: 48px; opacity: 0.3;"></uui-icon>
          <p>${a}</p>
        </div>
      `;
    }
    /**
     * Render info banner with consistent styling
     */
    renderInfoBanner(a, i, d) {
      return o`
        <div class="info-banner ${a}">
          ${i}
          ${d ? o`<div class="actions">${d}</div>` : ""}
        </div>
      `;
    }
    /**
     * Render badge with consistent styling
     */
    renderBadge(a, i = "default", d) {
      return o`
        <span class="badge ${i}">
          ${d ? o`<uui-icon name="${d}"></uui-icon>` : ""}
          ${a}
        </span>
      `;
    }
    /**
     * Render status badge for schedules
     */
    renderScheduleStatus(a) {
      if (a.isCurrentlyActive)
        return o`
          <uui-badge color="positive" look="primary">
            <uui-icon name="${r.ICONS.CHECK}"></uui-icon>
            Active Now
          </uui-badge>
        `;
      const i = /* @__PURE__ */ new Date(), d = new Date(a.startDateTime), l = new Date(a.endDateTime);
      return i < d ? o`
          <uui-badge color="default" look="secondary">
            <uui-icon name="${r.ICONS.TIME}"></uui-icon>
            Scheduled
          </uui-badge>
        ` : i >= l ? o`
          <uui-badge color="default" look="outline">
            <uui-icon name="${r.ICONS.DELETE}"></uui-icon>
            Expired
          </uui-badge>
        ` : o`
        <uui-badge color="warning" look="secondary">
          <uui-icon name="${r.ICONS.CALENDAR}"></uui-icon>
          Pending
        </uui-badge>
      `;
    }
  }
  return t;
}, w = f`
  /* Dashboard Layout */
  .dashboard-container {
    max-width: 1200px;
    margin: 0 auto;
  }

  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--uui-size-space-6);
  }

  .header-content h1 {
    margin: 0 0 var(--uui-size-space-2) 0;
    font-size: var(--uui-type-h3-size);
  }

  .header-content p {
    color: var(--uui-color-text-alt);
    margin: 0;
  }

  .header-actions {
    display: flex;
    gap: var(--uui-size-space-3);
  }

  /* Loading and Error States */
  .loading,
  .error,
  .empty-state {
    padding: var(--uui-size-space-6);
    text-align: center;
    background: var(--uui-color-surface);
    border: 1px solid var(--uui-color-border);
    border-radius: var(--uui-border-radius);
  }

  .error {
    color: var(--uui-color-danger);
    border-color: var(--uui-color-danger);
  }

  .loading-spinner {
    display: flex;
    justify-content: center;
    padding: var(--uui-size-space-8);
  }

  .error-message {
    background: var(--uui-color-danger-emphasis);
    color: var(--uui-color-danger);
    padding: var(--uui-size-space-3);
    border-radius: var(--uui-border-radius);
    margin-bottom: var(--uui-size-space-4);
  }

  .success-message {
    background: var(--uui-color-positive-emphasis);
    color: var(--uui-color-positive);
    padding: var(--uui-size-space-3);
    border-radius: var(--uui-border-radius);
    margin-bottom: var(--uui-size-space-4);
  }

  /* Info Banners */
  .info-banner {
    border: 1px solid var(--uui-color-border);
    border-radius: var(--uui-border-radius);
    padding: var(--uui-size-space-3);
    margin-bottom: var(--uui-size-space-4);
    display: flex;
    align-items: center;
    gap: var(--uui-size-space-3);
  }

  .info-banner.default-order {
    background: var(--uui-color-default-emphasis);
  }

  .info-banner.active-schedule {
    background: var(--uui-color-positive-emphasis);
    border-color: var(--uui-color-positive);
  }

  .info-banner .icon {
    font-size: 20px;
  }

  .info-banner .content {
    flex: 1;
  }

  .info-banner .actions {
    display: flex;
    gap: var(--uui-size-space-2);
  }

  /* Cards and Lists */
  .card {
    background: var(--uui-color-surface);
    border: 1px solid var(--uui-color-border);
    border-radius: var(--uui-border-radius);
    padding: var(--uui-size-space-4);
    display: grid;
    gap: var(--uui-size-space-4);
    align-items: center;
  }

  .card.active {
    border-color: var(--uui-color-positive);
    background: var(--uui-color-positive-emphasis);
  }

  .card-list {
    display: flex;
    flex-direction: column;
    gap: var(--uui-size-space-3);
  }

  /* Tables */
  .data-table {
    width: 100%;
    border-collapse: collapse;
    background: var(--uui-color-surface);
    border-radius: var(--uui-border-radius);
    overflow: hidden;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  .data-table thead {
    background: var(--uui-color-surface-alt);
  }

  .data-table th {
    padding: var(--uui-size-space-4);
    text-align: left;
    font-weight: 600;
    border-bottom: 2px solid var(--uui-color-border);
  }

  .data-table td {
    padding: var(--uui-size-space-4);
    border-bottom: 1px solid var(--uui-color-border);
  }

  .data-table tbody tr {
    transition: all 0.2s;
  }

  .data-table tbody tr:hover {
    background: var(--uui-color-surface-emphasis);
  }

  .data-table tbody tr:last-child td {
    border-bottom: none;
  }

  /* Badges */
  .badge {
    display: inline-flex;
    align-items: center;
    gap: var(--uui-size-space-1);
    padding: var(--uui-size-space-1) var(--uui-size-space-2);
    border-radius: var(--uui-border-radius);
    font-size: var(--uui-type-small-size);
    font-weight: 600;
  }

  .badge.positive {
    background: var(--uui-color-positive);
    color: white;
  }

  .badge.default {
    background: var(--uui-color-surface-emphasis);
    color: var(--uui-color-text);
  }

  .badge.warning {
    background: var(--uui-color-warning);
    color: white;
  }

  /* Utilities */
  .text-center {
    text-align: center;
  }

  .flex {
    display: flex;
  }

  .flex-column {
    flex-direction: column;
  }

  .items-center {
    align-items: center;
  }

  .gap-2 {
    gap: var(--uui-size-space-2);
  }

  .gap-3 {
    gap: var(--uui-size-space-3);
  }

  .mb-4 {
    margin-bottom: var(--uui-size-space-4);
  }

  .p-4 {
    padding: var(--uui-size-space-4);
  }
`;
var $ = Object.defineProperty, C = Object.getOwnPropertyDescriptor, c = (e, t, s, a) => {
  for (var i = a > 1 ? void 0 : a ? C(t, s) : t, d = e.length - 1, l; d >= 0; d--)
    (l = e[d]) && (i = (a ? l(t, s, i) : l(i)) || i);
  return a && i && $(t, s, i), i;
};
let u = class extends A(O(m)) {
  constructor() {
    super(...arguments), this.id = "", this.parentNodeName = "", this.nodeChildren = [], this.activeSchedules = [], this.hasDefaultOrder = !1, this.defaultOrderInfo = null, this.loading = !1, this.error = "";
  }
  async connectedCallback() {
    super.connectedCallback(), this.scheduleApi = new D(() => this.getAuthToken()), this.id = E.extractGuidFromPath() || "", this.id && (await this.loadNodeChildren(), await this.loadActiveSchedules(), await this.loadDefaultOrderInfo());
  }
  async loadDefaultOrderInfo() {
    if (this.id)
      try {
        const e = await this.makeAuthenticatedRequest(
          `${r.API_BASE}${r.ENDPOINTS.DEFAULT_SORT_ORDER}/${this.id}`
        ), t = await n.handleResponse(e);
        this.defaultOrderInfo = t, this.hasDefaultOrder = t.isSet;
      } catch (e) {
        console.error("Error loading default order info:", e);
      }
  }
  async saveAsDefaultOrder() {
    if (this.id && n.confirmAction(r.MESSAGES.CONFIRM_SAVE_DEFAULT))
      try {
        const e = await this.makeAuthenticatedRequest(
          `${r.API_BASE}${r.ENDPOINTS.DEFAULT_SORT_ORDER_SAVE}`,
          {
            method: "POST",
            body: JSON.stringify({ parentId: this.id })
          }
        );
        await n.handleResponse(e), await this.loadDefaultOrderInfo(), n.showSuccess("Current sort order saved as default!");
      } catch (e) {
        n.showError(e, "Failed to save default order");
      }
  }
  async restoreDefaultOrder() {
    if (this.id && n.confirmAction(r.MESSAGES.CONFIRM_RESTORE_DEFAULT))
      try {
        const e = await this.makeAuthenticatedRequest(
          `${r.API_BASE}${r.ENDPOINTS.DEFAULT_SORT_ORDER_RESTORE}/${this.id}`,
          { method: "POST" }
        );
        await n.handleResponse(e), await this.loadNodeChildren(), n.showSuccess("Default sort order restored!");
      } catch (e) {
        n.showError(e, "Failed to restore default order");
      }
  }
  async clearDefaultOrder() {
    if (this.id && n.confirmAction(r.MESSAGES.CONFIRM_CLEAR_DEFAULT))
      try {
        const e = await this.makeAuthenticatedRequest(
          `${r.API_BASE}${r.ENDPOINTS.DEFAULT_SORT_ORDER}/${this.id}`,
          { method: "DELETE" }
        );
        await n.handleResponse(e), await this.loadDefaultOrderInfo(), n.showSuccess("Default sort order cleared!");
      } catch (e) {
        n.showError(e, "Failed to clear default order");
      }
  }
  async loadActiveSchedules() {
    if (!(!this.id || !this.scheduleApi))
      try {
        this.activeSchedules = await this.scheduleApi.getActiveSchedules(this.id);
      } catch (e) {
        console.error("Error loading active schedules:", e);
      }
  }
  getScheduleForChild(e) {
    return this.activeSchedules.find((t) => t.contentId === e);
  }
  navigateToSchedules() {
    g.navigateTo(g.getDashboardPath("schedules", this.id));
  }
  async updated(e) {
    super.updated(e), e.has("id") && this.id && await this.loadNodeChildren();
  }
  async loadNodeChildren() {
    if (this.id) {
      this.loading = !0, this.error = "";
      try {
        const e = await this.makeAuthenticatedRequest(
          `${r.API_BASE}${r.ENDPOINTS.CHILDREN}/${this.id}`
        ), t = await n.handleResponse(e), s = await this.makeAuthenticatedRequest(`/umbraco/management/api/v1/document/${this.id}`);
        if (s.ok) {
          const a = await s.json();
          this.parentNodeName = a.variants?.[0]?.name || "Unknown Node";
        }
        this.nodeChildren = t.items?.map((a) => ({
          id: a.id,
          name: a.name,
          sortOrder: a.sortOrder,
          contentTypeAlias: a.documentType?.id,
          icon: a.documentType?.icon || r.ICONS.DOCUMENT
        })) || [], await this.loadActiveSchedules();
      } catch (e) {
        this.error = e instanceof Error ? e.message : r.MESSAGES.ERROR_GENERIC, console.error("Error loading children:", e);
      } finally {
        this.loading = !1;
      }
    }
  }
  async updateSortOrder() {
    if (this.id)
      try {
        const e = this.nodeChildren.map((s, a) => ({
          id: s.id,
          sortOrder: a
        })), t = await this.makeAuthenticatedRequest(
          `${r.API_BASE}${r.ENDPOINTS.SORT_DOCUMENT}`,
          {
            method: "PUT",
            body: JSON.stringify({
              parent: { id: this.id },
              sorting: e
            })
          }
        );
        await n.handleResponse(t), await this.loadNodeChildren();
      } catch (e) {
        this.error = "Failed to update sort order", n.showError(e, "Sort order update failed");
      }
  }
  handleDragStart(e, t) {
    e.dataTransfer.effectAllowed = "move", e.dataTransfer.setData("text/plain", t.id), e.target.style.opacity = "0.5";
  }
  handleDragEnd(e) {
    e.target.style.opacity = "1";
  }
  handleDragOver(e) {
    e.preventDefault(), e.dataTransfer.dropEffect = "move";
  }
  async handleDrop(e, t) {
    e.preventDefault();
    const s = e.dataTransfer.getData("text/plain");
    if (!this.nodeChildren.find((h) => h.id === s) || s === t.id) return;
    const i = this.nodeChildren.findIndex((h) => h.id === s), d = this.nodeChildren.findIndex((h) => h.id === t.id), l = [...this.nodeChildren], [v] = l.splice(i, 1);
    l.splice(d, 0, v), this.nodeChildren = l.map((h, b) => ({
      ...h,
      sortOrder: b
    })), await this.updateSortOrder();
  }
  renderDefaultOrderBanner() {
    if (!this.hasDefaultOrder) return "";
    const e = o`
      <uui-icon class="icon" name="${r.ICONS.BOOKMARK}"></uui-icon>
      <div class="content">
        <strong>Default Order Saved</strong>
        <p style="margin: var(--uui-size-space-1) 0 0 0; font-size: var(--uui-type-small-size);">
          ${this.defaultOrderInfo?.itemCount || 0} items • 
          Last updated: ${new Date(this.defaultOrderInfo?.updated).toLocaleDateString()}
          ${this.activeSchedules.length === 0 ? " • Will restore automatically when schedules expire" : ""}
        </p>
      </div>
    `, t = o`
      <uui-button
        look="outline"
        label="Clear"
        compact
        @click=${this.clearDefaultOrder}>
        <uui-icon name="${r.ICONS.DELETE}"></uui-icon>
      </uui-button>
    `;
    return this.renderInfoBanner("default", e, t);
  }
  renderActiveScheduleBanner(e) {
    if (!e) return "";
    const t = o`
      <uui-icon name="${r.ICONS.CALENDAR}" style="color: var(--uui-color-positive); font-size: 24px;"></uui-icon>
      <div class="content">
        <strong>Active Schedules</strong>
        <p style="margin: var(--uui-size-space-1) 0 0 0; font-size: var(--uui-type-small-size);">
          ${this.activeSchedules.length} schedule${this.activeSchedules.length === 1 ? "" : "s"} currently active.
          Some items are automatically sorted to specific positions.
        </p>
      </div>
    `, s = o`
      <uui-button
        look="outline"
        label="View Schedules"
        @click=${this.navigateToSchedules}>
        View Details
      </uui-button>
    `;
    return this.renderInfoBanner("positive", t, s);
  }
  renderChildrenTable() {
    return this.nodeChildren.length === 0 ? this.renderEmptyState("This node has no children.", r.ICONS.DOCUMENT) : o`
      <table class="data-table">
        <thead>
          <tr>
            <th width="50"></th>
            <th>Name</th>
            <th>Content Type</th>
            <th width="120">Sort Order</th>
          </tr>
        </thead>
        <tbody>
          ${this.nodeChildren.map((e) => {
      const t = this.getScheduleForChild(e.id);
      return o`
              <tr 
                draggable="true"
                @dragstart=${(s) => this.handleDragStart(s, e)}
                @dragend=${this.handleDragEnd}
                @dragover=${this.handleDragOver}
                @drop=${(s) => this.handleDrop(s, e)}>
                <td>
                  <uui-icon class="drag-handle" name="${r.ICONS.NAVIGATION}"></uui-icon>
                </td>
                <td>
                  <div class="node-icon">
                    <uui-icon name="${e.icon || r.ICONS.DOCUMENT}"></uui-icon>
                    <strong>${e.name}</strong>
                    ${t ? o`
                          <span class="scheduled-badge" title="Boosted to position ${t.targetPosition} (Priority: ${t.priority})">
                            <uui-icon name="icon-calendar-alt"></uui-icon>
                            Scheduled
                          </span>
                        ` : ""}
                  </div>
                </td>
                <td>${e.contentTypeAlias || "N/A"}</td>
                <td>
                  <span class="sort-order-badge">${e.sortOrder}</span>
                </td>
              </tr>
            `;
    })}
        </tbody>
      </table>
    `;
  }
  render() {
    if (this.loading)
      return this.renderLoadingState("Loading children...");
    if (this.error)
      return this.renderErrorState(this.error, () => this.loadNodeChildren());
    const e = this.activeSchedules.length > 0;
    return o`
      <div class="dashboard-container">
        <div class="dashboard-header">
          <div class="header-content">
            <h1>Sort Children of: ${this.parentNodeName}</h1>
            <p>Drag and drop rows to reorder child nodes</p>
          </div>
          <div class="header-actions">
            ${this.hasDefaultOrder ? o`
                  <uui-button
                    look="outline"
                    color="default"
                    label="Restore Default Order"
                    @click=${this.restoreDefaultOrder}>
                    <uui-icon name="${r.ICONS.UNDO}"></uui-icon>
                    Restore Default
                  </uui-button>
                ` : ""}
            <uui-button
              look="outline"
              color="default"
              label="Save as Default"
              @click=${this.saveAsDefaultOrder}>
              <uui-icon name="${r.ICONS.SAVE}"></uui-icon>
              Save as Default
            </uui-button>
            <uui-button
              look="primary"
              color="default"
              label="Manage Schedules"
              @click=${this.navigateToSchedules}>
              <uui-icon name="${r.ICONS.CALENDAR}"></uui-icon>
              Manage Schedules
            </uui-button>
          </div>
        </div>

        ${this.renderDefaultOrderBanner()}
        ${this.renderActiveScheduleBanner(e)}
        ${this.renderChildrenTable()}
      </div>
    `;
  }
};
u.styles = [
  w,
  f`
      :host {
        display: block;
        padding: var(--uui-size-space-5);
      }

      .children-table {
        cursor: move;
      }

      .children-table tbody tr {
        cursor: move;
      }

      .children-table tbody tr:active {
        opacity: 0.5;
      }

      .node-icon {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-3);
      }

      .sort-order-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 32px;
        height: 32px;
        padding: 0 var(--uui-size-space-2);
        background: var(--uui-color-positive-emphasis);
        border-radius: var(--uui-border-radius);
        font-weight: 600;
      }

      .drag-handle {
        color: var(--uui-color-text-alt);
        cursor: grab;
      }

      .drag-handle:active {
        cursor: grabbing;
      }

      .scheduled-badge {
        display: inline-flex;
        align-items: center;
        gap: var(--uui-size-space-1);
        padding: var(--uui-size-space-1) var(--uui-size-space-2);
        background: var(--uui-color-positive);
        color: white;
        border-radius: var(--uui-border-radius);
        font-size: var(--uui-type-small-size);
        font-weight: 600;
        margin-left: var(--uui-size-space-2);
      }
    `
];
c([
  S({ type: String, attribute: !1, reflect: !1 })
], u.prototype, "id", 2);
c([
  p()
], u.prototype, "parentNodeName", 2);
c([
  p()
], u.prototype, "nodeChildren", 2);
c([
  p()
], u.prototype, "activeSchedules", 2);
c([
  p()
], u.prototype, "hasDefaultOrder", 2);
c([
  p()
], u.prototype, "defaultOrderInfo", 2);
c([
  p()
], u.prototype, "loading", 2);
c([
  p()
], u.prototype, "error", 2);
u = c([
  y("power-sort-children-dashboard")
], u);
export {
  u as default
};
//# sourceMappingURL=children.element-BSwuSelv.js.map
