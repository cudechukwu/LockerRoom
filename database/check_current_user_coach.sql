-- Quick check: Is the current user (8d99f216-1454-4500-9652-f87922774f5c) a coach/admin?

-- Check in team_members
SELECT 
    'Your role in team_members' AS check_name,
    role,
    is_admin,
    CASE 
        WHEN role = 'coach' THEN 'YES - You are a coach ✓'
        WHEN is_admin = TRUE THEN 'YES - You are an admin ✓'
        ELSE 'NO - You are not a coach/admin ✗'
    END AS coach_status
FROM team_members
WHERE user_id = '8d99f216-1454-4500-9652-f87922774f5c'::uuid
AND team_id = 'ddced7b8-e45b-45f9-ac31-96b2045f40e8'::uuid;

-- Check in team_member_roles
SELECT 
    'Your role in team_member_roles' AS check_name,
    role,
    CASE 
        WHEN role IN ('head_coach', 'assistant_coach', 'team_admin') THEN 'YES - You are a coach/admin ✓'
        ELSE 'NO - You are not a coach/admin ✗'
    END AS coach_status
FROM team_member_roles
WHERE user_id = '8d99f216-1454-4500-9652-f87922774f5c'::uuid
AND team_id = 'ddced7b8-e45b-45f9-ac31-96b2045f40e8'::uuid;

-- Final check: Does is_coach_or_admin return true?
SELECT 
    'Final coach check' AS check_name,
    is_coach_or_admin(
        'ddced7b8-e45b-45f9-ac31-96b2045f40e8'::uuid,
        '8d99f216-1454-4500-9652-f87922774f5c'::uuid
    ) AS is_coach,
    CASE 
        WHEN is_coach_or_admin('ddced7b8-e45b-45f9-ac31-96b2045f40e8'::uuid, '8d99f216-1454-4500-9652-f87922774f5c'::uuid) = TRUE 
        THEN 'YES - You can mark attendance ✓'
        ELSE 'NO - You cannot mark attendance ✗ (This is why RLS is blocking you)'
    END AS can_mark_attendance;

