import { css } from '@umbraco-cms/backoffice/external/lit';

/**
 * Shared CSS styles for Power Sorting dashboard components
 */
export const powerSortSharedStyles = css`
  /* Dashboard Layout */
  .dashboard-container {
    max-width: 1200px;
    margin: 0 auto;
  }

  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--uui-size-space-6);
  }

  .header-content h1 {
    margin: 0 0 var(--uui-size-space-2) 0;
    font-size: var(--uui-type-h3-size);
  }

  .header-content p {
    color: var(--uui-color-text-alt);
    margin: 0;
  }

  .header-actions {
    display: flex;
    gap: var(--uui-size-space-3);
  }

  /* Loading and Error States */
  .loading,
  .error,
  .empty-state {
    padding: var(--uui-size-space-6);
    text-align: center;
    background: var(--uui-color-surface);
    border: 1px solid var(--uui-color-border);
    border-radius: var(--uui-border-radius);
  }

  .error {
    color: var(--uui-color-danger);
    border-color: var(--uui-color-danger);
  }

  .loading-spinner {
    display: flex;
    justify-content: center;
    padding: var(--uui-size-space-8);
  }

  .error-message {
    background: var(--uui-color-danger-emphasis);
    color: var(--uui-color-danger);
    padding: var(--uui-size-space-3);
    border-radius: var(--uui-border-radius);
    margin-bottom: var(--uui-size-space-4);
  }

  .success-message {
    background: var(--uui-color-positive-emphasis);
    color: var(--uui-color-positive);
    padding: var(--uui-size-space-3);
    border-radius: var(--uui-border-radius);
    margin-bottom: var(--uui-size-space-4);
  }

  /* Info Banners */
  .info-banner {
    border: 1px solid var(--uui-color-border);
    border-radius: var(--uui-border-radius);
    padding: var(--uui-size-space-3);
    margin-bottom: var(--uui-size-space-4);
    display: flex;
    align-items: center;
    gap: var(--uui-size-space-3);
  }

  .info-banner.default-order {
    background: var(--uui-color-default-emphasis);
  }

  .info-banner.active-schedule {
    background: var(--uui-color-positive-emphasis);
    border-color: var(--uui-color-positive);
  }

  .info-banner .icon {
    font-size: 20px;
  }

  .info-banner .content {
    flex: 1;
  }

  .info-banner .actions {
    display: flex;
    gap: var(--uui-size-space-2);
  }

  /* Cards and Lists */
  .card {
    background: var(--uui-color-surface);
    border: 1px solid var(--uui-color-border);
    border-radius: var(--uui-border-radius);
    padding: var(--uui-size-space-4);
    display: grid;
    gap: var(--uui-size-space-4);
    align-items: center;
  }

  .card.active {
    border-color: var(--uui-color-positive);
    background: var(--uui-color-positive-emphasis);
  }

  .card-list {
    display: flex;
    flex-direction: column;
    gap: var(--uui-size-space-3);
  }

  /* Tables */
  .data-table {
    width: 100%;
    border-collapse: collapse;
    background: var(--uui-color-surface);
    border-radius: var(--uui-border-radius);
    overflow: hidden;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  .data-table thead {
    background: var(--uui-color-surface-alt);
  }

  .data-table th {
    padding: var(--uui-size-space-4);
    text-align: left;
    font-weight: 600;
    border-bottom: 2px solid var(--uui-color-border);
  }

  .data-table td {
    padding: var(--uui-size-space-4);
    border-bottom: 1px solid var(--uui-color-border);
  }

  .data-table tbody tr {
    transition: all 0.2s;
  }

  .data-table tbody tr:hover {
    background: var(--uui-color-surface-emphasis);
  }

  .data-table tbody tr:last-child td {
    border-bottom: none;
  }

  /* Badges */
  .badge {
    display: inline-flex;
    align-items: center;
    gap: var(--uui-size-space-1);
    padding: var(--uui-size-space-1) var(--uui-size-space-2);
    border-radius: var(--uui-border-radius);
    font-size: var(--uui-type-small-size);
    font-weight: 600;
  }

  .badge.positive {
    background: var(--uui-color-positive);
    color: white;
  }

  .badge.default {
    background: var(--uui-color-surface-emphasis);
    color: var(--uui-color-text);
  }

  .badge.warning {
    background: var(--uui-color-warning);
    color: white;
  }

  /* Utilities */
  .text-center {
    text-align: center;
  }

  .flex {
    display: flex;
  }

  .flex-column {
    flex-direction: column;
  }

  .items-center {
    align-items: center;
  }

  .gap-2 {
    gap: var(--uui-size-space-2);
  }

  .gap-3 {
    gap: var(--uui-size-space-3);
  }

  .mb-4 {
    margin-bottom: var(--uui-size-space-4);
  }

  .p-4 {
    padding: var(--uui-size-space-4);
  }
`;
