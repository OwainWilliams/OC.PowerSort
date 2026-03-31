# OC.PowerSort - Upgrade Guide

## Upgrading from Previous Versions

If you're upgrading OC.PowerSort from a version **before 17.1.0** (before recurring schedules were added), follow these steps:

### Step 1: Update the Package

1. **Update the NuGet package** to the latest version:
   ```bash
   dotnet add package OC.PowerSort --version 17.1.0
   ```

2. **Build your project** to ensure all new files are compiled:
   ```bash
   dotnet build
   ```

### Step 2: Stop Your Application

- Stop IIS Express / Kestrel
- Close all browser tabs with the site open

### Step 3: Start Your Application

1. **Start the application** (F5 in Visual Studio or `dotnet run`)

2. **Watch the console/logs** for migration messages:
   ```
   OC.PowerSort: Starting migration execution
   OC.PowerSort: Checking if table ocPowerSortRecurringSchedule exists
   OC.PowerSort: Table ocPowerSortRecurringSchedule created successfully
   ...
   OC.PowerSort: Migration execution completed successfully
   ```

3. **Migrations run automatically** on application startup
   - New tables will be created
   - New columns will be added to existing tables
   - Your existing data will NOT be affected

### Step 4: Verify Upgrade

After the application starts successfully:

1. **Check the database** - You should now have these new tables:
   - `ocPowerSortRecurringSchedule`
   - `ocPowerSortScheduleOccurrence`

2. **Check existing table** - `ocPowerSortSchedule` should have a new column:
   - `RecurringScheduleId` (nullable GUID)

3. **Test functionality**:
   - Create a regular schedule (should work as before)
   - The new recurring schedule API endpoints are now available

### What's New in 17.1.0

✨ **Recurring Schedules Feature**
- Schedule content boosts to repeat automatically
- Support for Daily, Weekly, and Monthly patterns
- Complex patterns like "2nd Tuesday of each month"
- Occurrence preview and cancellation
- Full REST API support

📚 **New Documentation**
- `RECURRING_SCHEDULES_IMPLEMENTATION.md` - Technical details
- `RECURRING_SCHEDULES_QUICKSTART.md` - API usage guide
- `MIGRATION_TROUBLESHOOTING.md` - Upgrade help

---

## Troubleshooting

### Error: "table ocPowerSortSchedule has no column named RecurringScheduleId"

This means migrations haven't run yet. See `MIGRATION_TROUBLESHOOTING.md` for detailed steps.

**Quick fix:**
1. Stop the application completely
2. Restart it and wait for migrations to complete
3. Check logs for "Migration execution completed successfully"

### Migrations Not Running?

**Check the runtime level:**
- Migrations only run when `RuntimeLevel` is `Run`
- If Umbraco is in upgrade mode, complete the Umbraco upgrade first

**Check the logs:**
- Look for "OC.PowerSort: Starting migration execution" in console output
- If not present, check for errors in `umbraco/Logs/`

**Force migration re-run (safe):**
```sql
-- Delete migration state (won't delete your data)
DELETE FROM umbracoKeyValue WHERE [key] LIKE '%OC.PowerSort%';
```
Then restart the application.

---

## Database Changes

### New Tables

#### ocPowerSortRecurringSchedule
Stores recurring schedule configurations:
- Recurrence patterns (Daily, Weekly, Monthly)
- Duration, priority, and date ranges
- Enable/disable status

#### ocPowerSortScheduleOccurrence
Tracks individual occurrences generated from recurring schedules:
- Links to parent recurring schedule
- Processed and cancelled status
- Automatic cleanup after 30 days

### Modified Tables

#### ocPowerSortSchedule
Added column:
- `RecurringScheduleId` (GUID, nullable) - Links to parent recurring schedule if this is an auto-generated schedule

---

## Backwards Compatibility

✅ **Fully backwards compatible**
- All existing schedules continue to work unchanged
- No breaking changes to existing API endpoints
- New features are purely additive
- Can continue using one-time schedules as before

✅ **Data Safety**
- Migrations check for existing data before making changes
- No data is deleted or modified
- Foreign keys use `SET NULL` on delete for safety
- Migrations can be safely re-run (idempotent)

---

## Rollback

If you need to rollback to a previous version:

1. **Stop the application**

2. **Downgrade the package:**
   ```bash
   dotnet add package OC.PowerSort --version 17.0.0
   ```

3. **The database changes are safe to leave:**
   - Extra columns/tables won't break the old version
   - Old version simply ignores new columns
   - Or, manually drop the new tables if desired:
     ```sql
     DROP TABLE IF EXISTS ocPowerSortScheduleOccurrence;
     DROP TABLE IF EXISTS ocPowerSortRecurringSchedule;
     -- Note: RecurringScheduleId column can be left in place (it's nullable)
     ```

4. **Restart the application**

---

## Production Deployment

### Recommended Deployment Process

1. **Test in Development/Staging First**
   - Upgrade in a non-production environment
   - Verify migrations complete successfully
   - Test both existing and new features

2. **Backup Production Database**
   - Always backup before any upgrade
   - Test restore process

3. **Deploy During Low-Traffic Period**
   - Migrations typically complete in <1 second
   - But plan for brief downtime during app restart

4. **Monitor Logs**
   - Watch for migration success messages
   - Check for any errors during startup

5. **Verify Functionality**
   - Test creating schedules
   - Verify existing schedules still work
   - Check background service is running

### Deployment Checklist

- [ ] Backup database
- [ ] Test upgrade in staging
- [ ] Update package version
- [ ] Stop application
- [ ] Start application
- [ ] Verify migrations completed (check logs)
- [ ] Verify new tables exist
- [ ] Test schedule creation
- [ ] Test existing functionality
- [ ] Monitor for errors

---

## Support

If you encounter issues during upgrade:

1. **Check logs** - Look in Visual Studio Output window or `umbraco/Logs/`
2. **Review documentation** - See `MIGRATION_TROUBLESHOOTING.md`
3. **Check migration state** - Query `umbracoKeyValue` table
4. **Open an issue** - https://github.com/OwainWilliams/OC.PowerSort/issues

Include in your issue:
- Current package version
- Previous package version
- Error messages from logs
- Database type (SQLite, SQL Server, etc.)
- Migration state from database
