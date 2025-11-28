# Recurring Event Deletion Plan

## Overview

This document outlines the implementation plan for supporting deletion of recurring event instances. Currently, users can only delete entire recurring event series, which is a poor UX when they want to remove just one occurrence (e.g., "delete this Friday only").

## Current State

### What Exists
- ✅ Recurring events are expanded in the frontend (`src/utils/recurringEvents.js`)
- ✅ Each instance has:
  - `instanceId`: `{originalEventId}:{YYYY-MM-DD}` (e.g., `uuid:2024-01-15`)
  - `originalEventId`: The original event's UUID
  - `isRecurringInstance: true`
- ✅ `deleteEvent()` function exists but only deletes by `event.id` (UUID)

### The Problem
- ❌ No way to delete a single instance (e.g., "delete this Friday only")
- ❌ No UI to choose between "delete this occurrence" vs "delete all occurrences"
- ❌ Deleting uses `event.id`, which could be:
  - The `originalEventId` → deletes the entire series (all instances)
  - An `instanceId` → won't work (format is `uuid:date`, not a valid UUID)
- ❌ Backend has no exceptions/deletions table to track deleted instances

---

## Implementation Plan

### Phase 1: Backend — Exceptions Table

#### 1.1 Create `event_exceptions` Table

**File:** `database/create_event_exceptions_table.sql`

```sql
-- Event Exceptions Table
-- Tracks deleted or modified instances of recurring events

CREATE TABLE IF NOT EXISTS event_exceptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  exception_date DATE NOT NULL, -- The specific date to exclude (YYYY-MM-DD)
  exception_type VARCHAR(20) DEFAULT 'deleted' CHECK (exception_type IN ('deleted', 'modified')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL, -- References auth.users (who deleted/modified it)
  UNIQUE(event_id, exception_date)
);

-- Index for fast lookups when filtering events
CREATE INDEX IF NOT EXISTS idx_event_exceptions_event_date 
  ON event_exceptions(event_id, exception_date);

-- RLS Policies
ALTER TABLE event_exceptions ENABLE ROW LEVEL SECURITY;

-- Users can view exceptions for events they can view
CREATE POLICY "Users can view exceptions for visible events"
  ON event_exceptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_exceptions.event_id
      AND (
        e.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.team_id = e.team_id
          AND tm.user_id = auth.uid()
        )
      )
    )
  );

-- Users can create exceptions for events they can delete
CREATE POLICY "Users can create exceptions for deletable events"
  ON event_exceptions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_exceptions.event_id
      AND (
        e.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.team_id = e.team_id
          AND tm.user_id = auth.uid()
          AND tm.role IN ('coach', 'admin')
        )
      )
    )
  );

-- Users can delete exceptions they created
CREATE POLICY "Users can delete their own exceptions"
  ON event_exceptions FOR DELETE
  USING (created_by = auth.uid());
```

#### 1.2 Update `get_events_in_range` RPC

**File:** `database/update_get_events_in_range_with_exceptions.sql`

Modify the existing RPC to:
- Join with `event_exceptions` table
- Filter out dates that have `exception_type = 'deleted'`
- This prevents deleted instances from appearing in calendar queries

**Note:** This is a future enhancement. For Phase 1, we'll handle filtering in the frontend expansion logic.

#### 1.3 Create RPC Function for Instance Deletion

**File:** `database/create_delete_recurring_instance_rpc.sql`

