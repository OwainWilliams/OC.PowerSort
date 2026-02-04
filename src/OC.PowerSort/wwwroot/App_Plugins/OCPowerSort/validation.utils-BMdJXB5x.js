class s {
  /**
   * Navigate using Umbraco's routing system
   */
  static navigateTo(t) {
    history.pushState(null, "", t), window.dispatchEvent(new PopStateEvent("popstate"));
  }
  /**
   * Generate dashboard path for Power Sort sections
   * Now routes to main dashboard with view type and ID in path
   */
  static getDashboardPath(t, e) {
    return `/umbraco/section/power-sort/dashboard/power-sort-dashboard#${t}/${e}`;
  }
}
class n {
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
  n as D,
  s as R
};
//# sourceMappingURL=validation.utils-BMdJXB5x.js.map
