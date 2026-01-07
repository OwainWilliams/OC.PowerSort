const s = class s {
  /**
   * Check if a string is a valid GUID
   */
  static isGuid(t) {
    return this.GUID_REGEX.test(t);
  }
  /**
   * Extract GUID from URL path segments
   */
  static extractGuidFromPath(t = window.location.pathname) {
    const e = t.split("/").filter(Boolean), a = e[e.length - 1];
    return this.isGuid(a) ? a : null;
  }
  /**
   * Validate email format
   */
  static isValidEmail(t) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
  }
  /**
   * Check if date range is valid (start before end)
   */
  static isValidDateRange(t, e) {
    const a = new Date(t), r = new Date(e);
    return a < r;
  }
};
s.GUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
let n = s;
class o {
  /**
   * Navigate using Umbraco's routing system
   */
  static navigateTo(t) {
    history.pushState(null, "", t), window.dispatchEvent(new PopStateEvent("popstate"));
  }
  /**
   * Generate dashboard path for Power Sort sections
   */
  static getDashboardPath(t, e) {
    return `/umbraco/section/power-sort/dashboard/power-sort-${t}/${e}`;
  }
}
class c {
  /**
   * Format date to local string
   */
  static formatDateTime(t) {
    return new Date(t).toLocaleString();
  }
  /**
   * Format date for input fields (YYYY-MM-DDTHH:mm)
   */
  static formatForInput(t) {
    return new Date(t).toISOString().slice(0, 16);
  }
  /**
   * Get current UTC time
   */
  static now() {
    return /* @__PURE__ */ new Date();
  }
  /**
   * Check if date is in the past
   */
  static isInPast(t) {
    return new Date(t) < /* @__PURE__ */ new Date();
  }
  /**
   * Check if date is in the future
   */
  static isInFuture(t) {
    return new Date(t) > /* @__PURE__ */ new Date();
  }
}
export {
  c as D,
  o as R,
  n as V
};
//# sourceMappingURL=validation.utils-BWAQMB43.js.map
