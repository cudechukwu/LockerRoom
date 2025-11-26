# Deployment Instructions: Pre-Compute Attendance List System

## Overview
This implementation pre-computes the list of expected attendees when events are created, eliminating the need to filter team members on every attendance list render. This dramatically improves performance.

## Steps to Deploy

### Step 1: Run Database Schema
Run this SQL file in Supabase SQL Editor:
```
database/create_event_expected_attendees.sql
```

This creates:
- `event_expected_attendees` table
- `populate_event_expected_attendees()` function
- Triggers to auto-populate on event creation/update
- Triggers to update when team members join or groups change
- RLS policies

### Step 2: Migrate Existing Events
Run this SQL file to populate expected attendees for all existing future events:
```
database/migrate_existing_events_expected_attendees.sql
```

This will populate the `event_expected_attendees` table for all events that haven't started yet.

### Step 3: Verify Installation
After running the SQL files, verify everything is working:

```sql
-- Check that the table exists
SELECT COUNT(*) FROM event_expected_attendees;

-- Check that triggers are created
SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'events'
AND trigger_name LIKE '%expected_attendees%';

-- Check a sample event's expected attendees
SELECT 
    e.title,
    e.start_time,
    COUNT(eea.user_id) as expected_count
FROM events e
LEFT JOIN event_expected_attendees eea ON e.id = eea.event_id
WHERE e.start_time > NOW()
GROUP BY e.id, e.title, e.start_time
LIMIT 5;
```

## What Changed

### Database
1. **New Table**: `event_expected_attendees` - stores pre-computed list
2. **New Function**: `populate_event_expected_attendees()` - populates the list
3. **Triggers**: Auto-populate on event creation/update and team/group changes

### Code Changes
1. **`src/api/events.js`**: Updated `createEvent()` to populate expected attendees
2. **`src/hooks/useTeamMembers.js`**: Now fetches from `event_expected_attendees` instead of filtering

## How It Works

### Event Creation
1. Event is created with `is_full_team_event` and `assigned_attendance_groups`
2. Trigger automatically calls `populate_event_expected_attendees()`
3. Function adds all team members (if full team) or group members (if specific groups)
4. List is stored in `event_expected_attendees` table

### Displaying Attendance List
1. `useTeamMembers` hook fetches `user_id`s from `event_expected_attendees`
2. Fetches full member details for those users
3. No filtering needed - list is already pre-computed!

### Dynamic Updates
- **New team member joins**: Automatically added to all future full-team events
- **Member added to group**: Automatically added to all future events that include that group
- **Event groups changed**: Expected attendees list is automatically updated

## Benefits

✅ **Performance**: No filtering on every render - list is ready instantly
✅ **Consistency**: List determined once at creation
✅ **Automatic**: Triggers handle updates when team/group membership changes
✅ **Fallback**: Code falls back to old filtering method if pre-computed list unavailable

## Testing

After deployment:
1. Create a new event (full team or specific groups)
2. Check `event_expected_attendees` table - should have entries
3. Open attendance list - should load instantly
4. Add a new team member - should appear in future full-team events
5. Add member to a group - should appear in future events with that group

## Rollback (if needed)

If you need to rollback:
1. The code has fallback logic - it will use old filtering method if pre-computed list fails
2. To fully rollback, drop the table and triggers:
```sql
DROP TRIGGER IF EXISTS trigger_auto_populate_expected_attendees ON events;
DROP TRIGGER IF EXISTS trigger_update_expected_attendees_on_change ON events;
DROP TRIGGER IF EXISTS trigger_add_member_to_full_team_events ON team_members;
DROP TRIGGER IF EXISTS trigger_add_group_member_to_events ON attendance_group_members;
DROP FUNCTION IF EXISTS populate_event_expected_attendees(UUID, UUID, BOOLEAN, UUID[]);
DROP TABLE IF EXISTS event_expected_attendees;
```

## How It Works

