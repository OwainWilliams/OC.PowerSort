import {
  LitElement,
  html,
  css,
  customElement,
  state,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbAuthMixin } from "../mixins/auth.mixin.js";
import { UmbUiMixin } from "../mixins/ui.mixin.js";
import { PowerSortConstants } from "../utils/constants.js";
import { ApiResponseHandler } from "../utils/api-response.utils.js";
import { powerSortSharedStyles } from "../styles/shared.styles.js";
import type {
  EnumPriorityResponse,
  EnumPriorityListResponse,
  CreateEnumPriorityRequest,
  UpdateEnumPriorityRequest,
} from "../types/index.js";

@customElement("power-sort-enum-priorities-dashboard")
export default class PowerSortSectionViewElement extends UmbUiMixin(
  UmbAuthMixin(LitElement),
) {
  @state()
  private enumPriorities: EnumPriorityResponse[] = [];

  // @property({ type: Array })
  // private priorityOptions: PriorityOption[] = [];

  @state()
  private loading = false;

  @state()
  private error = "";

  @state()
  private showCreateDialog = false;

  @state()
  private editingItem: EnumPriorityResponse | null = null;

  @state()
  private formData: CreateEnumPriorityRequest = {
    name: "",
    sortPriority: 100,
  };

  @state()
  private formErrors: { [key: string]: string } = {};

  async connectedCallback() {
    super.connectedCallback();
    await this.loadEnumPriorities();
  }

  private async loadEnumPriorities() {
    this.loading = true;
    this.error = "";

    try {
      const response = await this.makeAuthenticatedRequest(
        `${PowerSortConstants.API_BASE}/enum-priorities`,
      );

      const data = (await ApiResponseHandler.handleResponse(
        response,
      )) as EnumPriorityListResponse;
      this.enumPriorities = data.items || [];
    } catch (error) {
      this.error =
        error instanceof Error
          ? error.message
          : "Failed to load enum priorities";
      console.error("Error loading enum priorities:", error);
    } finally {
      this.loading = false;
    }
  }

  private openCreateDialog() {
    this.editingItem = null;
    this.formData = {
      name: "",
      sortPriority: this.getNextAvailablePriority(),
    };
    this.formErrors = {};
    this.showCreateDialog = true;
  }

  private openEditDialog(item: EnumPriorityResponse) {
    this.editingItem = item;
    this.formData = {
      name: item.name,
      sortPriority: item.sortPriority,
    };
    this.formErrors = {};
    this.showCreateDialog = true;
  }

  private closeDialog() {
    this.showCreateDialog = false;
    this.editingItem = null;
    this.formData = { name: "", sortPriority: 100 };
    this.formErrors = {};
  }

  private getNextAvailablePriority(): number {
    if (this.enumPriorities.length === 0) return 100;

    const usedPriorities = new Set(
      this.enumPriorities.map((ep) => ep.sortPriority),
    );
    let nextPriority = 100;

    while (usedPriorities.has(nextPriority)) {
      nextPriority += 100;
    }

    return nextPriority;
  }

  private validateForm(): boolean {
    this.formErrors = {};
    let isValid = true;

    // Validate name
    if (!this.formData.name.trim()) {
      this.formErrors.name = "Name is required";
      isValid = false;
    } else if (this.formData.name.trim().length < 2) {
      this.formErrors.name = "Name must be at least 2 characters";
      isValid = false;
    } else if (this.formData.name.trim().length > 100) {
      this.formErrors.name = "Name must be less than 100 characters";
      isValid = false;
    }

    // Check if name already exists (excluding current item when editing)
    const existingWithSameName = this.enumPriorities.find(
      (ep) =>
        ep.name.toLowerCase() === this.formData.name.trim().toLowerCase() &&
        (!this.editingItem || ep.id !== this.editingItem.id),
    );

    if (existingWithSameName) {
      this.formErrors.name = `Name '${this.formData.name.trim()}' is already in use`;
      isValid = false;
    }

    // Validate sort priority
    if (this.formData.sortPriority < 0) {
      this.formErrors.sortPriority = "Sort priority must be 0 or greater";
      isValid = false;
    } else if (this.formData.sortPriority > 999999) {
      this.formErrors.sortPriority =
        "Sort priority must be less than 1,000,000";
      isValid = false;
    }

    // Check if priority already exists (excluding current item when editing)
    const existingWithSamePriority = this.enumPriorities.find(
      (ep) =>
        ep.sortPriority === this.formData.sortPriority &&
        (!this.editingItem || ep.id !== this.editingItem.id),
    );

    if (existingWithSamePriority) {
      this.formErrors.sortPriority = `Sort priority ${this.formData.sortPriority} is already in use by '${existingWithSamePriority.name}'`;
      isValid = false;
    }

    this.requestUpdate();
    return isValid;
  }

  private async saveItem() {
    if (!this.validateForm()) return;

    try {
      let response: Response;

      if (this.editingItem) {
        // Update existing
        const updateData: UpdateEnumPriorityRequest = {
          name: this.formData.name.trim(),
          sortPriority: this.formData.sortPriority,
        };

        response = await this.makeAuthenticatedRequest(
          `${PowerSortConstants.API_BASE}/enum-priorities/${this.editingItem.id}`,
          {
            method: "PUT",
            body: JSON.stringify(updateData),
          },
        );
      } else {
        // Create new
        response = await this.makeAuthenticatedRequest(
          `${PowerSortConstants.API_BASE}/enum-priorities`,
          {
            method: "POST",
            body: JSON.stringify(this.formData),
          },
        );
      }

      await ApiResponseHandler.handleResponse(response);
      await this.loadEnumPriorities();
      this.showMessage(
        `Priority tag ${this.editingItem ? "updated" : "created"} successfully`,
        "positive",
      );
      this.closeDialog();
    } catch (error) {
      // Server-side validation errors
      if (error instanceof Error && error.message.includes("already in use")) {
        if (error.message.includes("Sort priority")) {
          this.formErrors.sortPriority = error.message;
        } else if (error.message.includes("Name")) {
          this.formErrors.name = error.message;
        }
        this.requestUpdate();
      } else {
        this.showMessage(
          `Failed to ${this.editingItem ? "update" : "create"} priority tag`,
          "danger",
        );
      }
    }
  }

  private async deleteItem(item: EnumPriorityResponse) {
    try {
      const response = await this.makeAuthenticatedRequest(
        `${PowerSortConstants.API_BASE}/enum-priorities/${item.id}`,
        { method: "DELETE" },
      );

      await ApiResponseHandler.handleResponse(response);
      await this.loadEnumPriorities();
      this.showMessage(`${item.name} deleted successfully!`, "positive");
    } catch (error) {
      this.showMessage(`Failed to delete ${item.name}`, "danger");
    }
  }

  private handleFormInput(
    event: Event,
    field: keyof CreateEnumPriorityRequest,
  ) {
    const target = event.target as HTMLInputElement;

    if (field === "sortPriority") {
      this.formData = {
        ...this.formData,
        [field]: parseInt(target.value) || 0,
      };
    } else {
      this.formData = {
        ...this.formData,
        [field]: target.value,
      };
    }

    // Clear field-specific error when user starts typing
    if (this.formErrors[field]) {
      this.formErrors = {
        ...this.formErrors,
        [field]: "",
      };
      this.requestUpdate();
    }
  }

  private renderDialog() {
    if (!this.showCreateDialog) return "";

    const title = this.editingItem
      ? "Edit Enum Priority"
      : "Create Enum Priority";
    const submitLabel = this.editingItem ? "Update" : "Create";

    return html`
      <uui-modal-dialog headline="${title}" class="enum-priority-dialog">
        <div class="dialog-content">
          <div class="form-field">
            <uui-label for="name-input" slot="label" required>Name</uui-label>
            <uui-input
              id="name-input"
              type="text"
              placeholder="e.g., High Priority"
              .value=${this.formData.name}
              @input=${(e: Event) => this.handleFormInput(e, "name")}
              ?error=${!!this.formErrors.name}
              maxlength="100"
            >
            </uui-input>
            ${this.formErrors.name
              ? html` <div class="error-message">${this.formErrors.name}</div> `
              : ""}
          </div>

          <div class="form-field">
            <uui-label for="priority-input" slot="label" required
              >Sort Priority (Weight)</uui-label
            >
            <uui-input
              id="priority-input"
              type="number"
              placeholder="100"
              min="0"
              max="999999"
              .value=${this.formData.sortPriority.toString()}
              @input=${(e: Event) => this.handleFormInput(e, "sortPriority")}
              ?error=${!!this.formErrors.sortPriority}
            >
            </uui-input>
            <div class="field-description">
              Higher numbers = higher priority. Each weight can only be used
              once.
            </div>
            ${this.formErrors.sortPriority
              ? html`
                  <div class="error-message">
                    ${this.formErrors.sortPriority}
                  </div>
                `
              : ""}
          </div>

          <!-- Actions moved inside content -->
          <div class="dialog-actions">
            <uui-button
              label="Cancel"
              look="secondary"
              @click=${this.closeDialog}
            >
              Cancel
            </uui-button>
            <uui-button
              label="${submitLabel}"
              look="primary"
              color="positive"
              @click=${this.saveItem}
            >
              ${submitLabel}
            </uui-button>
          </div>
        </div>
      </uui-modal-dialog>
    `;
  }

  private renderEnumPrioritiesTable() {
    if (this.enumPriorities.length === 0) {
      return this.renderEmptyState(
        "No enum priorities have been created yet.",
        PowerSortConstants.ICONS.SETTINGS,
      );
    }

    return html`
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
          ${this.enumPriorities.map(
            (item) => html`
              <tr>
                <td>
                  <div class="item-name">
                    <strong>${item.name}</strong>
                  </div>
                </td>
                <td>
                  <span
                    class="priority-badge priority-${this.getPriorityLevel(
                      item.sortPriority,
                    )}"
                  >
                    ${item.sortPriority}
                  </span>
                </td>
                <td>
                  <div class="date-info">
                    <div>${new Date(item.created).toLocaleDateString()}</div>
                    <small>by ${item.createdByName}</small>
                  </div>
                </td>
                <td>
                  <div class="date-info">
                    <div>${new Date(item.updated).toLocaleDateString()}</div>
                    <small>by ${item.updatedByName}</small>
                  </div>
                </td>
                <td>
                  <div class="action-buttons">
                    <uui-button
                      compact
                      look="outline"
                      label="Edit"
                      @click=${() => this.openEditDialog(item)}
                    >
                      <uui-icon
                        name="${PowerSortConstants.ICONS.EDIT}"
                      ></uui-icon>
                    </uui-button>
                    <uui-button
                      compact
                      look="outline"
                      color="danger"
                      label="Delete"
                      @click=${() => this.deleteItem(item)}
                    >
                      <uui-icon
                        name="${PowerSortConstants.ICONS.DELETE}"
                      ></uui-icon>
                    </uui-button>
                  </div>
                </td>
              </tr>
            `,
          )}
        </tbody>
      </table>
    `;
  }

  private getPriorityLevel(priority: number): string {
    if (priority >= 500) return "high";
    if (priority >= 200) return "medium";
    return "low";
  }

  static styles = [
    powerSortSharedStyles,
    css`
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

      .dashboard__header {
        margin-bottom: 45px;
        padding: var(--uui-size-space-6);
        background: var(--uui-color-surface);
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
      }

      .dashboard__intro {
        width: 60%;
        margin-top: 20px;
      }

      .header__actions {
        flex-shrink: 0;
      }

      .header__container {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-2);
      }

      .header__top-level {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
    `,
  ];

  render() {
    if (this.loading) {
      return this.renderLoadingState("Loading priority tags...");
    }

    if (this.error) {
      return this.renderErrorState(this.error, () => this.loadEnumPriorities());
    }

    return html`
      ${this.renderToastContainer()}
      <div class="dashboard-container">
        <div class="dashboard__header">
          <div class="header__top-level">
            <div class="header__container">
              <uui-icon name="icon-ordered-list"></uui-icon>
              <h1>Priority Tags</h1>
            </div>
            <div class="header__actions">
              <uui-button
                look="primary"
                color="positive"
                label="Create Priority"
                @click=${this.openCreateDialog}
              >
                <uui-icon name="${PowerSortConstants.ICONS.ADD}"></uui-icon>
                Create Priority
              </uui-button>
            </div>
          </div>
          <div class="dashboard__intro">
            <p>
              Here you can create and edit priority tags. These are applied to
              list items in the scheduling view. The priority tag weighting
              provides a fallback mechanism when no explicit priority is set, or
              if any conflicts in priority arise. The higher the number applied,
              the higher priority (and rank in the sort order) the item is
              given.
            </p>
          </div>
        </div>

        ${this.renderEnumPrioritiesTable()} ${this.renderDialog()}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "power-sort-enum-priorities-dashboard": PowerSortSectionViewElement;
  }
}
