# Plan: Pre-Compute Expected Attendees List

## Problem
Currently, every time the attendance list is displayed, we:
1. Fetch all team members
2. Check if event has assigned groups
3. Filter team members based on groups
4. This happens on every render/refresh

This is inefficient and causes unnecessary database queries.

## Solution
Pre-compute the list of expected attendees when the event is created, and store it in a dedicated table. This way:
- The list is ready immediately when viewing attendance
- No filtering needed at display time
- Can be updated when team membership or groups change

## Implementation Plan

### Step 1: Create `event_expected_attendees` Table

```sql
CREATE TABLE event_expected_attendees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- References auth.users
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    added_reason VARCHAR(50) DEFAULT 'event_creation', -- 'event_creation', 'group_assignment', 'manual_add', 'team_join'
    UNIQUE(event_id, user_id)
);

-- Index for fast lookups
CREATE INDEX idx_event_expected_attendees_event_id ON event_expected_attendees(event_id);
CREATE INDEX idx_event_expected_attendees_user_id ON event_expected_attendees(user_id);
CREATE INDEX idx_event_expected_attendees_team_id ON event_expected_attendees(team_id);

-- RLS Policies
ALTER TABLE event_expected_attendees ENABLE ROW LEVEL SECURITY;

-- Team members can view expected attendees for their team's events
CREATE POLICY "Team members view expected attendees" ON event_expected_attendees
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = event_expected_attendees.team_id
            AND tm.user_id = auth.uid()
        )
    );
```

### Step 2: Create Function to Populate Expected Attendees

