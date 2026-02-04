import { LitElement as m, html as n, css as O, property as v, state as h, customElement as D } from "@umbraco-cms/backoffice/external/lit";
import { U as E, P as r, A as i } from "./crud.mixin-WeBWptlA.js";
import { U as A } from "./ui.mixin-DutlRF0v.js";
import { R as f } from "./validation.utils-BMdJXB5x.js";
import { p as y } from "./shared.styles-7p8CFe0X.js";
import { S as b } from "./schedule-api.client-CUqMY55I.js";
var w = Object.defineProperty, C = Object.getOwnPropertyDescriptor, l = (e, t, a, s) => {
  for (var d = s > 1 ? void 0 : s ? C(t, a) : t, p = e.length - 1, u; p >= 0; p--)
    (u = e[p]) && (d = (s ? u(t, a, d) : u(d)) || d);
  return s && d && w(t, a, d), d;
};
let o = class extends A(E(m)) {
  constructor() {
    super(...arguments), this.id = "", this.parentNodeName = "", this.nodeChildren = [], this.activeSchedules = [], this.hasDefaultOrder = !1, this.defaultOrderInfo = null, this.loading = !1, this.error = "";
  }
  async connectedCallback() {
    super.connectedCallback(), this.scheduleApi = new b(() => this.getAuthToken()), this.id && (await this.loadNodeChildren(), await this.loadActiveSchedules(), await this.loadDefaultOrderInfo());
  }
  async loadDefaultOrderInfo() {
    if (this.id)
      try {
        const e = await this.makeAuthenticatedRequest(
          `${r.API_BASE}${r.ENDPOINTS.DEFAULT_SORT_ORDER}/${this.id}`
        ), t = await i.handleResponse(e);
        this.defaultOrderInfo = t, this.hasDefaultOrder = t.isSet;
      } catch (e) {
        console.error("Error loading default order info:", e);
      }
  }
  async saveAsDefaultOrder() {
    if (this.id && i.confirmAction(r.MESSAGES.CONFIRM_SAVE_DEFAULT))
      try {
        const e = await this.makeAuthenticatedRequest(
          `${r.API_BASE}${r.ENDPOINTS.DEFAULT_SORT_ORDER_SAVE}`,
          {
            method: "POST",
            body: JSON.stringify({ parentId: this.id })
          }
        );
        await i.handleResponse(e), await this.loadDefaultOrderInfo(), i.showSuccess("Current sort order saved as default!");
      } catch (e) {
        i.showError(e, "Failed to save default order");
      }
  }
  async restoreDefaultOrder() {
    if (this.id && i.confirmAction(r.MESSAGES.CONFIRM_RESTORE_DEFAULT))
      try {
        const e = await this.makeAuthenticatedRequest(
          `${r.API_BASE}${r.ENDPOINTS.DEFAULT_SORT_ORDER_RESTORE}/${this.id}`,
          { method: "POST" }
        );
        await i.handleResponse(e), await this.loadNodeChildren(), i.showSuccess("Default sort order restored!");
      } catch (e) {
        i.showError(e, "Failed to restore default order");
      }
  }
  async clearDefaultOrder() {
    if (this.id && i.confirmAction(r.MESSAGES.CONFIRM_CLEAR_DEFAULT))
      try {
        const e = await this.makeAuthenticatedRequest(
          `${r.API_BASE}${r.ENDPOINTS.DEFAULT_SORT_ORDER}/${this.id}`,
          { method: "DELETE" }
        );
        await i.handleResponse(e), await this.loadDefaultOrderInfo(), i.showSuccess("Default sort order cleared!");
      } catch (e) {
        i.showError(e, "Failed to clear default order");
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
    f.navigateTo(f.getDashboardPath("schedules", this.id));
  }
  async updated(e) {
    super.updated(e), e.has("id") && this.id && (await this.loadNodeChildren(), await this.loadActiveSchedules(), await this.loadDefaultOrderInfo());
  }
  async loadNodeChildren() {
    if (this.id) {
      this.loading = !0, this.error = "";
      try {
        const e = await this.makeAuthenticatedRequest(
          `${r.API_BASE}${r.ENDPOINTS.CHILDREN}/${this.id}`
        ), t = await i.handleResponse(e), a = await this.makeAuthenticatedRequest(`/umbraco/management/api/v1/document/${this.id}`);
        if (a.ok) {
          const s = await a.json();
          this.parentNodeName = s.variants?.[0]?.name || "Unknown Node";
        }
        this.nodeChildren = t.items?.map((s) => ({
          id: s.id,
          name: s.name,
          sortOrder: s.sortOrder,
          contentTypeAlias: s.documentType?.id,
          icon: s.documentType?.icon || r.ICONS.DOCUMENT
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
        const e = this.nodeChildren.map((a, s) => ({
          id: a.id,
          sortOrder: s
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
        await i.handleResponse(t), await this.loadNodeChildren();
      } catch (e) {
        this.error = "Failed to update sort order", i.showError(e, "Sort order update failed");
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
    const a = e.dataTransfer.getData("text/plain");
    if (!this.nodeChildren.find((c) => c.id === a) || a === t.id) return;
    const d = this.nodeChildren.findIndex((c) => c.id === a), p = this.nodeChildren.findIndex((c) => c.id === t.id), u = [...this.nodeChildren], [S] = u.splice(d, 1);
    u.splice(p, 0, S), this.nodeChildren = u.map((c, g) => ({
      ...c,
      sortOrder: g
    })), await this.updateSortOrder();
  }
  renderDefaultOrderBanner() {
    if (!this.hasDefaultOrder) return "";
    const e = n`
      <uui-icon class="icon" name="${r.ICONS.BOOKMARK}"></uui-icon>
      <div class="content">
        <strong>Default Order Saved</strong>
        <p style="margin: var(--uui-size-space-1) 0 0 0; font-size: var(--uui-type-small-size);">
          ${this.defaultOrderInfo?.itemCount || 0} items • 
          Last updated: ${new Date(this.defaultOrderInfo?.updated).toLocaleDateString()}
          ${this.activeSchedules.length === 0 ? " • Will restore automatically when schedules expire" : ""}
        </p>
      </div>
    `, t = n`
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
    const t = n`
      <uui-icon name="${r.ICONS.CALENDAR}" style="color: var(--uui-color-positive); font-size: 24px;"></uui-icon>
      <div class="content">
        <strong>Active Schedules</strong>
        <p style="margin: var(--uui-size-space-1) 0 0 0; font-size: var(--uui-type-small-size);">
          ${this.activeSchedules.length} schedule${this.activeSchedules.length === 1 ? "" : "s"} currently active.
          Some items are automatically sorted to specific positions.
        </p>
      </div>
    `, a = n`
      <uui-button
        look="outline"
        label="View Schedules"
        @click=${this.navigateToSchedules}>
        View Details
      </uui-button>
    `;
    return this.renderInfoBanner("positive", t, a);
  }
  renderChildrenTable() {
    return this.nodeChildren.length === 0 ? this.renderEmptyState("This node has no children.", r.ICONS.DOCUMENT) : n`
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
      return n`
              <tr 
                draggable="true"
                @dragstart=${(a) => this.handleDragStart(a, e)}
                @dragend=${this.handleDragEnd}
                @dragover=${this.handleDragOver}
                @drop=${(a) => this.handleDrop(a, e)}>
                <td>
                  <uui-icon class="drag-handle" name="${r.ICONS.NAVIGATION}"></uui-icon>
                </td>
                <td>
                  <div class="node-icon">
                    <uui-icon name="${e.icon || r.ICONS.DOCUMENT}"></uui-icon>
                    <strong>${e.name}</strong>
                    ${t ? n`
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
    return n`
      <div class="dashboard-container">
        <div class="dashboard-header">
          <div class="header-content">
            <h1>Sort Children of: ${this.parentNodeName}</h1>
            <p>Drag and drop rows to reorder child nodes</p>
          </div>
          <div class="header-actions">
            ${this.hasDefaultOrder ? n`
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
o.styles = [
  y,
  O`
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
l([
  v({ type: String, attribute: !1, reflect: !1 })
], o.prototype, "id", 2);
l([
  h()
], o.prototype, "parentNodeName", 2);
l([
  h()
], o.prototype, "nodeChildren", 2);
l([
  h()
], o.prototype, "activeSchedules", 2);
l([
  h()
], o.prototype, "hasDefaultOrder", 2);
l([
  h()
], o.prototype, "defaultOrderInfo", 2);
l([
  h()
], o.prototype, "loading", 2);
l([
  h()
], o.prototype, "error", 2);
o = l([
  D("power-sort-children-dashboard")
], o);
export {
  o as default
};
//# sourceMappingURL=children.element-Cx4KO6OH.js.map
