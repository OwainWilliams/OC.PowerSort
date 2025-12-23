import { LitElement as s, css as e, html as l } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as a } from "@umbraco-cms/backoffice/element-api";
const o = class o extends a(s) {
  render() {
    return l`
      <umb-body-layout headline="Power Sort">
        <umb-dashboard-collection alias="OC.PowerSorting.Section"></umb-dashboard-collection>
      </umb-body-layout>
    `;
  }
};
o.styles = e`
    :host {
      display: block;
      height: 100%;
    }
  `;
let t = o;
customElements.define("power-sort-section-view", t);
export {
  t as default
};
//# sourceMappingURL=section-view.element-B1ICiDDx.js.map