```sql
CREATE OR REPLACE FUNCTION populate_event_expected_attendees(
    p_event_id UUID,
    p_team_id UUID,
    p_is_full_team_event BOOLEAN,
    p_assigned_group_ids UUID[] DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_inserted_count INTEGER := 0;
BEGIN
    -- Delete existing expected attendees for this event
    DELETE FROM event_expected_attendees WHERE event_id = p_event_id;
    
    IF p_is_full_team_event THEN
        -- Add all team members
        INSERT INTO event_expected_attendees (event_id, user_id, team_id, added_reason)
        SELECT 
            p_event_id,
            tm.user_id,
            p_team_id,
            'event_creation'
        FROM team_members tm
        WHERE tm.team_id = p_team_id
        AND tm.role = 'player' -- Only players, not coaches
        ON CONFLICT (event_id, user_id) DO NOTHING;
        
        GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
    ELSIF p_assigned_group_ids IS NOT NULL AND array_length(p_assigned_group_ids, 1) > 0 THEN
        -- Add only members of assigned groups
        INSERT INTO event_expected_attendees (event_id, user_id, team_id, added_reason)
        SELECT DISTINCT
            p_event_id,
            agm.user_id,
            p_team_id,
            'event_creation'
        FROM attendance_group_members agm
        WHERE agm.group_id = ANY(p_assigned_group_ids)
        AND EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.user_id = agm.user_id
            AND tm.team_id = p_team_id
            AND tm.role = 'player'
        )
        ON CONFLICT (event_id, user_id) DO NOTHING;
        
        GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
    END IF;
    
    RETURN v_inserted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Step 3: Update Event Creation

**In `src/api/events.js` - `createEvent` function:**

After creating the event, call the function to populate expected attendees:

```javascript
export async function createEvent(supabaseClient, eventData) {
  // ... existing event creation code ...
  
  if (data) {
    // Populate expected attendees
    const { error: attendeesError } = await supabase.rpc('populate_event_expected_attendees', {
      p_event_id: data.id,
      p_team_id: eventData.team_id,
      p_is_full_team_event: eventData.is_full_team_event || false,
      p_assigned_group_ids: eventData.assigned_attendance_groups || null
    });
    
    if (attendeesError) {
      console.error('Error populating expected attendees:', attendeesError);
      // Don't fail event creation, just log the error
    }
  }
  
  return { data, error };
}
```

### Step 4: Update `useTeamMembers` Hook

**In `src/hooks/useTeamMembers.js`:**

Instead of filtering team members, fetch from `event_expected_attendees`:

```javascript
export function useTeamMembers(teamId, event = null) {
  // ... existing code ...
  
  const queryFn = useCallback(async () => {
    if (!event?.id) {
      // No event - return all team members (fallback)
      return await getTeamMembers(supabase, teamId);
    }
    
    // Fetch expected attendees from pre-computed list
    const { data: expectedAttendees, error: attendeesError } = await supabase
      .from('event_expected_attendees')
      .select('user_id')
      .eq('event_id', event.id);
    
    if (attendeesError) {
      console.error('Error fetching expected attendees:', attendeesError);
      // Fallback to old method
      return await getTeamMembersForEvent(supabase, teamId, event);
    }
    
    if (!expectedAttendees || expectedAttendees.length === 0) {
      // No expected attendees - return empty array or fallback
      return [];
    }
    
    const userIds = expectedAttendees.map(ea => ea.user_id);
    
    // Fetch full member details for these users
    const { data: members, error: membersError } = await supabase
      .from('team_members')
      .select(`
        *,
        user:users!team_members_user_id_fkey (
          id,
          full_name,
          handle,
          avatar_url
        )
      `)
      .eq('team_id', teamId)
      .in('user_id', userIds)
      .eq('role', 'player');
    
    if (membersError) throw membersError;
    
    return processTeamMembers(members);
  }, [supabase, teamId, event]);
  
  // ... rest of hook ...
}
```

### Step 5: Handle Dynamic Updates

When team membership or group assignments change, update expected attendees:

**Option A: Trigger-based (Automatic)**
```sql
-- Trigger when team member joins
CREATE OR REPLACE FUNCTION update_event_expected_attendees_on_team_join()
RETURNS TRIGGER AS $$
BEGIN
    -- Add to all full-team events for this team
    INSERT INTO event_expected_attendees (event_id, user_id, team_id, added_reason)
    SELECT id, NEW.user_id, NEW.team_id, 'team_join'
    FROM events
    WHERE team_id = NEW.team_id
    AND is_full_team_event = TRUE
    AND start_time > NOW() -- Only future events
    ON CONFLICT (event_id, user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_team_member_join
    AFTER INSERT ON team_members
    FOR EACH ROW
    WHEN (NEW.role = 'player')
    EXECUTE FUNCTION update_event_expected_attendees_on_team_join();
```

**Option B: Manual Update (On-Demand)**
When groups are updated or team members join/leave, manually call:
```javascript
await supabase.rpc('populate_event_expected_attendees', {
  p_event_id: eventId,
  p_team_id: teamId,
  p_is_full_team_event: event.is_full_team_event,
  p_assigned_group_ids: event.assigned_attendance_groups
});
```

### Step 6: Migration for Existing Events

```sql
-- Populate expected attendees for all existing events
DO $$
DECLARE
    event_record RECORD;
BEGIN
    FOR event_record IN 
        SELECT id, team_id, is_full_team_event, assigned_attendance_groups
        FROM events
        WHERE start_time > NOW() -- Only future events
    LOOP
        PERFORM populate_event_expected_attendees(
            event_record.id,
            event_record.team_id,
            COALESCE(event_record.is_full_team_event, TRUE),
            event_record.assigned_attendance_groups
        );
    END LOOP;
END $$;
```

## Benefits

1. **Performance**: No filtering needed at display time
2. **Consistency**: List is determined once at creation
3. **Flexibility**: Can manually add/remove expected attendees
4. **Audit Trail**: `added_reason` tracks why someone is expected
5. **Future Events**: Can pre-populate for recurring events

## Considerations

- Need to handle updates when:
  - Event groups are changed
  - Team members join/leave
  - Group memberships change
- Consider cleanup for past events (optional)
- May want to add `removed_at` and `removed_reason` for audit trail


## Problem
Currently, every time the attendance list is displayed, we:
1. Fetch all team members
2. Check if event has assigned groups
3. Filter team members based on groups
4. This happens on every render/refresh

This is inefficient and causes unnecessary database queries.

## Solution
Pre-compute the list of expected attendees when the event is created, and store it in a dedicated table. This way:
- The list is ready immediately when viewing attendance
- No filtering needed at display time
- Can be updated when team membership or groups change

## Implementation Plan

### Step 1: Create `event_expected_attendees` Table

```sql
CREATE TABLE event_expected_attendees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- References auth.users
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    added_reason VARCHAR(50) DEFAULT 'event_creation', -- 'event_creation', 'group_assignment', 'manual_add', 'team_join'
    UNIQUE(event_id, user_id)
);

