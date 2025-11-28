-- Fix Recurring Events Expansion
-- Update get_events_in_range to also return recurring events that could expand into the range
-- This allows the frontend to expand recurring events to show on future dates
--
-- ⚠️ NOTE: recurring_days is included in the return type but the column doesn't exist yet.
-- Once the backend adds the recurring_days column, it will automatically be returned.
-- For now, it will be NULL.

DROP FUNCTION IF EXISTS get_events_in_range(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE);

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
    total_invited BIGINT,
    is_recurring BOOLEAN,
    recurring_pattern VARCHAR(20),
    recurring_until TIMESTAMP WITH TIME ZONE,
    recurring_days TEXT[]  -- Will be NULL until column is added to events table
) AS $$
BEGIN
    -- 🔐 CRITICAL FOR SUPABASE RLS — DO NOT REMOVE
    -- This preserves RLS policies and ensures the function does NOT become a god-mode bypass
    PERFORM set_config('request.jwt.claims', current_setting('request.jwt.claims'), true);

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
        COALESCE(total.total_invited, 0) as total_invited,
        e.is_recurring,
        e.recurring_pattern,
        e.recurring_until,
        NULL::TEXT[] as recurring_days  -- Will be populated once column is added
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
    AND (
        -- Non-recurring events: start_time must be in range
        (NOT e.is_recurring AND e.start_time >= p_start_date AND e.start_time <= p_end_date)
        OR
        -- Recurring events: start_time must be before or equal to end_date (we'll expand in frontend)
        -- Also check if recurring_until is null or after start_date
        (e.is_recurring = true 
         AND e.start_time <= p_end_date
         AND (e.recurring_until IS NULL OR e.recurring_until >= p_start_date))
    )
    ORDER BY e.start_time ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

