import { html as d, LitElement as p, css as h, state as u, property as g, customElement as y } from "@umbraco-cms/backoffice/external/lit";
import { U as f, P as s, A as l, b as v } from "./api-response.utils-CwOHzmUr.js";
import { U as b } from "./ui.mixin-CNYLBGOM.js";
import { p as P } from "./shared.styles-7p8CFe0X.js";
var E = Object.defineProperty, w = Object.getOwnPropertyDescriptor, n = (i, r, t, e) => {
  for (var a = e > 1 ? void 0 : e ? w(r, t) : r, m = i.length - 1, c; m >= 0; m--)
    (c = i[m]) && (a = (e ? c(r, t, a) : c(a)) || a);
  return e && a && E(r, t, a), a;
};
let o = class extends b(f(p)) {
  constructor() {
    super(...arguments), this.enumPriorities = [], this.priorityOptions = [], this.loading = !1, this.error = "", this.showCreateDialog = !1, this.editingItem = null, this.formData = {
      name: "",
      sortPriority: 100
    }, this.formErrors = {};
  }
  async connectedCallback() {
    super.connectedCallback(), await this.loadEnumPriorities(), await this.loadPriorityOptions();
  }
  async loadEnumPriorities() {
    this.loading = !0, this.error = "";
    try {
      const i = await this.makeAuthenticatedRequest(
        `${s.API_BASE}/enum-priorities`
      ), r = await l.handleResponse(i);
      this.enumPriorities = r.items || [];
    } catch (i) {
      this.error = i instanceof Error ? i.message : "Failed to load enum priorities", console.error("Error loading enum priorities:", i);
    } finally {
      this.loading = !1;
    }
  }
  openCreateDialog() {
    this.editingItem = null, this.formData = {
      name: "",
      sortPriority: this.getNextAvailablePriority()
    }, this.formErrors = {}, this.showCreateDialog = !0;
  }
  openEditDialog(i) {
    this.editingItem = i, this.formData = {
      name: i.name,
      sortPriority: i.sortPriority
    }, this.formErrors = {}, this.showCreateDialog = !0;
  }
  closeDialog() {
    this.showCreateDialog = !1, this.editingItem = null, this.formData = { name: "", sortPriority: 100 }, this.formErrors = {};
  }
  getNextAvailablePriority() {
    if (this.enumPriorities.length === 0) return 100;
    const i = new Set(this.enumPriorities.map((t) => t.sortPriority));
    let r = 100;
    for (; i.has(r); )
      r += 100;
    return r;
  }
  validateForm() {
    this.formErrors = {};
    let i = !0;
    this.formData.name.trim() ? this.formData.name.trim().length < 2 ? (this.formErrors.name = "Name must be at least 2 characters", i = !1) : this.formData.name.trim().length > 100 && (this.formErrors.name = "Name must be less than 100 characters", i = !1) : (this.formErrors.name = "Name is required", i = !1), this.enumPriorities.find(
      (e) => e.name.toLowerCase() === this.formData.name.trim().toLowerCase() && (!this.editingItem || e.id !== this.editingItem.id)
    ) && (this.formErrors.name = `Name '${this.formData.name.trim()}' is already in use`, i = !1), this.formData.sortPriority < 0 ? (this.formErrors.sortPriority = "Sort priority must be 0 or greater", i = !1) : this.formData.sortPriority > 999999 && (this.formErrors.sortPriority = "Sort priority must be less than 1,000,000", i = !1);
    const t = this.enumPriorities.find(
      (e) => e.sortPriority === this.formData.sortPriority && (!this.editingItem || e.id !== this.editingItem.id)
    );
    return t && (this.formErrors.sortPriority = `Sort priority ${this.formData.sortPriority} is already in use by '${t.name}'`, i = !1), this.requestUpdate(), i;
  }
  async saveItem() {
    if (this.validateForm())
      try {
        let i;
        if (this.editingItem) {
          const t = {
            name: this.formData.name.trim(),
            sortPriority: this.formData.sortPriority
          };
          i = await this.makeAuthenticatedRequest(
            `${s.API_BASE}/enum-priorities/${this.editingItem.id}`,
            {
              method: "PUT",
              body: JSON.stringify(t)
            }
          );
        } else
          i = await this.makeAuthenticatedRequest(
            `${s.API_BASE}/enum-priorities`,
            {
              method: "POST",
              body: JSON.stringify(this.formData)
            }
          );
        await l.handleResponse(i), await this.loadEnumPriorities(), this.closeDialog();
        const r = this.editingItem ? "updated" : "created";
        l.showSuccess(`Enum priority ${r} successfully!`);
      } catch (i) {
        i instanceof Error && i.message.includes("already in use") ? (i.message.includes("Sort priority") ? this.formErrors.sortPriority = i.message : i.message.includes("Name") && (this.formErrors.name = i.message), this.requestUpdate()) : l.showError(i, `Failed to ${this.editingItem ? "update" : "create"} enum priority`);
      }
  }
  async deleteItem(i) {
    if (l.confirmAction(`Are you sure you want to delete '${i.name}'? This action cannot be undone.`))
      try {
        const r = await this.makeAuthenticatedRequest(
          `${s.API_BASE}/enum-priorities/${i.id}`,
          { method: "DELETE" }
        );
        await l.handleResponse(r), await this.loadEnumPriorities(), l.showSuccess("Enum priority deleted successfully!");
      } catch (r) {
        l.showError(r, "Failed to delete enum priority");
      }
  }
  handleFormInput(i, r) {
    const t = i.target;
    r === "sortPriority" ? this.formData = {
      ...this.formData,
      [r]: parseInt(t.value) || 0
    } : this.formData = {
      ...this.formData,
      [r]: t.value
    }, this.formErrors[r] && (this.formErrors = {
      ...this.formErrors,
      [r]: ""
    }, this.requestUpdate());
  }
  async loadPriorityOptions() {
    try {
      console.log("[PowerSort Debug] Loading priority options from EnumPriorityAPIController...");
      const i = await fetch(v(s.ENDPOINTS.ENUM_PRIORITIES), {
        headers: {
          Authorization: `Bearer ${this.authToken}`,
          "Content-Type": "application/json"
        }
      });
      if (i.ok) {
        const r = await i.json();
        console.log("[PowerSort Debug] Priority options response:", r);
        const t = Array.isArray(r) ? r : r.items || [];
        t.length > 0 ? (this.priorityOptions = t.sort((e, a) => e.sortPriority - a.sortPriority).map((e) => ({
          value: e.sortPriority,
          // Use the sortPriority as the value
          label: e.name
        })), console.log("[PowerSort Debug] Mapped priority options:", this.priorityOptions)) : console.log("[PowerSort Debug] No priority options found in response");
      } else
        console.error("[PowerSort Debug] Failed to load priority options:", i.status, i.statusText);
    } catch (i) {
      console.error("[PowerSort Debug] Error loading priority options:", i);
    }
  }
  renderDialog() {
    if (!this.showCreateDialog) return "";
    const i = this.editingItem ? "Edit Enum Priority" : "Create Enum Priority", r = this.editingItem ? "Update" : "Create";
    return d`
      <uui-modal-dialog 
        headline="${i}"
        class="enum-priority-dialog">
        <div class="dialog-content">
          <div class="form-field">
            <uui-label for="name-input" slot="label" required>Name</uui-label>
            <uui-input
              id="name-input"
              type="text"
              placeholder="e.g., High Priority"
              .value=${this.formData.name}
              @input=${(t) => this.handleFormInput(t, "name")}
              ?error=${!!this.formErrors.name}
              maxlength="100">
            </uui-input>
            ${this.formErrors.name ? d`
              <div class="error-message">${this.formErrors.name}</div>
            ` : ""}
          </div>

          <div class="form-field">
            <uui-label for="priority-input" slot="label" required>Sort Priority (Weight)</uui-label>
            <uui-input
              id="priority-input"
              type="number"
              placeholder="100"
              min="0"
              max="999999"
              .value=${this.formData.sortPriority.toString()}
              @input=${(t) => this.handleFormInput(t, "sortPriority")}
              ?error=${!!this.formErrors.sortPriority}>
            </uui-input>
            <div class="field-description">
              Higher numbers = higher priority. Each weight can only be used once.
            </div>
            ${this.formErrors.sortPriority ? d`
              <div class="error-message">${this.formErrors.sortPriority}</div>
            ` : ""}
          </div>

          <!-- Actions moved inside content -->
          <div class="dialog-actions">
            <uui-button
              label="Cancel"
              look="secondary"
              @click=${this.closeDialog}>
              Cancel
            </uui-button>
            <uui-button
              label="${r}"
              look="primary"
              color="positive"
              @click=${this.saveItem}>
              ${r}
            </uui-button>
          </div>
        </div>
      </uui-modal-dialog>
    `;
  }
  renderEnumPrioritiesTable() {
    return this.enumPriorities.length === 0 ? this.renderEmptyState(
      "No enum priorities have been created yet.",
      s.ICONS.SETTINGS
    ) : d`
      <table class="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th width="120">Sort Priority</th>
            <th width="150">Created</th>
            <th width="150">Updated</th>
            <th width="120">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${this.enumPriorities.map((i) => d`
            <tr>
              <td>
                <div class="item-name">
                  <strong>${i.name}</strong>
                </div>
              </td>
              <td>
                <span class="priority-badge priority-${this.getPriorityLevel(i.sortPriority)}">
                  ${i.sortPriority}
                </span>
              </td>
              <td>
                <div class="date-info">
                  <div>${new Date(i.created).toLocaleDateString()}</div>
                  <small>by ${i.createdByName}</small>
                </div>
              </td>
              <td>
                <div class="date-info">
                  <div>${new Date(i.updated).toLocaleDateString()}</div>
                  <small>by ${i.updatedByName}</small>
                </div>
              </td>
              <td>
                <div class="action-buttons">
                  <uui-button
                    compact
                    look="outline"
                    label="Edit"
                    @click=${() => this.openEditDialog(i)}>
                    <uui-icon name="${s.ICONS.EDIT}"></uui-icon>
                  </uui-button>
                  <uui-button
                    compact
                    look="outline"
                    color="danger"
                    label="Delete"
                    @click=${() => this.deleteItem(i)}>
                    <uui-icon name="${s.ICONS.DELETE}"></uui-icon>
                  </uui-button>
                </div>
              </td>
            </tr>
          `)}
        </tbody>
      </table>
    `;
  }
  getPriorityLevel(i) {
    return i >= 500 ? "high" : i >= 200 ? "medium" : "low";
  }
  render() {
    return this.loading ? this.renderLoadingState("Loading enum priorities...") : this.error ? this.renderErrorState(this.error, () => this.loadEnumPriorities()) : d`
      <div class="dashboard-container">
        <div class="dashboard-header">
          <div class="header-content">
            <h1>Enum Priorities</h1>
            <p>Manage priority enum values and their weights. Higher numbers get higher priority.</p>
          </div>
          <div class="header-actions">
            <uui-button
              look="primary"
              color="positive"
              label="Create Priority"
              @click=${this.openCreateDialog}>
              <uui-icon name="${s.ICONS.ADD}"></uui-icon>
              Create Priority
            </uui-button>
          </div>
        </div>

        ${this.renderEnumPrioritiesTable()}
        ${this.renderDialog()}
      </div>
    `;
  }
};
o.styles = [
  P,
  h`
      :host {
        display: block;
        padding: var(--uui-size-space-5);
      }

      .enum-priority-dialog {
        --uui-modal-dialog-max-width: 800px;
        --uui-modal-dialog-min-width: 600px;
        --uui-modal-dialog-max-height: 600px;
        --uui-modal-dialog-min-height: 400px;
      }

      .dialog-content {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-4);
        padding: var(--uui-size-space-4);
        min-height: 300px; /* Ensures content area has minimum height */
        overflow-y: auto; /* Allows scrolling if content is too tall */
      }

      .form-field {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-2);
      }

      .field-description {
        font-size: var(--uui-type-small-size);
        color: var(--uui-color-text-alt);
      }

      .error-message {
        color: var(--uui-color-danger);
        font-size: var(--uui-type-small-size);
        margin-top: var(--uui-size-space-1);
      }

      .item-name strong {
        color: var(--uui-color-text);
      }

      .priority-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 48px;
        height: 32px;
        padding: 0 var(--uui-size-space-2);
        border-radius: var(--uui-border-radius);
        font-weight: 600;
        font-size: var(--uui-type-small-size);
      }

      .priority-high {
        background: var(--uui-color-danger);
        color: white;
      }

      .priority-medium {
        background: var(--uui-color-warning);
        color: white;
      }

      .priority-low {
        background: var(--uui-color-positive);
        color: white;
      }

      .date-info {
        font-size: var(--uui-type-small-size);
      }

      .date-info small {
        color: var(--uui-color-text-alt);
      }

      .action-buttons {
        display: flex;
        gap: var(--uui-size-space-2);
      }

      /* Priority Selection Styles */
      .priority-selection-section {
        margin-top: var(--uui-size-space-6);
        padding: var(--uui-size-space-4);
        background: var(--uui-color-surface);
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
      }

      .section-header {
        margin-bottom: var(--uui-size-space-4);
      }

      .section-header h2 {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-2);
        margin: 0 0 var(--uui-size-space-1) 0;
        color: var(--uui-color-text);
      }

      .section-header p {
        margin: 0;
        color: var(--uui-color-text-alt);
        font-size: var(--uui-type-small-size);
      }

      .priority-loading {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-2);
        padding: var(--uui-size-space-4);
        color: var(--uui-color-text-alt);
      }

      .no-priority-options {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--uui-size-space-2);
        padding: var(--uui-size-space-5);
        text-align: center;
        color: var(--uui-color-text-alt);
      }

      .radio-options {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: var(--uui-size-space-3);
      }

      .radio-option {
        display: flex;
        align-items: flex-start;
        gap: var(--uui-size-space-2);
        padding: var(--uui-size-space-3);
        border: 2px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
        background: var(--uui-color-surface);
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .radio-option:hover {
        border-color: var(--uui-color-selected);
        background: var(--uui-color-selected-alt);
      }

      .radio-option.selected {
        border-color: var(--uui-color-selected);
        background: var(--uui-color-selected-alt);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .radio-option input[type="radio"] {
        margin: var(--uui-size-space-1) 0 0 0;
        accent-color: var(--uui-color-selected);
      }

      .radio-content {
        flex: 1;
      }

      .radio-label {
        font-weight: 600;
        color: var(--uui-color-text);
        margin-bottom: var(--uui-size-space-1);
      }

      .radio-priority {
        font-size: var(--uui-type-small-size);
        color: var(--uui-color-text-alt);
        margin-bottom: var(--uui-size-space-1);
      }

      .priority-level-badge {
        display: inline-block;
        padding: 2px var(--uui-size-space-2);
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .priority-info {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-2);
        margin-top: var(--uui-size-space-3);
        padding: var(--uui-size-space-2) 0;
        color: var(--uui-color-text-alt);
        font-size: var(--uui-type-small-size);
      }
    `
];
n([
  u()
], o.prototype, "enumPriorities", 2);
n([
  g({ type: Array })
], o.prototype, "priorityOptions", 2);
n([
  u()
], o.prototype, "loading", 2);
n([
  u()
], o.prototype, "error", 2);
n([
  u()
], o.prototype, "showCreateDialog", 2);
n([
  u()
], o.prototype, "editingItem", 2);
n([
  u()
], o.prototype, "formData", 2);
n([
  u()
], o.prototype, "formErrors", 2);
o = n([
  y("power-sort-enum-priorities-dashboard")
], o);
export {
  o as default
};
//# sourceMappingURL=priority-section-view.element-DGakZAnw.js.map
