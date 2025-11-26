-- Diagnostic Queries for the 5 Root Causes
-- Run each section to check for the specific issue

-- ============================================
-- CAUSE 1: Check if auth.uid() is NULL in RLS context
-- ============================================
-- This will show what auth.uid() returns when evaluated in a policy-like context
SELECT 
    'CAUSE 1: auth.uid() check' AS diagnostic,
    auth.uid() AS auth_uid_value,
    CASE 
        WHEN auth.uid() IS NULL THEN '❌ PROBLEM: auth.uid() is NULL - RLS will fail'
        WHEN auth.uid() = '8d99f216-1454-4500-9652-f87922774f5c'::uuid THEN '✅ CORRECT: auth.uid() matches expected user'
        ELSE '⚠️ WARNING: auth.uid() is different from expected user'
    END AS status;

-- ============================================
-- CAUSE 3: Check for ALL INSERT policies (including conflicting ones)
-- ============================================
SELECT 
    'CAUSE 3: All INSERT policies' AS diagnostic,
    policyname,
    cmd,
    permissive,
    roles,
    qual AS using_expression,
    with_check AS with_check_expression,
    CASE 
        WHEN qual IS NOT NULL AND qual LIKE '%false%' THEN '❌ PROBLEM: USING clause denies all'
        WHEN with_check IS NULL THEN '⚠️ WARNING: No WITH CHECK clause'
        ELSE '✅ OK'
    END AS status
FROM pg_policies
WHERE tablename = 'event_attendance'
AND cmd = 'INSERT'
ORDER BY policyname;

-- Get exact policy definitions
SELECT 
    'CAUSE 3: Exact policy definitions' AS diagnostic,
    pol.polname AS policy_name,
    pol.polcmd AS command,
    pol.polpermissive AS permissive,
    pg_get_expr(pol.polqual, pol.polrelid) AS using_expression,
    pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check_expression,
    CASE 
        WHEN pg_get_expr(pol.polqual, pol.polrelid) LIKE '%false%' THEN '❌ PROBLEM: USING denies all'
        ELSE '✅ OK'
    END AS status
FROM pg_policy pol
JOIN pg_class pc ON pol.polrelid = pc.oid
WHERE pc.relname = 'event_attendance'
AND pol.polcmd = 'INSERT';

-- ============================================
-- CAUSE 4: Check SECURITY DEFINER function permissions
-- ============================================
SELECT 
    'CAUSE 4: Function permissions' AS diagnostic,
    p.proname AS function_name,
    p.prosecdef AS is_security_definer,
    p.proowner::regrole AS function_owner,
    n.nspname AS schema_name,
    CASE 
        WHEN p.prosecdef = false THEN '❌ PROBLEM: Not SECURITY DEFINER'
        WHEN n.nspname != 'public' THEN '⚠️ WARNING: Not in public schema'
        ELSE '✅ OK'
    END AS status,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN ('is_coach_or_admin', 'is_user_in_team')
ORDER BY p.proname;

-- Check function grants
SELECT 
    'CAUSE 4: Function grants' AS diagnostic,
    p.proname AS function_name,
    r.rolname AS granted_to,
    CASE 
        WHEN r.rolname = 'authenticated' THEN '✅ OK: Granted to authenticated'
        WHEN r.rolname = 'anon' THEN '⚠️ WARNING: Also granted to anon'
        ELSE 'ℹ️ INFO'
    END AS status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
JOIN pg_depend d ON d.objid = p.oid
JOIN pg_roles r ON r.oid = d.refobjid
WHERE n.nspname = 'public'
AND p.proname IN ('is_coach_or_admin', 'is_user_in_team')
AND d.deptype = 'a'
ORDER BY p.proname, r.rolname;

-- ============================================
-- CAUSE 5: Check for RLS caching issues
-- ============================================
SELECT 
    'CAUSE 5: RLS status' AS diagnostic,
    schemaname,
    tablename,
    rowsecurity AS rls_enabled,
    CASE 
        WHEN rowsecurity = false THEN '❌ PROBLEM: RLS is disabled'
        ELSE '✅ OK: RLS is enabled'
    END AS status
FROM pg_tables
WHERE tablename = 'event_attendance';

-- Check when policies were last modified (if possible)
SELECT 
    'CAUSE 5: Policy modification check' AS diagnostic,
    pol.polname AS policy_name,
    pol.polcmd AS command,
    'Check Supabase dashboard for last modified time' AS note
FROM pg_policy pol
JOIN pg_class pc ON pol.polrelid = pc.oid
WHERE pc.relname = 'event_attendance'
AND pol.polcmd = 'INSERT';

