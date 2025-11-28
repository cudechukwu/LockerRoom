-- RPC Function: Get all exceptions (deleted instances) for a recurring event
-- Used by frontend to filter out deleted instances during expansion
--
-- This function returns all exception dates for a given recurring event.
-- The frontend uses this to filter out deleted instances when expanding
-- recurring events for calendar display.
--
-- Parameters:
--   p_event_id: The original recurring event's UUID
--
-- Returns:
--   Table with exception_date and exception_type for all exceptions
--   (currently only 'deleted' type is used)

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
  -- This preserves RLS policies and ensures the function does NOT become a god-mode bypass
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

