import { UmbDocumentPickerInputContext } from '@umbraco-cms/backoffice/document';
import { UmbAuthMixin } from "../mixins/auth.mixin"
import { LitElement, html, customElement } from '@umbraco-cms/backoffice/external/lit';

@customElement('custom-document-picker')
export default class customDocumentPicker extends UmbAuthMixin(LitElement) {
  #pickerContext = new UmbDocumentPickerInputContext(this);

  private async _openPicker() {
    try {
      await this.#pickerContext.openPicker();

      const ctxAny = this.#pickerContext as any;
      const selection = ctxAny.getSelection();

      console.debug('[custom-document-picker] resolved selection:', selection);

      this.dispatchEvent(new CustomEvent('selection-changed', {
        detail: { selection },
        bubbles: true,
        composed: true
      }));
    } catch (err: unknown) {
      console.warn('[custom-document-picker] openPicker error or closed:', err);
    }
    // clear selected nodes after getting selection, ready for next selection
    this.#pickerContext.setSelection([]);
  }

  render() {
    return html`
      <uui-button
        look="primary"
        label="Select document"
        @click=${this._openPicker}>
        Select parent nodes
      </uui-button>
    `;
  }
}
