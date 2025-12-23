import { LitElement as u, html as i, css as h, property as p, state as c, customElement as b } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as g } from "@umbraco-cms/backoffice/element-api";
var v = Object.defineProperty, m = Object.getOwnPropertyDescriptor, n = (r, e, o, a) => {
  for (var t = a > 1 ? void 0 : a ? m(e, o) : e, s = r.length - 1, l; s >= 0; s--)
    (l = r[s]) && (t = (a ? l(e, o, t) : l(t)) || t);
  return a && t && v(e, o, t), t;
};
let d = class extends g(u) {
  constructor() {
    super(), this.id = "", this.parentNodeName = "", this.nodeChildren = [], this.loading = !1, this.error = "";
  }
  async connectedCallback() {
    super.connectedCallback(), this.id && await this.loadNodeChildren();
  }
  async updated(r) {
    super.updated(r), r.has("id") && this.id && await this.loadNodeChildren();
  }
  async loadNodeChildren() {
    if (this.id) {
      this.loading = !0, this.error = "";
      try {
        const r = await fetch(`/umbraco/management/api/v1/document/${this.id}/children?skip=0&take=100`);
        if (!r.ok)
          throw new Error("Failed to load children");
        const e = await r.json(), o = await fetch(`/umbraco/management/api/v1/document/${this.id}`);
        if (o.ok) {
          const a = await o.json();
          this.parentNodeName = a.variants?.[0]?.name || "Unknown Node";
        }
        this.nodeChildren = e.items?.map((a) => ({
          id: a.id,
          name: a.variants?.[0]?.name || "Unnamed",
          sortOrder: a.sortOrder || 0,
          contentTypeAlias: a.documentType?.alias,
          icon: a.documentType?.icon || "icon-document"
        })) || [], this.nodeChildren.sort((a, t) => a.sortOrder - t.sortOrder);
      } catch (r) {
        this.error = r instanceof Error ? r.message : "An error occurred", console.error("Error loading children:", r);
      } finally {
        this.loading = !1;
      }
    }
  }
  async updateSortOrder(r, e) {
    try {
      if (!(await fetch(`/umbraco/management/api/v1/document/${r}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sortOrder: e
        })
      })).ok)
        throw new Error("Failed to update sort order");
      await this.loadNodeChildren();
    } catch (o) {
      console.error("Error updating sort order:", o), this.error = "Failed to update sort order";
    }
  }
  handleDragStart(r, e) {
    r.dataTransfer.effectAllowed = "move", r.dataTransfer.setData("text/plain", e.id);
  }
  handleDragOver(r) {
    r.preventDefault(), r.dataTransfer.dropEffect = "move";
  }
  async handleDrop(r, e) {
    r.preventDefault();
    const o = r.dataTransfer.getData("text/plain"), a = this.nodeChildren.find((l) => l.id === o);
    if (!a || o === e.id) return;
    const t = a.sortOrder, s = e.sortOrder;
    await this.updateSortOrder(o, s), await this.updateSortOrder(e.id, t);
  }
  render() {
    return this.loading ? i`
        <div class="dashboard-container">
          <div class="loading">
            <uui-loader></uui-loader>
            <p>Loading children...</p>
          </div>
        </div>
      ` : this.error ? i`
        <div class="dashboard-container">
          <div class="error">
            <uui-icon name="icon-alert"></uui-icon>
            <p>${this.error}</p>
            <uui-button @click=${this.loadNodeChildren}>
              Retry
            </uui-button>
          </div>
        </div>
      ` : i`
      <div class="dashboard-container">
        <div class="dashboard-header">
          <h1>Sort Children of: ${this.parentNodeName}</h1>
          <p>Drag and drop rows to reorder child nodes</p>
        </div>

        ${this.nodeChildren.length > 0 ? i`
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
              ${this.nodeChildren.map((r) => i`
                <tr 
                  draggable="true"
                  @dragstart=${(e) => this.handleDragStart(e, r)}
                  @dragover=${this.handleDragOver}
                  @drop=${(e) => this.handleDrop(e, r)}>
                  <td>
                    <uui-icon class="drag-handle" name="icon-navigation"></uui-icon>
                  </td>
                  <td>
                    <div class="node-icon">
                      <uui-icon name="${r.icon || "icon-document"}"></uui-icon>
                      <strong>${r.name}</strong>
                    </div>
                  </td>
                  <td>${r.contentTypeAlias || "N/A"}</td>
                  <td>
                    <span class="sort-order-badge">${r.sortOrder}</span>
                  </td>
                </tr>
              `)}
            </tbody>
          </table>
        ` : i`
          <div class="no-children">
            <uui-icon name="icon-folder"></uui-icon>
            <p>This node has no children.</p>
          </div>
        `}
      </div>
    `;
  }
};
d.styles = h`
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
      transition: background-color 0.2s;
    }

    .children-table tbody tr:hover {
      background: var(--uui-color-surface-emphasis);
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
      cursor: move;
    }
  `;
n([
  p({ type: String, attribute: !1, reflect: !1 })
], d.prototype, "id", 2);
n([
  c()
], d.prototype, "parentNodeName", 2);
n([
  c()
], d.prototype, "nodeChildren", 2);
n([
  c()
], d.prototype, "loading", 2);
n([
  c()
], d.prototype, "error", 2);
d = n([
  b("power-sort-children-dashboard")
], d);
export {
  d as default
};
//# sourceMappingURL=children.element-BQxPfkvv.js.map
