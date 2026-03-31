# Recurring Schedules - Quick Start Guide

## Overview
The recurring schedules feature allows you to automatically boost content at regular intervals without creating individual schedules manually.

## API Usage Examples

### 1. Create a Recurring Schedule - "Boost Every Monday"

**POST** `/api/oc/power-sort/recurring-schedules`

```json
{
  "contentId": "your-content-guid",
  "parentId": "parent-content-guid",
  "targetPosition": 0,
  "priority": 100,
  "boostDurationHours": 24,
  "pattern": {
    "type": "Weekly",
    "interval": 1,
    "daysOfWeek": [1],
    "startDate": "2024-01-01T00:00:00Z"
  }
}
```

**Days of Week:** 0 = Sunday, 1 = Monday, 2 = Tuesday, etc.

---

### 2. Create a Recurring Schedule - "2nd Tuesday of Every Month"

**POST** `/api/oc/power-sort/recurring-schedules`

```json
{
  "contentId": "your-content-guid",
  "parentId": "parent-content-guid",
  "targetPosition": 0,
  "priority": 100,
  "boostDurationHours": 48,
  "pattern": {
    "type": "Monthly",
    "interval": 1,
    "monthlyPattern": {
      "type": "DayOfWeek",
      "weekOfMonth": 2,
      "dayOfWeek": 2
    },
    "startDate": "2024-01-01T00:00:00Z"
  }
}
```

**Week of Month:** 1 = First, 2 = Second, 3 = Third, 4 = Fourth, 5 = Last

---

### 3. Create a Recurring Schedule - "3rd of Each Month for 6 Months"

**POST** `/api/oc/power-sort/recurring-schedules`

```json
{
  "contentId": "your-content-guid",
  "parentId": "parent-content-guid",
  "targetPosition": 0,
  "priority": 100,
  "boostDurationHours": 24,
  "pattern": {
    "type": "Monthly",
    "interval": 1,
    "monthlyPattern": {
      "type": "DayOfMonth",
      "dayOfMonth": 3
    },
    "startDate": "2024-01-01T00:00:00Z",
    "maxOccurrences": 6
  }
}
```

---

### 4. Get All Recurring Schedules

**GET** `/api/oc/power-sort/recurring-schedules`

Optional query parameters:
- `parentId` - Filter by parent content
- `enabledOnly` - Only show enabled schedules

---

### 5. Get Specific Recurring Schedule with Occurrences

**GET** `/api/oc/power-sort/recurring-schedules/{id}`

Response includes:
- Full schedule details
- Next occurrence date/time
- List of upcoming occurrences

---

### 6. Preview Next 10 Occurrences

**GET** `/api/oc/power-sort/recurring-schedules/{id}/preview?count=10`

```json
[
  {
    "startDate": "2024-01-08T00:00:00Z",
    "endDate": "2024-01-09T00:00:00Z",
    "isProcessed": false,
    "isCancelled": false
  },
  {
    "startDate": "2024-01-15T00:00:00Z",
    "endDate": "2024-01-16T00:00:00Z",
    "isProcessed": false,
    "isCancelled": false
  }
  // ... more occurrences
]
```

---

### 7. Cancel a Specific Occurrence

**POST** `/api/oc/power-sort/recurring-schedules/{id}/cancel-occurrence`

```json
{
  "occurrenceDate": "2024-01-15T00:00:00Z"
}
```

---

### 8. Enable/Disable a Recurring Schedule

**POST** `/api/oc/power-sort/recurring-schedules/{id}/toggle`

Toggles the `isEnabled` status of the schedule.

---

### 9. Update a Recurring Schedule

**PUT** `/api/oc/power-sort/recurring-schedules/{id}`

```json
{
  "targetPosition": 1,
  "priority": 150,
  "boostDurationHours": 36,
  "isEnabled": true,
  "pattern": {
    "type": "Weekly",
    "interval": 1,
    "daysOfWeek": [1, 3, 5],
    "startDate": "2024-01-01T00:00:00Z"
  }
}
```

**Note:** Updating a recurring schedule will delete all future unprocessed occurrences and regenerate them.

---

### 10. Delete a Recurring Schedule

**DELETE** `/api/oc/power-sort/recurring-schedules/{id}`

**Note:** This will:
- Delete the recurring schedule
- Delete all associated occurrences (cascade)
- Set `RecurringScheduleId` to NULL on any generated one-time schedules

---

## TypeScript/JavaScript Usage

