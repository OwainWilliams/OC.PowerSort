import {html, css, property } from '@umbraco-cms/backoffice/external/lit';
import { PowerSortConstants } from '../utils/constants.js';
import { ApiResponseHandler } from '../utils/api-response.utils.js';
import type { MenuItem } from '../types/index.js';
import { UmbDocumentItemRepository } from '@umbraco-cms/backoffice/document';
import crudMixin from "../mixins/crud.mixin.js"
import "../components/document-picker.js"
export default class PowerSortDashboardElement extends crudMixin {
  @property({ type: String })
  private selectedNodeId: string | null = null;

  @property({ type: String })
  private selectedNodeName: string = '';

  @property({ type: Array })
  private menuItems: MenuItem[] = [];

  private documentItemRepository?: UmbDocumentItemRepository;

  constructor() {
    super();
    this.selectedNodeId = null;
    this.selectedNodeName = '';
    this.menuItems = [];
  }

  async connectedCallback() {
    super.connectedCallback(); // Auth setup handled by mixin
    
    // Initialize repository after element is connected
    this.documentItemRepository = new UmbDocumentItemRepository(this);
    
    await this.loadMenuItemsFromDb();
  }

  async loadMenuItemsFromDb() {
    try {
      const response = await this.makeAuthenticatedRequest(
        `${PowerSortConstants.API_BASE}${PowerSortConstants.ENDPOINTS.MENU_ITEMS}`
      );

      const data = await ApiResponseHandler.handleResponse<{items: MenuItem[]}>(response);
      this.menuItems = data.items || [];
    } catch (error) {
      console.error('Error loading menu items from database:', error);
      const saved = localStorage.getItem(PowerSortConstants.STORAGE_KEYS.MENU_ITEMS);
      this.menuItems = saved ? JSON.parse(saved) : [];
    }
  }

  async saveMenuItemsToDb() {
    try {
      const response = await this.makeAuthenticatedRequest(
        `${PowerSortConstants.API_BASE}${PowerSortConstants.ENDPOINTS.MENU_ITEMS}`,
        {
          method: 'POST',
          body: JSON.stringify({ items: this.menuItems })
        }
      );

      await ApiResponseHandler.handleResponse(response);

      // Save to localStorage as backup
      localStorage.setItem(PowerSortConstants.STORAGE_KEYS.MENU_ITEMS, JSON.stringify(this.menuItems));

      // Dispatch update event
      window.dispatchEvent(new CustomEvent('powerSortMenuUpdated', {
        detail: { menuItems: this.menuItems }
      }));
    } catch (error) {
      console.error('Error saving menu items to database:', error);
      
      // Fallback to localStorage
      localStorage.setItem(PowerSortConstants.STORAGE_KEYS.MENU_ITEMS, JSON.stringify(this.menuItems));
      window.dispatchEvent(new CustomEvent('powerSortMenuUpdated', {
        detail: { menuItems: this.menuItems }
      }));
    }
  }



