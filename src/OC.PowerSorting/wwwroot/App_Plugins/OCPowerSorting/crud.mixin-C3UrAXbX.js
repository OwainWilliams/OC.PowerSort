import { LitElement as n, property as d } from "@umbraco-cms/backoffice/external/lit";
import { U as p, P as r, A as E } from "./api-response.utils-CwOHzmUr.js";
var S = Object.defineProperty, c = (a, e, t, v) => {
  for (var s = void 0, o = a.length - 1, i; o >= 0; o--)
    (i = a[o]) && (s = i(e, t, s) || s);
  return s && S(e, t, s), s;
};
class l extends p(n) {
  constructor() {
    super(), this.saveMessage = "", this.saveMessage = "";
  }
  async saveMenuItemsToDb(e) {
    try {
      const t = await this.makeAuthenticatedRequest(
        `${r.API_BASE}${r.ENDPOINTS.MENU_ITEMS}`,
        {
          method: "POST",
          body: JSON.stringify({ items: e })
        }
      );
      await E.handleResponse(t), localStorage.setItem(r.STORAGE_KEYS.MENU_ITEMS, JSON.stringify(e)), window.dispatchEvent(new CustomEvent("powerSortMenuUpdated", {
        detail: { menuItems: e }
      }));
    } catch (t) {
      console.error("Error saving menu items to database:", t), localStorage.setItem(r.STORAGE_KEYS.MENU_ITEMS, JSON.stringify(e)), window.dispatchEvent(new CustomEvent("powerSortMenuUpdated", {
        detail: { menuItems: e }
      }));
    }
  }
}
c([
  d()
], l.prototype, "saveMessage");
export {
  l as c
};
//# sourceMappingURL=crud.mixin-C3UrAXbX.js.map
