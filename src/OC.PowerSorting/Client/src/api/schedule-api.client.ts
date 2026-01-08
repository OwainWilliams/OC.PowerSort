import { PowerSortConstants } from '../utils/constants.js';
import { ApiResponseHandler } from '../utils/api-response.utils.js';
import type {
  ScheduleListResponse,
  ScheduleResponse,
  CreateScheduleRequest,
  UpdateScheduleRequest,
  ActiveScheduleInfo
} from '../types/index.js';

/**
 * API client for schedule-related operations
 */
export class ScheduleApiClient {
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

  async getSchedules(parentId?: string): Promise<ScheduleListResponse> {
    const url = parentId 
      ? `${PowerSortConstants.API_BASE}${PowerSortConstants.ENDPOINTS.SCHEDULES}?parentId=${parentId}`
      : `${PowerSortConstants.API_BASE}${PowerSortConstants.ENDPOINTS.SCHEDULES}`;
    
    const response = await this.makeRequest(url);
    return ApiResponseHandler.handleResponse<ScheduleListResponse>(response);
  }

  async getSchedule(id: string): Promise<ScheduleResponse> {
    const response = await this.makeRequest(
      `${PowerSortConstants.API_BASE}${PowerSortConstants.ENDPOINTS.SCHEDULES}/${id}`
    );
    return ApiResponseHandler.handleResponse<ScheduleResponse>(response);
  }

  async createSchedule(request: CreateScheduleRequest): Promise<ScheduleResponse> {
    const response = await this.makeRequest(
      `${PowerSortConstants.API_BASE}${PowerSortConstants.ENDPOINTS.SCHEDULES}`,
      {
        method: 'POST',
        body: JSON.stringify(request)
      }
    );
    return ApiResponseHandler.handleResponse<ScheduleResponse>(response);
  }

  async updateSchedule(id: string, request: UpdateScheduleRequest): Promise<ScheduleResponse> {
    const response = await this.makeRequest(
      `${PowerSortConstants.API_BASE}${PowerSortConstants.ENDPOINTS.SCHEDULES}/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(request)
      }
    );
    return ApiResponseHandler.handleResponse<ScheduleResponse>(response);
  }

  async deleteSchedule(id: string): Promise<void> {
    const response = await this.makeRequest(
      `${PowerSortConstants.API_BASE}${PowerSortConstants.ENDPOINTS.SCHEDULES}/${id}`,
      { method: 'DELETE' }
    );
    await ApiResponseHandler.handleResponse(response);
  }

  async getActiveSchedules(parentId: string): Promise<ActiveScheduleInfo[]> {
    const response = await this.makeRequest(
      `${PowerSortConstants.API_BASE}${PowerSortConstants.ENDPOINTS.SCHEDULES_ACTIVE}/${parentId}`
    );
    return ApiResponseHandler.handleResponse<ActiveScheduleInfo[]>(response);
  }
}
