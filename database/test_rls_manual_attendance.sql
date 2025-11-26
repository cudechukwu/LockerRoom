-- Test RLS policy for manual attendance insertion
-- Run this in Supabase SQL Editor while logged in as the coach user

-- First, verify auth.uid() is not NULL
SELECT 
    auth.uid() as current_user_id,
    CASE 
        WHEN auth.uid() IS NULL THEN '❌ auth.uid() is NULL - this is the problem!'
        ELSE '✅ auth.uid() is available'
    END as auth_status;

-- Test the helper functions with the actual user IDs from the error log
-- Replace these with your actual IDs:
-- Coach ID: <USER_ID>
-- Player ID: e163e9b2-55ea-49aa-a8e7-3c83bf550d74
-- Team ID: <TEAM_ID>

SELECT 
    'Testing is_coach_or_admin' as test_name,
    is_coach_or_admin(
        '<TEAM_ID>'::UUID,  -- team_id
        auth.uid()  -- coach user_id
    ) as is_coach,
    CASE 
        WHEN is_coach_or_admin('<TEAM_ID>'::UUID, auth.uid()) 
        THEN '✅ Coach check passed'
        ELSE '❌ Coach check failed'
    END as coach_check_result;

SELECT 
    'Testing is_user_in_team' as test_name,
    is_user_in_team(
        '<TEAM_ID>'::UUID,  -- team_id
        'e163e9b2-55ea-49aa-a8e7-3c83bf550d74'::UUID  -- player user_id
    ) as is_in_team,
    CASE 
        WHEN is_user_in_team('<TEAM_ID>'::UUID, 'e163e9b2-55ea-49aa-a8e7-3c83bf550d74'::UUID)
        THEN '✅ Player in team check passed'
        ELSE '❌ Player in team check failed'
    END as team_check_result;

-- Check if coach is in team_members or team_member_roles
SELECT 
    'Coach role check' as check_type,
    tm.role as team_members_role,
    tm.is_admin as team_members_is_admin,
    tmr.role as team_member_roles_role
FROM team_members tm
LEFT JOIN team_member_roles tmr ON tmr.team_id = tm.team_id AND tmr.user_id = tm.user_id
WHERE tm.team_id = '<TEAM_ID>'::UUID
AND tm.user_id = auth.uid();

-- Check if player is in team_members
SELECT 
    'Player membership check' as check_type,
    tm.role,
    tm.is_admin
FROM team_members tm
WHERE tm.team_id = '<TEAM_ID>'::UUID
AND tm.user_id = 'e163e9b2-55ea-49aa-a8e7-3c83bf550d74'::UUID;

-- Simulate the RLS policy check
SELECT 
    'RLS Policy Simulation' as test_name,
    is_coach_or_admin('<TEAM_ID>'::UUID, auth.uid()) as coach_check,
    is_user_in_team('<TEAM_ID>'::UUID, 'e163e9b2-55ea-49aa-a8e7-3c83bf550d74'::UUID) as player_check,
    CASE 
        WHEN is_coach_or_admin('<TEAM_ID>'::UUID, auth.uid())
         AND is_user_in_team('<TEAM_ID>'::UUID, 'e163e9b2-55ea-49aa-a8e7-3c83bf550d74'::UUID)
        THEN '✅ RLS policy should allow insert'
        ELSE '❌ RLS policy will reject insert'
    END as rls_result;

