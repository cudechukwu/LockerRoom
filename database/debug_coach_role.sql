-- Debug query to see exactly what role data exists for the coach
-- Run this in Supabase SQL Editor while logged in as the coach

-- Check what's in team_members for the coach
SELECT 
    'team_members check' as source,
    tm.role as role,
    tm.is_admin as is_admin,
    tm.team_id,
    tm.user_id,
    CASE 
        WHEN tm.role = 'coach' THEN '✅ Found coach role in team_members'
        WHEN tm.is_admin = TRUE THEN '✅ Found is_admin = true in team_members'
        ELSE '❌ Not a coach in team_members'
    END as status
FROM team_members tm
WHERE tm.team_id = 'ddced7b8-e45b-45f9-ac31-96b2045f40e8'::UUID
AND tm.user_id = auth.uid();

-- Check what's in team_member_roles for the coach
SELECT 
    'team_member_roles check' as source,
    tmr.role as role,
    tmr.team_id,
    tmr.user_id,
    CASE 
        WHEN tmr.role IN ('head_coach', 'assistant_coach', 'team_admin', 'position_coach') 
        THEN '✅ Found coach/admin role in team_member_roles'
        ELSE '❌ Not a coach in team_member_roles'
    END as status
FROM team_member_roles tmr
WHERE tmr.team_id = 'ddced7b8-e45b-45f9-ac31-96b2045f40e8'::UUID
AND tmr.user_id = auth.uid();

-- Test the function directly
SELECT 
    'Function test' as test,
    is_coach_or_admin(
        'ddced7b8-e45b-45f9-ac31-96b2045f40e8'::UUID,
        auth.uid()
    ) as result,
    CASE 
        WHEN is_coach_or_admin('ddced7b8-e45b-45f9-ac31-96b2045f40e8'::UUID, auth.uid())
        THEN '✅ Function returns TRUE'
        ELSE '❌ Function returns FALSE'
    END as status;

