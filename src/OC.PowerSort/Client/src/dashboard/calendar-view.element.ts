import {
  LitElement,
  html,
  css,
  customElement,
  property,
  unsafeCSS,
} from "@umbraco-cms/backoffice/external/lit";
import type { ScheduleResponse } from "../types/index.js";
import type { RecurringSchedule } from "../types/recurring-schedule.types.js";
import { UmbAuthMixin } from "../mixins/auth.mixin.js";
import { UmbUiMixin } from "../mixins/ui.mixin.js";
import { Timeline } from "vis-timeline/standalone";
import { DataSet } from "vis-data";
import { RecurringScheduleApiClient } from "../api/recurring-schedule-api.client.js";
import { powerSortSharedStyles } from "../styles/shared.styles.js";

const visTimelineCss = `
.vis-timeline {
  position: relative;
  border: 1px solid #bfbfbf;
  overflow: hidden;
  padding: 0;
  margin: 0;
  box-sizing: border-box;
}
.vis-panel {
  position: absolute;
  padding: 0;
  margin: 0;
  box-sizing: border-box;
}
.vis-panel.vis-center,
.vis-panel.vis-left,
.vis-panel.vis-right,
.vis-panel.vis-top,
.vis-panel.vis-bottom {
  position: absolute;
}
.vis-panel.vis-center,
.vis-panel.vis-left,
.vis-panel.vis-right {
  top: 0;
  bottom: 0;
  overflow: hidden;
}
.vis-panel.vis-center,
.vis-panel.vis-top,
.vis-panel.vis-bottom {
  left: 0;
  right: 0;
}
.vis-panel.vis-center {
  overflow: hidden;
}
.vis-panel.vis-top {
  overflow: hidden;
}
.vis-panel.vis-bottom {
  overflow: hidden;
}
.vis-panel > .vis-content {
  position: relative;
}
.vis-panel .vis-shadow {
  position: absolute;
  width: 100%;
  height: 1px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.8);
}
.vis-panel .vis-shadow.vis-top {
  top: 0;
  left: 0;
}
.vis-panel .vis-shadow.vis-bottom {
  bottom: 0;
  left: 0;
}
.vis-labelset {
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
}
.vis-labelset .vis-label {
  position: relative;
  left: 0;
  top: 0;
  width: 100%;
  color: #4d4d4d;
  box-sizing: border-box;
  border-bottom: 1px solid #bfbfbf;
}
.vis-labelset .vis-label:last-child {
  border-bottom: none;
}
.vis-labelset .vis-label .vis-inner {
  display: inline-block;
  padding: 5px;
}
.vis-labelset .vis-label .vis-inner.vis-hidden {
  padding: 0;
}
.vis-itemset {
  position: relative;
  padding: 0;
  margin: 0;
  box-sizing: border-box;
}
.vis-itemset .vis-background,
.vis-itemset .vis-foreground {
  position: absolute;
  width: 100%;
  height: 100%;
  overflow: visible;
}
.vis-axis {
  position: absolute;
  width: 100%;
  height: 0;
  left: 0;
  z-index: 1;
}
.vis-foreground .vis-group {
  position: relative;
  box-sizing: border-box;
  border-bottom: 1px solid #bfbfbf;
}
.vis-foreground .vis-group:last-child {
  border-bottom: none;
}
.vis-nesting-group {
  cursor: pointer;
}
.vis-nested-group {
  background: #f5f5f5;
}
.vis-label.vis-nesting-group.expanded:before {
  content: "▼";
}
.vis-label.vis-nesting-group.collapsed:before {
  content: "►";
}
.vis-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10;
}
.vis-item {
  position: absolute;
  color: #1a1a1a;
  border-color: #97b0f8;
  border-width: 1px;
  background-color: #d5ddf6;
  display: inline-block;
  z-index: 1;
}
.vis-item.vis-selected {
  border-color: #ffc200;
  background-color: #fff785;
  z-index: 2;
}
.vis-editable.vis-selected {
  cursor: move;
}
.vis-item.vis-point.vis-selected {
  background-color: #fff785;
}
.vis-item.vis-box {
  text-align: center;
  border-style: solid;
  border-radius: 2px;
}
.vis-item.vis-point {
  background: none;
}
.vis-item.vis-dot {
  position: absolute;
  padding: 0;
  border-width: 4px;
  border-style: solid;
  border-radius: 4px;
}
.vis-item.vis-range {
  border-style: solid;
  border-radius: 2px;
  box-sizing: border-box;
}
.vis-item.vis-background {
  border: none;
  background-color: rgba(213, 221, 246, 0.4);
  box-sizing: border-box;
  padding: 0;
  margin: 0;
}
.vis-item .vis-item-overflow {
  position: relative;
  width: 100%;
  height: 100%;
  padding: 0;
  margin: 0;
  overflow: hidden;
}
.vis-item-visible-frame {
  white-space: nowrap;
}
.vis-item.vis-range .vis-item-content {
  position: relative;
  display: inline-block;
}
.vis-item.vis-background .vis-item-content {
  position: absolute;
  display: inline-block;
}
.vis-item.vis-line {
  padding: 0;
  position: absolute;
  width: 0;
  border-left-width: 1px;
  border-left-style: solid;
}
.vis-item .vis-item-content {
  white-space: nowrap;
  box-sizing: border-box;
  padding: 5px;
}
.vis-item .vis-onUpdateTime-tooltip {
  position: absolute;
  background: #4f81bd;
  color: white;
  width: 200px;
  text-align: center;
  white-space: nowrap;
  padding: 5px;
  border-radius: 1px;
  transition: 0.4s;
}
.vis-item .vis-delete,
.vis-item .vis-delete-rtl {
  position: absolute;
  top: 0;
  width: 24px;
  height: 24px;
  box-sizing: border-box;
  padding: 0 5px;
  cursor: pointer;
  transition: background 0.2s linear;
}
.vis-item .vis-delete {
  right: -24px;
}
.vis-item .vis-delete-rtl {
  left: -24px;
}
.vis-item .vis-delete:after,
.vis-item .vis-delete-rtl:after {
  content: "×";
  color: red;
  font-family: arial, sans-serif;
  font-size: 22px;
  font-weight: bold;
  transition: color 0.2s linear;
}
.vis-item .vis-delete:hover,
.vis-item .vis-delete-rtl:hover {
  background: red;
}
.vis-item .vis-delete:hover:after,
.vis-item .vis-delete-rtl:hover:after {
  color: white;
}
.vis-item .vis-drag-center {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  cursor: move;
}
.vis-item.vis-range .vis-drag-left {
  position: absolute;
  width: 24px;
  max-width: 20%;
  min-width: 2px;
  height: 100%;
  top: 0;
  left: -4px;
  cursor: w-resize;
}
.vis-item.vis-range .vis-drag-right {
  position: absolute;
  width: 24px;
  max-width: 20%;
  min-width: 2px;
  height: 100%;
  top: 0;
  right: -4px;
  cursor: e-resize;
}
.vis-range.vis-item.vis-readonly-drag-left .vis-drag-left {
  cursor: auto;
}
.vis-range.vis-item.vis-readonly-drag-right .vis-drag-right {
  cursor: auto;
}
.vis-time-axis {
  position: relative;
  overflow: hidden;
}
.vis-time-axis.vis-foreground {
  top: 0;
  left: 0;
  width: 100%;
}
.vis-time-axis.vis-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
.vis-time-axis .vis-text {
  position: absolute;
  color: #4d4d4d;
  padding: 3px;
  overflow: hidden;
  box-sizing: border-box;
  white-space: nowrap;
}
.vis-time-axis .vis-text.vis-measure {
  position: absolute;
  padding-left: 0;
  padding-right: 0;
  margin-left: 0;
  margin-right: 0;
  visibility: hidden;
}
.vis-time-axis .vis-grid.vis-vertical {
  position: absolute;
  border-left: 1px solid;
}
.vis-time-axis .vis-grid.vis-vertical-rtl {
  position: absolute;
  border-right: 1px solid;
}
.vis-time-axis .vis-grid.vis-minor {
  border-color: #e5e5e5;
}
.vis-time-axis .vis-grid.vis-major {
  border-color: #bfbfbf;
}
.vis-current-time {
  background-color: #ff7f6e;
  width: 2px;
  z-index: 1;
  pointer-events: none;
}
.vis-rolling-mode-btn {
  height: 40px;
  width: 40px;
  position: absolute;
  top: 7px;
  right: 20px;
  border-radius: 50%;
  font-size: 28px;
  cursor: pointer;
  opacity: 0.8;
  color: white;
  font-weight: bold;
  text-align: center;
  background: #3876c2;
}
.vis-rolling-mode-btn:before {
  content: "\\26F6";
}
.vis-rolling-mode-btn:hover {
  opacity: 1;
}
.vis-custom-time {
  background-color: #6e94ff;
  width: 2px;
  cursor: move;
  z-index: 1;
}
.vis-panel.vis-background.vis-horizontal .vis-grid.vis-horizontal {
  position: absolute;
  width: 100%;
  height: 0;
  border-bottom: 1px solid;
}
.vis-panel.vis-background.vis-horizontal .vis-grid.vis-minor {
  border-color: #e5e5e5;
}
.vis-panel.vis-background.vis-horizontal .vis-grid.vis-major {
  border-color: #bfbfbf;
}
.vis-tooltip {
  position: absolute;
  visibility: visible;
  padding: 8px;
  white-space: nowrap;
  font-family: sans-serif;
  font-size: 13px;
  color: #1a1a1a;
  background-color: #fff;
  border: 1px solid #bfbfbf;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  border-radius: 4px;
  pointer-events: none;
  z-index: 1000;
}
`;

