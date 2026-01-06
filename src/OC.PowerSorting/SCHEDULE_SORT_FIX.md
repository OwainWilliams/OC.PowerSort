# Schedule Sort Order Fix - Changes Summary

## Issue
Schedule functionality was created but sort order wasn't actually changing when schedules became active. Item at position 1 scheduled to move to position 0 stayed at position 1.

## Root Cause
The `ApplySchedulesToParentAsync` method in `ScheduleProcessingService.cs` had a flawed approach:
1. It was setting `SortOrder = targetPosition` directly instead of properly reordering the list
2. This caused conflicts because multiple items could end up with the same SortOrder
3. The re-normalization happened after the direct assignment, creating race conditions

## Changes Made

### 1. Fixed ScheduleProcessingService.cs
**File:** `OC.PowerSorting/Services/ScheduleProcessingService.cs`

**Changed the sort logic to:**
1. Load all children in order
2. Create a manipulable list
3. Find the content by its Key (Guid)
4. **Actually move it** in the list (remove from old position, insert at new position)
5. Apply new sequential SortOrder values (0, 1, 2, 3...) to all children
6. Save each child that changed

**Key improvements:**
- Uses `List.RemoveAt()` and `List.Insert()` to properly reorder
- Applies clean sequential SortOrder values
- Added comprehensive logging at each step
- Handles multiple schedules with priority ordering

### 2. Added Diagnostic Endpoint
**File:** `OC.PowerSorting/Controllers/OCPowerSortingApiController.cs`

**New endpoint:**
```
POST /umbraco/management/api/v1/oc/power-sorting/schedules/process-now
```

**Returns:**
- Current UTC time
- All schedules that should be active
- Current position of each scheduled item
- Target position for each schedule
- Parent information and child counts

**Use for:**
- Immediate testing without waiting for background service
- Diagnosing schedule configuration issues
- Verifying content IDs are correct
- Checking if items are found in parent

### 3. Created Troubleshooting Guide
**File:** `OC.PowerSorting/TROUBLESHOOTING.md`

Comprehensive guide covering:
- Quick diagnostic steps
- Common issues and solutions
- Step-by-step diagnostic process
- SQL queries for verification
- Log patterns to look for
- Testing checklist

## How to Test the Fix

### Option 1: Wait for Background Service (1-2 minutes)
1. Create a schedule with start time = now
2. Wait 1-2 minutes for background service to run
3. Check Umbraco logs for "Moving content..." messages
4. Refresh the children list

### Option 2: Use Diagnostic Endpoint (Immediate)
1. Create a schedule
2. Call the diagnostic endpoint:
   ```
   POST /umbraco/management/api/v1/oc/power-sorting/schedules/process-now
   ```
3. Check the response to see:
   - If schedule is found
   - Current position vs target position
   - If content exists in parent
4. Check logs for detailed processing info

### Option 3: Check Logs
Look in `App_Data/Logs/` for:
```
Schedule Processing Service started
Processing 1 schedules for parent {guid} with {count} children
Moving content "{name}" from position {from} to {to}
Updated "{name}" SortOrder from {old} to {new}
Successfully applied sort order changes
```

## Expected Log Output (Working)

```
[10:30:00 INF] Schedule Processing Service started
[10:31:00 INF] Activated schedule abc-123 for content def-456 to position 0
[10:31:00 INF] Processing 1 schedules for parent xyz-789 with 5 children
[10:31:00 INF] Moving content "Featured Item" (Key: def-456) from position 1 to 0 based on schedule abc-123
[10:31:00 INF] Applying new sort order to 5 children
[10:31:00 INF] Updated "Featured Item" SortOrder from 1 to 0
[10:31:00 INF] Updated "Other Item" SortOrder from 0 to 1
[10:31:00 INF] Successfully applied sort order changes for parent xyz-789
```

## Common Issues After Fix

### Issue: "Content {guid} not found in parent"
**Cause:** ContentId in schedule doesn't match any child's Key
**Fix:** 
- Verify the content GUID in the schedule
- Check the content's parent GUID matches schedule's ParentId
- Use diagnostic endpoint to see what was found

### Issue: "Content already at target position"
**Cause:** Item is already where it should be
**Fix:**
- Check current positions with diagnostic endpoint
- Verify target position is different from current
- May be working correctly!

### Issue: No log entries at all
**Cause:** Background service not running
**Fix:**
- Check `OCPowerSortingApiComposer.cs` has service registered
- Restart application
- Look for "Schedule Processing Service started" in logs

## Verification Steps

1. ✅ Build successful
2. ✅ Background service logic fixed
3. ✅ Diagnostic endpoint added
4. ✅ Comprehensive logging added
5. ✅ Troubleshooting guide created

## Next Steps for User

1. Restart the Umbraco application (to reload the background service)
2. Create a test schedule:
   - Content at position 1
   - Target position 0
   - Start time: Now (UTC)
   - End time: +1 hour
3. Wait 2 minutes OR use diagnostic endpoint
4. Check logs for movement messages
5. Refresh the children view
6. Item should now be at position 0

## Files Modified
- `OC.PowerSorting/Services/ScheduleProcessingService.cs` (Fixed sort logic)
- `OC.PowerSorting/Controllers/OCPowerSortingApiController.cs` (Added diagnostic endpoint)

## Files Created
- `OC.PowerSorting/TROUBLESHOOTING.md` (Diagnostic guide)
- `OC.PowerSorting/SCHEDULE_SORT_FIX.md` (This file)
