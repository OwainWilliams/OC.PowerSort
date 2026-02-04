import { LitElement } from '@umbraco-cms/backoffice/external/lit';
import { UmbElementMixin } from '@umbraco-cms/backoffice/element-api';
import { UMB_AUTH_CONTEXT } from '@umbraco-cms/backoffice/auth';

/**
 * Mixin that provides authentication functionality to Lit elements
 * Eliminates code duplication across dashboard components
 */
export const UmbAuthMixin = <T extends Constructor<LitElement>>(superClass: T) => {
  class UmbAuthMixinClass extends UmbElementMixin(superClass) {
    public authToken: string = '';
    public hasError: boolean = false;
    public errorMessage: string = '';

    /**
     * Setup authentication context and get initial token
     */
    protected async setupAuthContext(): Promise<void> {
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

    /**
     * Get current authentication token, refreshing if necessary
     */
    protected async getAuthToken(): Promise<string> {
      try {
        let token = this.authToken;

        if (!token) {
          const authContext = await this.getContext(UMB_AUTH_CONTEXT);
          if (authContext) {
            const config = authContext.getOpenApiConfiguration?.();
            if (config?.token) {
              token = await config.token() ?? '';
              if (token !== '') {
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

    /**
     * Make an authenticated HTTP request
     */
    protected async makeAuthenticatedRequest(
      url: string, 
      options: RequestInit = {}
    ): Promise<Response> {
      const token = await this.getAuthToken();
      const headers = new Headers(options.headers);
      headers.set('Content-Type', 'application/json');

      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      return fetch(url, {
        ...options,
        headers
      });
    }

    /**
     * Handle common authentication setup in connectedCallback
     */
    async connectedCallback() {
      super.connectedCallback();
      await this.setupAuthContext();
    }
  }

  return UmbAuthMixinClass;
};

// Type helper for constructor
type Constructor<T = {}> = new (...args: any[]) => T;
