import { html as i } from "@umbraco-cms/backoffice/external/lit";
import { P as r } from "./api-response.utils-CwOHzmUr.js";
const l = (o) => {
  class t extends o {
    /**
     * Render loading state with consistent styling
     */
    renderLoadingState(e = r.MESSAGES.LOADING) {
      return i`
        <div class="loading">
          <uui-loader></uui-loader>
          <p>${e}</p>
        </div>
      `;
    }
    /**
     * Render error state with optional retry action
     */
    renderErrorState(e, n) {
      return i`
        <div class="error">
          <uui-icon name="${r.ICONS.ALERT}"></uui-icon>
          <p>${e}</p>
          ${n ? i`<uui-button @click=${n}>Retry</uui-button>` : ""}
        </div>
      `;
    }
    /**
     * Render empty state with icon and message
     */
    renderEmptyState(e, n = r.ICONS.DOCUMENT) {
      return i`
        <div class="empty-state">
          <uui-icon name="${n}" style="font-size: 48px; opacity: 0.3;"></uui-icon>
          <p>${e}</p>
        </div>
      `;
    }
    /**
     * Render info banner with consistent styling
     */
    renderInfoBanner(e, n, u) {
      return i`
        <div class="info-banner ${e}">
          ${n}
          ${u ? i`<div class="actions">${u}</div>` : ""}
        </div>
      `;
    }
    /**
     * Render badge with consistent styling
     */
    renderBadge(e, n = "default", u) {
      return i`
        <span class="badge ${n}">
          ${u ? i`<uui-icon name="${u}"></uui-icon>` : ""}
          ${e}
        </span>
      `;
    }
    /**
     * Render status badge for schedules
     */
    renderScheduleStatus(e) {
      if (e.isCurrentlyActive)
        return i`
          <uui-badge color="positive" look="primary">
            <uui-icon name="${r.ICONS.CHECK}"></uui-icon>
            Active Now
          </uui-badge>
        `;
      const n = /* @__PURE__ */ new Date(), u = new Date(e.startDateTime), a = new Date(e.endDateTime);
      return n < u ? i`
          <uui-badge color="default" look="secondary">
            <uui-icon name="${r.ICONS.TIME}"></uui-icon>
            Scheduled
          </uui-badge>
        ` : n >= a ? i`
          <uui-badge color="default" look="outline">
            <uui-icon name="${r.ICONS.DELETE}"></uui-icon>
            Expired
          </uui-badge>
        ` : i`
        <uui-badge color="warning" look="secondary">
          <uui-icon name="${r.ICONS.CALENDAR}"></uui-icon>
          Pending
        </uui-badge>
      `;
    }
  }
  return t;
};
export {
  l as U
};
//# sourceMappingURL=ui.mixin-CNYLBGOM.js.map
