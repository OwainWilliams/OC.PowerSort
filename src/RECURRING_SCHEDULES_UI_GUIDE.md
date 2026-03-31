# Recurring Schedules UI - Location Guide

## Where to Find the Recurring Schedules UI

The recurring schedules UI has been integrated into the Power Sort dashboard. Here's how to access it:

### Method 1: From the Children View (Recommended)

1. **Navigate to Power Sort Dashboard**
   - Go to the Umbraco backoffice
   - Click on "Power Sort" in the sidebar

2. **Select a Parent Node**
   - Use the content picker to select a parent node
   - Click "View Children & Schedules"

3. **Click "Recurring Schedules" Button**
   - In the children view header, you'll see a new button labeled "Recurring Schedules" with a calendar icon
   - Click this button to view/manage recurring schedules for that parent

### Method 2: Direct URL Navigation

You can navigate directly using the hash route:
```
#recurring/{parent-node-guid}
```

Example:
```
https://localhost:44367/umbraco#/section/power-sort/dashboard/power-sort-dashboard#recurring/198b3a03-f740-4451-a140-1e22fe338efb
```

---

## UI Components Overview

### Recurring Schedules List View

**Location:** Appears when you click "Recurring Schedules" from children view

**Features:**
- ✅ View all recurring schedules for a parent
- ✅ See next occurrence date/time
- ✅ View recurrence pattern description
- ✅ Enable/disable schedules with toggle button
- ✅ Edit existing recurring schedules
- ✅ Delete recurring schedules
- ✅ Create new recurring schedules
- ✅ Empty state with helpful guidance

**What You'll See:**
- Schedule cards showing:
  - Content name being boosted
  - Status badge (Active/Scheduled/Disabled)
  - Priority and target position
  - Recurrence pattern description
  - Duration of each boost
  - Next occurrence date
  - Created date and user

### Recurring Schedule Dialog

**Location:** Opens when you click "Create Recurring Schedule" or "Edit" on a schedule

**Features:**
- ✅ Content picker (for new schedules)
- ✅ Target position input
- ✅ Priority input
- ✅ Boost duration (hours)
- ✅ Recurrence pattern selection:
  - **Daily:** Every N days
  - **Weekly:** Select days of week (Mon-Sun)
  - **Monthly:** 
    - Day of month (e.g., "3rd of each month")
    - Day of week (e.g., "2nd Tuesday of each month")
- ✅ Interval setting (every 1, 2, 3... periods)
- ✅ Start date picker
- ✅ End options:
  - No end date (indefinite)
  - End by specific date
  - After N occurrences

---

## How to Use

### Creating Your First Recurring Schedule

1. **Navigate to a parent node's children view**
   - Select a parent in Power Sort dashboard
   - Click "View Children & Schedules"

2. **Click "Recurring Schedules" button**
   - Button in the header with calendar icon

3. **Click "Create Recurring Schedule"**
   - Large button at the top of the recurring schedules view

4. **Fill in the form:**
   - Select the content to boost
   - Set target position (0 = first)
   - Set priority (higher = wins conflicts)
   - Choose recurrence pattern
   - Set duration and dates

5. **Save**
   - Schedule will appear in the list
   - Next occurrence will be calculated automatically
   - Background service will process occurrences

### Example: "Boost Every Monday"

1. Click "Create Recurring Schedule"
2. Select content
3. Target Position: `0`
4. Priority: `100`
5. Boost Duration: `24` hours
6. Recurrence Pattern: `Weekly`
7. Every: `1` week(s)
8. Days of Week: Click "Mon" button (it will highlight)
9. Start Date: Select start date
10. End Options: Choose "No end date" (or set an end)
11. Click "Create"

### Example: "2nd Tuesday of Each Month"

1. Click "Create Recurring Schedule"
2. Select content
3. Set position and priority
4. Recurrence Pattern: `Monthly`
5. Every: `1` month(s)
6. Monthly Pattern: Select "Day of Week"
7. Week of Month: Select "Second"
8. Day of Week: Select "Tuesday"
9. Set dates and click "Create"

---

