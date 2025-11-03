-- Quick test for the RPC function
-- Run this in Supabase SQL Editor to test

-- First, let's see what team and user IDs exist
SELECT 
  t.id as team_id,
  tm.user_id,
  up.display_name
FROM teams t
JOIN team_members tm ON t.id = tm.team_id
JOIN user_profiles up ON tm.user_id = up.user_id
LIMIT 3;

-- Then test the RPC function with actual IDs
-- Replace these with real IDs from the query above
SELECT get_team_conversation_summary(
  'your-team-id-here', 
  'your-user-id-here'
);
