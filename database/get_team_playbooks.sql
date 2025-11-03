-- Optimized RPC function to get team playbooks with interactive animation data
-- This replaces multiple separate queries with a single optimized call

DROP FUNCTION IF EXISTS get_team_playbooks(UUID, UUID);

CREATE OR REPLACE FUNCTION get_team_playbooks(
  p_team_id UUID,
  p_user_id UUID,
  p_limit INTEGER DEFAULT 10,
  p_offset INTEGER DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  -- Get playbooks data (team + personal + shared)
  WITH playbooks_data AS (
    SELECT 
      pb.id,
      pb.name,
      pb.description,
      pb.category,
      pb.subcategory,
      pb.icon,
      pb.color,
      pb.is_public,
      pb.scope,
      pb.visibility,
      pb.is_shared,
      pb.shared_by,
      pb.created_by,
      pb.created_at,
      pb.updated_at,
      (SELECT COUNT(*) FROM plays p WHERE p.playbook_id = pb.id) as play_count
    FROM playbooks pb
    WHERE (
      -- Team playbooks
      (pb.team_id = p_team_id AND pb.scope = 'team')
      OR
      -- Personal playbooks for this user
      (pb.created_by = p_user_id AND pb.scope = 'personal')
      OR
      -- Shared playbooks accessible to this user
      (pb.visibility = 'public' OR (pb.visibility = 'team' AND pb.team_id = p_team_id))
    )
    ORDER BY 
      CASE WHEN pb.scope = 'team' THEN 1 ELSE 2 END, -- Team playbooks first
      pb.created_at DESC
    LIMIT COALESCE(p_limit, 10)
    OFFSET COALESCE(p_offset, 0)
  ),
  recent_plays_data AS (
    SELECT 
      p.id,
      p.name,
      p.description,
      p.playbook_id,
      pb.name as playbook_name,
      p.thumbnail_url,
      p.duration,
      p.difficulty,
      p.tags,
      p.created_by,
      p.created_at,
      p.updated_at
    FROM plays p
    JOIN playbooks pb ON p.playbook_id = pb.id
    WHERE p.team_id = p_team_id
    ORDER BY p.updated_at DESC
    LIMIT COALESCE(p_limit, 10)
  ),
  count_data AS (
    SELECT 
      COUNT(DISTINCT pb.id) as total_playbooks,
      COUNT(DISTINCT p.id) as total_plays,
      (SELECT COUNT(*) FROM plays p2 WHERE p2.team_id = p_team_id AND p2.updated_at > NOW() - INTERVAL '7 days') as recent_plays_count
    FROM playbooks pb
    LEFT JOIN plays p ON p.playbook_id = pb.id
    WHERE pb.team_id = p_team_id
  ),
  categories_data AS (
    SELECT 
      pb.category,
      COUNT(*) as count
    FROM playbooks pb
    WHERE pb.team_id = p_team_id
    GROUP BY pb.category
  )
  SELECT json_build_object(
    'playbooks', COALESCE((SELECT json_agg(json_build_object(
      'id', id,
      'name', name,
      'description', description,
      'category', category,
      'subcategory', subcategory,
      'icon', icon,
      'color', color,
      'is_public', is_public,
      'scope', scope,
      'visibility', visibility,
      'is_shared', is_shared,
      'shared_by', shared_by,
      'created_by', created_by,
      'created_at', created_at,
      'updated_at', updated_at,
      'play_count', play_count
    ) ORDER BY created_at DESC) FROM playbooks_data), '[]'::json),
    'recent_plays', COALESCE((SELECT json_agg(json_build_object(
      'id', id,
      'name', name,
      'description', description,
      'playbook_id', playbook_id,
      'playbook_name', playbook_name,
      'thumbnail_url', thumbnail_url,
      'duration', duration,
      'difficulty', difficulty,
      'tags', tags,
      'created_by', created_by,
      'created_at', created_at,
      'updated_at', updated_at
    )) FROM recent_plays_data), '[]'::json),
    'count_summary', (SELECT json_build_object(
      'total_playbooks', total_playbooks,
      'total_plays', total_plays,
      'recent_plays_count', recent_plays_count
    ) FROM count_data),
    'categories', COALESCE((SELECT json_agg(json_build_object(
      'category', category,
      'count', count
    )) FROM categories_data), '[]'::json)
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_team_playbooks(UUID, UUID, INTEGER, INTEGER) TO authenticated;