```sql
-- RPC Function: Delete a single instance of a recurring event
-- Creates an exception record to mark the instance as deleted

CREATE OR REPLACE FUNCTION delete_recurring_instance(
  p_event_id UUID,
  p_exception_date DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_result JSON;
BEGIN
  -- 🔐 CRITICAL FOR SUPABASE RLS — DO NOT REMOVE
  PERFORM set_config('request.jwt.claims', current_setting('request.jwt.claims'), true);

  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Verify event exists and is recurring
  IF NOT EXISTS (
    SELECT 1 FROM events
    WHERE id = p_event_id
    AND is_recurring = true
  ) THEN
    RAISE EXCEPTION 'Event not found or is not a recurring event';
  END IF;

  -- Verify user has permission to delete (event creator or team admin/coach)
  IF NOT EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = p_event_id
    AND (
      e.created_by = v_user_id
      OR EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.team_id = e.team_id
        AND tm.user_id = v_user_id
        AND tm.role IN ('coach', 'admin')
      )
    )
  ) THEN
    RAISE EXCEPTION 'User does not have permission to delete this event';
  END IF;

  -- Insert exception (or update if exists)
  INSERT INTO event_exceptions (event_id, exception_date, exception_type, created_by)
  VALUES (p_event_id, p_exception_date, 'deleted', v_user_id)
  ON CONFLICT (event_id, exception_date) 
  DO UPDATE SET 
    exception_type = 'deleted',
    created_at = NOW()
  WHERE event_exceptions.exception_type != 'deleted';

  -- Return success
  v_result := json_build_object(
    'success', true,
    'event_id', p_event_id,
    'exception_date', p_exception_date
  );

  RETURN v_result;
END;
$$;
```

#### 1.4 Create RPC Function to Fetch Exceptions

**File:** `database/create_get_event_exceptions_rpc.sql`

```sql
-- RPC Function: Get all exceptions for a recurring event
-- Used by frontend to filter out deleted instances during expansion

CREATE OR REPLACE FUNCTION get_event_exceptions(
  p_event_id UUID
)
RETURNS TABLE (
  exception_date DATE,
  exception_type VARCHAR(20)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 🔐 CRITICAL FOR SUPABASE RLS — DO NOT REMOVE
  PERFORM set_config('request.jwt.claims', current_setting('request.jwt.claims'), true);

  RETURN QUERY
  SELECT 
    ee.exception_date,
    ee.exception_type
  FROM event_exceptions ee
  WHERE ee.event_id = p_event_id
  AND ee.exception_type = 'deleted'
  ORDER BY ee.exception_date ASC;
END;
$$;
```

---

### Phase 2: Frontend API Layer

#### 2.1 Update `src/api/events.js`

**Add new function:**

```javascript
/**
 * Delete a single instance of a recurring event
 * Creates an exception record in the database to mark the instance as deleted
 * 
 * @param {Object} supabaseClient - Supabase client instance (from useSupabase() hook)
 * @param {string} originalEventId - Original event UUID
 * @param {Date} instanceDate - Date of the instance to delete (local time)
 * @returns {Promise<Object>} Success status and error info
 */
export async function deleteRecurringInstance(supabaseClient, originalEventId, instanceDate) {
  if (!supabaseClient) {
    throw new Error('Supabase client is required. Use useSupabase() hook and pass the client to this function.');
  }
  const supabase = supabaseClient;

  try {
    // Format date as YYYY-MM-DD (local time, not UTC)
    const year = instanceDate.getFullYear();
    const month = String(instanceDate.getMonth() + 1).padStart(2, '0');
    const day = String(instanceDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    // Call RPC to create exception
    const { data, error } = await supabase.rpc('delete_recurring_instance', {
      p_event_id: originalEventId,
      p_exception_date: dateStr
    });

    if (error) {
      console.error('Error deleting recurring instance:', error);
      throw error;
    }

    return { success: true, data, error: null };
  } catch (error) {
    console.error('Error deleting recurring instance:', error);
    return { success: false, data: null, error };
  }
}

/**
 * Get exceptions (deleted instances) for a recurring event
 * Used to filter out deleted instances during frontend expansion
 * 
 * @param {Object} supabaseClient - Supabase client instance
 * @param {string} eventId - Original event UUID
 * @returns {Promise<Array<Date>>} Array of dates that are deleted
 */
export async function getEventExceptions(supabaseClient, eventId) {
  if (!supabaseClient) {
    throw new Error('Supabase client is required.');
  }
  const supabase = supabaseClient;

  try {
    const { data, error } = await supabase.rpc('get_event_exceptions', {
      p_event_id: eventId
    });

    if (error) {
      console.error('Error fetching event exceptions:', error);
      throw error;
    }

    // Convert date strings to Date objects (local time)
    const deletedDates = (data || [])
      .filter(exception => exception.exception_type === 'deleted')
      .map(exception => {
        const [year, month, day] = exception.exception_date.split('-').map(Number);
        return new Date(year, month - 1, day); // Local time
      });

    return { data: deletedDates, error: null };
  } catch (error) {
    console.error('Error fetching event exceptions:', error);
    return { data: [], error };
  }
}
```