@customElement("calendar-view")
export default class CalendarView extends UmbUiMixin(UmbAuthMixin(LitElement)) {
  @property({ type: Array })
  private activeSchedules: ScheduleResponse[] = [];

  @property({ type: Array })
  private recurringSchedules: RecurringSchedule[] = [];

  private apiClient: RecurringScheduleApiClient | null = null;

  private timeline?: Timeline;
  private items?: DataSet<any>;
  private groups?: DataSet<any>;

  async connectedCallback() {
    super.connectedCallback();
    this.apiClient = new RecurringScheduleApiClient(() => this.getAuthToken());
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    // Clean up timeline instance
    if (this.timeline) {
      this.timeline.destroy();
    }
  }

  protected firstUpdated() {
    this.createTimeline();
  }

  protected updated(changedProperties: Map<string, any>) {
    // Update timeline when schedules change
    if (
      changedProperties.has("activeSchedules") ||
      changedProperties.has("recurringSchedules")
    ) {
      this.updateTimelineData();
    }
  }

  private createTimeline() {
    const container = this.renderRoot.querySelector(
      "#timeline-container",
    ) as HTMLElement;

    if (!container) {
      console.error("Timeline container not found");
      return;
    }

    // Create groups (one for each content item)
    this.groups = new DataSet();
    this.items = new DataSet();

    // Set a default time window (current week ± 2 weeks)
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    const end = new Date(now);
    end.setDate(end.getDate() + 14);

    // Configure timeline options - keep it simple
    const options: any = {
      width: "100%",
      height: "600px",
      stack: true,
      showCurrentTime: true,
      start: start,
      end: end,
      min: new Date(now.getFullYear() - 1, 0, 1), // Can't scroll before 1 year ago
      max: new Date(now.getFullYear() + 1, 11, 31), // Can't scroll beyond 1 year ahead
      zoomMin: 1000 * 60 * 60 * 24, // 1 day minimum zoom
      zoomMax: 1000 * 60 * 60 * 24 * 90, // 90 days maximum zoom
      editable: false,
      margin: {
        item: {
          horizontal: 10,
          vertical: 5,
        },
      },
      orientation: {
        axis: "top",
        item: "top",
      },
      tooltip: {
        followMouse: true,
        overflowMethod: "flip",
        template: function (originalItemData: any, _parsedItemData: any) {
          const colorMap: Record<string, string> = {
            "active-schedule": "#16a34a",
            scheduled: "#2563eb",
            "recurring-scheduled": "#9333ea",
            "recurring-processed": "#64748b",
          };
          const color = colorMap[originalItemData.className] ?? "#333";
          return `<div style="padding:6px 10px;font-family:sans-serif;font-size:13px;">
            <strong style="color:${color}">${originalItemData.content}</strong>
            <hr style="margin:4px 0;border-color:${color};opacity:0.3;" />
            ${originalItemData.title.replace(/<br\s*\/?>/gi, "<br/>")}
          </div>`;
        },
      },
    };

    // Initialize timeline
    this.timeline = new Timeline(container, this.items, this.groups, options);

    // Add click handler for items
    this.timeline.on("select", (properties) => {
      if (properties.items.length > 0) {
        const itemId = properties.items[0];
        this.handleScheduleClick(itemId);
      }
    });

    // Load initial data
    this.updateTimelineData();
  }

