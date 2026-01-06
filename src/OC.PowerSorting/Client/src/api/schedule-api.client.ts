import type {
  CreateScheduleRequest,
  UpdateScheduleRequest,
  ScheduleResponse,
  ScheduleListResponse,
  ActiveScheduleInfo
} from '../types/index.js';

/**
 * API client for schedule management operations
 */
export class ScheduleApiClient {
  private baseUrl = '/umbraco/management/api/v1/oc/power-sorting';

  constructor(private getAuthToken: () => Promise<string>) {}

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getAuthToken();
    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error (${response.status}): ${errorText}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  /**
   * Get all schedules, optionally filtered by parent
   */
  async getSchedules(
    parentId?: string,
    activeOnly?: boolean
  ): Promise<ScheduleListResponse> {
    const params = new URLSearchParams();
    if (parentId) params.append('parentId', parentId);
    if (activeOnly) params.append('activeOnly', 'true');

    const queryString = params.toString();
    const endpoint = `/schedules${queryString ? `?${queryString}` : ''}`;

    return this.makeRequest<ScheduleListResponse>(endpoint);
  }

  /**
   * Get a single schedule by ID
   */
  async getSchedule(id: string): Promise<ScheduleResponse> {
    return this.makeRequest<ScheduleResponse>(`/schedules/${id}`);
  }

  /**
   * Create a new schedule
   */
  async createSchedule(
    request: CreateScheduleRequest
  ): Promise<ScheduleResponse> {
    return this.makeRequest<ScheduleResponse>('/schedules', {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  /**
   * Update an existing schedule
   */
  async updateSchedule(
    id: string,
    request: UpdateScheduleRequest
  ): Promise<ScheduleResponse> {
    return this.makeRequest<ScheduleResponse>(`/schedules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(request)
    });
  }

  /**
   * Delete a schedule
   */
  async deleteSchedule(id: string): Promise<void> {
    await this.makeRequest<void>(`/schedules/${id}`, {
      method: 'DELETE'
    });
  }

  /**
   * Get active schedules for a parent
   */
  async getActiveSchedules(parentId: string): Promise<ActiveScheduleInfo[]> {
    return this.makeRequest<ActiveScheduleInfo[]>(
      `/schedules/active/${parentId}`
    );
  }
}
