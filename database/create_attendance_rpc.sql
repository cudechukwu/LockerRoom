-- Create RPC function to insert attendance with proper auth context
-- This ensures auth.uid() is available in the function context

CREATE OR REPLACE FUNCTION insert_event_attendance_manual(
  p_event_id UUID,
  p_user_id UUID,
  p_team_id UUID,
  p_status VARCHAR DEFAULT 'present',
  p_check_in_method VARCHAR DEFAULT 'manual',
  p_checked_in_at TIMESTAMPTZ DEFAULT NOW(),
  p_is_late BOOLEAN DEFAULT FALSE,
  p_late_minutes INTEGER DEFAULT NULL,
  p_late_category VARCHAR DEFAULT 'on_time'
)
RETURNS event_attendance AS $$
DECLARE
  v_current_user_id UUID;
  v_result event_attendance;
BEGIN
  -- Set search_path explicitly to avoid issues
  SET search_path = public;
  
  -- Get current user from auth context (this should work in SECURITY DEFINER)
  v_current_user_id := auth.uid();
  
  -- Verify we have an authenticated user
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated - auth.uid() is NULL';
  END IF;
  
  -- Verify current user is coach/admin
  IF NOT is_coach_or_admin(p_team_id, v_current_user_id) THEN
    RAISE EXCEPTION 'Not authorized to mark attendance - user is not a coach/admin';
  END IF;
  
  -- Verify target user is in team
  IF NOT is_user_in_team(p_team_id, p_user_id) THEN
    RAISE EXCEPTION 'Target user is not a member of the team';
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
      status = p_status::attendance_status, -- Cast VARCHAR to ENUM
      is_late = p_is_late,
      late_minutes = p_late_minutes,
      late_category = p_late_category,
      updated_at = NOW()
    WHERE event_id = p_event_id
    AND user_id = p_user_id
    AND is_deleted = FALSE
    RETURNING * INTO v_result;
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
      p_check_in_method::check_in_method_type, -- Cast VARCHAR to ENUM
      p_checked_in_at,
      p_status::attendance_status, -- Cast VARCHAR to ENUM
      p_is_late,
      p_late_minutes,
      p_late_category,
      NULL, -- Manual check-ins have no device fingerprint
      FALSE,
      FALSE
    )
    RETURNING * INTO v_result;
  END IF;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION insert_event_attendance_manual(
  UUID, UUID, UUID, VARCHAR, VARCHAR, TIMESTAMPTZ, BOOLEAN, INTEGER, VARCHAR
) TO authenticated;

