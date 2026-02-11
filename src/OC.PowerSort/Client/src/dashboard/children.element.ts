import {
  LitElement,
  html,
  css,
  customElement,
  state,
  property,
  PropertyValues,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbAuthMixin } from "../mixins/auth.mixin.js";
import { UmbUiMixin } from "../mixins/ui.mixin.js";
import { PowerSortConstants } from "../utils/constants.js";
import { ApiResponseHandler } from "../utils/api-response.utils.js";
import { powerSortSharedStyles } from "../styles/shared.styles.js";
import type {
  CreateScheduleRequest,
  NodeChild,
  ScheduleResponse,
  UpdateScheduleRequest,
} from "../types/index.js";
import { ScheduleApiClient } from "../api/schedule-api.client.js";
import { DateUtils } from "../utils/validation.utils.js";
import "./schedule-dialog.element.js";

@customElement("power-sort-children-dashboard")
export default class PowerSortChildrenDashboardElement extends UmbUiMixin(
  UmbAuthMixin(LitElement),
) {
  @property({ type: String, attribute: false, reflect: false })
  id: string = "";

  @state()
  private parentNodeName: string = "";

  @state()
  private nodeChildren: NodeChild[] = [];

  @state()
  private activeSchedules: ScheduleResponse[] = [];

  @state()
  private hasDefaultOrder: boolean = false;

  @state()
  private loading: boolean = false;

  @state()
  private error: string = "";

  @property({ type: Boolean })
  private showCreateDialog: boolean = false;

  @property({ type: Object })
  private editingSchedule: ScheduleResponse | null = null;

  @property()
  private contentId: string = "";

  private scheduleApi?: ScheduleApiClient;
  private _lastLoadedId: string = "";
  private _isLoading: boolean = false;

  protected override async willUpdate(
    changedProperties: PropertyValues,
  ): Promise<void> {
    super.willUpdate(changedProperties);

    // Only trigger data load when id actually changes to a new value
    if (
      changedProperties.has("id") &&
      this.id &&
      this.id !== this._lastLoadedId
    ) {
      console.log("[children] ID changed, loading data for:", this.id);
      this._lastLoadedId = this.id;
      await this.loadChildrenData();
    }
  }

  private async loadChildrenData() {
    if (this._isLoading) return;

    this._isLoading = true;
    this._lastLoadedId = this.id;

    try {
      await this.loadNodeChildren();
      await this.loadSchedules();
      await this.loadDefaultOrderInfo();
    } finally {
      this._isLoading = false;
    }
  }
  async connectedCallback() {
    super.connectedCallback(); // This now handles auth setup via mixin

    // Initialize schedule API
    this.scheduleApi = new ScheduleApiClient(() => this.getAuthToken());

    // If ID is already set (shouldn't happen on first connect), load data
    if (this.id && this.id !== this._lastLoadedId) {
      this._lastLoadedId = this.id;
      await this.loadChildrenData();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
  }
  private async loadDefaultOrderInfo() {
    if (!this.id) return;

    try {
      const response = await this.makeAuthenticatedRequest(
        `${PowerSortConstants.API_BASE}${PowerSortConstants.ENDPOINTS.DEFAULT_SORT_ORDER}/${this.id}`,
      );

      const data = (await ApiResponseHandler.handleResponse(response)) as any;
      this.hasDefaultOrder = data.isSet;
    } catch (error) {
      console.error("Error loading default order info:", error);
    }
  }

  private async saveAsDefaultOrder() {
    if (!this.id) return;

    try {
      const response = await this.makeAuthenticatedRequest(
        `${PowerSortConstants.API_BASE}${PowerSortConstants.ENDPOINTS.DEFAULT_SORT_ORDER_SAVE}`,
        {
          method: "POST",
          body: JSON.stringify({ parentId: this.id }),
        },
      );

      await ApiResponseHandler.handleResponse(response);
      await this.loadDefaultOrderInfo();
      this.showMessage("Current sort order saved as default", "positive");
    } catch (error) {
      this.showMessage("Failed to save default order", "danger");
    }
  }

  private async restoreDefaultOrder() {
    if (!this.id) return;

    try {
      const response = await this.makeAuthenticatedRequest(
        `${PowerSortConstants.API_BASE}${PowerSortConstants.ENDPOINTS.DEFAULT_SORT_ORDER_RESTORE}/${this.id}`,
        { method: "POST" },
      );

      await ApiResponseHandler.handleResponse(response);
      await this.loadNodeChildren();
      this.showMessage("Default sort order restored", "positive");
    } catch (error) {
      this.showMessage("Failed to restore default sort order", "danger");
    }
  }

  private async loadSchedules() {
    if (!this.scheduleApi || !this.id) return;

    this.loading = true;
    this.error = "";

    try {
      const response = await this.scheduleApi.getSchedules(this.id);
      this.activeSchedules = response.items;
    } catch (error) {
      console.error("Error loading schedules:", error);
      this.showMessage("Failed to load schedules", "danger");
    } finally {
      this.loading = false;
    }
  }

  private getScheduleForChild(childId: string): ScheduleResponse | undefined {
    return this.activeSchedules.find((s) => s.contentId === childId);
  }

  async loadNodeChildren() {
    if (!this.id) return;

    this.loading = true;
    this.error = "";

    try {
      const response = await this.makeAuthenticatedRequest(
        `${PowerSortConstants.API_BASE}${PowerSortConstants.ENDPOINTS.CHILDREN}/${this.id}`,
      );

      const data = (await ApiResponseHandler.handleResponse(response)) as any;

      // Load parent info
      const parentResponse = await this.makeAuthenticatedRequest(
        `/umbraco/management/api/v1/document/${this.id}`,
      );
      if (parentResponse.ok) {
        const parentData = await parentResponse.json();
        this.parentNodeName = parentData.variants?.[0]?.name || "Unknown Node";
      }

      this.nodeChildren =
        data.items?.map((item: any) => ({
          id: item.id,
          name: item.name,
          sortOrder: item.sortOrder,
          contentTypeAlias: item.documentType?.id,
          icon: item.documentType?.icon || PowerSortConstants.ICONS.DOCUMENT,
        })) || [];

      // Load active schedules after children are loaded
      await this.loadSchedules();
    } catch (error) {
      this.error =
        error instanceof Error
          ? error.message
          : PowerSortConstants.MESSAGES.ERROR_GENERIC;
      console.error("Error loading children:", error);
    } finally {
      this.loading = false;
    }
  }

  async updateSortOrder() {
    if (!this.id) return;

    try {
      // Build the sorting array from current node children order
      const sorting = this.nodeChildren.map((child, index) => ({
        id: child.id,
        sortOrder: index,
      }));

      const response = await this.makeAuthenticatedRequest(
        `${PowerSortConstants.API_BASE}${PowerSortConstants.ENDPOINTS.SORT_DOCUMENT}`,
        {
          method: "PUT",
          body: JSON.stringify({
            parent: { id: this.id },
            sorting: sorting,
          }),
        },
      );

      await ApiResponseHandler.handleResponse(response);
      await this.loadNodeChildren();
    } catch (error) {
      this.error = "Failed to update sort order";
      ApiResponseHandler.showError(error, "Sort order update failed");
    }
  }

  handleDragStart(event: DragEvent, child: NodeChild) {
    event.dataTransfer!.effectAllowed = "move";
    event.dataTransfer!.setData("text/plain", child.id);

    // Add visual feedback
    (event.target as HTMLElement).style.opacity = "0.5";
  }

  handleDragEnd(event: DragEvent) {
    // Reset opacity
    (event.target as HTMLElement).style.opacity = "1";
  }

  private openCreateDialog(child: NodeChild) {
    this.showCreateDialog = true;
    this.editingSchedule = null;
    this.contentId = child.id; // Pass the content ID of the child for which we're creating a schedule
  }

  private openEditDialog(schedule: ScheduleResponse) {
    this.editingSchedule = schedule;
    this.showCreateDialog = true;
  }

  private closeDialog() {
    this.showCreateDialog = false;
    this.editingSchedule = null;
  }

  private async handleSaveSchedule(event: CustomEvent) {
    if (!this.scheduleApi) return;

    const formData = event.detail;
    const itemName = this.findItemNameById(this.contentId);
    // Add debugging to understand the IDs being used
    try {
      if (this.editingSchedule) {
        // Update existing
        const request: UpdateScheduleRequest = {
          targetPosition: formData.targetPosition,
          startDateTime: formData.startDateTime,
          endDateTime: formData.endDateTime,
          priority: formData.priority || PowerSortConstants.DEFAULTS.PRIORITY,
        };
        await this.scheduleApi.updateSchedule(this.editingSchedule.id, request);
      } else {
        // Create new - use route parent ID since filter ensures content is a child
        const request: CreateScheduleRequest = {
          contentId: this.contentId,
          parentId: this.id,
          targetPosition: formData.targetPosition,
          startDateTime: formData.startDateTime,
          endDateTime: formData.endDateTime,
          priority: formData.priority || PowerSortConstants.DEFAULTS.PRIORITY,
        };

        await this.scheduleApi.createSchedule(request);
      }

      this.closeDialog();
      await this.loadSchedules();

      const successMessage = this.editingSchedule
        ? "Schedule updated successfully"
        : `Schedule for ${this.findItemNameById(this.contentId)} created successfully`;
      this.showMessage(successMessage, "positive");
    } catch (error) {
      console.error("[PowerSort Debug] Error saving schedule:", error);
      this.showMessage(`Failed to save schedule for ${itemName}`, "danger");
      // Show more detailed error message
      if (error instanceof Error && error.message.includes("API Error")) {
        this.error = `Failed to save schedule: ${error.message}`;
      } else {
        this.error = `Failed to save schedule for ${itemName}`;
      }
    }
  }

  private async handleDeleteSchedule(event: MouseEvent, scheduleId: string) {
    if (!this.scheduleApi) return;
    const item = event.currentTarget as HTMLElement;
    const parentItem = item.closest(".js-child-row") as HTMLElement;
    parentItem.classList.remove("hidden"); // Ensure accordion doesn't collapse on rerender after deletion
    const itemName = this.findItemNameById(this.contentId);

    try {
      await this.scheduleApi.deleteSchedule(scheduleId);
      await this.loadSchedules();
      this.showMessage(`Schedule for ${itemName} deleted successfully`, "positive");
    } catch (error) {
      ApiResponseHandler.showError(error, "Failed to delete schedule");
      this.showMessage(`Failed to delete schedule for ${itemName}`, "danger");
    }
  }

  handleDragOver(event: DragEvent) {
    event.preventDefault();
    event.dataTransfer!.dropEffect = "move";
  }

  async handleDrop(event: DragEvent, targetChild: NodeChild) {
    event.preventDefault();

    const draggedId = event.dataTransfer!.getData("text/plain");
    const draggedChild = this.nodeChildren.find((c) => c.id === draggedId);

    if (!draggedChild || draggedId === targetChild.id) return;

    // Find indices
    const draggedIndex = this.nodeChildren.findIndex((c) => c.id === draggedId);
    const targetIndex = this.nodeChildren.findIndex(
      (c) => c.id === targetChild.id,
    );

    // Reorder the array
    const newOrder = [...this.nodeChildren];
    const [removed] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, removed);

    // Update local state
    this.nodeChildren = newOrder.map((child, index) => ({
      ...child,
      sortOrder: index,
    }));

    // Save to server
    await this.updateSortOrder();
  }

  private toggleSchedules(e: MouseEvent, index: number) {
    const el = e.currentTarget as HTMLElement;
    const expandItem = el.querySelector("uui-symbol-expand") as HTMLElement;
    const detailsRows = Array.from(
      this.renderRoot.querySelectorAll(`#schedule-details-${index}`),
    ) as HTMLElement[];

    detailsRows.forEach((detailsRow) => {
      if (detailsRow.classList.contains("hidden")) {
        expandItem.setAttribute("open", "");
        detailsRow.classList.remove("hidden");
        el.setAttribute("active", "true");
      } else {
        detailsRow.classList.add("hidden");
        expandItem.removeAttribute("open");
        el.removeAttribute("active");
      }
    });
  }

  private formatDateTime(dateString: string): string {
    return DateUtils.formatDateTime(dateString);
  }

  private filterSchedulesByChild(childId: string): ScheduleResponse[] {
    return this.activeSchedules.filter((s) => s.contentId === childId);
  }

  private findItemNameById(id: string): string {
    return this.nodeChildren.find((c) => c.id === id)?.name || "Unknown Item";
  }

  private renderChildrenTable() {
    if (this.nodeChildren.length === 0) {
      return this.renderEmptyState(
        "This node has no children.",
        PowerSortConstants.ICONS.DOCUMENT,
      );
    }

    return html`
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
          ${this.nodeChildren.map((child, index) => {
            const schedule = this.getScheduleForChild(child.id);
            return html`
              <tr
                draggable="true"
                @dragstart=${(e: DragEvent) => this.handleDragStart(e, child)}
                @dragend=${this.handleDragEnd}
                @dragover=${this.handleDragOver}
                @drop=${(e: DragEvent) => this.handleDrop(e, child)}
                id="child-row-${index}"
                class="js-child-row"
              >
                <td>
                  <uui-icon
                    class="drag-handle"
                    name="${PowerSortConstants.ICONS.NAVIGATION}"
                  ></uui-icon>
                </td>
                <td>
                  <span class="sort-order-badge">${child.sortOrder}</span>
                </td>
                <td colspan="3">
                  <div class="node-icon">
                    <uui-icon
                      name="${child.icon || PowerSortConstants.ICONS.DOCUMENT}"
                    ></uui-icon>
                    <strong>${child.name}</strong>
                    ${schedule
                      ? html`
                          <span
                            class="scheduled-badge"
                            title="Boosted to position ${schedule.targetPosition} (Priority: ${schedule.priority})"
                          >
                            <uui-icon name="icon-calendar-alt"></uui-icon>
                            Scheduled
                          </span>
                        `
                      : ""}
                  </div>
                </td>
                <td>
                  <uui-button
                    look="outline"
                    color="default"
                    label="create new schedule"
                    @click=${() => this.openCreateDialog(child)}
                  >
                    <uui-icon name="add"></uui-icon>

                    Add schedule
                  </uui-button>
                </td>
                <td>
                  ${schedule
                    ? html`
                        <uui-button
                          look="outline"
                          label="View Schedule"
                          color="default"
                          @click=${(e: MouseEvent) =>
                            this.toggleSchedules(e, index)}
                        >
                          <uui-icon name="see"></uui-icon>

                          View
                          Schedule${this.activeSchedules.length > 1 ? "s" : ""}
                          <uui-symbol-expand></uui-symbol-expand>
                        </uui-button>
                      `
                    : `No active schedules for ${child.name}`}
                </td>
              </tr>
              <table>
                <tr
                  class="schedule-detail-row schedule-detail-head hidden"
                  id="schedule-details-${index}"
                >
                  <th>Priority</th>
                  <th>Edit</th>
                  <th>Delete</th>
                  <th>Sort Order</th>
                  <th>Start time</th>
                  <th>End time</th>
                  <th>Creator</th>
                </tr>
                ${this.filterSchedulesByChild(child.id).map((schedule) => {
                  return html`
                    <tr
                      class="schedule-detail-row hidden"
                      id="schedule-details-${index}"
                    >
                      <td>${schedule?.priority}</td>
                      <td>
                        <uui-button
                          look="outline"
                          label="Edit"
                          @click=${() => this.openEditDialog(schedule)}
                        >
                          <uui-icon name="icon-edit"></uui-icon>
                        </uui-button>
                      </td>
                      <td>
                        <uui-button
                          look="outline"
                          color="danger"
                          label="Delete"
                          popovertarget="schedule-delete-popover-${schedule.id}"
                        >
                          <uui-icon name="icon-trash"></uui-icon>
                        </uui-button>
                        <uui-popover-container
                          id="schedule-delete-popover-${schedule.id}"
                          class="js-popover popover"
                          placement="right-end"
                        >
                          Are you sure you want to delete?
                          <uui-button
                            class="ml-1"
                            label="delete menu item"
                            look="primary"
                            color="danger"
                            @click=${(e: MouseEvent) =>
                              this.handleDeleteSchedule(e, schedule.id)}
                          >
                            Yes
                          </uui-button>
                        </uui-popover-container>
                      </td>
                      <td>${schedule.targetPosition}</td>
                      <td>${this.formatDateTime(schedule?.startDateTime)}</td>
                      <td>${this.formatDateTime(schedule?.endDateTime)}</td>
                      <td>
                        Created by ${schedule.createdByName} on
                        ${this.formatDateTime(schedule.created)}
                      </td>
                    </tr>
                  `;
                })}
              </table>
            `;
          })}
        </tbody>
      </table>
    `;
  }

  static styles = [
    powerSortSharedStyles,
    css`
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
    `,
  ];

  render() {
    if (this.loading) {
      return this.renderLoadingState("Loading children...");
    }

    if (this.error) {
      return this.renderErrorState(this.error, () => this.loadNodeChildren());
    }

    return html`
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
            ${this.hasDefaultOrder
              ? html`
                  <uui-button
                    look="outline"
                    color="default"
                    label="Restore Default Order"
                    popovertarget="restore-default-popover"
                  >
                    <uui-icon
                      name="${PowerSortConstants.ICONS.UNDO}"
                    ></uui-icon>
                    Restore Default
                  </uui-button>
                  <uui-popover-container
                    id="restore-default-popover"
                    class="js-popover popover popover--sm"
                    placement="right-start"
                  >
                    <div class="mb-4">
                      Are you sure you want to restore the default sort order?
                      This will overwrite the current order.
                    </div>
                    <uui-button
                      class="ml-1"
                      label="Restore Default Order"
                      look="primary"
                      color="danger"
                      @click=${this.restoreDefaultOrder}
                    >
                      Yes
                    </uui-button>
                  </uui-popover-container>
                `
              : ""}
            <uui-button
              look="outline"
              color="default"
              label="Save Default Order"
              @click=${this.saveAsDefaultOrder}
            >
              <uui-icon name="${PowerSortConstants.ICONS.SAVE}"></uui-icon>
              Save Default Order
            </uui-button>
          </div>
        </div>

        ${this.renderChildrenTable()}
        ${this.renderToastContainer()}
        ${this.showCreateDialog
          ? html`
              <schedule-dialog
                .parentId=${this.id}
                .schedule=${this.editingSchedule}
                .contentId=${this.contentId}
                .contentName=${this.findItemNameById(this.contentId)}
                @save=${this.handleSaveSchedule}
                @cancel=${this.closeDialog}
              >
              </schedule-dialog>
            `
          : ""}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "power-sort-children-dashboard": PowerSortChildrenDashboardElement;
  }
}
