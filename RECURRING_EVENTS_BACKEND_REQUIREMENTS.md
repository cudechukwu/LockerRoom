# Recurring Events - Backend Requirements

## ⚠️ CRITICAL: Missing Backend Field

To fully support the multi-day weekly recurrence feature (e.g., "every Friday and Sunday"), the backend **MUST** add a new column to the `events` table:

```sql
ALTER TABLE events 
ADD COLUMN recurring_days TEXT[];

-- OR use integer array (0=Sunday, 1=Monday, ..., 6=Saturday):
-- ADD COLUMN recurring_days INTEGER[];
```

### Why This Is Required

The current implementation only supports pattern-based recurrence:
- `daily` - every day
- `weekly` - every week on the same day
- `biweekly` - every 2 weeks on the same day
- `monthly` - every month on the same day

**This cannot support:**
- "Every Friday and Sunday"
- "Every Tuesday and Thursday"
- "Every Monday, Wednesday, Friday"

### Current Workaround

The frontend currently maps multi-day selections to `biweekly` pattern, which is **incorrect**. It will expand as "every 2 weeks from the original date" rather than on the specific days selected.

### Implementation Status

✅ **Frontend**: Ready to use `recurring_days` when available
- Expansion logic supports both day names (`['Friday', 'Sunday']`) and numbers (`[5, 0]`)
- Falls back to pattern-based expansion if `recurring_days` is null

❌ **Backend**: Missing `recurring_days` column
- Database schema needs update
- API needs to store/return `recurring_days` array
- Migration needed for existing recurring events

## Database Migration Required

```sql
-- Add recurring_days column
ALTER TABLE events 
ADD COLUMN recurring_days TEXT[];

-- Update get_events_in_range function (already done in fix_recurring_events_expansion.sql)
-- The function now returns recurring_days (NULL until column exists)

-- Optional: Migrate existing events
-- If you have existing recurring events that should be converted:
-- UPDATE events 
-- SET recurring_days = ARRAY[TO_CHAR(start_time, 'Day')]
-- WHERE is_recurring = true AND recurring_pattern = 'weekly';
```

## API Changes Required

1. **Event Creation**: Accept `recurring_days` array in the payload
2. **Event Updates**: Allow updating `recurring_days`
3. **Event Retrieval**: Return `recurring_days` in all event queries

## Frontend Implementation

The frontend expansion logic (`src/utils/recurringEvents.js`) now:

✅ **Uses LOCAL TIME** (not UTC) - matches codebase standard, avoids DST bugs
✅ **Immutable date operations** - no mutations, prevents timezone issues
✅ **Stable instance IDs** - uses `instanceId` field (`{eventId}:{YYYY-MM-DD}`), preserves original `id`
✅ **Strategy pattern** - clean, composable expansion functions
✅ **Lazy expansion** - only expands visible range + buffer (not entire fetched range)
✅ **Separate patterns** - `weekly` vs `custom_weekly` (no overloading)
✅ **Simplified multi-day algorithm** - for each weekday, find first match then +7 days
✅ **Handles edge cases** - DST, month boundaries (Jan 31 → Feb 28/29), etc.
✅ **Supports `recurring_days`** when available
✅ **Falls back to pattern-based expansion** for backward compatibility

### Pattern Mapping

- `daily` - Every day
- `weekly` - Every week on the same day (single day)
- `custom_weekly` - Every week on specific days (requires `recurring_days` array)
- `biweekly` - Every 2 weeks on the same day
- `monthly` - Same day of month each month (e.g., 15th of each month)

⚠️ **Monthly Limitations**: Only supports "same day-of-month". Does NOT support:
- "nth weekday of month" (e.g., "first Monday")
- "last weekday of month" (e.g., "last Sunday")
- "last day of month" patterns

## Performance Considerations

⚠️ **Current Implementation**: Expands ALL recurring events for the ENTIRE date range

For large date ranges (e.g., full year view) with many recurring events, this could be slow.

**Future Optimization Options:**
1. Lazy expansion (only expand visible dates)
2. Backend expansion (generate instances in database)
3. Caching expanded instances
4. Pagination for large ranges

## Testing Checklist

Once `recurring_days` is added:

- [ ] Create event with "Every Friday and Sunday"
- [ ] Verify instances appear on correct days
- [ ] Test across month boundaries
- [ ] Test with `recurring_until` date
- [ ] Test editing recurring events
- [ ] Test with different timezones
- [ ] Test with DST transitions
- [ ] Verify instance IDs are stable across re-renders

