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
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } else {
          const text = await response.text();
          errorMessage = text || errorMessage;
        }
      } catch {
        // If reading the response fails, use the default error message
      }

      throw new Error(errorMessage);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  /**
   * Show user-friendly error message using modal
   */
  static showError(error: unknown, context: string = '', modalContext?: any): void {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    const fullMessage = context ? `${context}: ${message}` : message;
    
    console.error(fullMessage, error);
    
    if (modalContext) {
      try {
        // Just open the modal, don't wait for it
        modalContext.open(this, "Umb.Modal.Confirm", {
          data: {
            headline: "Error",
            content: fullMessage,
            color: "danger",
            confirmLabel: "OK",
          },
        });
      } catch (err) {
        // Fallback to alert if modal fails
        console.warn("Modal failed, falling back to alert:", err);
        alert(fullMessage);
      }
    } else {
      // Fallback to alert
      alert(fullMessage);
    }
  }

  /**
   * Show success message using modal
   */
  static showSuccess(message: string, modalContext?: any): void {
    console.log('Success:', message);
    
    if (modalContext) {
      try {
        // Just open the modal, don't wait for it
        modalContext.open(this, "Umb.Modal.Confirm", {
          data: {
            headline: "Success",
            content: message,
            color: "positive",
            confirmLabel: "OK",
          },
        });
      } catch (err) {
        // Fallback to alert if modal fails
        console.warn("Modal failed, falling back to alert:", err);
        alert(message);
      }
    } else {
      // Fallback to alert
      alert(message);
    }
  }

  /**
   * Confirm action with user
   * @deprecated Use modal-based confirmations instead
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
