-- Verify the current user exists in the database and check their role

-- Check ALL team members (including the current user)
SELECT 
    'All team members' AS check_name,
    user_id,
    role,
    is_admin,
    team_id
FROM team_members
WHERE team_id = 'ddced7b8-e45b-45f9-ac31-96b2045f40e8'::uuid
ORDER BY role, user_id;

-- Check ALL team member roles
SELECT 
    'All team member roles' AS check_name,
    user_id,
    role,
    team_id
FROM team_member_roles
WHERE team_id = 'ddced7b8-e45b-45f9-ac31-96b2045f40e8'::uuid
ORDER BY role, user_id;

-- Specifically check if current user (8d99f216-1454-4500-9652-f87922774f5c) exists
SELECT 
    'Current user check' AS check_name,
    'team_members' AS source,
    user_id,
    role::text AS role,
    is_admin
FROM team_members
WHERE user_id = '8d99f216-1454-4500-9652-f87922774f5c'::uuid
AND team_id = 'ddced7b8-e45b-45f9-ac31-96b2045f40e8'::uuid

UNION ALL

SELECT 
    'Current user check' AS check_name,
    'team_member_roles' AS source,
    user_id,
    role::text AS role,
    NULL::boolean AS is_admin
FROM team_member_roles
WHERE user_id = '8d99f216-1454-4500-9652-f87922774f5c'::uuid
AND team_id = 'ddced7b8-e45b-45f9-ac31-96b2045f40e8'::uuid;