  private isUpdating = false;

  private async updateTimelineData() {
    if (!this.items || !this.groups || this.isUpdating) return;

    this.isUpdating = true;
    try {
      this.items.clear();
      this.groups.clear();

      const range = Math.max(
        ...this.activeSchedules.map((s) => s.targetPosition),
        ...this.recurringSchedules.map((s) => s.targetPosition),
      );
      for (let i = 0; i <= range; i++) {
        this.groups!.add({
          id: i,
          content: `Position ${i}`,
        });
      }

      // Active schedules (synchronous)
      this.activeSchedules.forEach((schedule) => {
        const startDate = new Date(schedule.startDateTime);
        const endDate = new Date(schedule.endDateTime);

        if (
          isNaN(startDate.getTime()) ||
          isNaN(endDate.getTime()) ||
          endDate <= startDate
        )
          return;

        this.items!.add({
          id: schedule.id,
          group: schedule.targetPosition, // ← use position as group
          content: schedule.contentName, // ← show content name as label
          start: startDate,
          end: endDate,
          type: "range",
          className: schedule.isCurrentlyActive
            ? "active-schedule"
            : "scheduled",
          title: `${schedule.contentName}<br/>Position: ${schedule.targetPosition}<br/>Priority: ${schedule.priority}`,
          data: schedule,
        });
      });

      // Recurring schedules - await all fetches before adding
      const recurringWithOccurrences = await Promise.all(
        this.recurringSchedules.map(async (recurring) => {
          try {
            const response = await this.apiClient?.getRecurringSchedule(
              recurring.id,
            );
            return {
              ...recurring,
              upcomingOccurrences: response?.upcomingOccurrences || [],
            };
          } catch (error) {
            console.error(
              `Failed to fetch details for recurring schedule ${recurring.id}:`,
              error,
            );
            return recurring;
          }
        }),
      );

      recurringWithOccurrences.forEach((recurring) => {
        if (recurring.upcomingOccurrences) {
          recurring.upcomingOccurrences.forEach((occurrence, index) => {
            if (!occurrence.isCancelled) {
              const startDate = new Date(occurrence.startDate);
              const endDate = new Date(occurrence.endDate);

              if (
                isNaN(startDate.getTime()) ||
                isNaN(endDate.getTime()) ||
                endDate <= startDate
              )
                return;

              this.items!.add({
                id: `${recurring.id}-occurrence-${index}`,
                group: recurring.targetPosition, // ← use position as group
                content: recurring.contentName,
                start: startDate,
                end: endDate,
                type: "range",
                className: occurrence.isProcessed
                  ? "recurring-processed"
                  : "recurring-scheduled",
                title: `${recurring.contentName} (Recurring)<br/>Position: ${recurring.targetPosition}<br/>Priority: ${recurring.priority}<br/>Pattern: ${recurring.pattern.description}`,
                data: recurring,
              });
            }
          });
        }
      });
    } finally {
      this.isUpdating = false;
    }
  }

