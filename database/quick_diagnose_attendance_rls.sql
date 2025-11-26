-- Quick Diagnostic Query for Attendance RLS Issue
-- Run this in Supabase SQL Editor to diagnose the problem

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

-- Step 3: Test the function with current user
-- This will use auth.uid() automatically in Supabase
SELECT 
    'Function test (current user)' AS check_type,
    auth.uid() AS current_user_id,
    is_coach_or_admin(
        'ddced7b8-e45b-45f9-ac31-96b2045f40e8'::uuid,  -- Your team_id
        auth.uid()
    ) AS function_returns_true;

-- Step 4: Check current user's roles
SELECT 
    'Current user roles' AS check_type,
    'team_member_roles' AS source,
    role,
    team_id
FROM team_member_roles
WHERE user_id = auth.uid()

UNION ALL

SELECT 
    'Current user roles' AS check_type,
    'team_members' AS source,
    role::text,
    team_id
FROM team_members
WHERE user_id = auth.uid();

-- Step 5: Test RLS policy simulation for ALL players in the team
-- This shows which players the policy would allow you to mark
SELECT 
    'RLS Policy Simulation (All Players)' AS check_type,
    '8d99f216-1454-4500-9652-f87922774f5c'::uuid AS coach_user_id,
    tm.user_id AS player_user_id,
    tm.role AS player_role,
    'ddced7b8-e45b-45f9-ac31-96b2045f40e8'::uuid AS team_id,
    is_coach_or_admin(
        'ddced7b8-e45b-45f9-ac31-96b2045f40e8'::uuid,
        '8d99f216-1454-4500-9652-f87922774f5c'::uuid
    ) AS coach_check_passes,
    true AS player_in_team,  -- Always true since we're querying from team_members
    (
        is_coach_or_admin('ddced7b8-e45b-45f9-ac31-96b2045f40e8'::uuid, '8d99f216-1454-4500-9652-f87922774f5c'::uuid)
        AND true
    ) AS policy_should_allow_insert
FROM team_members tm
WHERE tm.team_id = 'ddced7b8-e45b-45f9-ac31-96b2045f40e8'::uuid
AND tm.user_id != '8d99f216-1454-4500-9652-f87922774f5c'::uuid  -- Exclude coach
ORDER BY tm.role, tm.user_id;

