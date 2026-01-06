# Troubleshooting Schedule Sort Order Issues

## Issue: Schedule Created but Sort Order Not Changing

### Quick Diagnostic Steps

1. **Check if Background Service is Running**
   - Look in Umbraco logs for: `"Schedule Processing Service started"`
   - Should appear when application starts
   - Location: `App_Data/Logs/` or via Log Viewer in Umbraco

2. **Check if Schedule is Activated**
   - Look for log entry: `"Activated schedule {ScheduleId}..."`
   - This happens when start time is reached
   - Should occur within 1 minute of start time

3. **Check if Sort is Applied**
   - Look for: `"Moving content {ContentName} from position {X} to {Y}"`
   - This confirms the sort is being attempted

4. **Use the Diagnostic Endpoint**
   ```
   POST /umbraco/management/api/v1/oc/power-sorting/schedules/process-now
   ```
   This will return current state without waiting for background service

### Common Issues and Solutions

#### Issue 1: Background Service Not Running

**Symptoms:**
- No log entries about "Schedule Processing Service"
- Schedules never activate

**Solution:**
Check `OCPowerSortingApiComposer.cs` has this line:
```csharp
builder.Services.AddHostedService<ScheduleProcessingService>();
```

Restart the application.

#### Issue 2: Schedule Not Activating

**Symptoms:**
- Service is running but schedule stays `IsActive = false`
- No "Activated schedule" log entries

**Possible Causes:**

1. **Time Zone Issue**
   - Schedules use UTC time
   - Your local time may differ
   - Check: Is your start time actually in the past in UTC?
   
   **Test:** Create schedule with:
   - Start: 2 hours ago (UTC)
   - End: 2 hours from now (UTC)

2. **Database Not Updated**
   - Check if migration ran: `SELECT * FROM ocPowerSortingSchedule`
   - Should see your schedule with correct dates

3. **Service Check Interval**
   - Background service checks every 1 minute
   - Wait at least 1-2 minutes after creating schedule

#### Issue 3: Schedule Active but Sort Not Changing

**Symptoms:**
- `IsActive = true` in database
- Log shows "Moving content..." but no change in UI
- Or no "Moving content" logs at all

**Possible Causes:**

1. **Position Conflict (Multiple Schedules Targeting Same Position)**
   - When two schedules target the same position, only the highest priority wins
   - Look for log: "Position X conflict: Schedule A is blocked by schedule B"
   - **Solution:** Use different target positions or adjust priorities
   
   Example problem:
   ```
   Schedule A: Target position 0, Priority 10 → Applied ✓
   Schedule B: Target position 0, Priority 0  → Skipped ✗
   ```
   
   Example solution:
   ```
   Schedule A: Target position 0, Priority 10
   Schedule B: Target position 1, Priority 0  → Both applied ✓
   ```

2. **Content GUID Mismatch**
   ```sql
   -- Check if ContentId matches actual content Key
   SELECT * FROM ocPowerSortingSchedule WHERE Id = 'your-schedule-id'
   SELECT * FROM umbracoNode WHERE [key] = 'content-id-from-schedule'
   ```

3. **Position Already Correct**
   - Item at position 1 targeting position 0
   - But position 1 might already be the "first" position if something else is at 0
   - Check actual current positions of all children

4. **Browser Cache**
   - Clear browser cache
   - Hard refresh (Ctrl+F5)
   - Check in Umbraco content tree, not just Power Sort view

5. **Parent ID Mismatch**
   ```sql
   -- Verify parent relationship
   SELECT n.*, c.parentId 
   FROM umbracoNode n
   JOIN umbracoContent c ON n.id = c.nodeId
   WHERE n.[key] = 'your-content-id'
   ```

### Step-by-Step Diagnostic Process

#### Step 1: Verify Schedule Data

```sql
-- Check your schedule
SELECT 
    Id,
    ContentId,
    ParentId,
    TargetPosition,
    StartDateTime,
    EndDateTime,
    IsActive,
    Priority
FROM ocPowerSortingSchedule
WHERE Id = 'your-schedule-guid'
```

**Expected:**
- `StartDateTime` <= current UTC time
- `EndDateTime` > current UTC time
- `IsActive` = 1 (if start time has passed)

