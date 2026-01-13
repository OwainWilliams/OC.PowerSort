import { LitElement, property } from '@umbraco-cms/backoffice/external/lit';
import { PowerSortConstants } from '../utils/constants.js';
import { UmbAuthMixin } from '../mixins/auth.mixin.js';
import type { MenuItem } from '../types/index.js';
import { ApiResponseHandler } from '../utils/api-response.utils.js';


export default class crudMixin extends UmbAuthMixin(LitElement) {

  @property()
  public saveMessage: string = ""
  constructor() {
    super()
    this.saveMessage = "";
  }

    async saveMenuItemsToDb(menuItems: MenuItem[]) {
      try {
        const response = await this.makeAuthenticatedRequest(
          `${PowerSortConstants.API_BASE}${PowerSortConstants.ENDPOINTS.MENU_ITEMS}`,
          {
            method: 'POST',
            body: JSON.stringify({ items: menuItems })
          }
        );

        await ApiResponseHandler.handleResponse(response);

        // Save to localStorage as backup
        localStorage.setItem(PowerSortConstants.STORAGE_KEYS.MENU_ITEMS, JSON.stringify(menuItems));

        // Dispatch update event
        window.dispatchEvent(new CustomEvent('powerSortMenuUpdated', {
          detail: { menuItems: menuItems }
        }));
      } catch (error) {
        console.error('Error saving menu items to database:', error);

        // Fallback to localStorage
        localStorage.setItem(PowerSortConstants.STORAGE_KEYS.MENU_ITEMS, JSON.stringify(menuItems));
        window.dispatchEvent(new CustomEvent('powerSortMenuUpdated', {
          detail: { menuItems: menuItems }
        }));
      }
    }
  }
