-- Analyze why is_coach_or_admin is returning false
-- Run this to see exactly what the function is checking and why it fails

-- First, let's see what data exists for the coach
SELECT 
    '=== COACH DATA IN team_members ===' as section,
    tm.role as role,
    tm.is_admin as is_admin,
    tm.team_id,
    tm.user_id,
    CASE 
        WHEN tm.role = 'coach' THEN '✅ Has coach role'
        WHEN tm.is_admin = TRUE THEN '✅ Has is_admin = true'
        ELSE '❌ No coach indicators'
    END as analysis
FROM team_members tm
WHERE tm.team_id = 'ddced7b8-e45b-45f9-ac31-96b2045f40e8'::UUID
AND tm.user_id = auth.uid();

-- Check team_member_roles
SELECT 
    '=== COACH DATA IN team_member_roles ===' as section,
    tmr.role as role,
    tmr.team_id,
    tmr.user_id,
    CASE 
        WHEN tmr.role IN ('head_coach', 'assistant_coach', 'team_admin', 'position_coach') 
        THEN '✅ Has coach/admin role'
        ELSE '❌ Not a coach/admin role'
    END as analysis
FROM team_member_roles tmr
WHERE tmr.team_id = 'ddced7b8-e45b-45f9-ac31-96b2045f40e8'::UUID
AND tmr.user_id = auth.uid();

-- Now let's manually trace through the function logic
-- Step 1: Check team_member_roles first
SELECT 
    '=== STEP 1: Check team_member_roles ===' as step,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM team_member_roles tmr
            WHERE tmr.team_id = 'ddced7b8-e45b-45f9-ac31-96b2045f40e8'::UUID
            AND tmr.user_id = auth.uid()
        ) THEN 'Found in team_member_roles'
        ELSE 'NOT found in team_member_roles'
    END as result,
    (
        SELECT role FROM team_member_roles tmr
        WHERE tmr.team_id = 'ddced7b8-e45b-45f9-ac31-96b2045f40e8'::UUID
        AND tmr.user_id = auth.uid()
        LIMIT 1
    ) as found_role,
    CASE 
        WHEN (
            SELECT role FROM team_member_roles tmr
            WHERE tmr.team_id = 'ddced7b8-e45b-45f9-ac31-96b2045f40e8'::UUID
            AND tmr.user_id = auth.uid()
            LIMIT 1
        ) IN ('head_coach', 'assistant_coach', 'team_admin') 
        THEN '✅ Would return TRUE from step 1'
        ELSE '❌ Would continue to step 2'
    END as step1_result;

-- Step 2: Check team_members fallback
SELECT 
    '=== STEP 2: Check team_members fallback ===' as step,
    (
        SELECT role FROM team_members tm
        WHERE tm.team_id = 'ddced7b8-e45b-45f9-ac31-96b2045f40e8'::UUID
        AND tm.user_id = auth.uid()
        LIMIT 1
    ) as found_role,
    (
        SELECT is_admin FROM team_members tm
        WHERE tm.team_id = 'ddced7b8-e45b-45f9-ac31-96b2045f40e8'::UUID
        AND tm.user_id = auth.uid()
        LIMIT 1
    ) as is_admin,
    CASE 
        WHEN (
            SELECT role FROM team_members tm
            WHERE tm.team_id = 'ddced7b8-e45b-45f9-ac31-96b2045f40e8'::UUID
            AND tm.user_id = auth.uid()
            LIMIT 1
        ) = 'coach' 
        THEN '✅ role = coach - should return TRUE'
        WHEN (
            SELECT is_admin FROM team_members tm
            WHERE tm.team_id = 'ddced7b8-e45b-45f9-ac31-96b2045f40e8'::UUID
            AND tm.user_id = auth.uid()
            LIMIT 1
        ) = TRUE
        THEN '✅ is_admin = true - should return TRUE'
        ELSE '❌ Neither condition met - would return FALSE'
    END as step2_result;

-- Final function result
SELECT 
    '=== FINAL RESULT ===' as section,
    is_coach_or_admin(
        'ddced7b8-e45b-45f9-ac31-96b2045f40e8'::UUID,
        auth.uid()
    ) as function_result,
    CASE 
        WHEN is_coach_or_admin('ddced7b8-e45b-45f9-ac31-96b2045f40e8'::UUID, auth.uid())
        THEN '✅ Function returns TRUE'
        ELSE '❌ Function returns FALSE - THIS IS THE PROBLEM'
    END as final_status;

