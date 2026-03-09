import {
  LitElement,
  html,
  css,
  customElement,
  property,
} from "@umbraco-cms/backoffice/external/lit";

@customElement("power-sort-confirm-modal")
export class PowerSortConfirmModalElement extends LitElement {
  @property({ type: String })
  headline = "Confirm Action";

  @property({ type: String })
  message = "Are you sure?";

  @property({ type: String })
  confirmLabel = "Confirm";

  @property({ type: String })
  cancelLabel = "Cancel";

  @property({ type: String })
  color: "default" | "positive" | "warning" | "danger" = "default";

  static styles = css`
    :host {
      display: contents;
    }

    .modal-content {
      padding: var(--uui-size-space-5);
    }

    .modal-actions {
      display: flex;
      gap: var(--uui-size-space-3);
      justify-content: flex-end;
      margin-top: var(--uui-size-space-5);
    }

    p {
      margin: 0;
      color: var(--uui-color-text);
    }
  `;

  private _handleConfirm() {
    this.dispatchEvent(
      new CustomEvent("confirm", {
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleCancel() {
    this.dispatchEvent(
      new CustomEvent("cancel", {
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    return html`
      <uui-dialog-layout .headline=${this.headline}>
        <div class="modal-content">
          <p>${this.message}</p>
        </div>
        <div class="modal-actions" slot="actions">
          <uui-button
            label=${this.cancelLabel}
            look="secondary"
            @click=${this._handleCancel}
          >
            ${this.cancelLabel}
          </uui-button>
          <uui-button
            label=${this.confirmLabel}
            look="primary"
            color=${this.color}
            @click=${this._handleConfirm}
          >
            ${this.confirmLabel}
          </uui-button>
        </div>
      </uui-dialog-layout>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "power-sort-confirm-modal": PowerSortConfirmModalElement;
  }
}
