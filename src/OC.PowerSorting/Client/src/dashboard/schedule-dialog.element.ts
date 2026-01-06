import { LitElement, html, css, property } from '@umbraco-cms/backoffice/external/lit';
import { UmbElementMixin } from '@umbraco-cms/backoffice/element-api';
import { UmbDocumentItemRepository } from '@umbraco-cms/backoffice/document';
import type { ScheduleResponse } from '../types/index.js';

export default class ScheduleDialogElement extends UmbElementMixin(LitElement) {
  @property({ type: String })
  public parentId: string = '';

  @property({ type: Object })
  public schedule: ScheduleResponse | null = null;

  @property({ type: String })
  private selectedContentId: string = '';

  @property({ type: String })
  private selectedContentName: string = '';

  @property({ type: Number })
  private targetPosition: number = 0;

  @property({ type: String })
  private startDateTime: string = '';

  @property({ type: String })
  private endDateTime: string = '';

  @property({ type: Number })
  private priority: number = 0;

  @property({ type: String })
  private error: string = '';

  #documentItemRepository = new UmbDocumentItemRepository(this);

  connectedCallback() {
    super.connectedCallback();

    if (this.schedule) {
      // Editing existing schedule
      this.selectedContentId = this.schedule.contentId;
      this.selectedContentName = this.schedule.contentName;
      this.targetPosition = this.schedule.targetPosition;
      this.startDateTime = this.toLocalDateTimeString(this.schedule.startDateTime);
      this.endDateTime = this.toLocalDateTimeString(this.schedule.endDateTime);
      this.priority = this.schedule.priority;
    } else {
      // New schedule - set defaults
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);

      this.startDateTime = this.toLocalDateTimeString(now.toISOString());
      this.endDateTime = this.toLocalDateTimeString(tomorrow.toISOString());
      this.targetPosition = 0;
      this.priority = 0;
    }
  }

  private toLocalDateTimeString(isoString: string): string {
    const date = new Date(isoString);
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60 * 1000);
    return localDate.toISOString().slice(0, 16);
  }

  private toISOString(localDateTimeString: string): string {
    return new Date(localDateTimeString).toISOString();
  }

  private async handleContentSelected(event: Event) {
    const picker = event.target as any;
    let selection = picker.selection || picker.value;

    if (selection && Array.isArray(selection) && selection.length > 0) {
      const nodeId =
        typeof selection[0] === 'string'
          ? selection[0]
          : selection[0].unique || selection[0].id;

      try {
        const { data } = await this.#documentItemRepository.requestItems([nodeId]);

        if (data && data.length > 0) {
          const nodeData = data[0];
          this.selectedContentId = nodeData.unique;
          this.selectedContentName = nodeData.variants?.[0]?.name || 'Unnamed Node';
        }
      } catch (error) {
        console.error('Error fetching node details:', error);
        this.error = 'Error loading content details';
      }
    }
  }

  private handleSave() {
    this.error = '';

    // Validation
    if (!this.schedule && !this.selectedContentId) {
      this.error = 'Please select a content item';
      return;
    }

    if (this.targetPosition < 0) {
      this.error = 'Target position must be non-negative';
      return;
    }

    if (!this.startDateTime || !this.endDateTime) {
      this.error = 'Start and end dates are required';
      return;
    }

    const start = new Date(this.startDateTime);
    const end = new Date(this.endDateTime);

    if (start >= end) {
      this.error = 'End date must be after start date';
      return;
    }

    // Dispatch save event
    this.dispatchEvent(
      new CustomEvent('save', {
        detail: {
          contentId: this.selectedContentId,
          targetPosition: this.targetPosition,
          startDateTime: this.toISOString(this.startDateTime),
          endDateTime: this.toISOString(this.endDateTime),
          priority: this.priority
        },
        bubbles: true,
        composed: true
      })
    );
  }

  private handleCancel() {
    this.dispatchEvent(
      new CustomEvent('cancel', {
        bubbles: true,
        composed: true
      })
    );
  }

  static styles = css`
    :host {
      display: block;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .dialog {
      background: var(--uui-color-surface);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-6);
      max-width: 600px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--uui-size-space-5);
    }

    .dialog-header h3 {
      margin: 0;
      font-size: var(--uui-type-h4-size);
    }

    .form-field {
      margin-bottom: var(--uui-size-space-4);
    }

    .form-field label {
      display: block;
      font-weight: 500;
      margin-bottom: var(--uui-size-space-2);
    }

    .form-field input,
    .form-field uui-input {
      width: 100%;
    }

    .form-field .description {
      font-size: var(--uui-type-small-size);
      color: var(--uui-color-text-alt);
      margin-top: var(--uui-size-space-1);
    }

    .dialog-actions {
      display: flex;
      gap: var(--uui-size-space-3);
      justify-content: flex-end;
      margin-top: var(--uui-size-space-5);
    }

    .error-message {
      background: var(--uui-color-danger-emphasis);
      color: var(--uui-color-danger);
      padding: var(--uui-size-space-3);
      border-radius: var(--uui-border-radius);
      margin-bottom: var(--uui-size-space-4);
    }

    .date-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--uui-size-space-3);
    }

    .selected-content {
      padding: var(--uui-size-space-3);
      background: var(--uui-color-positive-emphasis);
      border-radius: var(--uui-border-radius);
      margin-top: var(--uui-size-space-2);
    }
  `;

  render() {
    return html`
      <div class="dialog" @click=${(e: Event) => e.stopPropagation()}>
        <div class="dialog-header">
          <h3>
            <uui-icon name="icon-calendar"></uui-icon>
            ${this.schedule ? 'Edit Schedule' : 'Create Schedule'}
          </h3>
          <uui-button
            look="outline"
            label="Close"
            compact
            @click=${this.handleCancel}>
            <uui-icon name="icon-delete"></uui-icon>
          </uui-button>
        </div>

        ${this.error
          ? html`
              <div class="error-message">
                <uui-icon name="icon-alert"></uui-icon>
                ${this.error}
              </div>
            `
          : ''}

        <div class="form-field">
          <label>
            <uui-icon name="icon-document"></uui-icon>
            Content to Boost
          </label>
          ${this.schedule
            ? html`
                <div class="selected-content">
                  <strong>${this.selectedContentName}</strong>
                  <div class="description">Cannot change content when editing</div>
                </div>
              `
            : html`
                <umb-input-document
                  @change=${this.handleContentSelected}
                  max="1"
                  min="0">
                </umb-input-document>
                ${this.selectedContentName
                  ? html`
                      <div class="selected-content">
                        <uui-icon name="icon-check"></uui-icon>
                        Selected: <strong>${this.selectedContentName}</strong>
                      </div>
                    `
                  : ''}
                <div class="description">Select the content item to boost</div>
              `}
        </div>

        <div class="form-field">
          <label>
            <uui-icon name="icon-navigation-up"></uui-icon>
            Target Position
          </label>
          <uui-input
            type="number"
            .value=${this.targetPosition.toString()}
            @change=${(e: any) => (this.targetPosition = parseInt(e.target.value) || 0)}
            min="0">
          </uui-input>
          <div class="description">Position to boost the content to (0 = first)</div>
        </div>

        <div class="date-grid">
          <div class="form-field">
            <label>
              <uui-icon name="icon-calendar-alt"></uui-icon>
              Start Date & Time
            </label>
            <input
              type="datetime-local"
              .value=${this.startDateTime}
              @change=${(e: any) => (this.startDateTime = e.target.value)} />
            <div class="description">When the schedule becomes active</div>
          </div>

          <div class="form-field">
            <label>
              <uui-icon name="icon-calendar-alt"></uui-icon>
              End Date & Time
            </label>
            <input
              type="datetime-local"
              .value=${this.endDateTime}
              @change=${(e: any) => (this.endDateTime = e.target.value)} />
            <div class="description">When the schedule expires</div>
          </div>
        </div>

        <div class="form-field">
          <label>
            <uui-icon name="icon-settings"></uui-icon>
            Priority (Optional)
          </label>
          <uui-input
            type="number"
            .value=${this.priority.toString()}
            @change=${(e: any) => (this.priority = parseInt(e.target.value) || 0)}
            min="0">
          </uui-input>
          <div class="description">
            Higher priority schedules take precedence (default: 0)
          </div>
        </div>

        <div class="dialog-actions">
          <uui-button look="outline" label="Cancel" @click=${this.handleCancel}>
            Cancel
          </uui-button>
          <uui-button
            look="primary"
            color="positive"
            label="Save"
            @click=${this.handleSave}>
            <uui-icon name="icon-check"></uui-icon>
            ${this.schedule ? 'Update' : 'Create'} Schedule
          </uui-button>
        </div>
      </div>
    `;
  }
}

customElements.define('schedule-dialog', ScheduleDialogElement);
