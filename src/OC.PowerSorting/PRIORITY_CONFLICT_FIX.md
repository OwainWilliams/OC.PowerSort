# Priority Conflict Resolution Fix

## Issue Report
Two schedules were created targeting the **same position** (position 0):
- Schedule A: Priority 10, Target position 0
- Schedule B: Priority 0, Target position 0

**Expected:** Priority 10 schedule should claim position 0
**Actual:** Both schedules were being applied sequentially, causing the lower priority to overwrite the higher priority

## Root Cause

The original implementation processed schedules independently in priority order:
1. Process Schedule A (Priority 10) → Move item A to position 0
2. Process Schedule B (Priority 0) → Move item B to position 0 (pushes A to position 1)

**Problem:** Each schedule was applied without checking if another schedule had already claimed that position.

## Solution Implemented

Changed to a **two-pass approach**:

### Pass 1: Position Claiming
- Sort schedules by priority (highest first), then by start time
- Track which schedule "claims" each target position
- If a position is already claimed, log a conflict warning and skip the lower priority schedule

### Pass 2: Apply Winners
- Only apply the schedules that successfully claimed positions
- Process in position order (0, 1, 2...) for predictable results

## Code Changes

**File:** `OC.PowerSorting/Services/ScheduleProcessingService.cs`

**Key changes:**
1. Added `claimedPositions` dictionary to track position ownership
2. First loop determines winners based on priority
3. Second loop applies only winning schedules
4. Added conflict logging for skipped schedules

## Expected Behavior

### Scenario 1: Different Target Positions (Works)
```
Schedule A: Priority 10, Target 0
Schedule B: Priority 5,  Target 1
```
**Result:**
- Item A → Position 0
- Item B → Position 1
- ✅ Both applied

### Scenario 2: Same Target Position (Conflict)
```
Schedule A: Priority 10, Target 0
Schedule B: Priority 0,  Target 0
```
**Result:**
- Item A → Position 0 (Priority 10 wins)
- Item B → Stays in current position (Skipped due to conflict)
- ⚠️ Log: "Position 0 conflict: Schedule B blocked by Schedule A"

### Scenario 3: Three-way Conflict
```
Schedule A: Priority 10, Target 0
Schedule B: Priority 5,  Target 0
Schedule C: Priority 1,  Target 0
```
**Result:**
- Item A → Position 0 (Priority 10 wins)
- Item B → Skipped (blocked by A)
- Item C → Skipped (blocked by A)

## Log Output

### Working (Different Positions)
```
Processing 2 schedules for parent {guid} with 5 children
Schedule {A-guid} (Priority: 10) claims position 0 for content "Featured Item"
Schedule {B-guid} (Priority: 0) claims position 1 for content "Sale Item"
Moving content "Featured Item" (Priority: 10) from position 2 to 0
Moving content "Sale Item" (Priority: 0) from position 3 to 1
Updated "Featured Item" SortOrder from 2 to 0
Updated "Sale Item" SortOrder from 3 to 1
Successfully applied sort order changes
```

### Conflict (Same Position)
```
Processing 2 schedules for parent {guid} with 5 children
Schedule {A-guid} (Priority: 10) claims position 0 for content "Featured Item"
Position 0 conflict: Schedule {B-guid} (Priority: 0) is blocked by schedule {A-guid} (Priority: 10). Skipping lower priority schedule.
Moving content "Featured Item" (Priority: 10) from position 2 to 0
Updated "Featured Item" SortOrder from 2 to 0
Successfully applied sort order changes
```

## Testing

### Test Case 1: Priority Wins Position
1. Create Schedule A: Priority 10, Target position 0, Item at position 3
2. Create Schedule B: Priority 0, Target position 0, Item at position 2
3. Wait for processing or use diagnostic endpoint
4. **Expected:** Item from Schedule A at position 0, Schedule B item unchanged
5. **Check logs:** Should see conflict warning for Schedule B

### Test Case 2: Different Positions Work
1. Create Schedule A: Priority 10, Target position 0
2. Create Schedule B: Priority 0, Target position 1
3. **Expected:** Both items move to their target positions
4. **Check logs:** No conflict warnings

### Test Case 3: Equal Priority (First Wins)
1. Create Schedule A: Priority 5, Target position 0, Start time: 10:00
2. Create Schedule B: Priority 5, Target position 0, Start time: 10:01
3. **Expected:** Schedule A wins (earlier start time)
4. **Check logs:** Conflict warning for Schedule B

## Recommendations for Users

### ✅ Good Practice
```
Schedule 1: Item A → Position 0, Priority 10
Schedule 2: Item B → Position 1, Priority 5
Schedule 3: Item C → Position 2, Priority 0
```
Each schedule targets a different position.

### ⚠️ Conflict Scenario
```
Schedule 1: Item A → Position 0, Priority 10  ✓ Applied
Schedule 2: Item B → Position 0, Priority 0   ✗ Skipped
```
Both target the same position - only highest priority applies.

### 💡 Alternative for Same Position
If you want multiple items to compete for position 0:
- Use time-based scheduling (different time windows)
- Let them run at different times rather than simultaneously

Example:
```
Schedule 1: Item A → Position 0, Jan 1-5, Priority 10
Schedule 2: Item B → Position 0, Jan 6-10, Priority 10
```

## Files Modified
- `OC.PowerSorting/Services/ScheduleProcessingService.cs`
- `OC.PowerSorting/SCHEDULE_FEATURE.md`
- `OC.PowerSorting/TROUBLESHOOTING.md`

## Build Status
✅ Build successful
✅ No breaking changes
✅ Enhanced logging added
