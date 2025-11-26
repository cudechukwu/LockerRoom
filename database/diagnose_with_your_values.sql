-- Diagnostic Queries with Your Actual Values
-- Team ID: ddced7b8-e45b-45f9-ac31-96b2045f40e8
-- Coach User ID: 8d99f216-1454-4500-9652-f87922774f5c

-- Step 1: Check if the function exists
SELECT 
    'Function exists?' AS check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc 
            WHERE proname = 'is_coach_or_admin'
        ) THEN 'YES ✓'
        ELSE 'NO ✗ - Function missing!'
    END AS result;

-- Step 2: List all INSERT policies on event_attendance
SELECT 
    'INSERT Policies' AS check_type,
    policyname,
    with_check AS policy_condition
FROM pg_policies
WHERE tablename = 'event_attendance'
AND cmd = 'INSERT';

-- Step 3: Test the function with your coach user
SELECT 
    'Function test' AS check_type,
    '8d99f216-1454-4500-9652-f87922774f5c'::uuid AS coach_user_id,
    'ddced7b8-e45b-45f9-ac31-96b2045f40e8'::uuid AS team_id,
    is_coach_or_admin(
        'ddced7b8-e45b-45f9-ac31-96b2045f40e8'::uuid,
        '8d99f216-1454-4500-9652-f87922774f5c'::uuid
    ) AS function_returns_true;

-- Step 4: Check coach's roles in both tables
SELECT 
    'Coach roles check' AS check_type,
    'team_member_roles' AS source,
    role,
    team_id,
    user_id
FROM team_member_roles
WHERE team_id = 'ddced7b8-e45b-45f9-ac31-96b2045f40e8'::uuid
AND user_id = '8d99f216-1454-4500-9652-f87922774f5c'::uuid

UNION ALL

SELECT 
    'Coach roles check' AS check_type,
    'team_members' AS source,
    role::text,
    team_id,
    user_id
FROM team_members
WHERE team_id = 'ddced7b8-e45b-45f9-ac31-96b2045f40e8'::uuid
AND user_id = '8d99f216-1454-4500-9652-f87922774f5c'::uuid;

-- Step 5: List all team members (to find player IDs)
SELECT 
    'Team members' AS check_type,
    user_id,
    role,
    is_admin,
    team_id
FROM team_members
WHERE team_id = 'ddced7b8-e45b-45f9-ac31-96b2045f40e8'::uuid
ORDER BY role, user_id;

-- Step 6: Test RLS policy simulation for ALL players in the team
-- This will show which players the policy would allow you to mark
SELECT 
    'RLS Policy Simulation (All Players)' AS check_type,
    '8d99f216-1454-4500-9652-f87922774f5c'::uuid AS coach_user_id,
    tm.user_id AS player_user_id,
    tm.role AS player_role,
    'ddced7b8-e45b-45f9-ac31-96b2045f40e8'::uuid AS team_id,
    -- Check 1: Is coach a coach/admin?
    is_coach_or_admin(
        'ddced7b8-e45b-45f9-ac31-96b2045f40e8'::uuid,
        '8d99f216-1454-4500-9652-f87922774f5c'::uuid
    ) AS coach_check_passes,
    -- Check 2: Is player in team? (always true since we're querying team_members)
    true AS player_in_team,
    -- Final check: Both conditions must be true
    (
        is_coach_or_admin('ddced7b8-e45b-45f9-ac31-96b2045f40e8'::uuid, '8d99f216-1454-4500-9652-f87922774f5c'::uuid)
        AND true  -- Player is in team (we're querying from team_members)
    ) AS policy_should_allow_insert
FROM team_members tm
WHERE tm.team_id = 'ddced7b8-e45b-45f9-ac31-96b2045f40e8'::uuid
AND tm.user_id != '8d99f216-1454-4500-9652-f87922774f5c'::uuid  -- Exclude coach
ORDER BY tm.role, tm.user_id;

-- Step 7: Get exact policy definition
SELECT 
    'Policy Definition' AS check_type,
    pol.polname AS policy_name,
    pol.polcmd AS command,
    pg_get_expr(pol.polqual, pol.polrelid) AS using_expression,
    pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check_expression
FROM pg_policy pol
JOIN pg_class pc ON pol.polrelid = pc.oid
WHERE pc.relname = 'event_attendance'
AND pol.polname = 'Coaches insert team attendance';