-- Index for fast lookups
CREATE INDEX idx_event_expected_attendees_event_id ON event_expected_attendees(event_id);
CREATE INDEX idx_event_expected_attendees_user_id ON event_expected_attendees(user_id);
CREATE INDEX idx_event_expected_attendees_team_id ON event_expected_attendees(team_id);

-- RLS Policies
ALTER TABLE event_expected_attendees ENABLE ROW LEVEL SECURITY;

-- Team members can view expected attendees for their team's events
CREATE POLICY "Team members view expected attendees" ON event_expected_attendees
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = event_expected_attendees.team_id
            AND tm.user_id = auth.uid()
        )
    );
```

### Step 2: Create Function to Populate Expected Attendees

```sql
CREATE OR REPLACE FUNCTION populate_event_expected_attendees(
    p_event_id UUID,
    p_team_id UUID,
    p_is_full_team_event BOOLEAN,
    p_assigned_group_ids UUID[] DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_inserted_count INTEGER := 0;
BEGIN
    -- Delete existing expected attendees for this event
    DELETE FROM event_expected_attendees WHERE event_id = p_event_id;
    
    IF p_is_full_team_event THEN
        -- Add all team members
        INSERT INTO event_expected_attendees (event_id, user_id, team_id, added_reason)
        SELECT 
            p_event_id,
            tm.user_id,
            p_team_id,
            'event_creation'
        FROM team_members tm
        WHERE tm.team_id = p_team_id
        AND tm.role = 'player' -- Only players, not coaches
        ON CONFLICT (event_id, user_id) DO NOTHING;
        
        GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
    ELSIF p_assigned_group_ids IS NOT NULL AND array_length(p_assigned_group_ids, 1) > 0 THEN
        -- Add only members of assigned groups
        INSERT INTO event_expected_attendees (event_id, user_id, team_id, added_reason)
        SELECT DISTINCT
            p_event_id,
            agm.user_id,
            p_team_id,
            'event_creation'
        FROM attendance_group_members agm
        WHERE agm.group_id = ANY(p_assigned_group_ids)
        AND EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.user_id = agm.user_id
            AND tm.team_id = p_team_id
            AND tm.role = 'player'
        )
        ON CONFLICT (event_id, user_id) DO NOTHING;
        
        GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
    END IF;
    
    RETURN v_inserted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Step 3: Update Event Creation

**In `src/api/events.js` - `createEvent` function:**

After creating the event, call the function to populate expected attendees:

```javascript
export async function createEvent(supabaseClient, eventData) {
  // ... existing event creation code ...
  
  if (data) {
    // Populate expected attendees
    const { error: attendeesError } = await supabase.rpc('populate_event_expected_attendees', {
      p_event_id: data.id,
      p_team_id: eventData.team_id,
      p_is_full_team_event: eventData.is_full_team_event || false,
      p_assigned_group_ids: eventData.assigned_attendance_groups || null
    });
    
    if (attendeesError) {
      console.error('Error populating expected attendees:', attendeesError);
      // Don't fail event creation, just log the error
    }
  }
  
  return { data, error };
}
```

