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
import { UMB_MODAL_MANAGER_CONTEXT } from "@umbraco-cms/backoffice/modal";
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
import { RecurringScheduleApiClient } from "../api/recurring-schedule-api.client.js";
import type { RecurringSchedule } from "../types/recurring-schedule.types.js";
import { DateUtils } from "../utils/validation.utils.js";
import "./schedule-dialog.element.js";
import "./recurring-schedule-dialog.element.js";
import "../components/confirm-modal.element.js";

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
  private recurringSchedules: RecurringSchedule[] = [];

  @state()
  private hasDefaultOrder: boolean = false;

  @state()
  private defaultOrderInfo: any = null;

  @state()
  private loading: boolean = false;

  @state()
  private error: string = "";

  @property({ type: Boolean })
  private showCreateDialog: boolean = false;

  @property({ type: Boolean })
  private showRecurringDialog: boolean = false;

  @property({ type: Object })
  private editingSchedule: ScheduleResponse | null = null;

  @property({ type: Object })
  private editingRecurringSchedule: RecurringSchedule | null = null;

  @property()
  private contentId: string = "";

  private scheduleApi?: ScheduleApiClient;
  private recurringScheduleApi?: RecurringScheduleApiClient;
  private _lastLoadedId: string = "";
  private _isLoading: boolean = false;

  private _modalManagerContext?: typeof UMB_MODAL_MANAGER_CONTEXT.TYPE;

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
    super.connectedCallback();

    // Consume modal manager context
    this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (context) => {
      this._modalManagerContext = context;
    });

    // Initialize schedule API
    this.scheduleApi = new ScheduleApiClient(() => this.getAuthToken());
    this.recurringScheduleApi = new RecurringScheduleApiClient(() => this.getAuthToken());

    // If ID is already set, load data
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
      this.defaultOrderInfo = data;
      this.hasDefaultOrder = data.isSet;
    } catch (error) {
      console.error("Error loading default order info:", error);
    }
  }

  private async clearDefaultOrder() {
    if (!this.id) return;

    const confirmed = await this._showConfirmModal({
      headline: "Clear Default Sort Order",
      message: "Clear the saved default sort order? You won't be able to restore it anymore.",
      confirmLabel: "Clear",
      cancelLabel: "Cancel",
      color: "danger",
    });

    if (!confirmed) {
      return;
    }

    try {
      const response = await this.makeAuthenticatedRequest(
        `${PowerSortConstants.API_BASE}${PowerSortConstants.ENDPOINTS.DEFAULT_SORT_ORDER}/${this.id}`,
        { method: "DELETE" },
      );

      await ApiResponseHandler.handleResponse(response);
      await this.loadDefaultOrderInfo();
      // Show success modal (don't await it)
      ApiResponseHandler.showSuccess("Default sort order cleared!", this._modalManagerContext);
    } catch (error) {
      // Show error modal (don't await it)
      ApiResponseHandler.showError(error, "Failed to clear default order", this._modalManagerContext);
    }
  }

  private async saveAsDefaultOrder() {
    if (!this.id) return;

    const confirmed = await this._showConfirmModal({
      headline: "Save Default Sort Order",
      message: "Save the current sort order as default? This will overwrite any existing default order.",
      confirmLabel: "Save",
      cancelLabel: "Cancel",
      color: "positive",
    });

    if (!confirmed) {
      return;
    }

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
      // Show success modal (don't await it)
      ApiResponseHandler.showSuccess("Current sort order saved as default!", this._modalManagerContext);
    } catch (error) {
      // Show error modal (don't await it)
      ApiResponseHandler.showError(error, "Failed to save default order", this._modalManagerContext);
    }
  }

  private async restoreDefaultOrder() {
    if (!this.id) return;

    const confirmed = await this._showConfirmModal({
      headline: "Restore Default Sort Order",
      message: "Restore the saved default sort order? This will overwrite the current order.",
      confirmLabel: "Restore",
      cancelLabel: "Cancel",
      color: "warning",
    });

    if (!confirmed) {
      return;
    }

    try {
      const response = await this.makeAuthenticatedRequest(
        `${PowerSortConstants.API_BASE}${PowerSortConstants.ENDPOINTS.DEFAULT_SORT_ORDER_RESTORE}/${this.id}`,
        { method: "POST" },
      );

      await ApiResponseHandler.handleResponse(response);
      await this.loadNodeChildren();
      // Show success modal (don't await it)
      ApiResponseHandler.showSuccess("Default sort order restored!", this._modalManagerContext);
    } catch (error) {
      // Show error modal (don't await it)
      ApiResponseHandler.showError(error, "Failed to restore default order", this._modalManagerContext);
    }
  }





  private async _showConfirmModal(options: {
    headline: string;
    message: string;
    confirmLabel: string;
    cancelLabel: string;
    color: "default" | "positive" | "warning" | "danger";
  }): Promise<boolean> {
    if (!this._modalManagerContext) {
      // Fallback to browser confirm if modal context not available
      return confirm(options.message);
    }

    return new Promise((resolve) => {
      const modalToken = this._modalManagerContext!.open(this, "Umb.Modal.Confirm", {
        data: {
          headline: options.headline,
          content: options.message,
          color: options.color,
          confirmLabel: options.confirmLabel,
        },
      });

      // Handle submit (user clicked confirm)
      modalToken?.onSubmit().then(() => resolve(true));

      // Cast to any to bypass incomplete typing issues
      const token = modalToken as any;

      // Try multiple possible close/cancel methods
      if (token?.onReject) {
        token.onReject().then(() => resolve(false));
      } else if (token?.onClose) {
        token.onClose().then(() => resolve(false));
      } else if (token?.onCancel) {
        token.onCancel().then(() => resolve(false));
      } else {
        // Last resort fallback - resolve false after submit resolves or timeout
        Promise.race([
          modalToken?.onSubmit().then(() => { }), // Don't resolve here, let the submit handler above resolve true
          new Promise(resolve => setTimeout(resolve, 30000)) // 30 second timeout
        ]).then(() => {
          // Only resolve false if submit hasn't already resolved true
          setTimeout(() => resolve(false), 100);
        });
      }
    });
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

  private async loadSchedules() {
    if (!this.scheduleApi || !this.recurringScheduleApi || !this.id) return;

    this.loading = true;
    this.error = "";

    try {
      const [scheduleResponse, recurringResponse] = await Promise.all([
        this.scheduleApi.getSchedules(this.id),
        this.recurringScheduleApi.getRecurringSchedules(this.id, false)
      ]);

      const now = new Date();

      // Filter out expired one-off schedules
      this.activeSchedules = scheduleResponse.items.filter((schedule: ScheduleResponse) => {
        const endDate = new Date(schedule.endDateTime);
        return endDate > now;
      });

      // Filter out expired recurring schedules
      this.recurringSchedules = recurringResponse.items.filter((schedule: RecurringSchedule) => {
        // If the recurring schedule has an end date and it's in the past, filter it out
        if (schedule.pattern.endDate) {
          const endDate = new Date(schedule.pattern.endDate);
          return endDate > now;
        }
        // If disabled, filter it out
        if (!schedule.isEnabled) {
          return false;
        }
        // If no end date, keep it (it runs indefinitely)
        return true;
      });
    } catch (error) {
      console.error("Error loading schedules:", error);
      this.error = "Failed to load schedules";
    } finally {
      this.loading = false;
    }
  }

  private getScheduleForChild(childId: String): boolean {
    const hasOneOffSchedule = this.activeSchedules.some((s) => s.contentId === childId);
    const hasRecurringSchedule = this.recurringSchedules.some((s) => s.contentId === childId);
    return hasOneOffSchedule || hasRecurringSchedule;
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
      // Show error modal (don't await it)
      ApiResponseHandler.showError(error, "Sort order update failed", this._modalManagerContext);
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

  private openEditRecurringDialog(schedule: RecurringSchedule) {
    this.editingRecurringSchedule = schedule;
    this.showRecurringDialog = true;
  }

  private closeRecurringDialog() {
    this.showRecurringDialog = false;
    this.editingRecurringSchedule = null;
  }

  private async handleRecurringDialogSave() {
    this.showRecurringDialog = false;
    this.editingRecurringSchedule = null;
    await this.loadSchedules();
  }

  private async handleDeleteRecurringSchedule(event: MouseEvent, scheduleId: string) {
    if (!this.recurringScheduleApi) return;
    const item = event.currentTarget as HTMLElement;
    const parentItem = item.closest(".js-child-row") as HTMLElement;

    if (parentItem) {
      parentItem.classList.remove("hidden");
    }

    try {
      await this.recurringScheduleApi.deleteRecurringSchedule(scheduleId);
      await this.loadSchedules();
    } catch (error) {
      ApiResponseHandler.showError(error, "Failed to delete recurring schedule", this._modalManagerContext);
    }
  }

  private closeDialog() {
    this.showCreateDialog = false;
    this.editingSchedule = null;
  }

  private async handleSaveSchedule(event: CustomEvent) {
    if (!this.scheduleApi) return;

    const formData = event.detail;

    // Check if this is a recurring schedule - if so, just close and reload
    if (formData.isRecurring) {
      console.log("[PowerSort Debug] Recurring schedule saved, closing dialog");
      this.closeDialog();
      await this.loadSchedules();
      return;
    }

    // Add debugging to understand the IDs being used
    console.log("[PowerSort Debug] Schedule save attempt:", {
      isEditing: !!this.editingSchedule,
      formData: formData,
      parentIdFromRoute: this.id,
      parentNodeName: this.parentNodeName,
    });
    console.log(this.editingSchedule);
    try {
      if (this.editingSchedule) {
        // Update existing
        const request: UpdateScheduleRequest = {
          targetPosition: formData.targetPosition,
          startDateTime: formData.startDateTime,
          endDateTime: formData.endDateTime,
          priority: formData.priority || PowerSortConstants.DEFAULTS.PRIORITY,
        };

        console.log("[PowerSort Debug] Update request:", request);
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

        console.log("[PowerSort Debug] Create request:", request);
        await this.scheduleApi.createSchedule(request);
      }

      this.closeDialog();
      await this.loadSchedules();
    } catch (error) {
      console.error("[PowerSort Debug] Error saving schedule:", error);

      // Show more detailed error message
      if (error instanceof Error && error.message.includes("API Error")) {
        this.error = `Failed to save schedule: ${error.message}`;
      } else {
        this.error = "Failed to save schedule";
      }
    }
  }

  private async handleDeleteSchedule(event: MouseEvent, scheduleId: string) {
    if (!this.scheduleApi) return;
    const item = event.currentTarget as HTMLElement;
    const parentItem = item.closest(".js-child-row") as HTMLElement;

    if (parentItem) {
      parentItem.classList.remove("hidden");
    }

    try {
      await this.scheduleApi.deleteSchedule(scheduleId);
      await this.loadSchedules();
    } catch (error) {
      // Show error modal (don't await it)
      ApiResponseHandler.showError(error, "Failed to delete schedule", this._modalManagerContext);
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

  private renderDefaultOrderBanner() {
    if (!this.hasDefaultOrder) return "";

    const content = html`
      <uui-icon
        class="icon"
        name="${PowerSortConstants.ICONS.BOOKMARK}"
      ></uui-icon>
      <div class="content">
        <strong>Default Order Saved</strong>
        <p
          style="margin: var(--uui-size-space-1) 0 0 0; font-size: var(--uui-type-small-size);"
        >
          ${this.defaultOrderInfo?.itemCount || 0} items • Last updated:
          ${new Date(this.defaultOrderInfo?.updated).toLocaleDateString()}
          ${this.activeSchedules.length === 0
        ? " • Will restore automatically when schedules expire"
        : ""}
        </p>
      </div>
    `;

    const actions = html`
      <uui-button
        look="outline"
        label="Clear"
        compact
        @click=${this.clearDefaultOrder}
      >
        <uui-icon name="${PowerSortConstants.ICONS.DELETE}"></uui-icon>
      </uui-button>
    `;

    return this.renderInfoBanner("default", content, actions);
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

  private getCombinedSchedulesForChild(childId: string): Array<{
    type: 'one-off' | 'recurring';
    data: ScheduleResponse | RecurringSchedule;
  }> {
    const oneOffSchedules = this.activeSchedules
      .filter((s) => s.contentId === childId)
      .map(s => ({ type: 'one-off' as const, data: s }));

    const recurring = this.recurringSchedules
      .filter((s) => s.contentId === childId)
      .map(s => ({ type: 'recurring' as const, data: s }));

    return [...oneOffSchedules, ...recurring];
  }

  private renderActiveScheduleBanner(hasActiveSchedules: boolean) {
    if (!hasActiveSchedules) return "";

    const totalSchedules = this.activeSchedules.length + this.recurringSchedules.length;

    const content = html`
      <uui-icon
        name="${PowerSortConstants.ICONS.CALENDAR}"
        style="color: var(--uui-color-positive); font-size: 24px;"
      ></uui-icon>
      <div class="content">
        <strong>Active Schedules</strong>
        <p
          style="margin: var(--uui-size-space-1) 0 0 0; font-size: var(--uui-type-small-size);"
        >
          ${totalSchedules}
          schedule${totalSchedules === 1 ? "" : "s"} currently
          active (${this.activeSchedules.length} one-off, ${this.recurringSchedules.length} recurring).
          Some items are automatically sorted to specific positions.
        </p>
      </div>
    `;
    return this.renderInfoBanner("positive", content);
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
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${this.nodeChildren.map((child, index) => {
      const schedule = this.getScheduleForChild(child.id);
      const schedules = this.getCombinedSchedulesForChild(child.id);

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
                            title="Has active schedules"
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
                          color="default"
                          label="View Schedule${schedules.length > 1 ? "s" : ""}"
                          @click=${(e: MouseEvent) =>
              this.toggleSchedules(e, index)}
                        >
                          <uui-icon name="see"></uui-icon>
                          View
                          Schedule${schedules.length > 1 ? "s" : ""}
                          <uui-symbol-expand></uui-symbol-expand>
                        </uui-button>
                      `
          : `No active schedules`}
                </td>
                <td></td>
              </tr>

              <!-- Schedule details header row -->
              <tr
                class="schedule-detail-row schedule-detail-head hidden"
                id="schedule-details-${index}"
              >
                <th></th>
                <th>Type</th>
                <th>Priority</th>
                <th>Actions</th>
                <th>Sort Order</th>
                <th>Start / Pattern</th>
                <th>End / Next</th>
                <th>Creator</th>
              </tr>

              <!-- Schedule detail rows -->
              ${schedules.map((scheduleWrapper) => {
            const isRecurring = scheduleWrapper.type === 'recurring';
            const schedule = scheduleWrapper.data;
            const scheduleId = schedule.id;

            // Pre-format dates for this schedule
            const createdDate = this.formatDateTime(schedule.created);
            const startOrPattern = isRecurring
              ? (schedule as RecurringSchedule).pattern.description
              : this.formatDateTime((schedule as ScheduleResponse).startDateTime);
            const endOrNext = isRecurring
              ? ((schedule as RecurringSchedule).nextOccurrence
                ? this.formatDateTime((schedule as RecurringSchedule).nextOccurrence!)
                : 'No upcoming')
              : this.formatDateTime((schedule as ScheduleResponse).endDateTime);

            return html`
                  <tr
                    class="schedule-detail-row hidden"
                    id="schedule-details-${index}"
                  >
                  <td></td>
                    <td>
                     <div style="position: relative; width: 50px;">
                      <uui-badge
                        color="warning" 
                        look="primary"
                      >
                        ${isRecurring ? 'Recurring' : 'One-off'}
                      </uui-badge>
                      </div>
                    </td>
                    
                    <td>${schedule.priority}</td>
                    <td>
                      <div class="schedule-actions">
                        <uui-button
                          look="outline"
                          label="Edit"
                          compact
                          @click=${() => isRecurring
                ? this.openEditRecurringDialog(schedule as RecurringSchedule)
                : this.openEditDialog(schedule as ScheduleResponse)}
                        >
                          <uui-icon name="icon-edit"></uui-icon>
                        </uui-button>
                        <uui-button
                          look="outline"
                          color="danger"
                          label="Delete"
                          compact
                          popovertarget="schedule-delete-popover-${scheduleId}"
                        >
                          <uui-icon name="icon-trash"></uui-icon>
                        </uui-button>
                        <uui-popover-container
                          id="schedule-delete-popover-${scheduleId}"
                          class="js-popover popover"
                          placement="right-end"
                        >
                          Are you sure you want to delete this ${isRecurring ? 'recurring' : 'one-off'} schedule?
                          <uui-button
                            class="ml-1"
                            label="delete menu item"
                            look="primary"
                            color="danger"
                            @click=${(e: MouseEvent) =>
                isRecurring
                  ? this.handleDeleteRecurringSchedule(e, scheduleId)
                  : this.handleDeleteSchedule(e, scheduleId)}
                          >
                            Yes
                          </uui-button>
                        </uui-popover-container>
                      </div>
                    </td>
                    <td>${schedule.targetPosition}</td>
                    <td>${startOrPattern}</td>
                    <td>${endOrNext}</td>
                    <td>Created by ${schedule.createdByName} on ${createdDate}</td>
                  </tr>
                `;
          })}
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

      .schedule-actions {
        display: flex;
        gap: var(--uui-size-space-2);
        align-items: center;
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

    const hasActiveSchedules = this.activeSchedules.length > 0 || this.recurringSchedules.length > 0;

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
                    @click=${this.restoreDefaultOrder}
                  >
                    <uui-icon
                      name="${PowerSortConstants.ICONS.UNDO}"
                    ></uui-icon>
                    Restore Default
                  </uui-button>
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

        ${this.renderDefaultOrderBanner()}
        ${this.renderActiveScheduleBanner(hasActiveSchedules)}
        ${this.renderChildrenTable()}
        ${this.showCreateDialog
        ? html`
              <schedule-dialog
                .parentId=${this.id}
                .schedule=${this.editingSchedule}
                .contentId=${this.contentId}
                .contentName=${this.nodeChildren.find(
          (c) => c.id === this.contentId,
        )?.name || ""}
                @save=${this.handleSaveSchedule}
                @cancel=${this.closeDialog}
              >
              </schedule-dialog>
            `
        : ""}
        ${this.showRecurringDialog
        ? html`
              <recurring-schedule-dialog
                .parentId=${this.id}
                .schedule=${this.editingRecurringSchedule}
                @close=${this.closeRecurringDialog}
                @save=${this.handleRecurringDialogSave}
              >
              </recurring-schedule-dialog>
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
