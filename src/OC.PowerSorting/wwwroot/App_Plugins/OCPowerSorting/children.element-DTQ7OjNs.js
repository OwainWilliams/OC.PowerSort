import { LitElement as v, html as s, css as m, property as h, state as l, customElement as b } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as y } from "@umbraco-cms/backoffice/element-api";
import { UMB_AUTH_CONTEXT as p } from "@umbraco-cms/backoffice/auth";
import { S as w } from "./schedule-api.client-CYpzemIY.js";
var x = Object.defineProperty, k = Object.getOwnPropertyDescriptor, o = (e, r, t, a) => {
  for (var n = a > 1 ? void 0 : a ? k(r, t) : r, c = e.length - 1, d; c >= 0; c--)
    (d = e[c]) && (n = (a ? d(r, t, n) : d(n)) || n);
  return a && n && x(r, t, n), n;
};
let i = class extends y(v) {
  constructor() {
    super(), this.id = "", this.parentNodeName = "", this.nodeChildren = [], this.activeSchedules = [], this.hasDefaultOrder = !1, this.defaultOrderInfo = null, this.loading = !1, this.error = "", this.hasError = !1, this.errorMessage = "", this.authToken = "";
  }
  isGuid(e) {
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(e);
  }
  async connectedCallback() {
    super.connectedCallback(), this.setupContexts(), this.scheduleApi = new w(() => this.getAuthToken());
    const r = window.location.pathname.split("/").filter(Boolean), t = r[r.length - 1];
    this.isGuid(t) && (this.id = t, this.loadNodeChildren()), this.id && (await this.loadNodeChildren(), await this.loadActiveSchedules(), await this.loadDefaultOrderInfo());
  }
  async loadDefaultOrderInfo() {
    if (this.id)
      try {
        const e = await this.makeAuthenticatedRequest(
          `/umbraco/management/api/v1/oc/power-sorting/default-sort-order/${this.id}`
        );
        e.ok && (this.defaultOrderInfo = await e.json(), this.hasDefaultOrder = this.defaultOrderInfo.isSet);
      } catch (e) {
        console.error("Error loading default order info:", e);
      }
  }
  async saveAsDefaultOrder() {
    if (this.id && confirm("Save the current sort order as the default? This will be restored when all schedules expire."))
      try {
        (await this.makeAuthenticatedRequest(
          "/umbraco/management/api/v1/oc/power-sorting/default-sort-order/save",
          {
            method: "POST",
            body: JSON.stringify({ parentId: this.id })
          }
        )).ok ? (await this.loadDefaultOrderInfo(), alert("Current sort order saved as default!")) : alert("Failed to save default order");
      } catch (e) {
        console.error("Error saving default order:", e), alert("Error saving default order");
      }
  }
  async restoreDefaultOrder() {
    if (this.id && confirm("Restore the default sort order? This will override the current order."))
      try {
        const e = await this.makeAuthenticatedRequest(
          `/umbraco/management/api/v1/oc/power-sorting/default-sort-order/restore/${this.id}`,
          {
            method: "POST"
          }
        );
        if (e.ok)
          await this.loadNodeChildren(), alert("Default sort order restored!");
        else {
          const r = await e.json();
          alert(r.error || "Failed to restore default order");
        }
      } catch (e) {
        console.error("Error restoring default order:", e), alert("Error restoring default order");
      }
  }
  async clearDefaultOrder() {
    if (this.id && confirm("Clear the saved default sort order? You won't be able to restore it anymore."))
      try {
        const e = await this.makeAuthenticatedRequest(
          `/umbraco/management/api/v1/oc/power-sorting/default-sort-order/${this.id}`,
          {
            method: "DELETE"
          }
        );
        e.ok || e.status === 204 ? (await this.loadDefaultOrderInfo(), alert("Default sort order cleared!")) : alert("Failed to clear default order");
      } catch (e) {
        console.error("Error clearing default order:", e), alert("Error clearing default order");
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
    return this.activeSchedules.find((r) => r.contentId === e);
  }
  navigateToSchedules() {
    const e = `/umbraco/section/power-sort/dashboard/power-sort-schedules/${this.id}`;
    history.pushState(null, "", e), window.dispatchEvent(new PopStateEvent("popstate"));
  }
  async setupContexts() {
    try {
      await this.setupAuthContext();
    } catch (e) {
      console.error("Failed to setup contexts:", e), this.hasError = !0, this.errorMessage = "Failed to initialize editor contexts";
    }
  }
  async setupAuthContext() {
    return new Promise((e) => {
      this.consumeContext(p, async (r) => {
        try {
          const t = r?.getOpenApiConfiguration?.();
          t?.token && (this.authToken = await t.token()), e();
        } catch (t) {
          console.error("Failed to setup auth context:", t), this.hasError = !0, this.errorMessage = "Failed to authenticate", e();
        }
      }).asPromise({ preventTimeout: !0 }).catch(() => {
        console.error("Auth context not available"), this.hasError = !0, this.errorMessage = "Failed to access authentication context", e();
      });
    });
  }
  async makeAuthenticatedRequest(e, r = {}) {
    const t = await this.getAuthToken(), a = new Headers(r.headers);
    return a.set("Content-Type", "application/json"), t && a.set("Authorization", `Bearer ${t}`), fetch(e, {
      ...r,
      headers: a
    });
  }
  async getAuthToken() {
    try {
      let e = this.authToken;
      if (!e) {
        const r = await this.getContext(p);
        if (r) {
          const t = r.getOpenApiConfiguration?.();
          t?.token && (e = await t.token() ?? "", e != "" && (this.authToken = e));
        }
      }
      return e;
    } catch (e) {
      return console.error("Failed to get auth token:", e), "";
    }
  }
  async updated(e) {
    super.updated(e), e.has("id") && this.id && await this.loadNodeChildren();
  }
  async loadNodeChildren() {
    if (this.id) {
      this.loading = !0, this.error = "";
      try {
        const e = await this.makeAuthenticatedRequest(`/umbraco/management/api/v1/oc/power-sorting/children/${this.id}`);
        if (!e.ok)
          throw new Error("Failed to load children");
        const r = await e.json(), t = await this.makeAuthenticatedRequest(`/umbraco/management/api/v1/document/${this.id}`);
        if (t.ok) {
          const a = await t.json();
          this.parentNodeName = a.variants?.[0]?.name || "Unknown Node";
        }
        this.nodeChildren = r.items?.map((a) => ({
          id: a.id,
          name: a.name,
          sortOrder: a.sortOrder,
          contentTypeAlias: a.documentType?.id,
          icon: a.documentType?.icon || "icon-document"
        })) || [], await this.loadActiveSchedules();
      } catch (e) {
        this.error = e instanceof Error ? e.message : "An error occurred", console.error("Error loading children:", e);
      } finally {
        this.loading = !1;
      }
    }
  }
  async updateSortOrder() {
    if (this.id)
      try {
        const e = this.nodeChildren.map((t, a) => ({
          id: t.id,
          sortOrder: a
        }));
        if (!(await this.makeAuthenticatedRequest("/umbraco/management/api/v1/oc/power-sorting/sort/document", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            parent: { id: this.id },
            sorting: e
          })
        })).ok)
          throw new Error("Failed to update sort order");
        await this.loadNodeChildren();
      } catch (e) {
        console.error("Error updating sort order:", e), this.error = "Failed to update sort order";
      }
  }
  handleDragStart(e, r) {
    e.dataTransfer.effectAllowed = "move", e.dataTransfer.setData("text/plain", r.id), e.target.style.opacity = "0.5";
  }
  handleDragEnd(e) {
    e.target.style.opacity = "1";
  }
  handleDragOver(e) {
    e.preventDefault(), e.dataTransfer.dropEffect = "move";
  }
  async handleDrop(e, r) {
    e.preventDefault();
    const t = e.dataTransfer.getData("text/plain");
    if (!this.nodeChildren.find((u) => u.id === t) || t === r.id) return;
    const n = this.nodeChildren.findIndex((u) => u.id === t), c = this.nodeChildren.findIndex((u) => u.id === r.id), d = [...this.nodeChildren], [f] = d.splice(n, 1);
    d.splice(c, 0, f), this.nodeChildren = d.map((u, g) => ({
      ...u,
      sortOrder: g
    })), await this.updateSortOrder();
  }
  render() {
    if (this.loading)
      return s`
        <div class="dashboard-container">
          <div class="loading">
            <uui-loader></uui-loader>
            <p>Loading children...</p>
          </div>
        </div>
      `;
    if (this.error)
      return s`
        <div class="dashboard-container">
          <div class="error">
            <uui-icon name="icon-alert"></uui-icon>
            <p>${this.error}</p>
            <uui-button @click=${this.loadNodeChildren}>
              Retry
            </uui-button>
          </div>
        </div>
      `;
    const e = this.activeSchedules.length > 0;
    return s`
      <div class="dashboard-container">
        <div class="dashboard-header">
          <div class="header-content">
            <h1>Sort Children of: ${this.parentNodeName}</h1>
            <p>Drag and drop rows to reorder child nodes</p>
          </div>
          <div class="header-actions">
            ${this.hasDefaultOrder ? s`
                  <uui-button
                    look="outline"
                    color="default"
                    label="Restore Default Order"
                    @click=${this.restoreDefaultOrder}>
                    <uui-icon name="icon-undo"></uui-icon>
                    Restore Default
                  </uui-button>
                ` : ""}
            <uui-button
              look="outline"
              color="default"
              label="Save as Default"
              @click=${this.saveAsDefaultOrder}>
              <uui-icon name="icon-save"></uui-icon>
              Save as Default
            </uui-button>
            <uui-button
              look="primary"
              color="default"
              label="Manage Schedules"
              @click=${this.navigateToSchedules}>
              <uui-icon name="icon-calendar"></uui-icon>
              Manage Schedules
            </uui-button>
          </div>
        </div>

        ${this.hasDefaultOrder ? s`
              <div class="default-order-info">
                <uui-icon class="icon" name="icon-bookmark"></uui-icon>
                <div class="content">
                  <strong>Default Order Saved</strong>
                  <p style="margin: var(--uui-size-space-1) 0 0 0; font-size: var(--uui-type-small-size);">
                    ${this.defaultOrderInfo?.itemCount || 0} items • 
                    Last updated: ${new Date(this.defaultOrderInfo?.updated).toLocaleDateString()}
                    ${this.activeSchedules.length === 0 ? " • Will restore automatically when schedules expire" : ""}
                  </p>
                </div>
                <div class="default-order-actions">
                  <uui-button
                    look="outline"
                    label="Clear"
                    compact
                    @click=${this.clearDefaultOrder}>
                    <uui-icon name="icon-delete"></uui-icon>
                  </uui-button>
                </div>
              </div>
            ` : ""}

        ${e ? s`
              <div class="schedule-banner">
                <uui-icon name="icon-calendar" style="color: var(--uui-color-positive); font-size: 24px;"></uui-icon>
                <div class="schedule-banner-content">
                  <strong>Active Schedules</strong>
                  <p style="margin: var(--uui-size-space-1) 0 0 0; font-size: var(--uui-type-small-size);">
                    ${this.activeSchedules.length} schedule${this.activeSchedules.length === 1 ? "" : "s"} currently active.
                    Some items are automatically sorted to specific positions.
                  </p>
                </div>
                <uui-button
                  look="outline"
                  label="View Schedules"
                  @click=${this.navigateToSchedules}>
                  View Details
                </uui-button>
              </div>
            ` : ""}

        ${this.nodeChildren.length > 0 ? s`
          <table class="children-table">
            <thead>
              <tr>
                <th width="50"></th>
                <th>Name</th>
                <th>Content Type</th>
                <th width="120">Sort Order</th>
              </tr>
            </thead>
            <tbody>
              ${this.nodeChildren.map((r) => {
      const t = this.getScheduleForChild(r.id);
      return s`
                  <tr 
                    draggable="true"
                    @dragstart=${(a) => this.handleDragStart(a, r)}
                    @dragend=${this.handleDragEnd}
                    @dragover=${this.handleDragOver}
                    @drop=${(a) => this.handleDrop(a, r)}>
                    <td>
                      <uui-icon class="drag-handle" name="icon-navigation"></uui-icon>
                    </td>
                    <td>
                      <div class="node-icon">
                        <uui-icon name="${r.icon || "icon-document"}"></uui-icon>
                        <strong>${r.name}</strong>
                        ${t ? s`
                              <span class="scheduled-badge" title="Boosted to position ${t.targetPosition} (Priority: ${t.priority})">
                                <uui-icon name="icon-calendar-alt"></uui-icon>
                                Scheduled
                              </span>
                            ` : ""}
                      </div>
                    </td>
                    <td>${r.contentTypeAlias || "N/A"}</td>
                    <td>
                      <span class="sort-order-badge">${r.sortOrder}</span>
                    </td>
                  </tr>
                `;
    })}
            </tbody>
          </table>
        ` : s`
          <div class="no-children">
            <uui-icon name="icon-folder"></uui-icon>
            <p>This node has no children.</p>
          </div>
        `}
      </div>
    `;
  }
};
i.styles = m`
    :host {
      display: block;
      padding: var(--uui-size-space-5);
    }

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

    .default-order-info {
      background: var(--uui-color-default-emphasis);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-3);
      margin-bottom: var(--uui-size-space-4);
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
    }

    .default-order-info .icon {
      color: var(--uui-color-default);
      font-size: 20px;
    }

    .default-order-info .content {
      flex: 1;
    }

    .default-order-actions {
      display: flex;
      gap: var(--uui-size-space-2);
    }

    .schedule-banner {
      background: var(--uui-color-positive-emphasis);
      border: 1px solid var(--uui-color-positive);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-4);
      margin-bottom: var(--uui-size-space-4);
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
    }

    .schedule-banner-content {
      flex: 1;
    }

    .schedule-indicator {
      display: inline-flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
      background: var(--uui-color-positive);
      color: white;
      border-radius: var(--uui-border-radius);
      font-size: var(--uui-type-small-size);
      font-weight: 600;
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

    .loading,
    .error,
    .no-children {
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

    .children-table {
      width: 100%;
      border-collapse: collapse;
      background: var(--uui-color-surface);
      border-radius: var(--uui-border-radius);
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .children-table thead {
      background: var(--uui-color-surface-alt);
    }

    .children-table th {
      padding: var(--uui-size-space-4);
      text-align: left;
      font-weight: 600;
      border-bottom: 2px solid var(--uui-color-border);
    }

    .children-table td {
      padding: var(--uui-size-space-4);
      border-bottom: 1px solid var(--uui-color-border);
    }

    .children-table tbody tr {
      cursor: move;
      transition: all 0.2s;
    }

    .children-table tbody tr:hover {
      background: var(--uui-color-surface-emphasis);
    }

    .children-table tbody tr:active {
      opacity: 0.5;
    }

    .children-table tbody tr:last-child td {
      border-bottom: none;
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
  `;
o([
  h({ type: String, attribute: !1, reflect: !1 })
], i.prototype, "id", 2);
o([
  l()
], i.prototype, "parentNodeName", 2);
o([
  l()
], i.prototype, "nodeChildren", 2);
o([
  l()
], i.prototype, "activeSchedules", 2);
o([
  l()
], i.prototype, "hasDefaultOrder", 2);
o([
  l()
], i.prototype, "defaultOrderInfo", 2);
o([
  l()
], i.prototype, "loading", 2);
o([
  l()
], i.prototype, "error", 2);
o([
  h({ type: Boolean })
], i.prototype, "hasError", 2);
o([
  h({ type: String })
], i.prototype, "errorMessage", 2);
o([
  h({ type: String })
], i.prototype, "authToken", 2);
i = o([
  b("power-sort-children-dashboard")
], i);
export {
  i as default
};
//# sourceMappingURL=children.element-DTQ7OjNs.js.map
