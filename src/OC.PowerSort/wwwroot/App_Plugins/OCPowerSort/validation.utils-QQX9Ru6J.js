class r {
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
class s {
  /**
   * Format date to local string
   */
  static formatDateTime(t) {
    return new Date(t).toLocaleString(void 0, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: !1
    });
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
  s as D,
  r as R
};
//# sourceMappingURL=validation.utils-QQX9Ru6J.js.map
