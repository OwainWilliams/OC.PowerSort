import { LitElement as f, html as c, css as m, property as l, state as u, customElement as v } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as y } from "@umbraco-cms/backoffice/element-api";
import { UMB_AUTH_CONTEXT as p } from "@umbraco-cms/backoffice/auth";
var w = Object.defineProperty, x = Object.getOwnPropertyDescriptor, n = (e, r, t, o) => {
  for (var i = o > 1 ? void 0 : o ? x(r, t) : r, h = e.length - 1, d; h >= 0; h--)
    (d = e[h]) && (i = (o ? d(r, t, i) : d(i)) || i);
  return o && i && w(r, t, i), i;
};
let a = class extends y(f) {
  constructor() {
    super(), this.id = "", this.parentNodeName = "", this.nodeChildren = [], this.loading = !1, this.error = "", this.hasError = !1, this.errorMessage = "", this.authToken = "";
  }
  isGuid(e) {
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(e);
  }
  async connectedCallback() {
    super.connectedCallback(), this.setupContexts();
    const r = window.location.pathname.split("/").filter(Boolean), t = r[r.length - 1];
    this.isGuid(t) && (this.id = t, this.loadNodeChildren()), this.id && await this.loadNodeChildren();
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
    const t = await this.getAuthToken(), o = new Headers(r.headers);
    return o.set("Content-Type", "application/json"), t && o.set("Authorization", `Bearer ${t}`), fetch(e, {
      ...r,
      headers: o
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
          const o = await t.json();
          this.parentNodeName = o.variants?.[0]?.name || "Unknown Node";
        }
        this.nodeChildren = r.items?.map((o) => ({
          id: o.id,
          name: o.name,
          sortOrder: o.sortOrder,
          contentTypeAlias: o.documentType?.id,
          // You might want to fetch the alias separately
          icon: o.documentType?.icon || "icon-document"
        })) || [];
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
        const e = this.nodeChildren.map((t, o) => ({
          id: t.id,
          sortOrder: o
        }));
        if (!(await this.makeAuthenticatedRequest("/umbraco/management/api/v1/sort/document", {
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
    if (!this.nodeChildren.find((s) => s.id === t) || t === r.id) return;
    const i = this.nodeChildren.findIndex((s) => s.id === t), h = this.nodeChildren.findIndex((s) => s.id === r.id), d = [...this.nodeChildren], [g] = d.splice(i, 1);
    d.splice(h, 0, g), this.nodeChildren = d.map((s, b) => ({
      ...s,
      sortOrder: b
    })), await this.updateSortOrder();
  }
  render() {
    return this.loading ? c`
        <div class="dashboard-container">
          <div class="loading">
            <uui-loader></uui-loader>
            <p>Loading children...</p>
          </div>
        </div>
      ` : this.error ? c`
        <div class="dashboard-container">
          <div class="error">
            <uui-icon name="icon-alert"></uui-icon>
            <p>${this.error}</p>
            <uui-button @click=${this.loadNodeChildren}>
              Retry
            </uui-button>
          </div>
        </div>
      ` : c`
      <div class="dashboard-container">
        <div class="dashboard-header">
          <h1>Sort Children of: ${this.parentNodeName}</h1>
          <p>Drag and drop rows to reorder child nodes</p>
        </div>

        ${this.nodeChildren.length > 0 ? c`
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
              ${this.nodeChildren.map((e) => c`
                <tr 
                  draggable="true"
                  @dragstart=${(r) => this.handleDragStart(r, e)}
                  @dragend=${this.handleDragEnd}
                  @dragover=${this.handleDragOver}
                  @drop=${(r) => this.handleDrop(r, e)}>
                  <td>
                    <uui-icon class="drag-handle" name="icon-navigation"></uui-icon>
                  </td>
                  <td>
                    <div class="node-icon">
                      <uui-icon name="${e.icon || "icon-document"}"></uui-icon>
                      <strong>${e.name}</strong>
                    </div>
                  </td>
                  <td>${e.contentTypeAlias || "N/A"}</td>
                  <td>
                    <span class="sort-order-badge">${e.sortOrder}</span>
                  </td>
                </tr>
              `)}
            </tbody>
          </table>
        ` : c`
          <div class="no-children">
            <uui-icon name="icon-folder"></uui-icon>
            <p>This node has no children.</p>
          </div>
        `}
      </div>
    `;
  }
};
a.styles = m`
    :host {
      display: block;
      padding: var(--uui-size-space-5);
    }

    .dashboard-container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .dashboard-header {
      margin-bottom: var(--uui-size-space-6);
    }

    .dashboard-header h1 {
      margin: 0 0 var(--uui-size-space-2) 0;
      font-size: var(--uui-type-h3-size);
    }

    .dashboard-header p {
      color: var(--uui-color-text-alt);
      margin: 0;
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
      color: var(--uui-color-positive);
    }

    .drag-handle {
      color: var(--uui-color-text-alt);
      cursor: grab;
    }

    .drag-handle:active {
      cursor: grabbing;
    }
  `;
n([
  l({ type: String, attribute: !1, reflect: !1 })
], a.prototype, "id", 2);
n([
  u()
], a.prototype, "parentNodeName", 2);
n([
  u()
], a.prototype, "nodeChildren", 2);
n([
  u()
], a.prototype, "loading", 2);
n([
  u()
], a.prototype, "error", 2);
n([
  l({ type: Boolean })
], a.prototype, "hasError", 2);
n([
  l({ type: String })
], a.prototype, "errorMessage", 2);
n([
  l({ type: String })
], a.prototype, "authToken", 2);
a = n([
  v("power-sort-children-dashboard")
], a);
export {
  a as default
};
//# sourceMappingURL=children.element-ERDTc107.js.map
