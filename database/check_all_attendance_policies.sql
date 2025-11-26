-- Check all INSERT policies on event_attendance table

-- List all INSERT policies
SELECT 
    policyname,
    cmd,
    qual AS using_expression,
    with_check AS with_check_expression
FROM pg_policies
WHERE tablename = 'event_attendance'
AND cmd = 'INSERT'
ORDER BY policyname;

-- Get the exact policy definition from pg_policy
SELECT 
    pol.polname AS policy_name,
    pol.polcmd AS command,
    pg_get_expr(pol.polqual, pol.polrelid) AS using_expression,
    pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check_expression
FROM pg_policy pol
JOIN pg_class pc ON pol.polrelid = pc.oid
WHERE pc.relname = 'event_attendance'
AND pol.polcmd = 'INSERT';

-- Check if RLS is enabled on the table
SELECT 
    schemaname,
    tablename,
    rowsecurity AS rls_enabled
FROM pg_tables
WHERE tablename = 'event_attendance';