#### Step 2: Verify Content Exists

```sql
-- Check content exists and has correct parent
SELECT 
    n.[key] as ContentKey,
    n.[text] as Name,
    c.parentId,
    parent.[key] as ParentKey,
    c.sortOrder
FROM umbracoNode n
JOIN umbracoContent c ON n.id = c.nodeId
JOIN umbracoNode parent ON c.parentId = parent.id
WHERE n.[key] = 'your-content-id'
```

**Expected:**
- Row exists
- `ParentKey` matches your schedule's `ParentId`

#### Step 3: Check All Children Positions

```sql
-- See all children of parent with their sort orders
SELECT 
    n.[key],
    n.[text] as Name,
    c.sortOrder,
    n.createDate
FROM umbracoNode n
JOIN umbracoContent c ON n.id = c.nodeId
WHERE c.parentId = (SELECT id FROM umbracoNode WHERE [key] = 'parent-guid')
ORDER BY c.sortOrder
```

#### Step 4: Use Diagnostic Endpoint

Make a POST request to:
```
/umbraco/management/api/v1/oc/power-sorting/schedules/process-now
```

Response will show:
- Current schedules that should be active
- Current positions of content
- Target positions
- Whether content was found

Example response:
```json
{
  "currentTime": "2024-01-15T10:30:00Z",
  "processedParents": 1,
  "totalSchedules": 1,
  "details": [
    {
      "parentId": "...",
      "parentName": "Home",
      "childCount": 5,
      "scheduleCount": 1,
      "schedules": [
        {
          "scheduleId": "...",
          "contentId": "...",
          "contentName": "Featured Item",
          "targetPosition": 0,
          "currentPosition": 1,
          "isActive": true,
          "priority": 0
        }
      ]
    }
  ]
}
```

#### Step 5: Check Umbraco Logs

Look for these patterns in `App_Data/Logs/`:

**Good - Working:**
```
Schedule Processing Service started
Activated schedule {guid} for content {guid} to position 0
Processing 1 schedules for parent {guid} with 5 children
Moving content "Featured Item" from position 1 to 0
Updated "Featured Item" SortOrder from 1 to 0
Successfully applied sort order changes
```

**Problem - Not Finding Content:**
```
Content {guid} not found in parent {guid}
```
→ ContentId or ParentId mismatch

**Problem - No Movement:**
```
Content "Featured Item" already at target position 0
```
→ Item is already where it should be

**Problem - No Processing:**
```
Schedule Processing Service started
(nothing else)
```
→ No schedules match current time criteria

### Testing Checklist

- [ ] Migration ran successfully (table exists)
- [ ] Background service started (check logs)
- [ ] Schedule created with correct IDs
- [ ] Start time is in the past (UTC)
- [ ] End time is in the future (UTC)
- [ ] Wait at least 2 minutes after creating schedule
- [ ] Check IsActive = 1 in database
- [ ] Use diagnostic endpoint to see status
- [ ] Check Umbraco logs for errors
- [ ] Verify content exists and has correct parent
- [ ] Clear browser cache and refresh

### Force Processing for Testing

To test without waiting, you can:

1. **Create schedule starting 1 hour ago:**
   ```
   Start: DateTime.UtcNow.AddHours(-1)
   End: DateTime.UtcNow.AddHours(1)
   ```

2. **Manually trigger via API:**
   ```
   POST /umbraco/management/api/v1/oc/power-sorting/schedules/process-now
   ```

3. **Check logs immediately:**
   - Should see "Moving content..." within seconds

### If Still Not Working

1. **Enable debug logging** in `appsettings.json`:
   ```json
   {
     "Serilog": {
       "MinimumLevel": {
         "Default": "Debug",
         "Override": {
           "OC.PowerSorting": "Debug"
         }
       }
     }
   }
   ```

2. **Restart application** completely

3. **Verify database schema:**
   ```sql
   SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_NAME = 'ocPowerSortingSchedule'
   ```

4. **Check service is registered** in startup logs

5. **Try manual sort first** to confirm sorting works at all

### Contact Information

If the issue persists after these checks:
- Check GitHub issues: https://github.com/OwainWilliams/OC.PowerSorting
- Provide logs and diagnostic endpoint output
- Include schedule details and current positions
