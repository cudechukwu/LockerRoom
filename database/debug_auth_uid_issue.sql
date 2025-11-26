-- Debug why is_coach_or_admin returns FALSE even though app code finds the role
-- The app shows role="team_admin" but the function returns FALSE

-- First, check if auth.uid() is NULL (this would explain everything)
SELECT 
    'auth.uid() check' as test,
    auth.uid() as current_user_id,
    CASE 
        WHEN auth.uid() IS NULL THEN '❌ auth.uid() IS NULL - This is the problem!'
        ELSE '✅ auth.uid() is available'
    END as status;

-- Check what the app code sees (using the actual user ID from logs: 8d99f216-1454-4500-9652-f87922774f5c)
SELECT 
    'App code view (using explicit user ID)' as test,
    '8d99f216-1454-4500-9652-f87922774f5c'::UUID as user_id,
    (
        SELECT role FROM team_member_roles
        WHERE team_id = 'ddced7b8-e45b-45f9-ac31-96b2045f40e8'::UUID
        AND user_id = '8d99f216-1454-4500-9652-f87922774f5c'::UUID
    ) as role_in_team_member_roles,
    (
        SELECT role FROM team_members
        WHERE team_id = 'ddced7b8-e45b-45f9-ac31-96b2045f40e8'::UUID
        AND user_id = '8d99f216-1454-4500-9652-f87922774f5c'::UUID
    ) as role_in_team_members,
    (
        SELECT is_admin FROM team_members
        WHERE team_id = 'ddced7b8-e45b-45f9-ac31-96b2045f40e8'::UUID
        AND user_id = '8d99f216-1454-4500-9652-f87922774f5c'::UUID
    ) as is_admin_in_team_members;

-- Test the function with explicit user ID (not auth.uid())
SELECT 
    'Function test with explicit user ID' as test,
    is_coach_or_admin(
        'ddced7b8-e45b-45f9-ac31-96b2045f40e8'::UUID,
        '8d99f216-1454-4500-9652-f87922774f5c'::UUID
    ) as function_result,
    CASE 
        WHEN is_coach_or_admin('ddced7b8-e45b-45f9-ac31-96b2045f40e8'::UUID, '8d99f216-1454-4500-9652-f87922774f5c'::UUID)
        THEN '✅ Function works with explicit ID'
        ELSE '❌ Function fails even with explicit ID - function logic is wrong'
    END as status;

-- Test the function with auth.uid() (what RLS uses)
SELECT 
    'Function test with auth.uid()' as test,
    auth.uid() as current_user_id,
    is_coach_or_admin(
        'ddced7b8-e45b-45f9-ac31-96b2045f40e8'::UUID,
        auth.uid()
    ) as function_result,
    CASE 
        WHEN auth.uid() IS NULL THEN '❌ auth.uid() is NULL - RLS will fail'
        WHEN is_coach_or_admin('ddced7b8-e45b-45f9-ac31-96b2045f40e8'::UUID, auth.uid())
        THEN '✅ Function works with auth.uid()'
        ELSE '❌ Function fails with auth.uid()'
    END as status;

-- Check if user_id matches
SELECT 
    'User ID comparison' as test,
    auth.uid() as auth_uid,
    '8d99f216-1454-4500-9652-f87922774f5c'::UUID as expected_user_id,
    CASE 
        WHEN auth.uid() = '8d99f216-1454-4500-9652-f87922774f5c'::UUID THEN '✅ IDs match'
        WHEN auth.uid() IS NULL THEN '❌ auth.uid() is NULL'
        ELSE '❌ IDs do not match'
    END as comparison;

