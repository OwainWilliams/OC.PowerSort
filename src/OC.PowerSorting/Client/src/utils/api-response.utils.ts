/**
 * API response handling utilities
 */
export class ApiResponseHandler {
  /**
   * Handle API response with consistent error handling
   */
  static async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorMessage = `API Error (${response.status})`;
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        errorMessage = await response.text() || errorMessage;
      }
      
      throw new Error(errorMessage);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  /**
   * Show user-friendly error message
   */
  static showError(error: unknown, context: string = ''): void {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    const fullMessage = context ? `${context}: ${message}` : message;
    
    console.error(fullMessage, error);
    alert(fullMessage); // Could be replaced with toast notifications
  }

  /**
   * Show success message
   */
  static showSuccess(message: string): void {
    console.log('Success:', message);
    alert(message); // Could be replaced with toast notifications
  }

  /**
   * Confirm action with user
   */
  static confirmAction(message: string): boolean {
    return confirm(message);
  }
}

/**
 * Loading state manager for components
 */
export class LoadingStateManager {
  private loadingStates = new Map<string, boolean>();

  setLoading(key: string, isLoading: boolean): void {
    this.loadingStates.set(key, isLoading);
  }

  isLoading(key: string): boolean {
    return this.loadingStates.get(key) ?? false;
  }

  isAnyLoading(): boolean {
    return Array.from(this.loadingStates.values()).some(loading => loading);
  }

  clear(): void {
    this.loadingStates.clear();
  }
}
