-- Get Current RLS Policies for event_attendance table
-- Run this in Supabase SQL Editor to see all current policies

-- 1. Get all policies on event_attendance table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd AS command,
    qual AS using_expression,
    with_check AS with_check_expression
FROM pg_policies
WHERE tablename = 'event_attendance'
ORDER BY cmd, policyname;

-- 2. Get the exact policy definitions from pg_policy (more detailed)
SELECT 
    pol.polname AS policy_name,
    pol.polcmd AS command,
    pol.polpermissive AS permissive,
    pol.polroles AS roles,
    pg_get_expr(pol.polqual, pol.polrelid) AS using_expression,
    pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check_expression,
    pc.relname AS table_name
FROM pg_policy pol
JOIN pg_class pc ON pol.polrelid = pc.oid
WHERE pc.relname = 'event_attendance'
ORDER BY pol.polcmd, pol.polname;

-- 3. Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity AS rls_enabled
FROM pg_tables
WHERE tablename = 'event_attendance';

-- 4. Get the helper functions we created
SELECT 
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN ('is_coach_or_admin', 'is_user_in_team')
ORDER BY p.proname;

