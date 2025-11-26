-- Check User Role Directly (No auth.uid() needed)
-- Replace with your actual user ID: 8d99f216-1454-4500-9652-f87922774f5c

-- Check if user is in team_members
SELECT 
    'team_members' AS source,
    user_id,
    role,
    is_admin,
    team_id
FROM team_members
WHERE user_id = '8d99f216-1454-4500-9652-f87922774f5c'::uuid
AND team_id = 'ddced7b8-e45b-45f9-ac31-96b2045f40e8'::uuid;

-- Check if user is in team_member_roles
SELECT 
    'team_member_roles' AS source,
    user_id,
    role,
    team_id
FROM team_member_roles
WHERE user_id = '8d99f216-1454-4500-9652-f87922774f5c'::uuid
AND team_id = 'ddced7b8-e45b-45f9-ac31-96b2045f40e8'::uuid;

-- Test is_coach_or_admin function directly
SELECT 
    'is_coach_or_admin result' AS check_name,
    is_coach_or_admin(
        'ddced7b8-e45b-45f9-ac31-96b2045f40e8'::uuid,
        '8d99f216-1454-4500-9652-f87922774f5c'::uuid
    ) AS is_coach;

-- Check target user (Chiamaka) in team
SELECT 
    'Target user (Chiamaka) in team' AS check_name,
    EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.team_id = 'ddced7b8-e45b-45f9-ac31-96b2045f40e8'::uuid
        AND tm.user_id = 'e163e9b2-55ea-49aa-a8e7-3c83bf550d74'::uuid
    ) AS in_team_members,
    EXISTS (
        SELECT 1 FROM team_member_roles tmr
        WHERE tmr.team_id = 'ddced7b8-e45b-45f9-ac31-96b2045f40e8'::uuid
        AND tmr.user_id = 'e163e9b2-55ea-49aa-a8e7-3c83bf550d74'::uuid
    ) AS in_team_member_roles,
    is_user_in_team(
        'ddced7b8-e45b-45f9-ac31-96b2045f40e8'::uuid,
        'e163e9b2-55ea-49aa-a8e7-3c83bf550d74'::uuid
    ) AS is_in_team;

