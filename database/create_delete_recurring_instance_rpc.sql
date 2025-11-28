-- RPC Function: Delete a single instance of a recurring event
-- Creates an exception record to mark the instance as deleted
--
-- This function is called when a user wants to delete a single occurrence
-- of a recurring event (e.g., "delete this Friday only").
--
-- Parameters:
--   p_event_id: The original recurring event's UUID
--   p_exception_date: The date of the instance to delete (DATE format: YYYY-MM-DD)
--
-- Returns:
--   JSON object with success status, event_id, and exception_date

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
  -- This preserves RLS policies and ensures the function does NOT become a god-mode bypass
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

  -- Insert exception (or update if exists - idempotent operation)
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

