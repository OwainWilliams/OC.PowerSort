import { LitElement, html, css } from '@umbraco-cms/backoffice/external/lit';
import { UmbElementMixin } from '@umbraco-cms/backoffice/element-api';

export default class PowerSortSectionViewElement extends UmbElementMixin(LitElement) {
  static styles = css`
    :host {
      display: block;
      height: 100%;
    }
  `;

  render() {
    return html`
      <umb-body-layout headline="Power Sort">
        <umb-dashboard-collection alias="OC.PowerSorting.Section"></umb-dashboard-collection>
      </umb-body-layout>
    `;
  }
}

customElements.define('power-sort-section-view', PowerSortSectionViewElement);
