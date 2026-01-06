# Power Sorting Schedule Feature

## Overview

The Power Sorting Schedule feature allows you to automatically boost content items to specific positions during defined time periods. This is perfect for:

- **Promotional content** - Boost a specific product to the top during a sale
- **Time-sensitive content** - Display urgent news at position 1 during breaking events  
- **Scheduled campaigns** - Auto-sort campaign pages during active periods
- **Event management** - Prioritize event pages before and during the event

## How It Works

### 1. Database Table

A new table `ocPowerSortingSchedule` stores all schedule configurations:
- **ContentId**: The item to boost (Guid)
- **ParentId**: The parent container (Guid)
- **TargetPosition**: Position to boost to (0-based index)
- **StartDateTime**: When schedule becomes active
- **EndDateTime**: When schedule expires
- **Priority**: For handling conflicts (higher = more important)
- **IsActive**: Current activation status

### 2. Background Service

A background service runs every minute (configurable) to:
1. **Activate schedules** when their start time is reached
2. **Deactivate schedules** when they expire
3. **Apply sort orders** based on active schedules

### 3. Priority System

When multiple schedules affect the same parent:
- **Higher priority schedules take precedence**
- If priorities are equal, earlier schedules (by start time) win
- Manual sorting still works but may be overridden when schedules activate

**Important: Position Conflicts**
When multiple schedules target the **same position**:
- Only the **highest priority** schedule claims that position
- Lower priority schedules targeting the same position are **skipped**
- The skipped schedules are logged but not applied

**Example:**
```
Schedule A: Priority 10, Target Position 0
Schedule B: Priority 0, Target Position 0
```
Result: Only Schedule A moves its item to position 0. Schedule B is skipped.

**Recommendation:** 
- Use different target positions for different items
- Or use priority to control which item wins position 0
- Higher priority = more important content

## Usage Examples

### Example 1: Boost Node Today to Tomorrow

Create a schedule to boost "Featured Product" to position 0 (first) for 24 hours:

```
Content: Featured Product
Target Position: 0
Start: Today 00:00
End: Tomorrow 00:00
Priority: 0
```

### Example 2: Weekend Promotion

Boost "Weekend Sale" from Saturday to Sunday:

```
Content: Weekend Sale
Target Position: 0
Start: Saturday 00:00
End: Monday 00:00  
Priority: 0
```

### Example 3: Flash Sale (Specific Hours)

Boost "Flash Sale" today from 9 AM to 10 AM:

```
Content: Flash Sale
Target Position: 0
Start: Today 09:00
End: Today 10:00
Priority: 0
```

### Example 4: Multiple Schedules with Priority

Boost "Holiday Special" to position 0, but also boost "Limited Offer" to position 1:

Schedule 1:
```
Content: Holiday Special
Target Position: 0
Start: Dec 24 00:00
End: Dec 26 00:00
Priority: 10 (higher priority)
```

Schedule 2:
```
Content: Limited Offer
Target Position: 1
Start: Dec 24 00:00
End: Dec 26 00:00
Priority: 5 (lower priority)
```

✅ **This works** - Different target positions

### Example 5: Position Conflict (Same Target Position)

**Scenario:** Two items both targeting position 0

Schedule 1:
```
Content: Holiday Special
Target Position: 0
Start: Dec 24 00:00
End: Dec 26 00:00
Priority: 10 (wins!)
```

Schedule 2:
```
Content: Limited Offer
Target Position: 0
Start: Dec 24 00:00
End: Dec 26 00:00
Priority: 5 (skipped!)
```

**Result:** 
- ✅ "Holiday Special" moves to position 0 (Priority 10 wins)
- ⚠️ "Limited Offer" stays in its current position (conflict - skipped)
- 📝 Log shows: "Position 0 conflict: Schedule X is blocked by schedule Y"

**Better approach:**
```
Schedule 1: Holiday Special → Position 0, Priority 10
Schedule 2: Limited Offer → Position 1, Priority 5
```
This way both schedules are applied.

## API Endpoints

