-- Test RLS Policy with Simulated Insert
-- This will help us see what's happening

-- First, let's verify the current user is in the database
SELECT 
    'Current user in team_members' AS check_name,
    EXISTS (
        SELECT 1 FROM team_members
        WHERE user_id = '<USER_ID>'::uuid
        AND team_id = '<TEAM_ID>'::uuid
    ) AS in_team_members,
    (SELECT role FROM team_members WHERE user_id = '<USER_ID>'::uuid AND team_id = '<TEAM_ID>'::uuid) AS role,
    (SELECT is_admin FROM team_members WHERE user_id = '<USER_ID>'::uuid AND team_id = '<TEAM_ID>'::uuid) AS is_admin;

SELECT 
    'Current user in team_member_roles' AS check_name,
    EXISTS (
        SELECT 1 FROM team_member_roles
        WHERE user_id = '<USER_ID>'::uuid
        AND team_id = '<TEAM_ID>'::uuid
    ) AS in_team_member_roles,
    (SELECT role FROM team_member_roles WHERE user_id = '<USER_ID>'::uuid AND team_id = '<TEAM_ID>'::uuid) AS role;

-- Test the functions directly
SELECT 
    'Function test' AS check_name,
    is_coach_or_admin(
        '<TEAM_ID>'::uuid,
        '<USER_ID>'::uuid
    ) AS is_coach,
    is_user_in_team(
        '<TEAM_ID>'::uuid,
        'e163e9b2-55ea-49aa-a8e7-3c83bf550d74'::uuid
    ) AS target_in_team;

