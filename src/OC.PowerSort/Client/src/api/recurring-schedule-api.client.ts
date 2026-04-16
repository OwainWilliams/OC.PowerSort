import { PowerSortConstants } from '../utils/constants.js';
import { ApiResponseHandler } from '../utils/api-response.utils.js';
import type {
  RecurringScheduleListResponse,
  RecurringSchedule,
  CreateRecurringScheduleRequest,
  UpdateRecurringScheduleRequest,
  OccurrencePreview,
  CancelOccurrenceRequest
} from '../types/recurring-schedule.types.js';

/**
 * API client for recurring schedule-related operations
 */
export class RecurringScheduleApiClient {
  private getAuthToken: () => Promise<string>;

  constructor(getAuthToken: () => Promise<string>) {
    this.getAuthToken = getAuthToken;
  }

  private async makeRequest(url: string, options: RequestInit = {}): Promise<Response> {
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

  async getRecurringSchedules(parentId?: string, enabledOnly = false): Promise<RecurringScheduleListResponse> {
    let url = `${PowerSortConstants.API_BASE}/recurring-schedules`;
    const params = new URLSearchParams();
    
    if (parentId) {
      params.append('parentId', parentId);
    }
    if (enabledOnly) {
      params.append('enabledOnly', 'true');
    }
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const response = await this.makeRequest(url);
    return ApiResponseHandler.handleResponse<RecurringScheduleListResponse>(response);
  }

  async getRecurringSchedule(id: string): Promise<RecurringSchedule> {
    const response = await this.makeRequest(
      `${PowerSortConstants.API_BASE}/recurring-schedules/${id}`
    );
    return ApiResponseHandler.handleResponse<RecurringSchedule>(response);
  }

  async createRecurringSchedule(request: CreateRecurringScheduleRequest): Promise<RecurringSchedule> {
    const response = await this.makeRequest(
      `${PowerSortConstants.API_BASE}/recurring-schedules`,
      {
        method: 'POST',
        body: JSON.stringify(request)
      }
    );
    return ApiResponseHandler.handleResponse<RecurringSchedule>(response);
  }

  async updateRecurringSchedule(id: string, request: UpdateRecurringScheduleRequest): Promise<RecurringSchedule> {
    const response = await this.makeRequest(
      `${PowerSortConstants.API_BASE}/recurring-schedules/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(request)
      }
    );
    return ApiResponseHandler.handleResponse<RecurringSchedule>(response);
  }

  async deleteRecurringSchedule(id: string): Promise<void> {
    const response = await this.makeRequest(
      `${PowerSortConstants.API_BASE}/recurring-schedules/${id}`,
      { method: 'DELETE' }
    );
    await ApiResponseHandler.handleResponse(response);
  }

  async previewOccurrences(id: string, count = 10): Promise<OccurrencePreview[]> {
    const response = await this.makeRequest(
      `${PowerSortConstants.API_BASE}/recurring-schedules/${id}/preview?count=${count}`
    );
    return ApiResponseHandler.handleResponse<OccurrencePreview[]>(response);
  }

  async cancelOccurrence(id: string, request: CancelOccurrenceRequest): Promise<void> {
    const response = await this.makeRequest(
      `${PowerSortConstants.API_BASE}/recurring-schedules/${id}/cancel-occurrence`,
      {
        method: 'POST',
        body: JSON.stringify(request)
      }
    );
    await ApiResponseHandler.handleResponse(response);
  }

  async toggleRecurringSchedule(id: string): Promise<RecurringSchedule> {
    const response = await this.makeRequest(
      `${PowerSortConstants.API_BASE}/recurring-schedules/${id}/toggle`,
      { method: 'POST' }
    );
    return ApiResponseHandler.handleResponse<RecurringSchedule>(response);
  }
}
