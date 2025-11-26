-- Create event_expected_attendees table to pre-compute expected attendees
-- This eliminates the need to filter team members on every attendance list render

-- =============================================
-- TABLE: event_expected_attendees
-- =============================================

CREATE TABLE IF NOT EXISTS event_expected_attendees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- References auth.users
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    added_reason VARCHAR(50) DEFAULT 'event_creation' CHECK (added_reason IN (
        'event_creation',
        'group_assignment',
        'manual_add',
        'team_join',
        'group_member_added'
    )),
    UNIQUE(event_id, user_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_event_expected_attendees_event_id ON event_expected_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_expected_attendees_user_id ON event_expected_attendees(user_id);
CREATE INDEX IF NOT EXISTS idx_event_expected_attendees_team_id ON event_expected_attendees(team_id);

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE event_expected_attendees ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Team members view expected attendees" ON event_expected_attendees;
DROP POLICY IF EXISTS "Coaches manage expected attendees" ON event_expected_attendees;

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

-- Coaches can manage expected attendees
CREATE POLICY "Coaches manage expected attendees" ON event_expected_attendees
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM team_member_roles tmr
            WHERE tmr.team_id = event_expected_attendees.team_id
            AND tmr.user_id = auth.uid()
            AND tmr.role IN ('head_coach', 'assistant_coach', 'team_admin')
        )
        OR EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = event_expected_attendees.team_id
            AND tm.user_id = auth.uid()
            AND (tm.role = 'coach' OR tm.is_admin = TRUE)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM team_member_roles tmr
            WHERE tmr.team_id = event_expected_attendees.team_id
            AND tmr.user_id = auth.uid()
            AND tmr.role IN ('head_coach', 'assistant_coach', 'team_admin')
        )
        OR EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = event_expected_attendees.team_id
            AND tm.user_id = auth.uid()
            AND (tm.role = 'coach' OR tm.is_admin = TRUE)
        )
    );

-- =============================================
-- FUNCTION: populate_event_expected_attendees
-- =============================================

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
    SET search_path = public;
    
    -- Delete existing expected attendees for this event
    DELETE FROM event_expected_attendees WHERE event_id = p_event_id;
    
    IF p_is_full_team_event THEN
        -- Add all team members (players only, not coaches)
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
        AND agm.team_id = p_team_id
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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION populate_event_expected_attendees(UUID, UUID, BOOLEAN, UUID[]) TO authenticated;

-- =============================================
-- TRIGGER: Auto-populate on event creation
-- =============================================

