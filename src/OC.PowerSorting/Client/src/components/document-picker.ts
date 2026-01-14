import { UmbDocumentPickerInputContext } from '@umbraco-cms/backoffice/document';
import { UmbAuthMixin } from "../mixins/auth.mixin"
import { LitElement, html, customElement } from '@umbraco-cms/backoffice/external/lit';

@customElement('custom-document-picker')
export default class customDocumentPicker extends UmbAuthMixin(LitElement) {
  #pickerContext = new UmbDocumentPickerInputContext(this);

  private async _openPicker() {
    try {
      // open the modal; the picker context sets its internal selection rather than returning it
      await this.#pickerContext.openPicker();

      // Try common accessors on the context to read the selection after the modal closes.
      const ctxAny = this.#pickerContext as any;
      let selection: unknown = [];

      if (typeof ctxAny.getSelection === 'function') {
        selection = ctxAny.getSelection();
      } else if (typeof ctxAny.selection !== 'undefined') {
        selection = ctxAny.selection;
      } else if (typeof ctxAny.value !== 'undefined') {
        selection = ctxAny.value;
      }

      console.debug('[custom-document-picker] resolved selection:', selection);

      this.dispatchEvent(new CustomEvent('selection-changed', {
        detail: {selection},
        bubbles: true,
        composed: true
      }));
    } catch (err: unknown) {
      console.warn('[custom-document-picker] openPicker error or closed:', err);
    }
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
