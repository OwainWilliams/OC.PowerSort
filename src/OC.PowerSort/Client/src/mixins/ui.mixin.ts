import { LitElement, html, TemplateResult } from '@umbraco-cms/backoffice/external/lit';
import { PowerSortConstants } from '../utils/constants.js';

/**
 * Base component mixin for common UI patterns
 */
export const UmbUiMixin = <T extends Constructor<LitElement>>(superClass: T) => {
  class UmbUiMixinClass extends superClass {

    /**
     * Render loading state with consistent styling
     */
    protected renderLoadingState(message: string = PowerSortConstants.MESSAGES.LOADING): TemplateResult {
      return html`
        <div class="loading">
          <uui-loader></uui-loader>
          <p>${message}</p>
        </div>
      `;
    }

    /**
     * Render error state with optional retry action
     */
    protected renderErrorState(error: string, retryAction?: () => void): TemplateResult {
      return html`
        <div class="error">
          <uui-icon name="${PowerSortConstants.ICONS.ALERT}"></uui-icon>
          <p>${error}</p>
          ${retryAction 
            ? html`<uui-button @click=${retryAction}>Retry</uui-button>`
            : ''}
        </div>
      `;
    }

    /**
     * Render empty state with icon and message
     */
    protected renderEmptyState(
      message: string, 
      icon: string = PowerSortConstants.ICONS.DOCUMENT
    ): TemplateResult {
      return html`
        <div class="empty-state">
          <uui-icon name="${icon}" style="font-size: 48px; opacity: 0.3;"></uui-icon>
          <p>${message}</p>
        </div>
      `;
    }

    /**
     * Render info banner with consistent styling
     */
    protected renderInfoBanner(
      type: 'default' | 'positive' | 'warning',
      content: TemplateResult,
      actions?: TemplateResult
    ): TemplateResult {
      return html`
        <div class="info-banner ${type}">
          ${content}
          ${actions ? html`<div class="actions">${actions}</div>` : ''}
        </div>
      `;
    }

    /**
     * Render badge with consistent styling
     */
    protected renderBadge(
      text: string,
      type: 'positive' | 'default' | 'warning' = 'default',
      icon?: string
    ): TemplateResult {
      return html`
        <span class="badge ${type}">
          ${icon ? html`<uui-icon name="${icon}"></uui-icon>` : ''}
          ${text}
        </span>
      `;
    }

    /**
     * Render status badge for schedules
     */
    protected renderScheduleStatus(schedule: any): TemplateResult {
      if (schedule.isCurrentlyActive) {
        return html`
          <uui-badge color="positive" look="primary">
            <uui-icon name="${PowerSortConstants.ICONS.CHECK}"></uui-icon>
            Active Now
          </uui-badge>
        `;
      }

      const now = new Date();
      const start = new Date(schedule.startDateTime);
      const end = new Date(schedule.endDateTime);

      if (now < start) {
        return html`
          <uui-badge color="default" look="secondary">
            <uui-icon name="${PowerSortConstants.ICONS.TIME}"></uui-icon>
            Scheduled
          </uui-badge>
        `;
      }

      if (now >= end) {
        return html`
          <uui-badge color="default" look="outline">
            <uui-icon name="${PowerSortConstants.ICONS.DELETE}"></uui-icon>
            Expired
          </uui-badge>
        `;
      }

      return html`
        <uui-badge color="warning" look="secondary">
          <uui-icon name="${PowerSortConstants.ICONS.CALENDAR}"></uui-icon>
          Pending
        </uui-badge>
      `;
    }
  }

  return UmbUiMixinClass;
};

// Type helper for constructor
type Constructor<T = {}> = new (...args: any[]) => T;