### Event Creation
1. Event is created with `is_full_team_event` and `assigned_attendance_groups`
2. Trigger automatically calls `populate_event_expected_attendees()`
3. Function adds all team members (if full team) or group members (if specific groups)
4. List is stored in `event_expected_attendees` table

### Displaying Attendance List
1. `useTeamMembers` hook fetches `user_id`s from `event_expected_attendees`
2. Fetches full member details for those users
3. No filtering needed - list is already pre-computed!

### Dynamic Updates
- **New team member joins**: Automatically added to all future full-team events
- **Member added to group**: Automatically added to all future events that include that group
- **Event groups changed**: Expected attendees list is automatically updated

## Benefits

✅ **Performance**: No filtering on every render - list is ready instantly
✅ **Consistency**: List determined once at creation
✅ **Automatic**: Triggers handle updates when team/group membership changes
✅ **Fallback**: Code falls back to old filtering method if pre-computed list unavailable

## Testing

After deployment:
1. Create a new event (full team or specific groups)
2. Check `event_expected_attendees` table - should have entries
3. Open attendance list - should load instantly
4. Add a new team member - should appear in future full-team events
5. Add member to a group - should appear in future events with that group

## Rollback (if needed)

If you need to rollback:
1. The code has fallback logic - it will use old filtering method if pre-computed list fails
2. To fully rollback, drop the table and triggers:
```sql
DROP TRIGGER IF EXISTS trigger_auto_populate_expected_attendees ON events;
DROP TRIGGER IF EXISTS trigger_update_expected_attendees_on_change ON events;
DROP TRIGGER IF EXISTS trigger_add_member_to_full_team_events ON team_members;
DROP TRIGGER IF EXISTS trigger_add_group_member_to_events ON attendance_group_members;
DROP FUNCTION IF EXISTS populate_event_expected_attendees(UUID, UUID, BOOLEAN, UUID[]);
DROP TABLE IF EXISTS event_expected_attendees;
```

## How It Works

### Event Creation
1. Event is created with `is_full_team_event` and `assigned_attendance_groups`
2. Trigger automatically calls `populate_event_expected_attendees()`
3. Function adds all team members (if full team) or group members (if specific groups)
4. List is stored in `event_expected_attendees` table

### Displaying Attendance List
1. `useTeamMembers` hook fetches `user_id`s from `event_expected_attendees`
2. Fetches full member details for those users
3. No filtering needed - list is already pre-computed!

### Dynamic Updates
- **New team member joins**: Automatically added to all future full-team events
- **Member added to group**: Automatically added to all future events that include that group
- **Event groups changed**: Expected attendees list is automatically updated

## Benefits

✅ **Performance**: No filtering on every render - list is ready instantly
✅ **Consistency**: List determined once at creation
✅ **Automatic**: Triggers handle updates when team/group membership changes
✅ **Fallback**: Code falls back to old filtering method if pre-computed list unavailable

## Testing

After deployment:
1. Create a new event (full team or specific groups)
2. Check `event_expected_attendees` table - should have entries
3. Open attendance list - should load instantly
4. Add a new team member - should appear in future full-team events
5. Add member to a group - should appear in future events with that group

## Rollback (if needed)

If you need to rollback:
1. The code has fallback logic - it will use old filtering method if pre-computed list fails
2. To fully rollback, drop the table and triggers:
```sql
DROP TRIGGER IF EXISTS trigger_auto_populate_expected_attendees ON events;
DROP TRIGGER IF EXISTS trigger_update_expected_attendees_on_change ON events;
DROP TRIGGER IF EXISTS trigger_add_member_to_full_team_events ON team_members;
DROP TRIGGER IF EXISTS trigger_add_group_member_to_events ON attendance_group_members;
DROP FUNCTION IF EXISTS populate_event_expected_attendees(UUID, UUID, BOOLEAN, UUID[]);
DROP TABLE IF EXISTS event_expected_attendees;
```