```typescript
import { RecurringScheduleApiClient } from './api/recurring-schedule-api.client';
import type { CreateRecurringScheduleRequest } from './types/recurring-schedule.types';

// Initialize client
const client = new RecurringScheduleApiClient(getAuthToken);

// Create recurring schedule
const request: CreateRecurringScheduleRequest = {
  contentId: 'content-guid',
  parentId: 'parent-guid',
  targetPosition: 0,
  priority: 100,
  boostDurationHours: 24,
  pattern: {
    type: 'Weekly',
    interval: 1,
    daysOfWeek: [1, 3, 5], // Monday, Wednesday, Friday
    startDate: new Date().toISOString()
  }
};

const schedule = await client.createRecurringSchedule(request);

// Get all schedules for a parent
const schedules = await client.getRecurringSchedules('parent-guid');

// Preview occurrences
const occurrences = await client.previewOccurrences(schedule.id, 10);

// Toggle enable/disable
await client.toggleRecurringSchedule(schedule.id);

// Cancel specific occurrence
await client.cancelOccurrence(schedule.id, {
  occurrenceDate: '2024-01-15T00:00:00Z'
});

// Delete
await client.deleteRecurringSchedule(schedule.id);
```

---

## Recurrence Pattern Types

### Daily
- **interval**: Number of days between occurrences
- Example: `interval: 1` = every day, `interval: 3` = every 3 days

### Weekly
- **interval**: Number of weeks between occurrences
- **daysOfWeek**: Array of day numbers (0-6, Sunday-Saturday)
- Example: `{ interval: 2, daysOfWeek: [1, 4] }` = every 2 weeks on Monday and Thursday

### Monthly - Day of Month
- **interval**: Number of months between occurrences
- **monthlyPattern.type**: "DayOfMonth"
- **monthlyPattern.dayOfMonth**: Day number (1-31)
- Example: `{ interval: 1, monthlyPattern: { type: "DayOfMonth", dayOfMonth: 15 } }` = 15th of each month

### Monthly - Day of Week
- **interval**: Number of months between occurrences
- **monthlyPattern.type**: "DayOfWeek"
- **monthlyPattern.weekOfMonth**: Week number (1-5, where 5 = last)
- **monthlyPattern.dayOfWeek**: Day of week (0-6, Sunday-Saturday)
- Example: `{ interval: 1, monthlyPattern: { type: "DayOfWeek", weekOfMonth: 2, dayOfWeek: 2 } }` = 2nd Tuesday of each month

---

## How It Works

### Background Processing

1. **Occurrence Generation** (Every 6 hours)
   - System generates occurrences 90 days ahead
   - Avoids duplicates
   - Respects max occurrences and end dates

2. **Occurrence Processing** (Every minute)
   - Checks for unprocessed occurrences that should start
   - Creates one-time schedules from occurrences
   - Marks occurrences as processed

3. **Schedule Activation** (Every minute)
   - Activates one-time schedules when start time arrives
   - Deactivates expired schedules
   - Restores default sort order when all schedules end

4. **Cleanup** (Every minute)
   - Removes processed occurrences older than 30 days

### Priority System

When multiple schedules (recurring or one-time) target the same position:
1. Higher priority schedules win
2. If priorities are equal, earlier start time wins
3. Lower priority schedules are skipped for that position

---

## Validation Rules

### Required Fields
- `contentId`, `parentId`, `targetPosition`, `priority`, `boostDurationHours`, `pattern`

### Pattern Validation
- `interval` must be ≥ 1
- `startDate` cannot be in the past (more than 1 day ago)
- `endDate` must be after `startDate` (if specified)
- `boostDurationHours` must be > 0

### Weekly Pattern
- Must have at least one day in `daysOfWeek`
- Days must be 0-6

### Monthly Day of Month Pattern
- `dayOfMonth` must be 1-31
- If day doesn't exist in month (e.g., Feb 31), uses last day of month

### Monthly Day of Week Pattern
- `weekOfMonth` must be 1-5 (5 = last)
- `dayOfWeek` must be 0-6

### Content Validation
- Content must exist
- Parent must exist
- Content must be a child of the specified parent

---

## Troubleshooting

### Schedules Not Activating
- Check that the recurring schedule is enabled (`isEnabled: true`)
- Verify occurrences are being generated (check preview endpoint)
- Check server logs for processing errors
- Ensure background service is running

### Occurrences Not Generating
- Check the `startDate` is not too far in the future (>90 days)
- Verify the pattern is valid
- Check for `maxOccurrences` limit
- Look for errors in server logs

### Unexpected Boost Behavior
- Check priority values - higher priority wins
- Verify there are no conflicting one-time schedules
- Check that content and parent IDs are correct
- Review active schedules for the parent

### Performance Issues
- Cleanup runs automatically every minute
- Manual cleanup via database if needed: `DELETE FROM ocPowerSortScheduleOccurrence WHERE IsProcessed = 1 AND OccurrenceEndDate < DATEADD(day, -30, GETUTCDATE())`

---

## Database Schema Reference

### ocPowerSortRecurringSchedule
Main table storing recurring schedule configurations

### ocPowerSortScheduleOccurrence
Tracks individual occurrences generated from recurring schedules

### ocPowerSortSchedule
Extended with `RecurringScheduleId` to link generated one-time schedules

---

## Support and Documentation

For more information, see:
- `RECURRING_SCHEDULES_IMPLEMENTATION.md` - Full implementation details
- API Swagger documentation at `/umbraco/swagger`
- Source code in `OC.PowerSort` repository
