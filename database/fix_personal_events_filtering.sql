-- Fix Personal Events Filtering in RPC Functions
-- Personal events should only be visible to their creator
-- This prevents personal events from being returned to other team members

-- Drop existing functions first (to allow changing return type if needed)
DROP FUNCTION IF EXISTS get_events_in_range(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE);
DROP FUNCTION IF EXISTS get_upcoming_events(UUID, INTEGER);

-- Update get_events_in_range to filter personal events
CREATE OR REPLACE FUNCTION get_events_in_range(
    p_team_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
    id UUID,
    title VARCHAR(255),
    description TEXT,
    event_type VARCHAR(50),
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    location VARCHAR(255),
    color VARCHAR(7),
    is_all_day BOOLEAN,
    visibility VARCHAR(20),
    created_by UUID,
    attending_count BIGINT,
    total_invited BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.title,
        e.description,
        e.event_type,
        e.start_time,
        e.end_time,
        e.location,
        e.color,
        e.is_all_day,
        e.visibility,
        e.created_by,
        COALESCE(attending.attending_count, 0) as attending_count,
        COALESCE(total.total_invited, 0) as total_invited
    FROM events e
    LEFT JOIN (
        SELECT event_id, COUNT(*) as attending_count
        FROM event_attendees
        WHERE status = 'attending'
        GROUP BY event_id
    ) attending ON attending.event_id = e.id
    LEFT JOIN (
        SELECT event_id, COUNT(*) as total_invited
        FROM event_attendees
        GROUP BY event_id
    ) total ON total.event_id = e.id
    WHERE e.team_id = p_team_id
    AND e.start_time >= p_start_date
    AND e.start_time <= p_end_date
    -- Filter personal events: only show if user is the creator
    AND (
        e.visibility != 'personal' 
        OR e.created_by = auth.uid()
    )
    ORDER BY e.start_time ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_upcoming_events to filter personal events
CREATE OR REPLACE FUNCTION get_upcoming_events(
    p_team_id UUID,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    title VARCHAR(255),
    description TEXT,
    event_type VARCHAR(50),
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    location VARCHAR(255),
    color VARCHAR(7),
    is_all_day BOOLEAN,
    visibility VARCHAR(20),
    created_by UUID,
    attending_count BIGINT,
    total_invited BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.title,
        e.description,
        e.event_type,
        e.start_time,
        e.end_time,
        e.location,
        e.color,
        e.is_all_day,
        e.visibility,
        e.created_by,
        COALESCE(attending.attending_count, 0) as attending_count,
        COALESCE(total.total_invited, 0) as total_invited
    FROM events e
    LEFT JOIN (
        SELECT event_id, COUNT(*) as attending_count
        FROM event_attendees
        WHERE status = 'attending'
        GROUP BY event_id
    ) attending ON attending.event_id = e.id
    LEFT JOIN (
        SELECT event_id, COUNT(*) as total_invited
        FROM event_attendees
        GROUP BY event_id
    ) total ON total.event_id = e.id
    WHERE e.team_id = p_team_id
    AND e.start_time >= NOW()
    -- Filter personal events: only show if user is the creator
    AND (
        e.visibility != 'personal' 
        OR e.created_by = auth.uid()
    )
    ORDER BY e.start_time ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