**Update `deleteEvent()` to handle both cases:**

```javascript
/**
 * Delete an event (or entire recurring series)
 * For recurring instances, use deleteRecurringInstance() instead
 * 
 * @param {Object} supabaseClient - Supabase client instance
 * @param {string} eventId - Event ID (original event UUID for recurring events)
 * @param {boolean} deleteAllInstances - If true and event is recurring, deletes entire series
 * @returns {Promise<Object>} Success status and error info
 */
export async function deleteEvent(supabaseClient, eventId, deleteAllInstances = true) {
  // ... existing implementation ...
  // Add validation to ensure we're not accidentally deleting by instanceId
  if (eventId.includes(':')) {
    throw new Error('Cannot delete by instanceId. Use deleteRecurringInstance() for single instances, or pass originalEventId to deleteEvent()');
  }
  // ... rest of existing code ...
}
```

---

### Phase 3: Frontend UI — Deletion Options

#### 3.1 Update `EventDetailsScreen.jsx`

**Detect if event is a recurring instance:**

```javascript
// In EventDetailsScreen component
const isRecurringInstance = event?.isRecurringInstance && event?.originalEventId;
const isRecurringSeries = event?.is_recurring && !event?.isRecurringInstance;
const originalEventId = event?.originalEventId || event?.id;
```

**Update `handleDelete()` to show options:**

