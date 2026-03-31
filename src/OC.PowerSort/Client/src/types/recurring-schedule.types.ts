/**
 * Recurring schedule types and enums
 */

export type RecurrenceType = 'Daily' | 'Weekly' | 'Monthly' | 'Custom';
export type MonthlyPatternType = 'DayOfMonth' | 'DayOfWeek';

export interface RecurringSchedule {
  id: string;
  contentId: string;
  contentName: string;
  parentId: string;
  parentName: string;
  targetPosition: number;
  priority: number;
  pattern: RecurrencePattern;
  boostDurationHours: number;
  isEnabled: boolean;
  created: string;
  createdByName: string;
  modified?: string;
  modifiedByName?: string;
  nextOccurrence?: string;
  upcomingOccurrences?: OccurrencePreview[];
}

export interface RecurrencePattern {
  type: RecurrenceType;
  typeDisplay: string;
  interval: number;
  daysOfWeek?: number[];
  daysOfWeekDisplay?: string[];
  monthlyPattern?: MonthlyPattern;
  startDate: string;
  endDate?: string;
  maxOccurrences?: number;
  description: string;
}

export interface MonthlyPattern {
  type: MonthlyPatternType;
  dayOfMonth?: number;
  weekOfMonth?: number;
  dayOfWeek?: number;
  description: string;
}

export interface OccurrencePreview {
  startDate: string;
  endDate: string;
  isProcessed: boolean;
  isCancelled: boolean;
}

export interface CreateRecurringScheduleRequest {
  contentId: string;
  parentId: string;
  targetPosition: number;
  priority: number;
  pattern: RecurrencePatternRequest;
  boostDurationHours: number;
}

export interface UpdateRecurringScheduleRequest {
  targetPosition: number;
  priority: number;
  pattern: RecurrencePatternRequest;
  boostDurationHours: number;
  isEnabled: boolean;
}

export interface RecurrencePatternRequest {
  type: RecurrenceType;
  interval: number;
  daysOfWeek?: number[];
  monthlyPattern?: MonthlyPatternRequest;
  startDate: string;
  endDate?: string;
  maxOccurrences?: number;
}

export interface MonthlyPatternRequest {
  type: MonthlyPatternType;
  dayOfMonth?: number;
  weekOfMonth?: number;
  dayOfWeek?: number;
}

export interface RecurringScheduleListResponse {
  total: number;
  items: RecurringSchedule[];
}

export interface CancelOccurrenceRequest {
  occurrenceDate: string;
}

/**
 * Helper functions for recurring schedules
 */
export class RecurringScheduleHelpers {
  static readonly DAYS_OF_WEEK = [
    { value: 0, label: 'Sunday', short: 'Sun' },
    { value: 1, label: 'Monday', short: 'Mon' },
    { value: 2, label: 'Tuesday', short: 'Tue' },
    { value: 3, label: 'Wednesday', short: 'Wed' },
    { value: 4, label: 'Thursday', short: 'Thu' },
    { value: 5, label: 'Friday', short: 'Fri' },
    { value: 6, label: 'Saturday', short: 'Sat' }
  ];

  static readonly WEEK_OF_MONTH = [
    { value: 1, label: 'First' },
    { value: 2, label: 'Second' },
    { value: 3, label: 'Third' },
    { value: 4, label: 'Fourth' },
    { value: 5, label: 'Last' }
  ];

  static getDayOfWeekLabel(dayNumber: number): string {
    const day = this.DAYS_OF_WEEK.find(d => d.value === dayNumber);
    return day?.label ?? 'Unknown';
  }

  static getWeekOfMonthLabel(weekNumber: number): string {
    const week = this.WEEK_OF_MONTH.find(w => w.value === weekNumber);
    return week?.label ?? 'Unknown';
  }

  static formatRecurrenceDescription(pattern: RecurrencePattern): string {
    switch (pattern.type) {
      case 'Daily':
        return pattern.interval === 1 
          ? 'Every day' 
          : `Every ${pattern.interval} days`;

      case 'Weekly':
        const dayLabels = pattern.daysOfWeekDisplay?.join(', ') ?? 'Unknown days';
        return pattern.interval === 1
          ? `Every ${dayLabels}`
          : `Every ${pattern.interval} weeks on ${dayLabels}`;

      case 'Monthly':
        if (pattern.monthlyPattern) {
          const intervalText = pattern.interval === 1 
            ? 'each month' 
            : `every ${pattern.interval} months`;
          return `${pattern.monthlyPattern.description} (${intervalText})`;
        }
        return 'Monthly';

      default:
        return pattern.description || 'Custom recurrence';
    }
  }

  static formatNextOccurrence(nextOccurrence?: string): string {
    if (!nextOccurrence) return 'No upcoming occurrences';

    const date = new Date(nextOccurrence);
    const now = new Date();

    // Normalize both dates to midnight for accurate day comparison
    const dateAtMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const nowAtMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.round((dateAtMidnight.getTime() - nowAtMidnight.getTime()) / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffDays === 0) {
      if (diffHours === 0) {
        return 'Starting soon';
      }
      return `In ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
    } else if (diffDays === 1) {
      return 'Tomorrow';
    } else if (diffDays < 7) {
      return `In ${diffDays} days`;
    } else {
      return date.toLocaleDateString();
    }
  }
}
