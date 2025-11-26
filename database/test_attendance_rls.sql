-- Test query to verify the is_coach_or_admin function works
-- Replace 'YOUR_TEAM_ID' and 'YOUR_USER_ID' with actual values from your database

-- Test 1: Check if function exists and works
SELECT is_coach_or_admin(
    'YOUR_TEAM_ID'::uuid,  -- Replace with your team_id
    'YOUR_USER_ID'::uuid   -- Replace with your user_id (coach's auth.uid())
) AS is_coach;

-- Test 2: Check what roles exist for the user
SELECT 
    'team_member_roles' AS source,
    role,
    team_id,
    user_id
FROM team_member_roles
WHERE team_id = 'YOUR_TEAM_ID'::uuid
AND user_id = 'YOUR_USER_ID'::uuid

UNION ALL

SELECT 
    'team_members' AS source,
    role::text,
    team_id,
    user_id
FROM team_members
WHERE team_id = 'YOUR_TEAM_ID'::uuid
AND user_id = 'YOUR_USER_ID'::uuid;

-- Test 3: Check current user (run this in Supabase SQL editor - it will use auth.uid())
SELECT 
    auth.uid() AS current_user_id,
    is_coach_or_admin(
        'YOUR_TEAM_ID'::uuid,
        auth.uid()
    ) AS is_coach_for_team;

