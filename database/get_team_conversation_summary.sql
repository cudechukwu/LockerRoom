-- Optimized RPC function to get team conversation summary in a single query
-- This replaces multiple separate queries for channels, DMs, and unread counts

DROP FUNCTION IF EXISTS get_team_conversation_summary(UUID, UUID);

CREATE OR REPLACE FUNCTION get_team_conversation_summary(
  p_team_id UUID,
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  WITH user_channels AS (
    -- Get all channels user has access to
    SELECT c.id, c.name, c.description, c.type, c.is_private, c.updated_at, c.is_announcements, c.image_url
    FROM channels c
    JOIN channel_members cm ON cm.channel_id = c.id
    WHERE c.team_id = p_team_id AND cm.user_id = p_user_id
  ),
  read_messages AS (
    -- Get all read message IDs for this user
    SELECT message_id FROM message_reads WHERE user_id = p_user_id
  ),
  unread_counts AS (
    -- Count unread messages per channel
    SELECT m.channel_id, COUNT(*) AS unread_count
    FROM messages m
    INNER JOIN user_channels uc ON m.channel_id = uc.id
    WHERE m.sender_id != p_user_id 
    AND (m.id NOT IN (SELECT message_id FROM read_messages) OR NOT EXISTS (SELECT 1 FROM read_messages))
    GROUP BY m.channel_id
  ),
  dm_user_info AS (
    -- Get other user info for DMs (simplified for now)
    SELECT 
      cm.channel_id, 
      up.display_name,
      NULL as avatar_url 
    FROM channel_members cm
    JOIN user_profiles up ON cm.user_id = up.user_id
    WHERE cm.user_id != p_user_id
    AND cm.channel_id IN (SELECT id FROM user_channels WHERE type IN ('dm', 'direct_message', 'group_dm'))
  ),
  processed_channels AS (
    -- Process channels with computed fields (ensure unique)
    SELECT DISTINCT
      uc.id, 
      uc.name, 
      uc.description, 
      uc.type, 
      uc.is_private, 
      uc.updated_at,
      uc.image_url,
      COALESCE(ucount.unread_count, 0) AS unread_count,
      CASE 
        WHEN uc.type = 'team' OR uc.is_announcements THEN true
        ELSE false
      END as is_pinned,
      CASE 
        WHEN uc.name ILIKE '%announcement%' THEN 'megaphone'
        WHEN uc.name ILIKE '%general%' THEN 'chatbubbles'
        WHEN uc.name ILIKE '%offense%' THEN 'football'
        WHEN uc.name ILIKE '%defense%' THEN 'shield'
        WHEN uc.name ILIKE '%special%' THEN 'flash'
        WHEN uc.name ILIKE '%coach%' THEN 'school'
        WHEN uc.name ILIKE '%trainer%' THEN 'fitness'
        ELSE 'chatbubbles'
      END AS icon_name
    FROM user_channels uc
    LEFT JOIN unread_counts ucount ON uc.id = ucount.channel_id
    WHERE uc.type NOT IN ('dm', 'direct_message', 'group_dm')
    AND EXISTS (
      -- Only show channels that have at least one message or are team/announcements
      SELECT 1 FROM messages m 
      WHERE m.channel_id = uc.id
      UNION ALL
      SELECT 1 WHERE uc.type IN ('team', 'announcements', 'coach', 'trainer')
    )
  ),
  processed_dms AS (
    -- Process DMs with computed fields (ensure unique)
    -- Only show DMs with messages in the last 30 days
    SELECT DISTINCT
      uc.id, 
      COALESCE(dm.display_name, 'Unknown User') AS name,
      uc.description,
      uc.type,
      uc.is_private,
      uc.updated_at,
      COALESCE(ucount.unread_count, 0) AS unread_count,
      false as is_pinned,
      'person' AS icon_name,
      NULL as avatar_url
    FROM user_channels uc
    LEFT JOIN unread_counts ucount ON uc.id = ucount.channel_id
    LEFT JOIN dm_user_info dm ON uc.id = dm.channel_id
    WHERE uc.type IN ('dm', 'direct_message', 'group_dm')
    AND (uc.updated_at >= NOW() - INTERVAL '30 days' OR EXISTS (
      SELECT 1 FROM messages m 
      WHERE m.channel_id = uc.id 
      AND m.created_at >= NOW() - INTERVAL '30 days'
    ))
  ),
  all_conversations AS (
    -- Combine channels and DMs (ensure unique IDs)
    SELECT DISTINCT
      id, name, description, type, is_private, updated_at, 
      unread_count, is_pinned, icon_name, image_url,
      'channel' as conversation_type
    FROM processed_channels
    UNION ALL
    SELECT DISTINCT
      id, name, description, type, is_private, updated_at, 
      unread_count, is_pinned, icon_name, avatar_url as image_url,
      'dm' as conversation_type
    FROM processed_dms
  ),
  sorted_conversations AS (
    -- Sort by pinned, unread count, then last activity
    SELECT *
    FROM all_conversations
    ORDER BY 
      is_pinned DESC,
      unread_count DESC,
      updated_at DESC
  )
  SELECT json_build_object(
    'channels', (
      SELECT json_agg(
        json_build_object(
          'id', id,
          'name', name,
          'description', description,
          'type', type,
          'is_private', is_private,
          'updated_at', updated_at,
          'unread_count', unread_count,
          'is_pinned', is_pinned,
          'icon_name', icon_name,
          'image_url', image_url
        )
      )
      FROM processed_channels
    ),
    'dms', (
      SELECT json_agg(
        json_build_object(
          'id', id,
          'name', name,
          'description', description,
          'type', type,
          'is_private', is_private,
          'updated_at', updated_at,
          'unread_count', unread_count,
          'is_pinned', is_pinned,
          'icon_name', icon_name,
          'avatar_url', NULL
        )
      )
      FROM processed_dms
    ),
    'allConversations', (
      SELECT json_agg(
        json_build_object(
          'id', id,
          'name', name,
          'description', description,
          'type', conversation_type,
          'is_private', is_private,
          'updated_at', updated_at,
          'unread_count', unread_count,
          'is_pinned', is_pinned,
          'icon_name', icon_name,
          'image_url', image_url
        )
      )
      FROM sorted_conversations
    ),
    'totalUnread', (
      SELECT COALESCE(SUM(unread_count), 0)
      FROM all_conversations
    ),
    'teamInfo', (
      SELECT json_build_object(
        'id', t.id,
        'name', t.name,
        'logo_url', t.logo_url,
        'primary_color', t.primary_color,
        'secondary_color', t.secondary_color,
        'school', t.school
      )
      FROM teams t
      WHERE t.id = p_team_id
    )
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_team_conversation_summary(UUID, UUID) TO authenticated;
