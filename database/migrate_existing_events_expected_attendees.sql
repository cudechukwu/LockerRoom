-- Migration: Populate expected attendees for all existing future events
-- Run this after creating the event_expected_attendees table

-- Populate expected attendees for all existing future events
DO $$
DECLARE
    event_record RECORD;
    v_count INTEGER;
BEGIN
    FOR event_record IN 
        SELECT 
            id, 
            team_id, 
            COALESCE(is_full_team_event, TRUE) as is_full_team_event,
            assigned_attendance_groups
        FROM events
        WHERE start_time > NOW() -- Only future events
    LOOP
        -- Convert JSONB array to UUID array
        PERFORM populate_event_expected_attendees(
            event_record.id,
            event_record.team_id,
            event_record.is_full_team_event,
            CASE 
                WHEN event_record.assigned_attendance_groups IS NULL 
                     OR jsonb_array_length(event_record.assigned_attendance_groups) = 0 
                THEN NULL
                ELSE ARRAY(
                    SELECT jsonb_array_elements_text(event_record.assigned_attendance_groups)::UUID
                )
            END
        );
        
        -- Get count for logging
        SELECT COUNT(*) INTO v_count
        FROM event_expected_attendees
        WHERE event_id = event_record.id;
        
        RAISE NOTICE 'Populated % expected attendees for event %', v_count, event_record.id;
    END LOOP;
    
    RAISE NOTICE 'Migration complete: Populated expected attendees for all future events';
END $$;

-- Verify the migration
SELECT 
    e.id as event_id,
    e.title,
    e.start_time,
    COUNT(eea.user_id) as expected_attendees_count
FROM events e
LEFT JOIN event_expected_attendees eea ON e.id = eea.event_id
WHERE e.start_time > NOW()
GROUP BY e.id, e.title, e.start_time
ORDER BY e.start_time;

-- Run this after creating the event_expected_attendees table

-- Populate expected attendees for all existing future events
DO $$
DECLARE
    event_record RECORD;
    v_count INTEGER;
BEGIN
    FOR event_record IN 
        SELECT 
            id, 
            team_id, 
            COALESCE(is_full_team_event, TRUE) as is_full_team_event,
            assigned_attendance_groups
        FROM events
        WHERE start_time > NOW() -- Only future events
    LOOP
        -- Convert JSONB array to UUID array
        PERFORM populate_event_expected_attendees(
            event_record.id,
            event_record.team_id,
            event_record.is_full_team_event,
            CASE 
                WHEN event_record.assigned_attendance_groups IS NULL 
                     OR jsonb_array_length(event_record.assigned_attendance_groups) = 0 
                THEN NULL
                ELSE ARRAY(
                    SELECT jsonb_array_elements_text(event_record.assigned_attendance_groups)::UUID
                )
            END
        );
        
        -- Get count for logging
        SELECT COUNT(*) INTO v_count
        FROM event_expected_attendees
        WHERE event_id = event_record.id;
        
        RAISE NOTICE 'Populated % expected attendees for event %', v_count, event_record.id;
    END LOOP;
    
    RAISE NOTICE 'Migration complete: Populated expected attendees for all future events';
END $$;

-- Verify the migration
SELECT 
    e.id as event_id,
    e.title,
    e.start_time,
    COUNT(eea.user_id) as expected_attendees_count
FROM events e
LEFT JOIN event_expected_attendees eea ON e.id = eea.event_id
WHERE e.start_time > NOW()
GROUP BY e.id, e.title, e.start_time
ORDER BY e.start_time;

-- Run this after creating the event_expected_attendees table

-- Populate expected attendees for all existing future events
DO $$
DECLARE
    event_record RECORD;
    v_count INTEGER;
BEGIN
    FOR event_record IN 
        SELECT 
            id, 
            team_id, 
            COALESCE(is_full_team_event, TRUE) as is_full_team_event,
            assigned_attendance_groups
        FROM events
        WHERE start_time > NOW() -- Only future events
    LOOP
        -- Convert JSONB array to UUID array
        PERFORM populate_event_expected_attendees(
            event_record.id,
            event_record.team_id,
            event_record.is_full_team_event,
            CASE 
                WHEN event_record.assigned_attendance_groups IS NULL 
                     OR jsonb_array_length(event_record.assigned_attendance_groups) = 0 
                THEN NULL
                ELSE ARRAY(
                    SELECT jsonb_array_elements_text(event_record.assigned_attendance_groups)::UUID
                )
            END
        );
        
        -- Get count for logging
        SELECT COUNT(*) INTO v_count
        FROM event_expected_attendees
        WHERE event_id = event_record.id;
        
        RAISE NOTICE 'Populated % expected attendees for event %', v_count, event_record.id;
    END LOOP;
    
    RAISE NOTICE 'Migration complete: Populated expected attendees for all future events';
END $$;

-- Verify the migration
SELECT 
    e.id as event_id,
    e.title,
    e.start_time,
    COUNT(eea.user_id) as expected_attendees_count
FROM events e
LEFT JOIN event_expected_attendees eea ON e.id = eea.event_id
WHERE e.start_time > NOW()
GROUP BY e.id, e.title, e.start_time
ORDER BY e.start_time;