```javascript
const handleDelete = useCallback(async () => {
  if (!event || !supabase) return;
  
  // If it's a recurring instance, show options
  if (isRecurringInstance) {
    Alert.alert(
      'Delete Recurring Event',
      `"${event.title}" is part of a recurring series. What would you like to delete?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'This occurrence only',
          onPress: async () => {
            try {
              const instanceDate = new Date(event.startTime);
              const { success, error: deleteError } = await deleteRecurringInstance(
                supabase, 
                originalEventId, 
                instanceDate
              );
              
              if (deleteError) {
                Alert.alert('Error', 'Failed to delete this occurrence. Please try again.');
                return;
              }
              
              // Invalidate caches and refresh
              queryClient.invalidateQueries({ queryKey: queryKeys.events(teamId) });
              queryClient.invalidateQueries({ queryKey: queryKeys.event(originalEventId) });
              
              // Navigate back
              navigation.goBack();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete this occurrence. Please try again.');
            }
          }
        },
        {
          text: 'All occurrences',
          style: 'destructive',
          onPress: async () => {
            // Show confirmation for deleting entire series
            Alert.alert(
              'Delete All Occurrences',
              `Are you sure you want to delete all occurrences of "${event.title}"? This cannot be undone.`,
              [
                {
                  text: 'Cancel',
                  style: 'cancel'
                },
                {
                  text: 'Delete All',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      const { success, error: deleteError } = await deleteEvent(supabase, originalEventId);
                      
                      if (deleteError) {
                        Alert.alert('Error', 'Failed to delete event. Please try again.');
                        return;
                      }
                      
                      queryClient.invalidateQueries({ queryKey: queryKeys.events(teamId) });
                      navigation.goBack();
                    } catch (err) {
                      Alert.alert('Error', 'Failed to delete event. Please try again.');
                    }
                  }
                }
              ]
            );
          }
        }
      ]
    );
    return;
  }
  
  // If it's a recurring series (original event), show confirmation
  if (isRecurringSeries) {
    Alert.alert(
      'Delete Recurring Event',
      `Are you sure you want to delete all occurrences of "${event.title}"? This cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            // ... existing delete logic ...
          }
        }
      ]
    );
    return;
  }
  
  // Non-recurring event - existing logic
  Alert.alert(
    'Delete Event',
    `Are you sure you want to delete "${event.title}"?`,
    [
      {
        text: 'Cancel',
        style: 'cancel'
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          // ... existing delete logic ...
        }
      }
    ]
  );
}, [event, supabase, teamId, queryClient, navigation, isRecurringInstance, isRecurringSeries, originalEventId]);
```

#### 3.2 Update `CalendarScreen.jsx` `handleDeleteEvent()`

Apply the same logic as `EventDetailsScreen`:
- Detect if event is a recurring instance
- Show ActionSheet/Alert with deletion options
- Handle both single-instance and series deletion

---

### Phase 4: Frontend — Expansion Logic

#### 4.1 Update `src/utils/recurringEvents.js`

**Modify `expandRecurringEvent()` to accept exceptions:**

```javascript
/**
 * Expand a recurring event into instances
 * 
 * @param {Object} event - Event to expand
 * @param {Date} startDate - Range start
 * @param {Date} endDate - Range end
 * @param {Array<Date>} exceptions - Array of dates to exclude (deleted instances)
 * @returns {Array} Array of event instances
 */
export function expandRecurringEvent(event, startDate, endDate, exceptions = []) {
  // ... existing validation ...
  
  // Normalize exceptions to midnight for comparison
  const normalizedExceptions = new Set(
    exceptions.map(date => {
      const normalized = new Date(date);
      normalized.setHours(0, 0, 0, 0);
      return normalized.getTime();
    })
  );
  
  // ... existing expansion logic ...
  
  // In each expansion strategy function, filter out exceptions:
  // After creating each instance, check:
  const instanceDateKey = normalizeToMidnight(currentDate).getTime();
  if (!normalizedExceptions.has(instanceDateKey)) {
    instances.push(createEventInstance(...));
  }
}
```

**Update `expandRecurringEvents()` to accept exceptions map:**

```javascript
/**
 * Expand multiple recurring events
 * 
 * @param {Array<Object>} events - Array of recurring events
 * @param {Date} startDate - Range start
 * @param {Date} endDate - Range end
 * @param {Map<string, Array<Date>>} exceptionsMap - Map of eventId -> array of deleted dates
 * @returns {Array} Array of expanded event instances
 */
export function expandRecurringEvents(events, startDate, endDate, exceptionsMap = new Map()) {
  const allInstances = [];
  
  for (const event of events) {
    const exceptions = exceptionsMap.get(event.id) || [];
    const instances = expandRecurringEvent(event, startDate, endDate, exceptions);
    allInstances.push(...instances);
  }
  
  return allInstances;
}
```

#### 4.2 Update `src/hooks/useCalendarData.js`

**Fetch exceptions for recurring events:**

```javascript
// In useCalendarData hook
const fetchEventExceptions = useCallback(async (recurringEventIds) => {
  if (!recurringEventIds || recurringEventIds.length === 0) {
    return new Map();
  }

  try {
    // Fetch exceptions for all recurring events in parallel
    const exceptionPromises = recurringEventIds.map(async (eventId) => {
      const { data, error } = await getEventExceptions(supabase, eventId);
      if (error) {
        console.warn(`Failed to fetch exceptions for event ${eventId}:`, error);
        return { eventId, exceptions: [] };
      }
      return { eventId, exceptions: data || [] };
    });

    const results = await Promise.all(exceptionPromises);
    
    // Build map: eventId -> array of deleted dates
    const exceptionsMap = new Map();
    results.forEach(({ eventId, exceptions }) => {
      if (exceptions.length > 0) {
        exceptionsMap.set(eventId, exceptions);
      }
    });

    return exceptionsMap;
  } catch (error) {
    console.error('Error fetching event exceptions:', error);
    return new Map();
  }
}, [supabase]);

// In the main data fetching logic:
// 1. Fetch recurring events
// 2. Extract their IDs
// 3. Fetch exceptions for those IDs
// 4. Pass exceptionsMap to expandRecurringEvents()
```

**Update expansion call:**

```javascript
// After fetching recurring events
const recurringEventIds = recurringEvents.map(e => e.id);
const exceptionsMap = await fetchEventExceptions(recurringEventIds);

// Expand with exceptions
const expandedInstances = expandRecurringEvents(
  recurringEvents,
  rangeStart,
  rangeEnd,
  exceptionsMap
);
```

---

### Phase 5: Edge Cases & UX Enhancements

#### 5.1 Visual Indication (Optional)

- **Deleted instances:** Simply don't show them (recommended)
- **Future enhancement:** Show a subtle indicator in edit mode if needed

#### 5.2 Undo Deletion (Future)

- Add `undoDeleteRecurringInstance()` function
- Remove exception record from database
- Show "Undo" toast/action after deletion

#### 5.3 Performance Optimizations

- **Batch fetch exceptions:** Fetch all exceptions in one query instead of per-event
- **Cache exceptions:** Store in React Query cache with appropriate invalidation
- **Lazy loading:** Only fetch exceptions for visible date range

#### 5.4 Permissions

- Use existing `canDeleteEvent()` logic
- Ensure RLS policies on `event_exceptions` table enforce permissions
- Verify user can only delete instances they have permission to delete

#### 5.5 Error Handling

- Handle case where exception already exists (idempotent)
- Handle case where event is deleted while creating exception
- Show user-friendly error messages

---

## Implementation Order

### Phase 1: Backend (Required First)
1. ✅ Create `event_exceptions` table with RLS policies
2. ✅ Create `delete_recurring_instance` RPC function
3. ✅ Create `get_event_exceptions` RPC function
4. ⚠️ Update `get_events_in_range` to filter exceptions (optional, can do in frontend for now)

### Phase 2: Frontend API (Required)
1. ✅ Add `deleteRecurringInstance()` function
2. ✅ Add `getEventExceptions()` function
3. ✅ Update `deleteEvent()` with validation

### Phase 3: Frontend UI (Required)
1. ✅ Update `EventDetailsScreen` deletion handler
2. ✅ Update `CalendarScreen` deletion handler
3. ✅ Test deletion flows

### Phase 4: Frontend Expansion (Required)
1. ✅ Update `expandRecurringEvent()` to accept exceptions
2. ✅ Update `expandRecurringEvents()` to use exceptions map
3. ✅ Update `useCalendarData` to fetch and pass exceptions

### Phase 5: Polish (Optional)
1. ⏳ Add undo functionality
2. ⏳ Performance optimizations
3. ⏳ Enhanced error handling
4. ⏳ Visual indicators

---

## Edge Cases & Special Scenarios

### ✅ Already Handled (Confirmed)

1. **Editing parent series doesn't resurrect deleted instances**
   - When expanding recurring events, exceptions are checked AFTER expansion
   - Even if parent event is edited, deleted dates remain filtered out
   - **Status:** ✅ Handled in Phase 4.1 (expansion logic filters exceptions)

2. **Deleting entire series auto-deletes exceptions**
   - `ON DELETE CASCADE` on `event_exceptions.event_id` ensures cleanup
   - No orphaned exception records
   - **Status:** ✅ Handled in Phase 1.1 (table schema)

3. **Batching exceptions prevents N+1 queries**
   - Exceptions fetched in parallel for all recurring events
   - Single map lookup during expansion
   - **Status:** ✅ Handled in Phase 4.2 (useCalendarData hook)

4. **Timezone normalization**
   - Exceptions stored as `DATE` (no time component)
   - Frontend uses local time for date comparisons
   - **Status:** ✅ Handled throughout (DATE type, local time normalization)

### ⚠️ Additional Edge Cases to Handle

#### 1. Exception Date Outside Recurring Pattern

**Scenario:** User deletes a date that doesn't match the recurring pattern
- Example: Delete "Tuesday" for a "Every Friday" event
- Example: Delete "Jan 32" (invalid date)

**Solution:**
- Frontend validation: Only allow deletion of dates that match the pattern
- Backend: Allow it (defensive - user might change pattern later)
- **Implementation:** Validate in UI before calling API

#### 2. Exception Date Outside `recurring_until` Range

**Scenario:** User deletes a date that's after `recurring_until`
- Example: Event ends Dec 31, user tries to delete Jan 15

**Solution:**
- Frontend: Don't show instances after `recurring_until` (already handled)
- Backend: Allow exception (defensive - `recurring_until` might change)
- **Implementation:** UI validation only

#### 3. Changing `recurring_until` After Instance Deletion

**Scenario:** 
- Event: Weekly, `recurring_until = Dec 31`
- User deletes Dec 15 instance
- User edits event: `recurring_until = Dec 10`

**Solution:**
- Exception remains in database (harmless)
- Expansion won't include dates after new `recurring_until` anyway
- **Implementation:** No special handling needed (exceptions are date-based, not range-based)

#### 4. Changing Recurring Pattern After Instance Deletion

**Scenario:**
- Event: "Every Friday"
- User deletes Jan 5 (Friday)
- User changes pattern to "Every Monday"

**Solution:**
- Exception for Jan 5 remains (harmless - won't match new pattern)
- Could add cleanup: Remove exceptions that don't match current pattern
- **Implementation:** Optional cleanup in `updateEvent()` (future enhancement)

#### 5. Deleting Past vs Future Instances

**Scenario:** User deletes an instance that already occurred

**Solution:**
- Allow deletion of past instances (user might want to hide from history)
- Consider: Should past deletions be allowed? (Yes - for data integrity)
- **Implementation:** No restrictions needed

#### 6. Concurrent Deletions

**Scenario:** Two users try to delete the same instance simultaneously

**Solution:**
- Database `UNIQUE(event_id, exception_date)` constraint prevents duplicates
- Second insert will fail or be ignored (idempotent)
- **Implementation:** Handle gracefully in UI (show success even if already deleted)

#### 7. Deleting Instance of Deleted Series

**Scenario:** 
- User A deletes entire series
- User B (on different device) tries to delete an instance

**Solution:**
- `deleteRecurringInstance()` RPC checks if event exists
- Returns error: "Event not found or is not a recurring event"
- **Implementation:** Error handling in Phase 2.1

#### 8. Exception for Non-Existent Date

**Scenario:** User somehow creates exception for date that never existed
- Example: Exception for Feb 30 (invalid)

**Solution:**
- Database `DATE` type prevents invalid dates
- Frontend validation prevents user input errors
- **Implementation:** Type safety + UI validation

#### 9. Changing Event Start Time After Instance Deletion

**Scenario:**
- Event starts Jan 1 (Monday)
- User deletes Jan 8 (Monday) instance
- User changes start_time to Jan 2 (Tuesday)

**Solution:**
- Exception date (Jan 8) remains valid
- Expansion recalculates from new start_time
- Jan 8 might not be an occurrence anymore (depends on pattern)
- **Implementation:** No special handling (exceptions are absolute dates)

#### 10. Bulk Operations

**Scenario:** User wants to delete multiple instances at once
- Example: "Delete all Fridays in January"

**Solution:**
- **Phase 1:** Not supported (delete one at a time)
- **Future:** Add bulk deletion API endpoint
- **Implementation:** Future enhancement (Phase 5)

#### 11. Undo Deletion

**Scenario:** User accidentally deletes an instance, wants to undo

**Solution:**
- **Phase 1:** Not supported (must manually recreate)
- **Future:** Add `undoDeleteRecurringInstance()` function
- **Implementation:** Future enhancement (Phase 5)

#### 12. Exception for Modified Instance (Future)

**Scenario:** User wants to change time/details for one instance only

**Solution:**
- **Phase 1:** Only supports `exception_type = 'deleted'`
- **Future:** Support `exception_type = 'modified'` with separate table for modified instance data
- **Implementation:** Future enhancement (not in current plan)

#### 13. Event ID Reuse

**Scenario:** Event deleted, new event created with same UUID (extremely rare)

**Solution:**
- UUIDs are unique, this shouldn't happen
- If it does, exceptions would apply to new event (edge case)
- **Implementation:** Not a concern (UUID uniqueness)

#### 14. Exception Date in Different Timezone

**Scenario:** User in EST deletes instance, user in PST views calendar

**Solution:**
- Exceptions stored as `DATE` (no timezone)
- Date comparisons use local time (normalized to midnight)
- **Implementation:** Already handled (DATE type, local normalization)

#### 15. Exception for Recurring Event That Becomes Non-Recurring

**Scenario:**
- Event: Recurring weekly
- User deletes Jan 15 instance
- User changes event to non-recurring

**Solution:**
- Exception remains in database (harmless)
- Non-recurring events don't expand, so exception is ignored
- **Implementation:** No cleanup needed (exceptions only affect expansion)

---

## Testing Checklist

### Backend Tests
- [ ] Can create exception for valid recurring event
- [ ] Cannot create exception for non-recurring event
- [ ] RLS policies prevent unauthorized access
- [ ] Exception is unique per event+date (idempotent)
- [ ] Fetching exceptions returns correct dates
- [ ] Exception creation fails for non-existent event
- [ ] Exception creation fails for invalid date
- [ ] CASCADE deletion works when parent event is deleted

### Frontend Tests
- [ ] Single instance deletion works
- [ ] Series deletion works
- [ ] Deleted instances don't appear in calendar
- [ ] Deleted instances don't appear after refresh
- [ ] Error handling works correctly
- [ ] Permissions are enforced
- [ ] UI shows correct options for instances vs series
- [ ] Cannot delete instance that doesn't match pattern (UI validation)
- [ ] Cannot delete instance after `recurring_until` (UI validation)

### Edge Case Tests
- [ ] Deleting instance that's already deleted (idempotent)
- [ ] Deleting instance of deleted series (error handling)
- [ ] Deleting instance with no permissions (error handling)
- [ ] Calendar refresh after deletion (cache invalidation)
- [ ] Multiple users deleting different instances (concurrent)
- [ ] Editing parent series doesn't resurrect deleted instances
- [ ] Changing `recurring_until` doesn't affect existing exceptions
- [ ] Changing recurring pattern doesn't break exceptions
- [ ] Deleting past instances works correctly
- [ ] Exception for invalid date is prevented (UI validation)

---

## Migration Notes

### Existing Data
- No migration needed for existing events
- Exceptions table starts empty
- Existing recurring events continue to work

### Rollback Plan
- If issues arise, can temporarily disable single-instance deletion
- Keep `deleteEvent()` working for full series deletion
- Exceptions table can be ignored if needed

---

## Future Enhancements

1. **Modified Instances:** Support `exception_type = 'modified'` for instances with different times/details
2. **Bulk Deletion:** "Delete all Fridays" or "Delete all instances in date range"
3. **Recurrence Changes:** "Change this Friday to Saturday" (modify single instance)
4. **Exception Management UI:** View/edit all exceptions for a recurring event
5. **Backend Filtering:** Move exception filtering to `get_events_in_range` RPC for better performance

---

## Security Considerations

1. **RLS Policies:** All database operations must respect RLS
2. **Permission Checks:** Verify user can delete before creating exception
3. **Input Validation:** Validate event IDs and dates
4. **SQL Injection:** Use parameterized queries (Supabase handles this)
5. **Rate Limiting:** Consider rate limits for exception creation

---

## Notes

- **Time Zone:** All dates stored as DATE (no time component) to avoid timezone issues
- **Local Time:** Frontend expansion uses local time, exceptions use local dates
- **Performance:** Exceptions are small (just dates), so caching is efficient
- **Scalability:** Exception table will grow, but indexes keep queries fast

