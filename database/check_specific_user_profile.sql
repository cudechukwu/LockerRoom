-- SPECIFIC USER DIAGNOSTIC SCRIPT
-- Run this to check YOUR specific profile data

-- 1. Get your current user ID and team info
SELECT 
    'Your User Info' as info,
    auth.uid() as user_id,
    tm.team_id,
    tm.role,
    t.name as team_name
FROM team_members tm
JOIN teams t ON tm.team_id = t.id
WHERE tm.user_id = auth.uid();

-- 2. Check your user profile specifically
SELECT 
    'Your User Profile' as info,
    up.*
FROM user_profiles up
WHERE up.user_id = auth.uid();

-- 3. Check your team member profile specifically
SELECT 
    'Your Team Member Profile' as info,
    tmp.*
FROM team_member_profiles tmp
WHERE tmp.user_id = auth.uid();

-- 4. Check if there are any RLS policy issues
SELECT 
    'RLS Policies Check' as info,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('user_profiles', 'team_member_profiles')
ORDER BY tablename, policyname;