  private handleScheduleClick(itemId: string) {
    console.log("Schedule clicked:", itemId);
    // Emit custom event or handle schedule editing
    this.dispatchEvent(
      new CustomEvent("schedule-selected", {
        detail: { itemId },
        bubbles: true,
        composed: true,
      }),
    );
  }

  static styles = css`
    ${powerSortSharedStyles}
    ${unsafeCSS(visTimelineCss)}

    :host {
      display: block;
      width: 100%;
    }

    #calendar-view {
      width: 100%;
      box-sizing: border-box;
    }

    #timeline-container {
      width: 100%;
      min-height: 400px;
      border: 1px solid var(--uui-color-border, #d8d7d9);
      border-radius: 4px;
      background: var(--uui-color-surface, #fff);
    }

    /* Override vis-timeline item colors */
    .vis-item.active-schedule {
      background-color: #22c55e;
      border-color: #16a34a;
    }

    .vis-item.scheduled {
      background-color: #3b82f6;
      border-color: #2563eb;
    }

    .vis-item.recurring-scheduled {
      background-color: #a855f7;
      border-color: #9333ea;
      border-style: dashed;
    }

    .vis-item.recurring-processed {
      background-color: #94a3b8;
      border-color: #64748b;
    }

    .timeline-legend {
      display: flex;
      gap: 16px;
      margin-bottom: 12px;
      padding: 8px;
      background: var(--uui-color-surface, #fff);
      border-radius: 4px;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
    }

    .legend-color {
      width: 20px;
      height: 12px;
      border-radius: 2px;
    }

    .active-color {
      background-color: #22c55e;
    }

    .scheduled-color {
      background-color: #3b82f6;
    }

    .recurring-color {
      background-color: #a855f7;
      border: 2px dashed #9333ea;
    }

    .recurring-scheduled {
    }
  `;

  render() {
    return html`
      <div
        id="calendar-view"
        class="js-view js-calendar-view schedule-view-panel"
        role="tabpanel"
      >
        <div class="timeline-legend">
          <div class="legend-item">
            <div class="legend-color active-color"></div>
            <span>Currently Active</span>
          </div>
          <div class="legend-item">
            <div class="legend-color scheduled-color"></div>
            <span>Scheduled</span>
          </div>
          <div class="legend-item">
            <div class="legend-color recurring-color"></div>
            <span>Recurring</span>
          </div>
        </div>
        <div id="timeline-container"></div>
      </div>
    `;
  }
}
