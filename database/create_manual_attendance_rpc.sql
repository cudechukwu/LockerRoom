-- Create RPC function for manual attendance marking
-- This bypasses RLS by using SECURITY DEFINER and explicitly checking permissions
-- This solves the auth.uid() = NULL issue in RLS context

CREATE OR REPLACE FUNCTION insert_manual_attendance(
    p_event_id UUID,
    p_user_id UUID,
    p_team_id UUID,
    p_status VARCHAR(50),
    p_checked_in_at TIMESTAMPTZ,
    p_is_late BOOLEAN,
    p_late_minutes INTEGER,
    p_late_category VARCHAR(50)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_coach_user_id UUID;
    v_is_coach BOOLEAN;
    v_target_user_in_team BOOLEAN;
    v_inserted_id UUID;
    v_result JSONB;
BEGIN
    -- Get the current user ID from JWT (this works in SECURITY DEFINER functions)
    v_coach_user_id := auth.uid();
    
    -- Verify coach_user_id is not NULL
    IF v_coach_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not authenticated - auth.uid() is NULL'
        );
    END IF;
    
    -- Verify the coach is actually a coach/admin
    v_is_coach := is_coach_or_admin(p_team_id, v_coach_user_id);
    
    IF NOT v_is_coach THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Only coaches and admins can manually mark attendance'
        );
    END IF;
    
    -- Verify the target user is in the team
    v_target_user_in_team := is_user_in_team(p_team_id, p_user_id);
    
    IF NOT v_target_user_in_team THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Target user is not a member of this team'
        );
    END IF;
    
    -- Check if attendance already exists (non-deleted)
    IF EXISTS (
        SELECT 1 FROM event_attendance
        WHERE event_id = p_event_id
        AND user_id = p_user_id
        AND is_deleted = FALSE
    ) THEN
        -- Update existing record
        UPDATE event_attendance
        SET 
            status = p_status,
            is_late = p_is_late,
            late_minutes = p_late_minutes,
            late_category = p_late_category,
            updated_at = NOW()
        WHERE event_id = p_event_id
        AND user_id = p_user_id
        AND is_deleted = FALSE
        RETURNING id INTO v_inserted_id;
    ELSE
        -- Insert new record
        INSERT INTO event_attendance (
            event_id,
            user_id,
            team_id,
            check_in_method,
            checked_in_at,
            status,
            is_late,
            late_minutes,
            late_category,
            device_fingerprint,
            is_flagged,
            is_deleted
        ) VALUES (
            p_event_id,
            p_user_id,
            p_team_id,
            'manual',
            p_checked_in_at,
            p_status,
            p_is_late,
            p_late_minutes,
            p_late_category,
            NULL, -- Manual check-ins have NULL device_fingerprint
            FALSE,
            FALSE
        )
        RETURNING id INTO v_inserted_id;
    END IF;
    
    -- Return success with the inserted/updated record
    SELECT row_to_json(t) INTO v_result
    FROM (
        SELECT * FROM event_attendance WHERE id = v_inserted_id
    ) t;
    
    RETURN jsonb_build_object(
        'success', true,
        'data', v_result
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION insert_manual_attendance(
    UUID, UUID, UUID, VARCHAR, TIMESTAMPTZ, BOOLEAN, INTEGER, VARCHAR
) TO authenticated;

-- Test query (replace with actual values)
-- SELECT insert_manual_attendance(
--     'event_id'::UUID,
--     'user_id'::UUID,
--     'team_id'::UUID,
--     'present',
--     NOW(),
--     FALSE,
--     NULL,
--     'on_time'
-- );

