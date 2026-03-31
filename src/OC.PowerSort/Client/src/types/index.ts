export interface MenuItem {
  id: string;
  name: string;
  icon: string;
}

export interface NodeChild {
  id: string;
  name: string;
  sortOrder: number;
  contentTypeAlias?: string;
  icon?: string;
}

// Schedule interfaces
export interface CreateScheduleRequest {
  contentId: string;
  parentId: string;
  targetPosition: number;
  startDateTime: string; // ISO 8601 date string
  endDateTime: string; // ISO 8601 date string
  priority?: number;
}

export interface UpdateScheduleRequest {
  targetPosition: number;
  startDateTime: string; // ISO 8601 date string
  endDateTime: string; // ISO 8601 date string
  priority?: number;
}

export interface ScheduleResponse {
  id: string;
  contentId: string;
  contentName: string;
  parentId: string;
  parentName: string;
  targetPosition: number;
  startDateTime: string; // ISO 8601 date string
  endDateTime: string; // ISO 8601 date string
  isActive: boolean;
  isCurrentlyActive: boolean;
  priority: number;
  created: string; // ISO 8601 date string
  createdByName: string;
}

export interface ScheduleListResponse {
  total: number;
  items: ScheduleResponse[];
}

export interface ActiveScheduleInfo {
  scheduleId: string;
  contentId: string;
  targetPosition: number;
  endDateTime: string; // ISO 8601 date string
  priority: number;
}

// Enum Priority interfaces
export interface CreateEnumPriorityRequest {
  name: string;
  sortPriority: number;
}

export interface UpdateEnumPriorityRequest {
  name: string;
  sortPriority: number;
}

export interface EnumPriorityResponse {
  id: string;
  name: string;
  sortPriority: number;
  created: string; // ISO 8601 date string
  createdByName: string;
  updated: string; // ISO 8601 date string
  updatedByName: string;
}

export interface EnumPriorityListResponse {
  total: number;
  items: EnumPriorityResponse[];
}

// Re-export recurring schedule types
export * from './recurring-schedule.types.js';