## Visual Elements

### Buttons and Icons

- **Recurring Schedules Button** (in children view):
  - Calendar icon (📅)
  - Outline style
  - Located in header-actions next to "Save Default Order"

- **Create Button**:
  - Green/positive color
  - Plus icon
  - "Create Recurring Schedule" text

- **Toggle Enable/Disable**:
  - Play/Pause icon
  - Toggles schedule on/off without deleting

- **Edit Button**:
  - Pencil/edit icon
  - Opens dialog with current values

- **Delete Button**:
  - Delete icon in red
  - Shows confirmation dialog

### Status Badges

- **Active** (Green): Next occurrence within 24 hours
- **Scheduled** (Yellow): Future occurrences planned
- **Disabled** (Gray): Schedule turned off

---

## UI Flow Diagram

```
Power Sort Dashboard
    │
    ├─► Select Parent Node
    │       │
    │       └─► View Children & Schedules
    │               │
    │               ├─► Children List (existing)
    │               │
    │               └─► [NEW] "Recurring Schedules" Button
    │                       │
    │                       └─► Recurring Schedules View
    │                               │
    │                               ├─► Create New Schedule
    │                               │       └─► Recurring Schedule Dialog
    │                               │
    │                               ├─► Edit Schedule
    │                               │       └─► Recurring Schedule Dialog
    │                               │
    │                               ├─► Toggle Enable/Disable
    │                               │
    │                               └─► Delete Schedule
```

---

## Troubleshooting

### "I don't see the Recurring Schedules button"

**Possible causes:**
1. You're not in the children view
   - Solution: Navigate to a parent and click "View Children & Schedules"

2. The component didn't load
   - Solution: Hard refresh the page (Ctrl+F5)
   - Check browser console for errors

3. Build didn't include new files
   - Solution: Rebuild the project

### "The button is there but nothing happens when I click it"

**Solution:**
- Check browser console for errors
- Ensure migrations have run (check database for new tables)
- Verify API endpoints are working (check Network tab)

### "I can't create a recurring schedule - button is missing"

**Solution:**
1. Check if you're in the recurring schedules view (look for list of schedules)
2. The "Create Recurring Schedule" button should be at the top
3. If not visible, try refreshing the page
4. Check browser console for JavaScript errors

---

## Development Notes

### Files Created/Modified for UI

**New Files:**
- `OC.PowerSort\Client\src\dashboard\recurring-schedules-view.element.ts`
- `OC.PowerSort\Client\src\dashboard\recurring-schedule-dialog.element.ts`

**Modified Files:**
- `OC.PowerSort\Client\src\dashboard\powersort.element.ts`
  - Added "recurring" view type
  - Added `renderRecurringView()` method
  - Updated `detectCurrentView()` to handle #recurring/:id routes
  - Added module loading for recurring components

- `OC.PowerSort\Client\src\dashboard\children.element.ts`
  - Added "Recurring Schedules" button in header-actions

### Routes

The application uses hash-based routing:
- Main dashboard: `#`
- Children view: `#children/{parentId}`
- **Recurring view: `#recurring/{parentId}`** (NEW)
- Priorities: `#priorities`

---

## What Happens Behind the Scenes

When you create a recurring schedule:

1. **API Call**: Dialog sends request to `/api/oc/power-sort/recurring-schedules`
2. **Database**: Schedule saved to `ocPowerSortRecurringSchedule` table
3. **Occurrence Generation**: System generates next 90 days of occurrences
4. **Background Processing**: 
   - Every 6 hours: Regenerate occurrences
   - Every minute: Check for occurrences to process
   - Create one-time schedules from occurrences
   - Apply active schedules to content

---

## Next Steps

After UI is working:
1. ✅ Test creating schedules
2. ✅ Verify occurrences generate
3. ✅ Check background service processes them
4. ✅ Confirm content gets boosted at correct times
5. ✅ Test edit/delete/toggle functionality

For full API documentation, see:
- `RECURRING_SCHEDULES_QUICKSTART.md`
- `RECURRING_SCHEDULES_IMPLEMENTATION.md`
