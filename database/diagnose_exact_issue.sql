-- Diagnostic Query with Your Exact Values
-- Current User (trying to mark): <USER_ID>
-- Target User (being marked): e163e9b2-55ea-49aa-a8e7-3c83bf550d74
-- Team ID: <TEAM_ID>

-- Step 1: Check if current user is in team_members
SELECT 
    'Current User in team_members' AS check_name,
    EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.team_id = '<TEAM_ID>'::uuid
        AND tm.user_id = '<USER_ID>'::uuid
    ) AS result,
    (SELECT role FROM team_members WHERE team_id = '<TEAM_ID>'::uuid AND user_id = '<USER_ID>'::uuid) AS role_in_team_members,
    (SELECT is_admin FROM team_members WHERE team_id = '<TEAM_ID>'::uuid AND user_id = '<USER_ID>'::uuid) AS is_admin_in_team_members;

-- Step 2: Check if current user is in team_member_roles
SELECT 
    'Current User in team_member_roles' AS check_name,
    EXISTS (
        SELECT 1 FROM team_member_roles tmr
        WHERE tmr.team_id = '<TEAM_ID>'::uuid
        AND tmr.user_id = '<USER_ID>'::uuid
    ) AS result,
    (SELECT role FROM team_member_roles WHERE team_id = '<TEAM_ID>'::uuid AND user_id = '<USER_ID>'::uuid) AS role_in_team_member_roles;

-- Step 3: Test is_coach_or_admin function for current user
SELECT 
    'is_coach_or_admin check (current user)' AS check_name,
    is_coach_or_admin(
        '<TEAM_ID>'::uuid,
        '<USER_ID>'::uuid
    ) AS result;

-- Step 4: Check if target user (Chiamaka) is in team_members
SELECT 
    'Target User in team_members' AS check_name,
    EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.team_id = '<TEAM_ID>'::uuid
        AND tm.user_id = 'e163e9b2-55ea-49aa-a8e7-3c83bf550d74'::uuid
    ) AS result,
    (SELECT role FROM team_members WHERE team_id = '<TEAM_ID>'::uuid AND user_id = 'e163e9b2-55ea-49aa-a8e7-3c83bf550d74'::uuid) AS role_in_team_members;

-- Step 5: Check if target user (Chiamaka) is in team_member_roles
SELECT 
    'Target User in team_member_roles' AS check_name,
    EXISTS (
        SELECT 1 FROM team_member_roles tmr
        WHERE tmr.team_id = '<TEAM_ID>'::uuid
        AND tmr.user_id = 'e163e9b2-55ea-49aa-a8e7-3c83bf550d74'::uuid
    ) AS result,
    (SELECT role FROM team_member_roles WHERE team_id = '<TEAM_ID>'::uuid AND user_id = 'e163e9b2-55ea-49aa-a8e7-3c83bf550d74'::uuid) AS role_in_team_member_roles;

-- Step 6: Test is_user_in_team function for target user
SELECT 
    'is_user_in_team check (target user)' AS check_name,
    is_user_in_team(
        '<TEAM_ID>'::uuid,
        'e163e9b2-55ea-49aa-a8e7-3c83bf550d74'::uuid
    ) AS result;

-- Step 7: Full RLS policy simulation (what the policy actually checks)
SELECT 
    'Full RLS Policy Check' AS check_name,
    is_coach_or_admin(
        '<TEAM_ID>'::uuid,
        '<USER_ID>'::uuid
    ) AS coach_check_passes,
    is_user_in_team(
        '<TEAM_ID>'::uuid,
        'e163e9b2-55ea-49aa-a8e7-3c83bf550d74'::uuid
    ) AS target_in_team_check_passes,
    (
        is_coach_or_admin('<TEAM_ID>'::uuid, '<USER_ID>'::uuid)
        AND is_user_in_team('<TEAM_ID>'::uuid, 'e163e9b2-55ea-49aa-a8e7-3c83bf550d74'::uuid)
    ) AS policy_should_allow;

-- Step 8: Check what auth.uid() returns (if running as authenticated user)
-- This will only work if you're logged in as the user in Supabase SQL Editor
SELECT 
    'Current Auth User' AS check_name,
    auth.uid() AS current_auth_user_id,
    CASE 
        WHEN auth.uid() = '<USER_ID>'::uuid THEN 'Matches current user ✓'
        ELSE 'Does NOT match current user ✗'
    END AS auth_match;

