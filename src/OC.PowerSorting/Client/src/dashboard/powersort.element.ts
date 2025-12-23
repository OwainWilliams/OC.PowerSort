import { LitElement, html, css, property } from '@umbraco-cms/backoffice/external/lit';
import { UmbElementMixin } from '@umbraco-cms/backoffice/element-api';
import type { MenuItem } from '../types/index.js';
import { UmbDocumentItemRepository } from '@umbraco-cms/backoffice/document';
import { UMB_AUTH_CONTEXT } from '@umbraco-cms/backoffice/auth';

export default class PowerSortDashboardElement extends UmbElementMixin(LitElement) {
  @property({ type: String })
  private selectedNodeId: string | null = null;

  @property({ type: String })
  private selectedNodeName: string = '';

  @property({ type: Array })
  private menuItems: MenuItem[] = [];

  @property({ type: String })
  private saveMessage: string = '';

  @property({ type: Boolean })
  public hasError: boolean = false;

  @property({ type: String })
  public errorMessage: string = '';

  @property({ type: String })
  private authToken: string = '';

  #documentItemRepository = new UmbDocumentItemRepository(this);



  constructor() {
    super();
    this.selectedNodeId = null;
    this.selectedNodeName = '';
    this.menuItems = [];
    this.saveMessage = '';

   }

  async connectedCallback() {
    super.connectedCallback();
    this.setupContexts();
    await this.loadMenuItemsFromDb();
  }

  private async setupContexts() {
    try {
      await this.setupAuthContext();
    //  await this.setupWorkspaceContext();
    } catch (error) {
      console.error('Failed to setup contexts:', error);
      this.hasError = true;
      this.errorMessage = 'Failed to initialize editor contexts';
    }
  }
  private async setupAuthContext(): Promise<void> {
    return new Promise((resolve) => {
      this.consumeContext(UMB_AUTH_CONTEXT, async (authContext: any) => {
        try {
          const config = authContext?.getOpenApiConfiguration?.();
          if (config?.token) {
            this.authToken = await config.token();
          }
          resolve();
        } catch (error) {
          console.error('Failed to setup auth context:', error);
          this.hasError = true;
          this.errorMessage = 'Failed to authenticate';
          resolve();
        }
      })
        .asPromise({ preventTimeout: true })
        .catch(() => {
          console.error('Auth context not available');
          this.hasError = true;
          this.errorMessage = 'Failed to access authentication context';
          resolve();
        });
    });
  }

 
  private async makeAuthenticatedRequest(url: string): Promise<Response> {
    const token = await this.getAuthToken();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return fetch(url as unknown as RequestInfo, { headers });
  }
  private async getAuthToken(): Promise<string> {
    try {
      let token = this.authToken;

      if (!token) {
        const authContext = await this.getContext(UMB_AUTH_CONTEXT);
        if (authContext) {
          const config = authContext.getOpenApiConfiguration?.();
          if (config?.token) {
            token = await config.token() ?? '';
            if (token != '') {
              this.authToken = token;
            }
          }
        }
      }

      return token;
    } catch (error) {
      console.error('Failed to get auth token:', error);
      return '';
    }
  }


  async loadMenuItemsFromDb() {
    try {
      const response = await this.makeAuthenticatedRequest('/umbraco/management/api/v1/oc/power-sorting/menu-items');

      if (!response.ok) {
        console.error('Failed to load menu items:', response.status);
        const saved = localStorage.getItem('powerSortMenuItems');
        this.menuItems = saved ? JSON.parse(saved) : [];
        return;
      }

      const data = await response.json();
      this.menuItems = data.items || [];
    } catch (error) {
      console.error('Error loading menu items from database:', error);
      const saved = localStorage.getItem('powerSortMenuItems');
      this.menuItems = saved ? JSON.parse(saved) : [];
    }
  }

  async saveMenuItemsToDb() {
    try {
      const response = await this.makeAuthenticatedRequest('/umbraco/management/api/v1/oc/power-sorting/menu-items')

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(`Failed to save menu items: ${response.status}`);
      }

      localStorage.setItem('powerSortMenuItems', JSON.stringify(this.menuItems));

      window.dispatchEvent(new CustomEvent('powerSortMenuUpdated', {
        detail: { menuItems: this.menuItems }
      }));
    } catch (error) {
      console.error('Error saving menu items to database:', error);
      localStorage.setItem('powerSortMenuItems', JSON.stringify(this.menuItems));
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
      const nodeId = typeof selection[0] === 'string' ? selection[0] : selection[0].unique || selection[0].id;
      
      console.log('Selected node ID:', nodeId);

      // Fetch the full node details using Umbraco's repository
      await this.fetchNodeDetails(nodeId);
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
      // Use Umbraco's document item repository to get the document details
      const { data } = await this.#documentItemRepository.requestItems([nodeId]);
      
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

  removeMenuItem(id: any) {
    const itemToRemove = this.menuItems.find((item: MenuItem) => item.id === id);
    this.menuItems = this.menuItems.filter((item: MenuItem) => item.id !== id);
    this.saveMenuItemsToDb();
    console.log('Menu item removed:', id);
    
    // Show feedback
    this.saveMessage = `✓ "${itemToRemove?.name}" removed from menu`;
    setTimeout(() => {
      this.saveMessage = '';
      this.requestUpdate();
    }, 3000);
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
          <h1>Power Sort Dashboard</h1>
          <p>Select content nodes to add them as menu items in the sidebar</p>
        </div>

        <div class="content-picker-section">
          <h2>Select Content Node</h2>
          <div class="content-picker-wrapper">
            <label class="picker-label">Content Picker</label>
            <span class="picker-description">
              Choose a content item from your site to add to the Power Sort menu
            </span>
            
            <umb-input-document
              @change=${this.handleContentSelected}
              max="1"
              min="0">
            </umb-input-document>

            <div class="action-buttons">
              <uui-button
                look="primary"
                color="positive"
                label="Add to Menu"
                @click=${this.addSelectedNodeToMenu}
                ?disabled=${!this.selectedNodeName}>
                <uui-icon name="icon-add"></uui-icon>
                Add to Menu
              </uui-button>
              
              <uui-button
                look="outline"
                label="Clear Selection"
                @click=${this.clearSelection}
                ?disabled=${!this.selectedNodeName}>
                <uui-icon name="icon-delete"></uui-icon>
                Clear Selection
              </uui-button>
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

        <div class="menu-items-section">
          <h2>Active Menu Items (${this.menuItems.length})</h2>
          
          ${this.menuItems.length > 0 ? html`
            <div class="info-box">
              <strong>💡 How to use:</strong>
              Click on any menu item in the sidebar (left panel) to view and sort its children.
            </div>
            <div class="menu-items-list">
              ${this.menuItems.map((item: { icon: unknown; name: unknown; id: unknown; }) => html`
                <div class="menu-item">
                  <uui-icon name="${item.icon}"></uui-icon>
                  <div class="menu-item-content">
                    <span class="menu-item-name">${item.name}</span>
                    <span class="menu-item-id">${item.id}</span>
                  </div>
                  <uui-button 
                    label="Remove"
                    look="outline"
                    color="danger"
                    @click=${() => this.removeMenuItem(item.id)}>
                    <uui-icon name="icon-trash"></uui-icon>
                    Remove
                  </uui-button>
                </div>
              `)}
            </div>
          ` : html`
            <div class="no-items">
              <p>No menu items added yet.</p>
              <p>Use the content picker above to select a node and click "Add to Menu".</p>
            </div>
          `}
        </div>
      </div>
    `;
  }
}

customElements.define('power-sort-dashboard', PowerSortDashboardElement);
