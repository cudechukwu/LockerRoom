-- Test query for get_team_conversation_summary RPC function
-- Run this in Supabase SQL Editor to test the function

-- First, get a sample team_id and user_id from your database
SELECT 
  t.id as team_id,
  tm.user_id
FROM teams t
JOIN team_members tm ON t.id = tm.team_id
LIMIT 1;

-- Then use those values to test the RPC function
-- Replace 'your-team-id' and 'your-user-id' with actual values from above
SELECT get_team_conversation_summary('your-team-id', 'your-user-id');

-- Expected result: JSON object with channels, dms, allConversations, totalUnread, teamInfo
