import { LitElement as S, html as l, css as D, property as g, state as p, customElement as v } from "@umbraco-cms/backoffice/external/lit";
import { U as y, P as a, A as o, p as b } from "./shared.styles-BdnPOy5W.js";
import { U as O } from "./ui.mixin-C1ziC5Yq.js";
import { S as w } from "./schedule-dialog.element-LyV9gH3v.js";
import { D as E } from "./validation.utils-QQX9Ru6J.js";
var $ = Object.defineProperty, A = Object.getOwnPropertyDescriptor, n = (e, t, r, i) => {
  for (var s = i > 1 ? void 0 : i ? A(t, r) : t, u = e.length - 1, h; u >= 0; u--)
    (h = e[u]) && (s = (i ? h(t, r, s) : h(s)) || s);
  return i && s && $(t, r, s), s;
};
let d = class extends O(
  y(S)
) {
  constructor() {
    super(...arguments), this.id = "", this.parentNodeName = "", this.nodeChildren = [], this.activeSchedules = [], this.hasDefaultOrder = !1, this.defaultOrderInfo = null, this.loading = !1, this.error = "", this.showCreateDialog = !1, this.editingSchedule = null, this.contentId = "";
  }
  async connectedCallback() {
    super.connectedCallback(), this.scheduleApi = new w(() => this.getAuthToken()), this.id && (await this.loadNodeChildren(), await this.loadSchedules(), await this.loadDefaultOrderInfo());
  }
  async loadDefaultOrderInfo() {
    if (this.id)
      try {
        const e = await this.makeAuthenticatedRequest(
          `${a.API_BASE}${a.ENDPOINTS.DEFAULT_SORT_ORDER}/${this.id}`
        ), t = await o.handleResponse(e);
        this.defaultOrderInfo = t, this.hasDefaultOrder = t.isSet;
      } catch (e) {
        console.error("Error loading default order info:", e);
      }
  }
  async saveAsDefaultOrder() {
    if (this.id && o.confirmAction(
      a.MESSAGES.CONFIRM_SAVE_DEFAULT
    ))
      try {
        const e = await this.makeAuthenticatedRequest(
          `${a.API_BASE}${a.ENDPOINTS.DEFAULT_SORT_ORDER_SAVE}`,
          {
            method: "POST",
            body: JSON.stringify({ parentId: this.id })
          }
        );
        await o.handleResponse(e), await this.loadDefaultOrderInfo(), o.showSuccess("Current sort order saved as default!");
      } catch (e) {
        o.showError(e, "Failed to save default order");
      }
  }
  async restoreDefaultOrder() {
    if (this.id && o.confirmAction(
      a.MESSAGES.CONFIRM_RESTORE_DEFAULT
    ))
      try {
        const e = await this.makeAuthenticatedRequest(
          `${a.API_BASE}${a.ENDPOINTS.DEFAULT_SORT_ORDER_RESTORE}/${this.id}`,
          { method: "POST" }
        );
        await o.handleResponse(e), await this.loadNodeChildren(), o.showSuccess("Default sort order restored!");
      } catch (e) {
        o.showError(e, "Failed to restore default order");
      }
  }
  async clearDefaultOrder() {
    if (this.id && o.confirmAction(
      a.MESSAGES.CONFIRM_CLEAR_DEFAULT
    ))
      try {
        const e = await this.makeAuthenticatedRequest(
          `${a.API_BASE}${a.ENDPOINTS.DEFAULT_SORT_ORDER}/${this.id}`,
          { method: "DELETE" }
        );
        await o.handleResponse(e), await this.loadDefaultOrderInfo(), o.showSuccess("Default sort order cleared!");
      } catch (e) {
        o.showError(e, "Failed to clear default order");
      }
  }
  // private async loadActiveSchedules() {
  //   if (!this.id || !this.scheduleApi) return;
  //   try {
  //     this.activeSchedules = await this.scheduleApi.getSchedules(this.id);
  //   } catch (error) {
  //     console.error("Error loading active schedules:", error);
  //     // Don't show error to user, just log it
  //   }
  // }
  async loadSchedules() {
    if (!(!this.scheduleApi || !this.id)) {
      this.loading = !0, this.error = "";
      try {
        const e = await this.scheduleApi.getSchedules(this.id);
        this.activeSchedules = e.items;
      } catch (e) {
        console.error("Error loading schedules:", e), this.error = "Failed to load schedules";
      } finally {
        this.loading = !1;
      }
    }
  }
  getScheduleForChild(e) {
    return this.activeSchedules.find((t) => t.contentId === e);
  }
  async loadNodeChildren() {
    if (this.id) {
      this.loading = !0, this.error = "";
      try {
        const e = await this.makeAuthenticatedRequest(
          `${a.API_BASE}${a.ENDPOINTS.CHILDREN}/${this.id}`
        ), t = await o.handleResponse(e), r = await this.makeAuthenticatedRequest(
          `/umbraco/management/api/v1/document/${this.id}`
        );
        if (r.ok) {
          const i = await r.json();
          this.parentNodeName = i.variants?.[0]?.name || "Unknown Node";
        }
        this.nodeChildren = t.items?.map((i) => ({
          id: i.id,
          name: i.name,
          sortOrder: i.sortOrder,
          contentTypeAlias: i.documentType?.id,
          icon: i.documentType?.icon || a.ICONS.DOCUMENT
        })) || [], await this.loadSchedules();
      } catch (e) {
        this.error = e instanceof Error ? e.message : a.MESSAGES.ERROR_GENERIC, console.error("Error loading children:", e);
      } finally {
        this.loading = !1;
      }
    }
  }
  async updateSortOrder() {
    if (this.id)
      try {
        const e = this.nodeChildren.map((r, i) => ({
          id: r.id,
          sortOrder: i
        })), t = await this.makeAuthenticatedRequest(
          `${a.API_BASE}${a.ENDPOINTS.SORT_DOCUMENT}`,
          {
            method: "PUT",
            body: JSON.stringify({
              parent: { id: this.id },
              sorting: e
            })
          }
        );
        await o.handleResponse(t), await this.loadNodeChildren();
      } catch (e) {
        this.error = "Failed to update sort order", o.showError(e, "Sort order update failed");
      }
  }
  handleDragStart(e, t) {
    e.dataTransfer.effectAllowed = "move", e.dataTransfer.setData("text/plain", t.id), e.target.style.opacity = "0.5";
  }
  handleDragEnd(e) {
    e.target.style.opacity = "1";
  }
  openCreateDialog(e) {
    this.showCreateDialog = !0, this.editingSchedule = null, this.contentId = e.id;
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
      parentIdFromRoute: this.id,
      parentNodeName: this.parentNodeName
    }), console.log(this.editingSchedule);
    try {
      if (this.editingSchedule) {
        const r = {
          targetPosition: t.targetPosition,
          startDateTime: t.startDateTime,
          endDateTime: t.endDateTime,
          priority: t.priority || a.DEFAULTS.PRIORITY
        };
        console.log("[PowerSort Debug] Update request:", r), await this.scheduleApi.updateSchedule(this.editingSchedule.id, r);
      } else {
        const r = {
          contentId: this.contentId,
          parentId: this.id,
          targetPosition: t.targetPosition,
          startDateTime: t.startDateTime,
          endDateTime: t.endDateTime,
          priority: t.priority || a.DEFAULTS.PRIORITY
        };
        console.log("[PowerSort Debug] Create request:", r), await this.scheduleApi.createSchedule(r);
      }
      this.closeDialog(), await this.loadSchedules();
    } catch (r) {
      console.error("[PowerSort Debug] Error saving schedule:", r), r instanceof Error && r.message.includes("API Error") ? this.error = `Failed to save schedule: ${r.message}` : this.error = "Failed to save schedule";
    }
  }
  async handleDeleteSchedule(e, t) {
    if (!this.scheduleApi) return;
    e.currentTarget.closest(".js-child-row").classList.remove("hidden");
    try {
      await this.scheduleApi.deleteSchedule(t), await this.loadSchedules();
    } catch (s) {
      o.showError(s, "Failed to delete schedule");
    }
  }
  handleDragOver(e) {
    e.preventDefault(), e.dataTransfer.dropEffect = "move";
  }
  async handleDrop(e, t) {
    e.preventDefault();
    const r = e.dataTransfer.getData("text/plain");
    if (!this.nodeChildren.find((c) => c.id === r) || r === t.id) return;
    const s = this.nodeChildren.findIndex((c) => c.id === r), u = this.nodeChildren.findIndex(
      (c) => c.id === t.id
    ), h = [...this.nodeChildren], [f] = h.splice(s, 1);
    h.splice(u, 0, f), this.nodeChildren = h.map((c, m) => ({
      ...c,
      sortOrder: m
    })), await this.updateSortOrder();
  }
  renderDefaultOrderBanner() {
    if (!this.hasDefaultOrder) return "";
    const e = l`
      <uui-icon
        class="icon"
        name="${a.ICONS.BOOKMARK}"
      ></uui-icon>
      <div class="content">
        <strong>Default Order Saved</strong>
        <p
          style="margin: var(--uui-size-space-1) 0 0 0; font-size: var(--uui-type-small-size);"
        >
          ${this.defaultOrderInfo?.itemCount || 0} items • Last updated:
          ${new Date(this.defaultOrderInfo?.updated).toLocaleDateString()}
          ${this.activeSchedules.length === 0 ? " • Will restore automatically when schedules expire" : ""}
        </p>
      </div>
    `, t = l`
      <uui-button
        look="outline"
        label="Clear"
        compact
        @click=${this.clearDefaultOrder}
      >
        <uui-icon name="${a.ICONS.DELETE}"></uui-icon>
      </uui-button>
    `;
    return this.renderInfoBanner("default", e, t);
  }
  toggleSchedules(e, t) {
    const r = e.currentTarget, i = r.querySelector("uui-symbol-expand");
    Array.from(
      this.renderRoot.querySelectorAll(`#schedule-details-${t}`)
    ).forEach((u) => {
      u.classList.contains("hidden") ? (i.setAttribute("open", ""), u.classList.remove("hidden"), r.setAttribute("active", "true")) : (u.classList.add("hidden"), i.removeAttribute("open"), r.removeAttribute("active"));
    });
  }
  formatDateTime(e) {
    return E.formatDateTime(e);
  }
  filterSchedulesByChild(e) {
    return this.activeSchedules.filter((t) => t.contentId === e);
  }
  renderActiveScheduleBanner(e) {
    if (!e) return "";
    const t = l`
      <uui-icon
        name="${a.ICONS.CALENDAR}"
        style="color: var(--uui-color-positive); font-size: 24px;"
      ></uui-icon>
      <div class="content">
        <strong>Active Schedules</strong>
        <p
          style="margin: var(--uui-size-space-1) 0 0 0; font-size: var(--uui-type-small-size);"
        >
          ${this.activeSchedules.length}
          schedule${this.activeSchedules.length === 1 ? "" : "s"} currently
          active. Some items are automatically sorted to specific positions.
        </p>
      </div>
    `;
    return this.renderInfoBanner("positive", t);
  }
  renderChildrenTable() {
    return this.nodeChildren.length === 0 ? this.renderEmptyState(
      "This node has no children.",
      a.ICONS.DOCUMENT
    ) : l`
      <table class="data-table">
        <thead>
          <tr>
            <th width="50"></th>
            <th width="120">Sort Order</th>
            <th colspan="3">Name</th>
            <th>Create</th>
            <th>View</th>
          </tr>
        </thead>
        <tbody>
          ${this.nodeChildren.map((e, t) => {
      const r = this.getScheduleForChild(e.id);
      return l`
              <tr
                draggable="true"
                @dragstart=${(i) => this.handleDragStart(i, e)}
                @dragend=${this.handleDragEnd}
                @dragover=${this.handleDragOver}
                @drop=${(i) => this.handleDrop(i, e)}
                id="child-row-${t}"
                class="js-child-row"
              >
                <td>
                  <uui-icon
                    class="drag-handle"
                    name="${a.ICONS.NAVIGATION}"
                  ></uui-icon>
                </td>
                <td>
                  <span class="sort-order-badge">${e.sortOrder}</span>
                </td>
                <td colspan="3">
                  <div class="node-icon">
                    <uui-icon
                      name="${e.icon || a.ICONS.DOCUMENT}"
                    ></uui-icon>
                    <strong>${e.name}</strong>
                    ${r ? l`
                          <span
                            class="scheduled-badge"
                            title="Boosted to position ${r.targetPosition} (Priority: ${r.priority})"
                          >
                            <uui-icon name="icon-calendar-alt"></uui-icon>
                            Scheduled
                          </span>
                        ` : ""}
                  </div>
                </td>
                <td>
                  <uui-button
                    look="outline"
                    color="default"
                    label="create new schedule"
                    @click=${() => this.openCreateDialog(e)}
                  >
                    <uui-icon name="add"></uui-icon>

                    Add schedule
                  </uui-button>
                </td>
                <td>
                  ${r ? l`
                        <uui-button
                          look="outline"
                          color="default"
                          @click=${(i) => this.toggleSchedules(i, t)}
                        >
                          <uui-icon name="see"></uui-icon>

                          View
                          Schedule${this.activeSchedules.length > 1 ? "s" : ""}
                          <uui-symbol-expand></uui-symbol-expand>
                        </uui-button>
                      ` : `No active schedules for ${e.name}`}
                </td>
              </tr>
              <table>
                <tr
                  class="schedule-detail-row schedule-detail-head hidden"
                  id="schedule-details-${t}"
                >
                  <th>Priority</th>
                  <th>Edit</th>
                  <th>Delete</th>
                  <th>Sort Order</th>
                  <th>Start time</th>
                  <th>End time</th>
                  <th>Creator</th>
                </tr>
                ${this.filterSchedulesByChild(e.id).map((i) => l`
                    <tr
                      class="schedule-detail-row hidden"
                      id="schedule-details-${t}"
                    >
                      <td>${i?.priority}</td>
                      <td>
                        <uui-button
                          look="outline"
                          label="Edit"
                          @click=${() => this.openEditDialog(i)}
                        >
                          <uui-icon name="icon-edit"></uui-icon>
                        </uui-button>
                      </td>
                      <td>
                        <uui-button
                          look="outline"
                          color="danger"
                          label="Delete"
                          popovertarget="schedule-delete-popover-${i.id}"
                        >
                          <uui-icon name="icon-trash"></uui-icon>
                        </uui-button>
                        <uui-popover-container
                          id="schedule-delete-popover-${i.id}"
                          class="js-popover popover"
                          placement="right-end"
                        >
                          Are you sure you want to delete?
                          <uui-button
                            class="ml-1"
                            label="delete menu item"
                            look="primary"
                            color="danger"
                            @click=${(s) => this.handleDeleteSchedule(s, i.id)}
                          >
                            Yes
                          </uui-button>
                        </uui-popover-container>
                      </td>
                      <td>${i.targetPosition}</td>
                      <td>${this.formatDateTime(i?.startDateTime)}</td>
                      <td>${this.formatDateTime(i?.endDateTime)}</td>
                      <td>
                        Created by ${i.createdByName} on
                        ${this.formatDateTime(i.created)}
                      </td>
                    </tr>
                  `)}
              </table>
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
    return l`
      <div class="dashboard-container">
        <div class="dashboard-header">
          <div class="header-content">
            <h1>${this.parentNodeName} Schedules</h1>
            <p>
              Drag and drop rows to reorder child nodes, or toggle to see
              schedule details
            </p>
          </div>
          <div class="header-actions">
            ${this.hasDefaultOrder ? l`
                  <uui-button
                    look="outline"
                    color="default"
                    label="Restore Default Order"
                    @click=${this.restoreDefaultOrder}
                  >
                    <uui-icon
                      name="${a.ICONS.UNDO}"
                    ></uui-icon>
                    Restore Default
                  </uui-button>
                ` : ""}
            <uui-button
              look="outline"
              color="default"
              label="Save Default Order"
              @click=${this.saveAsDefaultOrder}
            >
              <uui-icon name="${a.ICONS.SAVE}"></uui-icon>
              Save Default Order
            </uui-button>
          </div>
        </div>

        ${this.renderDefaultOrderBanner()}
        ${this.renderActiveScheduleBanner(e)}
        ${this.renderChildrenTable()}
        ${this.showCreateDialog ? l`
              <schedule-dialog
                .parentId=${this.id}
                .schedule=${this.editingSchedule}
                .contentId=${this.contentId}
                .contentName=${this.nodeChildren.find(
      (t) => t.id === this.contentId
    )?.name || ""}
                @save=${this.handleSaveSchedule}
                @cancel=${this.closeDialog}
              >
              </schedule-dialog>
            ` : ""}
      </div>
    `;
  }
};
d.styles = [
  b,
  D`
      :host {
        display: block;
        padding: var(--uui-size-space-5);
      }

      .children-table {
        cursor: move;
      }

      .data-table {
        table-layout: fixed;
        width: 100%;
        border-collapse: collapse;
      }

      .schedule-detail-row.hidden {
        display: none;
      }

      .children-table tbody tr {
        cursor: move;
      }

      .children-table td {
        text-align: center;
      }

      .children-table tbody tr:active {
        opacity: 0.5;
      }

      .node-icon {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-3);
      }

      uui-icon[name="add"] {
        height: 24px;
        width: 24px;
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

      .schedule-detail-row {
        background: var(--uui-palette-white-dark);

        uui-button {
          background: var(--uui-palette-white);
        }
      }

      .schedule-detail-head {
        font-size: var(--uui-size-4);
        background: var(--uui-palette-mine-grey-light);
        color: var(--uui-palette-white-light);
        font-weight: normal;

        th {
          padding: var(--uui-size-space-2) var(--uui-size-space-3);
        }
      }

      .schedule-detail-head:hover {
        background: var(--uui-palette-mine-grey-light) !important;
      }
    `
];
n([
  g({ type: String, attribute: !1, reflect: !1 })
], d.prototype, "id", 2);
n([
  p()
], d.prototype, "parentNodeName", 2);
n([
  p()
], d.prototype, "nodeChildren", 2);
n([
  p()
], d.prototype, "activeSchedules", 2);
n([
  p()
], d.prototype, "hasDefaultOrder", 2);
n([
  p()
], d.prototype, "defaultOrderInfo", 2);
n([
  p()
], d.prototype, "loading", 2);
n([
  p()
], d.prototype, "error", 2);
n([
  g({ type: Boolean })
], d.prototype, "showCreateDialog", 2);
n([
  g({ type: Object })
], d.prototype, "editingSchedule", 2);
n([
  g()
], d.prototype, "contentId", 2);
d = n([
  v("power-sort-children-dashboard")
], d);
export {
  d as default
};
//# sourceMappingURL=children.element-BVv9PQI4.js.map