### Step 4: Update `useTeamMembers` Hook

**In `src/hooks/useTeamMembers.js`:**

Instead of filtering team members, fetch from `event_expected_attendees`:

```javascript
export function useTeamMembers(teamId, event = null) {
  // ... existing code ...
  
  const queryFn = useCallback(async () => {
    if (!event?.id) {
      // No event - return all team members (fallback)
      return await getTeamMembers(supabase, teamId);
    }
    
    // Fetch expected attendees from pre-computed list
    const { data: expectedAttendees, error: attendeesError } = await supabase
      .from('event_expected_attendees')
      .select('user_id')
      .eq('event_id', event.id);
    
    if (attendeesError) {
      console.error('Error fetching expected attendees:', attendeesError);
      // Fallback to old method
      return await getTeamMembersForEvent(supabase, teamId, event);
    }
    
    if (!expectedAttendees || expectedAttendees.length === 0) {
      // No expected attendees - return empty array or fallback
      return [];
    }
    
    const userIds = expectedAttendees.map(ea => ea.user_id);
    
    // Fetch full member details for these users
    const { data: members, error: membersError } = await supabase
      .from('team_members')
      .select(`
        *,
        user:users!team_members_user_id_fkey (
          id,
          full_name,
          handle,
          avatar_url
        )
      `)
      .eq('team_id', teamId)
      .in('user_id', userIds)
      .eq('role', 'player');
    
    if (membersError) throw membersError;
    
    return processTeamMembers(members);
  }, [supabase, teamId, event]);
  
  // ... rest of hook ...
}
```

### Step 5: Handle Dynamic Updates

When team membership or group assignments change, update expected attendees:

**Option A: Trigger-based (Automatic)**
```sql
-- Trigger when team member joins
CREATE OR REPLACE FUNCTION update_event_expected_attendees_on_team_join()
RETURNS TRIGGER AS $$
BEGIN
    -- Add to all full-team events for this team
    INSERT INTO event_expected_attendees (event_id, user_id, team_id, added_reason)
    SELECT id, NEW.user_id, NEW.team_id, 'team_join'
    FROM events
    WHERE team_id = NEW.team_id
    AND is_full_team_event = TRUE
    AND start_time > NOW() -- Only future events
    ON CONFLICT (event_id, user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_team_member_join
    AFTER INSERT ON team_members
    FOR EACH ROW
    WHEN (NEW.role = 'player')
    EXECUTE FUNCTION update_event_expected_attendees_on_team_join();
```

**Option B: Manual Update (On-Demand)**
When groups are updated or team members join/leave, manually call:
```javascript
await supabase.rpc('populate_event_expected_attendees', {
  p_event_id: eventId,
  p_team_id: teamId,
  p_is_full_team_event: event.is_full_team_event,
  p_assigned_group_ids: event.assigned_attendance_groups
});
```

### Step 6: Migration for Existing Events

```sql
-- Populate expected attendees for all existing events
DO $$
DECLARE
    event_record RECORD;
BEGIN
    FOR event_record IN 
        SELECT id, team_id, is_full_team_event, assigned_attendance_groups
        FROM events
        WHERE start_time > NOW() -- Only future events
    LOOP
        PERFORM populate_event_expected_attendees(
            event_record.id,
            event_record.team_id,
            COALESCE(event_record.is_full_team_event, TRUE),
            event_record.assigned_attendance_groups
        );
    END LOOP;
END $$;
```

## Benefits

1. **Performance**: No filtering needed at display time
2. **Consistency**: List is determined once at creation
3. **Flexibility**: Can manually add/remove expected attendees
4. **Audit Trail**: `added_reason` tracks why someone is expected
5. **Future Events**: Can pre-populate for recurring events

## Considerations

- Need to handle updates when:
  - Event groups are changed
  - Team members join/leave
  - Group memberships change
- Consider cleanup for past events (optional)
- May want to add `removed_at` and `removed_reason` for audit trail