  static styles = css`
    :host {
      display: block;
      padding: var(--uui-size-space-5);
    }

    .dashboard-container {
      max-width: 800px;
      margin: 0 auto;
    }

    .dashboard-header {
      margin-bottom: var(--uui-size-space-6);
    }

    .dashboard-header h1 {
      margin: 0 0 var(--uui-size-space-2) 0;
      font-size: var(--uui-type-h3-size);
    }

    .dashboard-header p {
      color: var(--uui-color-text-alt);
      margin: 0;
    }

    .content-picker-section {
      margin-bottom: var(--uui-size-space-6);
    }

    .content-picker-section h2 {
      font-size: var(--uui-type-h5-size);
      margin-bottom: var(--uui-size-space-3);
    }

    .content-picker-wrapper {
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-4);
    }

    .picker-label {
      display: block;
      font-weight: 500;
      margin-bottom: var(--uui-size-space-2);
      color: var(--uui-color-text);
    }

    .picker-description {
      display: block;
      font-size: var(--uui-type-small-size);
      color: var(--uui-color-text-alt);
      margin-bottom: var(--uui-size-space-3);
    }

    .selected-info {
      margin-top: var(--uui-size-space-4);
      padding: var(--uui-size-space-4);
      background: var(--uui-color-positive-emphasis);
      border-radius: var(--uui-border-radius);
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
    }

    .selected-info uui-icon {
      color: var(--uui-color-positive);
    }

    .save-message {
      margin-top: var(--uui-size-space-3);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-positive);
      color: white;
      border-radius: var(--uui-border-radius);
      text-align: center;
      animation: fadeIn 0.3s ease-in;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .menu-items-section {
      margin-top: var(--uui-size-space-6);
    }

    .menu-items-section h2 {
      font-size: var(--uui-type-h5-size);
      margin-bottom: var(--uui-size-space-3);
    }

    .menu-items-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .menu-item {
      display: flex;
      align-items: center;
      padding: var(--uui-size-space-4);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-surface);
      gap: var(--uui-size-space-3);
    }

    .menu-item uui-icon {
      color: var(--uui-color-text-alt);
    }

    .menu-item-content {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .menu-item-name {
      font-weight: bold;
    }

    .menu-item-id {
      font-size: var(--uui-type-small-size);
      color: var(--uui-color-text-alt);
    }

    .no-items {
      padding: var(--uui-size-space-6);
      text-align: center;
      color: var(--uui-color-text-alt);
      font-style: italic;
      background: var(--uui-color-surface);
      border: 1px dashed var(--uui-color-border);
      border-radius: var(--uui-border-radius);
    }

    .action-buttons {
      display: flex;
      gap: var(--uui-size-space-3);
      margin-top: var(--uui-size-space-3);
    }

    .info-box {
      margin-top: var(--uui-size-space-4);
      padding: var(--uui-size-space-4);
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      font-size: var(--uui-type-small-size);
    }

    .info-box strong {
      display: block;
      margin-bottom: var(--uui-size-space-2);
    }
  `;

  // This method handles the selection event with full node data
  async handleContentSelected(event: Event) {
    console.log('Content selected event:', event);
    
    // Try to get the custom event detail
    const customEvent = event as CustomEvent;
    console.log('Custom event detail:', customEvent.detail);
    
    // The umb-input-document component uses 'selection' property directly on the element
    const picker = event.target as any;
    console.log('Picker element:', picker);
    console.log('Picker selection:', picker.selection);
    console.log('Picker value:', picker.value);

    // Try to get selection from different possible sources
    let selection = customEvent.detail?.selection || picker.selection || picker.value;
    
    console.log('Final selection:', selection);

    if (selection && Array.isArray(selection) && selection.length > 0) {
      // The picker returns an array of IDs, not full objects
      selection.forEach(async (node) => {
        const nodeId = typeof node === 'string' ? node : node.unique || node.id
        await this.fetchNodeDetails(nodeId);
        this.addSelectedNodeToMenu();

      })
    } else if (typeof selection === 'string') {
      // Single ID string
      await this.fetchNodeDetails(selection);
    } else if (selection && Array.isArray(selection) && selection.length === 0) {
      // Selection was cleared
      this.clearSelection();
    } else {
      console.warn('Could not extract selection from event');
    }
  }

  async fetchNodeDetails(nodeId: string) {
    try {
      if (!this.documentItemRepository) {
        console.error('Document repository not initialized');
        return;
      }

      // Use Umbraco's document item repository to get the document details
      const { data } = await this.documentItemRepository.requestItems([nodeId]);
      
      if (data && data.length > 0) {
        const nodeData = data[0];
        this.selectedNodeId = nodeData.unique;
        this.selectedNodeName = nodeData.variants?.[0]?.name || 'Unnamed Node';
        
        console.log('Fetched node details:', nodeData);

        // Save the selected node info to localStorage
        this.saveSelection();

        // Clear any previous messages
        this.saveMessage = '';
      } else {
        console.error('No node data returned');
        this.saveMessage = 'Failed to load node details';
      }
    } catch (error) {
      console.error('Error fetching node details:', error);
      this.saveMessage = 'Error loading node details';
    }
  }

