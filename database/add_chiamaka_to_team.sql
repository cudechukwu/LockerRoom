-- Add chiamaka@uni.minerva.edu to Wesleyan Cardinals team
-- Run this in your Supabase SQL editor

-- First, let's find the user ID for chiamaka@uni.minerva.edu
-- (You'll need to get this from the auth.users table in Supabase Dashboard)

-- For now, let's assume the user exists and add them to the team
-- Replace 'USER_ID_HERE' with the actual user ID from auth.users

-- Add user to team as a player
INSERT INTO team_members (team_id, user_id, role, position) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'USER_ID_HERE', 'player', 'Player')
ON CONFLICT (team_id, user_id) DO UPDATE SET 
  role = EXCLUDED.role,
  position = EXCLUDED.position;

-- Add user to all team channels
INSERT INTO channel_members (channel_id, user_id, role)
SELECT 
  c.id as channel_id,
  'USER_ID_HERE' as user_id,
  'member' as role
FROM channels c
WHERE c.team_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
ON CONFLICT (channel_id, user_id) DO NOTHING;

-- Show the results
SELECT 
  tm.id,
  tm.team_id,
  tm.user_id,
  tm.role,
  tm.position,
  tm.joined_at,
  t.name as team_name
FROM team_members tm
LEFT JOIN teams t ON tm.team_id = t.id
WHERE tm.user_id = 'USER_ID_HERE';

-- Show channel memberships
SELECT 
  cm.id,
  cm.channel_id,
  cm.user_id,
  cm.role,
  c.name as channel_name
FROM channel_members cm
LEFT JOIN channels c ON cm.channel_id = c.id
WHERE cm.user_id = 'USER_ID_HERE';