## Problem
Currently, every time the attendance list is displayed, we:
1. Fetch all team members
2. Check if event has assigned groups
3. Filter team members based on groups
4. This happens on every render/refresh

This is inefficient and causes unnecessary database queries.

## Solution
Pre-compute the list of expected attendees when the event is created, and store it in a dedicated table. This way:
- The list is ready immediately when viewing attendance
- No filtering needed at display time
- Can be updated when team membership or groups change

## Implementation Plan

### Step 1: Create `event_expected_attendees` Table

```sql
CREATE TABLE event_expected_attendees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- References auth.users
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    added_reason VARCHAR(50) DEFAULT 'event_creation', -- 'event_creation', 'group_assignment', 'manual_add', 'team_join'
    UNIQUE(event_id, user_id)
);

-- Index for fast lookups
CREATE INDEX idx_event_expected_attendees_event_id ON event_expected_attendees(event_id);
CREATE INDEX idx_event_expected_attendees_user_id ON event_expected_attendees(user_id);
CREATE INDEX idx_event_expected_attendees_team_id ON event_expected_attendees(team_id);

-- RLS Policies
ALTER TABLE event_expected_attendees ENABLE ROW LEVEL SECURITY;

-- Team members can view expected attendees for their team's events
CREATE POLICY "Team members view expected attendees" ON event_expected_attendees
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = event_expected_attendees.team_id
            AND tm.user_id = auth.uid()
        )
    );
```

### Step 2: Create Function to Populate Expected Attendees

