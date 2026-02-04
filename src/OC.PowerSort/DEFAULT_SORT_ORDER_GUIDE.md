# Default Sort Order - Quick Start Guide

## Overview

The Default Sort Order feature allows you to save a "baseline" sort order that automatically restores when all schedules expire. Perfect for maintaining a standard order while allowing temporary promotional boosts.

## How It Works

```
Manual Order → Save as Default → Create Schedules → Schedules Expire → Auto-Restore Default
```

## Step-by-Step Guide

### 1. Set Up Your Default Order

1. Navigate to **Power Sort** section
2. Click on a parent node from the sidebar menu
3. Manually arrange children to your preferred "default" order
   - Drag and drop rows
   - This is your baseline order
4. Click **"Save as Default"** button
5. Confirm the save

✅ **Result:** Current sort order is saved as the default

### 2. Create Temporary Schedules

Now you can create schedules knowing there's a fallback:

1. Click **"Manage Schedules"**
2. Create schedule for promotion:
   ```
   Content: Holiday Sale Item
   Position: 0
   Start: Dec 20 00:00
   End: Dec 27 00:00
   Priority: 10
   ```
3. Schedule activates automatically

### 3. Automatic Restoration

When Dec 27 arrives:
1. Schedule expires automatically
2. Background service detects no active schedules
3. **Default order is restored automatically**
4. No manual intervention needed!

## UI Features

### Default Order Info Banner

When a default is saved, you'll see:

```
┌─────────────────────────────────────────────────┐
│ 📑 Default Order Saved                          │
│ 5 items • Last updated: 12/15/2024             │
│ Will restore automatically when schedules expire│
│                                          [Clear]│
└─────────────────────────────────────────────────┘
```

### Buttons Available

| Button | Shown When | Action |
|--------|------------|--------|
| **Save as Default** | Always | Saves current order as default |
| **Restore Default** | Default exists | Manually restores default order |
| **Clear** (in banner) | Default exists | Deletes saved default |

## Use Cases

### Use Case 1: Seasonal Promotions

**Setup:**
```
Default Order:
  0. About Us
  1. Services
  2. Contact

Save as Default ✓
```

**During Holiday:**
```
Create Schedule:
  Content: Holiday Hours
  Position: 0
  Dec 24-26
```

**Result:**
```
Dec 24-26:
  0. Holiday Hours  ← Scheduled
  1. About Us
  2. Services

After Dec 26:
  0. About Us       ← Restored
  1. Services
  2. Contact
```

### Use Case 2: Weekly Features

**Setup:**
```
Monday-Friday Default:
  0. Business Services
  1. Support
  2. Products

Save as Default ✓
```

**Weekend Override:**
```
Schedule 1:
  Content: Weekend Sale
  Position: 0
  Saturday-Sunday

Schedule 2:
  Content: Limited Hours
  Position: 1
  Saturday-Sunday
```

**Result:**
- **Sat-Sun:** Sale items on top
- **Mon-Fri:** Auto-restores to business focus

### Use Case 3: Event Management

**Setup:**
```
Normal Order:
  0. Home
  1. About
  2. Events (archived)

Save as Default ✓
```

**During Event:**
```
Schedule:
  Content: Events
  Position: 0
  Event Start → Event End
```

**Result:**
- Event prominent during event
- Auto-archives when event ends

## Best Practices

### ✅ DO

- **Save default BEFORE creating schedules**
- **Use meaningful, stable default order**
- **Update default when site structure changes**
- **Test restoration before major events**

### ❌ DON'T

- **Don't rely on default for frequently changing content**
- **Don't save temporary states as default**
- **Don't forget to update default after major changes**

## Advanced Features

### Manual Restoration

Even with active schedules, you can force restore:

1. Click **"Restore Default"**
2. Confirm action
3. Default order is applied immediately
4. Active schedules are **not** affected (they'll reapply on next cycle)

### Clear Default

To remove saved default:

1. Click **Clear** in the info banner
2. Confirm deletion
3. No auto-restore will occur when schedules expire

### Update Default

To update the saved default:

1. Arrange items to new desired order
2. Click **"Save as Default"**
3. Overwrites previous default
4. New default will be used for future restorations

## Troubleshooting

### Issue: Default Not Restoring

**Check:**
1. Are there still active schedules?
   - Default only restores when **ALL** schedules expire
2. Is default actually saved?
   - Look for the info banner
3. Check logs:
   ```
   "No active schedules remaining for parent {id}, checking for default order"
   "Restoring default sort order for parent {name}"
   ```

### Issue: Can't Save Default

**Check:**
1. Do you have permissions?
2. Is the parent valid?
3. Are there children to save?
4. Check browser console for errors

### Issue: Restore Button Not Showing

**Reason:** No default has been saved yet

**Solution:** Click "Save as Default" first

## API Endpoints

For programmatic access:

```http
# Get default order info
GET /api/v1/oc/power-sort/default-sort-order/{parentId}

# Save current as default
POST /api/v1/oc/power-sort/default-sort-order/save
{
  "parentId": "guid"
}

# Restore default
POST /api/v1/oc/power-sort/default-sort-order/restore/{parentId}

# Clear default
DELETE /api/v1/oc/power-sort/default-sort-order/{parentId}
```

## Summary

**Default Sort Order** provides a safety net for scheduled content:

1. ✅ Set and forget baseline order
2. ✅ Create unlimited temporary schedules
3. ✅ Automatic restoration when schedules end
4. ✅ Manual override anytime
5. ✅ Per-parent configuration

**Perfect for:**
- Seasonal campaigns
- Event management
- Weekly features
- Temporary promotions
- A/B testing periods

---

**Next Steps:**
1. Try it now! Arrange some items and click "Save as Default"
2. Create a test schedule
3. Watch it restore automatically
4. Read `SCHEDULE_FEATURE.md` for complete details