CREATE OR REPLACE FUNCTION auto_populate_event_expected_attendees()
RETURNS TRIGGER AS $$
BEGIN
    -- Only populate for future events
    IF NEW.start_time > NOW() THEN
        PERFORM populate_event_expected_attendees(
            NEW.id,
            NEW.team_id,
            COALESCE(NEW.is_full_team_event, TRUE),
            CASE 
                WHEN NEW.assigned_attendance_groups IS NULL OR jsonb_array_length(NEW.assigned_attendance_groups) = 0 
                THEN NULL
                ELSE ARRAY(SELECT jsonb_array_elements_text(NEW.assigned_attendance_groups)::UUID)
            END
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_auto_populate_expected_attendees ON events;
CREATE TRIGGER trigger_auto_populate_expected_attendees
    AFTER INSERT ON events
    FOR EACH ROW
    EXECUTE FUNCTION auto_populate_event_expected_attendees();

-- =============================================
-- TRIGGER: Update when event groups change
-- =============================================

CREATE OR REPLACE FUNCTION update_event_expected_attendees_on_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update for future events
    IF NEW.start_time > NOW() THEN
        -- Check if groups or full_team flag changed
        IF (OLD.is_full_team_event IS DISTINCT FROM NEW.is_full_team_event)
           OR (OLD.assigned_attendance_groups IS DISTINCT FROM NEW.assigned_attendance_groups) THEN
            PERFORM populate_event_expected_attendees(
                NEW.id,
                NEW.team_id,
                COALESCE(NEW.is_full_team_event, TRUE),
                CASE 
                    WHEN NEW.assigned_attendance_groups IS NULL OR jsonb_array_length(NEW.assigned_attendance_groups) = 0 
                    THEN NULL
                    ELSE ARRAY(SELECT jsonb_array_elements_text(NEW.assigned_attendance_groups)::UUID)
                END
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_expected_attendees_on_change ON events;
CREATE TRIGGER trigger_update_expected_attendees_on_change
    AFTER UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_event_expected_attendees_on_change();

-- =============================================
-- TRIGGER: Add new team members to full-team events
-- =============================================

CREATE OR REPLACE FUNCTION add_new_member_to_full_team_events()
RETURNS TRIGGER AS $$
BEGIN
    -- Only add to future full-team events
    IF NEW.role = 'player' THEN
        INSERT INTO event_expected_attendees (event_id, user_id, team_id, added_reason)
        SELECT 
            e.id,
            NEW.user_id,
            NEW.team_id,
            'team_join'
        FROM events e
        WHERE e.team_id = NEW.team_id
        AND COALESCE(e.is_full_team_event, TRUE) = TRUE
        AND e.start_time > NOW() -- Only future events
        ON CONFLICT (event_id, user_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_add_member_to_full_team_events ON team_members;
CREATE TRIGGER trigger_add_member_to_full_team_events
    AFTER INSERT ON team_members
    FOR EACH ROW
    EXECUTE FUNCTION add_new_member_to_full_team_events();

-- =============================================
-- TRIGGER: Add group members to events when added to group
-- =============================================

CREATE OR REPLACE FUNCTION add_group_member_to_events()
RETURNS TRIGGER AS $$
BEGIN
    -- Add to all future events that include this group
    INSERT INTO event_expected_attendees (event_id, user_id, team_id, added_reason)
    SELECT 
        e.id,
        NEW.user_id,
        NEW.team_id,
        'group_member_added'
    FROM events e
    WHERE e.team_id = NEW.team_id
    AND COALESCE(e.is_full_team_event, FALSE) = FALSE
    AND e.assigned_attendance_groups IS NOT NULL
    AND jsonb_array_length(e.assigned_attendance_groups) > 0
    AND NEW.group_id::text = ANY(
        SELECT jsonb_array_elements_text(e.assigned_attendance_groups)
    )
    AND e.start_time > NOW() -- Only future events
    ON CONFLICT (event_id, user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_add_group_member_to_events ON attendance_group_members;
CREATE TRIGGER trigger_add_group_member_to_events
    AFTER INSERT ON attendance_group_members
    FOR EACH ROW
    EXECUTE FUNCTION add_group_member_to_events();

-- This eliminates the need to filter team members on every attendance list render

-- =============================================
-- TABLE: event_expected_attendees
-- =============================================

CREATE TABLE IF NOT EXISTS event_expected_attendees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- References auth.users
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    added_reason VARCHAR(50) DEFAULT 'event_creation' CHECK (added_reason IN (
        'event_creation',
        'group_assignment',
        'manual_add',
        'team_join',
        'group_member_added'
    )),
    UNIQUE(event_id, user_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_event_expected_attendees_event_id ON event_expected_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_expected_attendees_user_id ON event_expected_attendees(user_id);
CREATE INDEX IF NOT EXISTS idx_event_expected_attendees_team_id ON event_expected_attendees(team_id);

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE event_expected_attendees ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Team members view expected attendees" ON event_expected_attendees;
DROP POLICY IF EXISTS "Coaches manage expected attendees" ON event_expected_attendees;

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

-- Coaches can manage expected attendees
CREATE POLICY "Coaches manage expected attendees" ON event_expected_attendees
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM team_member_roles tmr
            WHERE tmr.team_id = event_expected_attendees.team_id
            AND tmr.user_id = auth.uid()
            AND tmr.role IN ('head_coach', 'assistant_coach', 'team_admin')
        )
        OR EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = event_expected_attendees.team_id
            AND tm.user_id = auth.uid()
            AND (tm.role = 'coach' OR tm.is_admin = TRUE)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM team_member_roles tmr
            WHERE tmr.team_id = event_expected_attendees.team_id
            AND tmr.user_id = auth.uid()
            AND tmr.role IN ('head_coach', 'assistant_coach', 'team_admin')
        )
        OR EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = event_expected_attendees.team_id
            AND tm.user_id = auth.uid()
            AND (tm.role = 'coach' OR tm.is_admin = TRUE)
        )
    );

-- =============================================
-- FUNCTION: populate_event_expected_attendees
-- =============================================

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
    SET search_path = public;
    
    -- Delete existing expected attendees for this event
    DELETE FROM event_expected_attendees WHERE event_id = p_event_id;
    
    IF p_is_full_team_event THEN
        -- Add all team members (players only, not coaches)
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
        AND agm.team_id = p_team_id
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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION populate_event_expected_attendees(UUID, UUID, BOOLEAN, UUID[]) TO authenticated;

-- =============================================
-- TRIGGER: Auto-populate on event creation
-- =============================================

CREATE OR REPLACE FUNCTION auto_populate_event_expected_attendees()
RETURNS TRIGGER AS $$
BEGIN
    -- Only populate for future events
    IF NEW.start_time > NOW() THEN
        PERFORM populate_event_expected_attendees(
            NEW.id,
            NEW.team_id,
            COALESCE(NEW.is_full_team_event, TRUE),
            CASE 
                WHEN NEW.assigned_attendance_groups IS NULL OR jsonb_array_length(NEW.assigned_attendance_groups) = 0 
                THEN NULL
                ELSE ARRAY(SELECT jsonb_array_elements_text(NEW.assigned_attendance_groups)::UUID)
            END
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_auto_populate_expected_attendees ON events;
CREATE TRIGGER trigger_auto_populate_expected_attendees
    AFTER INSERT ON events
    FOR EACH ROW
    EXECUTE FUNCTION auto_populate_event_expected_attendees();

-- =============================================
-- TRIGGER: Update when event groups change
-- =============================================

CREATE OR REPLACE FUNCTION update_event_expected_attendees_on_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update for future events
    IF NEW.start_time > NOW() THEN
        -- Check if groups or full_team flag changed
        IF (OLD.is_full_team_event IS DISTINCT FROM NEW.is_full_team_event)
           OR (OLD.assigned_attendance_groups IS DISTINCT FROM NEW.assigned_attendance_groups) THEN
            PERFORM populate_event_expected_attendees(
                NEW.id,
                NEW.team_id,
                COALESCE(NEW.is_full_team_event, TRUE),
                CASE 
                    WHEN NEW.assigned_attendance_groups IS NULL OR jsonb_array_length(NEW.assigned_attendance_groups) = 0 
                    THEN NULL
                    ELSE ARRAY(SELECT jsonb_array_elements_text(NEW.assigned_attendance_groups)::UUID)
                END
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_expected_attendees_on_change ON events;
CREATE TRIGGER trigger_update_expected_attendees_on_change
    AFTER UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_event_expected_attendees_on_change();

-- =============================================
-- TRIGGER: Add new team members to full-team events
-- =============================================

CREATE OR REPLACE FUNCTION add_new_member_to_full_team_events()
RETURNS TRIGGER AS $$
BEGIN
    -- Only add to future full-team events
    IF NEW.role = 'player' THEN
        INSERT INTO event_expected_attendees (event_id, user_id, team_id, added_reason)
        SELECT 
            e.id,
            NEW.user_id,
            NEW.team_id,
            'team_join'
        FROM events e
        WHERE e.team_id = NEW.team_id
        AND COALESCE(e.is_full_team_event, TRUE) = TRUE
        AND e.start_time > NOW() -- Only future events
        ON CONFLICT (event_id, user_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_add_member_to_full_team_events ON team_members;
CREATE TRIGGER trigger_add_member_to_full_team_events
    AFTER INSERT ON team_members
    FOR EACH ROW
    EXECUTE FUNCTION add_new_member_to_full_team_events();

-- =============================================
-- TRIGGER: Add group members to events when added to group
-- =============================================

CREATE OR REPLACE FUNCTION add_group_member_to_events()
RETURNS TRIGGER AS $$
BEGIN
    -- Add to all future events that include this group
    INSERT INTO event_expected_attendees (event_id, user_id, team_id, added_reason)
    SELECT 
        e.id,
        NEW.user_id,
        NEW.team_id,
        'group_member_added'
    FROM events e
    WHERE e.team_id = NEW.team_id
    AND COALESCE(e.is_full_team_event, FALSE) = FALSE
    AND e.assigned_attendance_groups IS NOT NULL
    AND jsonb_array_length(e.assigned_attendance_groups) > 0
    AND NEW.group_id::text = ANY(
        SELECT jsonb_array_elements_text(e.assigned_attendance_groups)
    )
    AND e.start_time > NOW() -- Only future events
    ON CONFLICT (event_id, user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_add_group_member_to_events ON attendance_group_members;
CREATE TRIGGER trigger_add_group_member_to_events
    AFTER INSERT ON attendance_group_members
    FOR EACH ROW
    EXECUTE FUNCTION add_group_member_to_events();

-- This eliminates the need to filter team members on every attendance list render

-- =============================================
-- TABLE: event_expected_attendees
-- =============================================

CREATE TABLE IF NOT EXISTS event_expected_attendees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- References auth.users
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    added_reason VARCHAR(50) DEFAULT 'event_creation' CHECK (added_reason IN (
        'event_creation',
        'group_assignment',
        'manual_add',
        'team_join',
        'group_member_added'
    )),
    UNIQUE(event_id, user_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_event_expected_attendees_event_id ON event_expected_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_expected_attendees_user_id ON event_expected_attendees(user_id);
CREATE INDEX IF NOT EXISTS idx_event_expected_attendees_team_id ON event_expected_attendees(team_id);

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE event_expected_attendees ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Team members view expected attendees" ON event_expected_attendees;
DROP POLICY IF EXISTS "Coaches manage expected attendees" ON event_expected_attendees;

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

-- Coaches can manage expected attendees
CREATE POLICY "Coaches manage expected attendees" ON event_expected_attendees
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM team_member_roles tmr
            WHERE tmr.team_id = event_expected_attendees.team_id
            AND tmr.user_id = auth.uid()
            AND tmr.role IN ('head_coach', 'assistant_coach', 'team_admin')
        )
        OR EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = event_expected_attendees.team_id
            AND tm.user_id = auth.uid()
            AND (tm.role = 'coach' OR tm.is_admin = TRUE)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM team_member_roles tmr
            WHERE tmr.team_id = event_expected_attendees.team_id
            AND tmr.user_id = auth.uid()
            AND tmr.role IN ('head_coach', 'assistant_coach', 'team_admin')
        )
        OR EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = event_expected_attendees.team_id
            AND tm.user_id = auth.uid()
            AND (tm.role = 'coach' OR tm.is_admin = TRUE)
        )
    );

-- =============================================
-- FUNCTION: populate_event_expected_attendees
-- =============================================

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
    SET search_path = public;
    
    -- Delete existing expected attendees for this event
    DELETE FROM event_expected_attendees WHERE event_id = p_event_id;
    
    IF p_is_full_team_event THEN
        -- Add all team members (players only, not coaches)
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
        AND agm.team_id = p_team_id
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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION populate_event_expected_attendees(UUID, UUID, BOOLEAN, UUID[]) TO authenticated;

-- =============================================
-- TRIGGER: Auto-populate on event creation
-- =============================================

CREATE OR REPLACE FUNCTION auto_populate_event_expected_attendees()
RETURNS TRIGGER AS $$
BEGIN
    -- Only populate for future events
    IF NEW.start_time > NOW() THEN
        PERFORM populate_event_expected_attendees(
            NEW.id,
            NEW.team_id,
            COALESCE(NEW.is_full_team_event, TRUE),
            CASE 
                WHEN NEW.assigned_attendance_groups IS NULL OR jsonb_array_length(NEW.assigned_attendance_groups) = 0 
                THEN NULL
                ELSE ARRAY(SELECT jsonb_array_elements_text(NEW.assigned_attendance_groups)::UUID)
            END
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_auto_populate_expected_attendees ON events;
CREATE TRIGGER trigger_auto_populate_expected_attendees
    AFTER INSERT ON events
    FOR EACH ROW
    EXECUTE FUNCTION auto_populate_event_expected_attendees();

-- =============================================
-- TRIGGER: Update when event groups change
-- =============================================

CREATE OR REPLACE FUNCTION update_event_expected_attendees_on_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update for future events
    IF NEW.start_time > NOW() THEN
        -- Check if groups or full_team flag changed
        IF (OLD.is_full_team_event IS DISTINCT FROM NEW.is_full_team_event)
           OR (OLD.assigned_attendance_groups IS DISTINCT FROM NEW.assigned_attendance_groups) THEN
            PERFORM populate_event_expected_attendees(
                NEW.id,
                NEW.team_id,
                COALESCE(NEW.is_full_team_event, TRUE),
                CASE 
                    WHEN NEW.assigned_attendance_groups IS NULL OR jsonb_array_length(NEW.assigned_attendance_groups) = 0 
                    THEN NULL
                    ELSE ARRAY(SELECT jsonb_array_elements_text(NEW.assigned_attendance_groups)::UUID)
                END
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_expected_attendees_on_change ON events;
CREATE TRIGGER trigger_update_expected_attendees_on_change
    AFTER UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_event_expected_attendees_on_change();

-- =============================================
-- TRIGGER: Add new team members to full-team events
-- =============================================

CREATE OR REPLACE FUNCTION add_new_member_to_full_team_events()
RETURNS TRIGGER AS $$
BEGIN
    -- Only add to future full-team events
    IF NEW.role = 'player' THEN
        INSERT INTO event_expected_attendees (event_id, user_id, team_id, added_reason)
        SELECT 
            e.id,
            NEW.user_id,
            NEW.team_id,
            'team_join'
        FROM events e
        WHERE e.team_id = NEW.team_id
        AND COALESCE(e.is_full_team_event, TRUE) = TRUE
        AND e.start_time > NOW() -- Only future events
        ON CONFLICT (event_id, user_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_add_member_to_full_team_events ON team_members;
CREATE TRIGGER trigger_add_member_to_full_team_events
    AFTER INSERT ON team_members
    FOR EACH ROW
    EXECUTE FUNCTION add_new_member_to_full_team_events();

-- =============================================
-- TRIGGER: Add group members to events when added to group
-- =============================================

CREATE OR REPLACE FUNCTION add_group_member_to_events()
RETURNS TRIGGER AS $$
BEGIN
    -- Add to all future events that include this group
    INSERT INTO event_expected_attendees (event_id, user_id, team_id, added_reason)
    SELECT 
        e.id,
        NEW.user_id,
        NEW.team_id,
        'group_member_added'
    FROM events e
    WHERE e.team_id = NEW.team_id
    AND COALESCE(e.is_full_team_event, FALSE) = FALSE
    AND e.assigned_attendance_groups IS NOT NULL
    AND jsonb_array_length(e.assigned_attendance_groups) > 0
    AND NEW.group_id::text = ANY(
        SELECT jsonb_array_elements_text(e.assigned_attendance_groups)
    )
    AND e.start_time > NOW() -- Only future events
    ON CONFLICT (event_id, user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_add_group_member_to_events ON attendance_group_members;
CREATE TRIGGER trigger_add_group_member_to_events
    AFTER INSERT ON attendance_group_members
    FOR EACH ROW
    EXECUTE FUNCTION add_group_member_to_events();