```sql
CREATE OR REPLACE FUNCTION populate_event_expected_attendees(
    p_event_id UUID,
    p_team_id UUID,
    p_is_full_team_event BOOLEAN,
    p_assigned_group_ids UUID[] DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_inserted_count INTEGER := 0;
BEGIN
    -- Delete existing expected attendees for this event
    DELETE FROM event_expected_attendees WHERE event_id = p_event_id;
    
    IF p_is_full_team_event THEN
        -- Add all team members
        INSERT INTO event_expected_attendees (event_id, user_id, team_id, added_reason)
        SELECT 
            p_event_id,
            tm.user_id,
            p_team_id,
            'event_creation'
        FROM team_members tm
        WHERE tm.team_id = p_team_id
        AND tm.role = 'player' -- Only players, not coaches
        ON CONFLICT (event_id, user_id) DO NOTHING;
        
        GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
    ELSIF p_assigned_group_ids IS NOT NULL AND array_length(p_assigned_group_ids, 1) > 0 THEN
        -- Add only members of assigned groups
        INSERT INTO event_expected_attendees (event_id, user_id, team_id, added_reason)
        SELECT DISTINCT
            p_event_id,
            agm.user_id,
            p_team_id,
            'event_creation'
        FROM attendance_group_members agm
        WHERE agm.group_id = ANY(p_assigned_group_ids)
        AND EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.user_id = agm.user_id
            AND tm.team_id = p_team_id
            AND tm.role = 'player'
        )
        ON CONFLICT (event_id, user_id) DO NOTHING;
        
        GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
    END IF;
    
    RETURN v_inserted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Step 3: Update Event Creation

**In `src/api/events.js` - `createEvent` function:**

After creating the event, call the function to populate expected attendees:

```javascript
export async function createEvent(supabaseClient, eventData) {
  // ... existing event creation code ...
  
  if (data) {
    // Populate expected attendees
    const { error: attendeesError } = await supabase.rpc('populate_event_expected_attendees', {
      p_event_id: data.id,
      p_team_id: eventData.team_id,
      p_is_full_team_event: eventData.is_full_team_event || false,
      p_assigned_group_ids: eventData.assigned_attendance_groups || null
    });
    
    if (attendeesError) {
      console.error('Error populating expected attendees:', attendeesError);
      // Don't fail event creation, just log the error
    }
  }
  
  return { data, error };
}
```

### Step 4: Update `useTeamMembers` Hook

**In `src/hooks/useTeamMembers.js`:**

Instead of filtering team members, fetch from `event_expected_attendees`:

```javascript
export function useTeamMembers(teamId, event = null) {
  // ... existing code ...
  
  const queryFn = useCallback(async () => {
    if (!event?.id) {
      // No event - return all team members (fallback)
      return await getTeamMembers(supabase, teamId);
    }
    
    // Fetch expected attendees from pre-computed list
    const { data: expectedAttendees, error: attendeesError } = await supabase
      .from('event_expected_attendees')
      .select('user_id')
      .eq('event_id', event.id);
    
    if (attendeesError) {
      console.error('Error fetching expected attendees:', attendeesError);
      // Fallback to old method
      return await getTeamMembersForEvent(supabase, teamId, event);
    }
    
    if (!expectedAttendees || expectedAttendees.length === 0) {
      // No expected attendees - return empty array or fallback
      return [];
    }
    
    const userIds = expectedAttendees.map(ea => ea.user_id);
    
    // Fetch full member details for these users
    const { data: members, error: membersError } = await supabase
      .from('team_members')
      .select(`
        *,
        user:users!team_members_user_id_fkey (
          id,
          full_name,
          handle,
          avatar_url
        )
      `)
      .eq('team_id', teamId)
      .in('user_id', userIds)
      .eq('role', 'player');
    
    if (membersError) throw membersError;
    
    return processTeamMembers(members);
  }, [supabase, teamId, event]);
  
  // ... rest of hook ...
}
```

### Step 5: Handle Dynamic Updates

When team membership or group assignments change, update expected attendees:

**Option A: Trigger-based (Automatic)**
```sql
-- Trigger when team member joins
CREATE OR REPLACE FUNCTION update_event_expected_attendees_on_team_join()
RETURNS TRIGGER AS $$
BEGIN
    -- Add to all full-team events for this team
    INSERT INTO event_expected_attendees (event_id, user_id, team_id, added_reason)
    SELECT id, NEW.user_id, NEW.team_id, 'team_join'
    FROM events
    WHERE team_id = NEW.team_id
    AND is_full_team_event = TRUE
    AND start_time > NOW() -- Only future events
    ON CONFLICT (event_id, user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_team_member_join
    AFTER INSERT ON team_members
    FOR EACH ROW
    WHEN (NEW.role = 'player')
    EXECUTE FUNCTION update_event_expected_attendees_on_team_join();
```

**Option B: Manual Update (On-Demand)**
When groups are updated or team members join/leave, manually call:
```javascript
await supabase.rpc('populate_event_expected_attendees', {
  p_event_id: eventId,
  p_team_id: teamId,
  p_is_full_team_event: event.is_full_team_event,
  p_assigned_group_ids: event.assigned_attendance_groups
});
```

### Step 6: Migration for Existing Events

```sql
-- Populate expected attendees for all existing events
DO $$
DECLARE
    event_record RECORD;
BEGIN
    FOR event_record IN 
        SELECT id, team_id, is_full_team_event, assigned_attendance_groups
        FROM events
        WHERE start_time > NOW() -- Only future events
    LOOP
        PERFORM populate_event_expected_attendees(
            event_record.id,
            event_record.team_id,
            COALESCE(event_record.is_full_team_event, TRUE),
            event_record.assigned_attendance_groups
        );
    END LOOP;
END $$;
```

## Benefits

1. **Performance**: No filtering needed at display time
2. **Consistency**: List is determined once at creation
3. **Flexibility**: Can manually add/remove expected attendees
4. **Audit Trail**: `added_reason` tracks why someone is expected
5. **Future Events**: Can pre-populate for recurring events

## Considerations

- Need to handle updates when:
  - Event groups are changed
  - Team members join/leave
  - Group memberships change
- Consider cleanup for past events (optional)
- May want to add `removed_at` and `removed_reason` for audit trail