  addSelectedNodeToMenu() {
    if (!this.selectedNodeId || !this.selectedNodeName) {
      return;
    }

    const node = {
      unique: this.selectedNodeId,
      name: this.selectedNodeName
    };

    this.addMenuItemForNode(node);
    
    // Show success message
    this.saveMessage = `✓ "${this.selectedNodeName}" added to sidebar menu!`;
    
    // Clear message after 3 seconds
    setTimeout(() => {
      this.saveMessage = '';
      this.requestUpdate();
    }, 3000);
  }

  addMenuItemForNode(node: { unique: any; name: any; }) {
    const newMenuItem: MenuItem = {
      id: node.unique,
      name: node.name || 'Unnamed Node',
      icon: 'icon-document'
    };

    // Check if already exists
    const exists = this.menuItems.some((item: MenuItem) => item.id === node.unique);

    if (!exists) {
      this.menuItems = [...this.menuItems, newMenuItem];
      this.saveMenuItemsToDb();
      console.log('Menu item added:', newMenuItem);
    } else {
      console.log('Menu item already exists');
      this.saveMessage = `"${node.name}" is already in the menu`;
      setTimeout(() => {
        this.saveMessage = '';
        this.requestUpdate();
      }, 3000);
    }
  }

  clearSelection() {
    this.selectedNodeId = null;
    this.selectedNodeName = '';
    
    // Clear from localStorage
    localStorage.removeItem('powerSortSelectedNodeName');
    localStorage.removeItem('powerSortSelectedNodeId');
    localStorage.removeItem('powerSortLastSelectedTime');
    
    // Don't try to set the picker value - let it manage itself
    this.requestUpdate();
  }

  saveSelection() {
    if (this.selectedNodeName && this.selectedNodeId) {
      localStorage.setItem('powerSortSelectedNodeName', this.selectedNodeName);
      localStorage.setItem('powerSortSelectedNodeId', this.selectedNodeId);
      localStorage.setItem('powerSortLastSelectedTime', new Date().toISOString());
    }
  }

  restoreSelection() {
    // Restore the selected node info for display only
    const savedName = localStorage.getItem('powerSortSelectedNodeName');
    const savedId = localStorage.getItem('powerSortSelectedNodeId');
    
    if (savedName && savedId) {
      this.selectedNodeName = savedName;
      this.selectedNodeId = savedId;
      this.requestUpdate();
    }
  }

  render() {
    return html`
      <div class="dashboard-container">
        <div class="dashboard-header">
          <h1 aria-describedby="plugin-description">Power Sort Dashboard</h1>
          <h2 id="plugin-description">A plugin to enable scheduled sorting of child nodes</h2>
        </div>

        <div class="content-picker-section">
          <h2>Select Content Node</h2>
          <div class="content-picker-wrapper">
            <label class="picker-label">Content Picker</label>
            <span class="picker-description">
              Select the parent nodes to add to the left hand menu to enable sorting
            </span>
            
         <custom-document-picker @selection-changed=${this.handleContentSelected}>
         </custom-document-picker>
            </div>
          </div>

          ${this.saveMessage ? html`
            <div class="save-message">
              ${this.saveMessage}
            </div>
          ` : ''}

          ${this.selectedNodeName ? html`
            <div class="selected-info">
              <uui-icon name="icon-check"></uui-icon>
              <div>
                <div><strong>${this.selectedNodeName}</strong></div>
                <div style="font-size: var(--uui-type-small-size); color: var(--uui-color-text-alt);">
                  ID: ${this.selectedNodeId}
                </div>
                <div style="font-size: var(--uui-type-small-size); color: var(--uui-color-text-alt); margin-top: var(--uui-size-space-1);">
                  Last selected: ${new Date(localStorage.getItem('powerSortLastSelectedTime') || Date.now()).toLocaleString()}
                </div>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }
}

customElements.define('power-sort-dashboard', PowerSortDashboardElement);
