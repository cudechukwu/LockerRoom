-- Optimized RPC function to get team notification summary in a single query
-- This replaces multiple separate queries for unread messages and priority alerts

-- Drop the existing function first to change return type
DROP FUNCTION IF EXISTS get_team_notification_summary(UUID, UUID);

CREATE OR REPLACE FUNCTION get_team_notification_summary(
  p_team_id UUID,
  p_user_id UUID
)
RETURNS TABLE(
  unread_messages BIGINT,
  priority_alerts BIGINT,
  total_notifications BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER -- Ensures function runs with definer's privileges (e.g., service_role)
AS $$
BEGIN
  RETURN QUERY
  WITH team_channels AS (
    -- Get all channels the user has access to
    SELECT id as channel_id
    FROM channels 
    WHERE team_id = p_team_id
  ),
  read_messages AS (
    -- Get all read message IDs for this user
    SELECT message_id
    FROM message_reads 
    WHERE user_id = p_user_id
  ),
  unread_count AS (
    -- Count unread messages (excluding own messages and read messages)
    SELECT COUNT(*) as count
    FROM messages m
    INNER JOIN team_channels tc ON m.channel_id = tc.channel_id
    WHERE m.sender_id != p_user_id
    AND (m.id NOT IN (SELECT message_id FROM read_messages) OR NOT EXISTS (SELECT 1 FROM read_messages))
  ),
  priority_alerts_count AS (
    -- Count priority alerts for this team
    SELECT COUNT(*) as count
    FROM priority_alerts 
    WHERE team_id = p_team_id
    AND (scope = 'team' OR p_user_id = ANY(target_users))
  )
  SELECT
    COALESCE(uc.count, 0)::BIGINT as unread_messages,
    COALESCE(pac.count, 0)::BIGINT as priority_alerts,
    (COALESCE(uc.count, 0) + COALESCE(pac.count, 0))::BIGINT as total_notifications
  FROM unread_count uc
  CROSS JOIN priority_alerts_count pac;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_team_notification_summary(UUID, UUID) TO authenticated;
