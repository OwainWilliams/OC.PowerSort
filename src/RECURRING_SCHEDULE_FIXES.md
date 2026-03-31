# Recurring Schedule Logic Fixes

## Summary
Fixed four critical bugs in the recurring schedule system that were causing incorrect occurrence calculations, return values, and UI display issues.

## Bugs Fixed

### 1. Weekly Recurrence Week Offset Calculation
**Issue**: When creating a recurring schedule, the week numbering started from the evaluation date instead of the recurrence start date. This caused incorrect week matching for interval-based weekly schedules.

**Example Problem**: 
- Create schedule on Thursday for Mon/Wed/Sat every week
- Expected first occurrence: Saturday (2 days away)
- Actual first occurrence: Friday (incorrect - not in selected days)

**Fix**: Changed `CalculateWeeklyOccurrences` to:
- Calculate the Sunday of the recurrence start week as the anchor point
- Calculate week offset from the recurrence start date, not the evaluation date
- This ensures `weekNumber % interval == 0` correctly identifies matching weeks

**Code Change**:
```csharp
// Before: Started counting from evaluation week
var weekNumber = 0;

// After: Anchor to recurrence start and calculate offset
var recurrenceStartSunday = schedule.RecurrenceStart.Date;
while (recurrenceStartSunday.DayOfWeek != DayOfWeek.Sunday)
{
    recurrenceStartSunday = recurrenceStartSunday.AddDays(-1);
}

var evaluationStartSunday = start.Date;
while (evaluationStartSunday.DayOfWeek != DayOfWeek.Sunday)
{
    evaluationStartSunday = evaluationStartSunday.AddDays(-1);
}

var weeksDiff = (int)((evaluationStartSunday - recurrenceStartSunday).TotalDays / 7);
var weekNumber = Math.Max(0, weeksDiff);
```

### 2. Monthly Day-of-Month Handling
**Issue**: When selecting day 31 for monthly recurrence, months with fewer than 31 days would use the last day of that month instead of skipping the month entirely.

**Example Problem**:
- Schedule for 31st of each month
- Expected: Jan 31, Mar 31 (skip Feb and Apr)
- Actual: Jan 31, Feb 29, Mar 31, Apr 30 (used last day of short months)

**Fix**: Changed `GetDayOfMonthOccurrence` to return `null` when the requested day doesn't exist in the month, causing that month to be skipped.

**Code Change**:
```csharp
// Before: Used last day of month
var actualDay = Math.Min(dayOfMonth, daysInMonth);
return new DateTime(month.Year, month.Month, actualDay);

// After: Skip months where day doesn't exist
if (dayOfMonth > daysInMonth)
    return null;

return new DateTime(month.Year, month.Month, dayOfMonth);
```

### 3. GetNextOccurrence Null Handling
**Issue**: When no future occurrences exist (e.g., recurrence has ended), `GetNextOccurrence` returned `DateTime.MinValue` (0001-01-01) instead of `null`.

**Fix**: Added explicit check for default DateTime value and return null properly.

**Code Change**:
```csharp
// Before
return occurrences.FirstOrDefault(); // Returns default(DateTime) for empty collection

// After
var firstOccurrence = occurrences.FirstOrDefault();
return firstOccurrence == default(DateTime) ? null : firstOccurrence;
```

### 4. Next Occurrence Display Bug (UI)
**Issue**: The `formatNextOccurrence` TypeScript function incorrectly calculated day differences when times of day differ, causing "Tomorrow" to display when the occurrence was 2+ days away.

**Example Problem**:
- Today: Thursday 3:00 PM
- Next occurrence: Saturday 12:00 AM
- Time difference: ~33 hours
- Displayed: "Tomorrow" (incorrect)
- Should display: "In 2 days"

**Root Cause**: Using `Math.floor(diffMs / (1000 * 60 * 60 * 24))` on timestamps with different times of day gives incorrect day counts.

**Fix**: Normalize both dates to midnight before calculating day difference.

**Code Change**:
```typescript
// Before: Calculated days from millisecond difference
const diffMs = date.getTime() - now.getTime();
const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

// After: Normalize to midnight first for accurate day calculation
const dateAtMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
const nowAtMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const diffDays = Math.round((dateAtMidnight.getTime() - nowAtMidnight.getTime()) / (1000 * 60 * 60 * 24));
```

## Tests Added

Created comprehensive unit test suite (`RecurrenceCalculatorServiceTests.cs`) with **37 tests** covering:

### Daily Recurrence
- Every day
- Every N days
- With end dates
- With max occurrences

### Weekly Recurrence
- Single day of week
- Multiple days of week
- Every N weeks
- Starting mid-week
- All days selected
- No days specified (error case)
- **Thursday with Monday/Saturday** (user's exact scenario)

### Monthly Recurrence
- Day of month (e.g., 15th of each month)
- Day of month that doesn't exist in all months (e.g., 31st)
- Nth weekday (e.g., 2nd Tuesday)
- Every N months

### Edge Cases
- Disabled schedules
- Start date after evaluation period
- Recurrence end dates
- Max occurrence limits
- GetNextOccurrence with no future occurrences

### Description Generation
- Daily patterns
- Weekly patterns (single and multiple days)
- Monthly patterns

## Test Results
All 44 tests (7 existing + 37 new) pass successfully.

## Impact

These fixes ensure:
1. ✅ Weekly schedules correctly calculate which weeks match the interval
2. ✅ Monthly schedules properly skip months where the selected day doesn't exist
3. ✅ API properly returns null for schedules with no future occurrences
4. ✅ UI accurately displays next occurrence relative to today (Tomorrow, In X days, etc.)
5. ✅ Background service processes occurrences at the correct times
6. ✅ Users see accurate "next occurrence" dates in the dashboard

## Files Modified
- `OC.PowerSort/Services/RecurrenceCalculatorService.cs` - Fixed 3 backend bugs
- `OC.PowerSort/Client/src/types/recurring-schedule.types.ts` - Fixed UI display bug
- `OC.PowerSort/Controllers/RecurringScheduleApiController.cs` - Added debug endpoint
- `OC.PowerSort.Tests/Services/RecurrenceCalculatorServiceTests.cs` - Added 37 comprehensive tests