### Get All Schedules
```
GET /umbraco/management/api/v1/oc/power-sorting/schedules
GET /umbraco/management/api/v1/oc/power-sorting/schedules?parentId={guid}
GET /umbraco/management/api/v1/oc/power-sorting/schedules?activeOnly=true
```

### Get Single Schedule
```
GET /umbraco/management/api/v1/oc/power-sorting/schedules/{id}
```

### Create Schedule
```
POST /umbraco/management/api/v1/oc/power-sorting/schedules
{
  "contentId": "guid",
  "parentId": "guid",
  "targetPosition": 0,
  "startDateTime": "2024-01-15T09:00:00Z",
  "endDateTime": "2024-01-15T10:00:00Z",
  "priority": 0
}
```

### Update Schedule
```
PUT /umbraco/management/api/v1/oc/power-sorting/schedules/{id}
{
  "targetPosition": 1,
  "startDateTime": "2024-01-15T09:00:00Z",
  "endDateTime": "2024-01-15T10:00:00Z",
  "priority": 5
}
```

### Delete Schedule
```
DELETE /umbraco/management/api/v1/oc/power-sorting/schedules/{id}
```

### Get Active Schedules for Parent
```
GET /umbraco/management/api/v1/oc/power-sorting/schedules/active/{parentId}
```

## UI Components

### Children Dashboard

The children dashboard now shows:
- **Active Schedule Banner** - When schedules are active for the parent
- **Scheduled Badges** - Green badges on items with active schedules
- **Manage Schedules Button** - Navigate to schedule management

### Schedule Management Dashboard

Navigate to schedule management via the "Manage Schedules" button to:
- View all schedules for a parent
- See schedule status (Active Now, Scheduled, Expired)
- Create new schedules with date/time pickers
- Edit existing schedules
- Delete schedules
- See priority and creator information

### Schedule Dialog

When creating/editing schedules:
- **Content Picker** - Select the content to boost (create only)
- **Target Position** - 0-based position (0 = first)
- **Start/End DateTime** - Local time converted to UTC
- **Priority** - Optional, default 0

## Configuration

### Change Check Interval

The background service checks every 1 minute by default. To change this, modify `ScheduleProcessingService.cs`:

```csharp
private readonly TimeSpan _checkInterval = TimeSpan.FromMinutes(5); // Check every 5 minutes
```

### Disable Background Service

To temporarily disable scheduling, comment out the service registration in `OCPowerSortingApiComposer.cs`:

```csharp
// builder.Services.AddHostedService<ScheduleProcessingService>();
```

## Important Notes

### Time Zones
- All times are stored and processed in UTC
- The UI converts to/from local browser time
- Ensure server time is correct for accurate scheduling

### Manual Sorting vs Schedules
- Manual sorting still works during active schedules
- Changes may be overridden on next schedule check (every minute)
- To prevent this, delete or edit the conflicting schedule

### Performance
- Background service uses scoped database access
- Sort operations only run when schedules change state
- Indexes ensure fast schedule lookups

### Migration
- Database migration runs automatically on application startup
- Safe to run multiple times (checks if table exists)
- Creates necessary indexes for performance

## Troubleshooting

### Schedules Not Activating

1. Check background service is running (look for log entries)
2. Verify start/end times are in the future/correct
3. Check server time vs expected activation time
4. Look for errors in Umbraco logs

### Sort Not Applying

1. Verify content exists and is a child of specified parent
2. Check content hasn't been moved to different parent
3. Ensure target position is valid (not greater than child count)
4. Check for conflicting schedules with higher priority

### Schedule UI Not Showing

1. Ensure migration ran successfully (check database for table)
2. Verify API endpoints are accessible
3. Check browser console for JavaScript errors
4. Confirm user has permission to access the section

## Future Enhancements

Potential features for future versions:
- Recurring schedules (e.g., every Monday)
- Schedule templates for common patterns
- Bulk schedule creation
- Schedule preview/simulation
- Email notifications when schedules activate
- Schedule conflict detection and warnings
- Dashboard widgets showing upcoming schedules
