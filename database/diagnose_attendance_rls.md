# Diagnosing Attendance RLS Policy Issue

## Problem
Getting `42501: new row violates row-level security policy for table "event_attendance"` when coaches try to manually mark attendance.

## Diagnostic Steps

### Step 1: Verify the function exists and works
```sql
-- Check if function exists
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'is_coach_or_admin';

-- Test the function with your actual values
-- Replace with your actual team_id and user_id (coach's auth.uid())
SELECT is_coach_or_admin(
    'YOUR_TEAM_ID'::uuid,
    'YOUR_USER_ID'::uuid
) AS function_result;
```

### Step 2: Check coach's role in both tables
```sql
-- Check team_member_roles
SELECT 
    'team_member_roles' AS source,
    role,
    team_id,
    user_id
FROM team_member_roles
WHERE team_id = 'YOUR_TEAM_ID'::uuid
AND user_id = 'YOUR_USER_ID'::uuid;

-- Check team_members
SELECT 
    'team_members' AS source,
    role,
    is_admin,
    team_id,
    user_id
FROM team_members
WHERE team_id = 'YOUR_TEAM_ID'::uuid
AND user_id = 'YOUR_USER_ID'::uuid;
```

### Step 3: Check target user (player) is in team_members
```sql
-- Replace with the player's user_id you're trying to mark
SELECT 
    team_id,
    user_id,
    role,
    is_admin
FROM team_members
WHERE team_id = 'YOUR_TEAM_ID'::uuid
AND user_id = 'PLAYER_USER_ID'::uuid;
```

### Step 4: List all INSERT policies on event_attendance
```sql
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'event_attendance'
AND cmd = 'INSERT';
```

### Step 5: Test the policy directly
```sql
-- This simulates what RLS will check
-- Replace with actual values from your manual check-in attempt
SELECT 
    is_coach_or_admin(
        'YOUR_TEAM_ID'::uuid,  -- event.team_id
        auth.uid()              -- coach's user_id
    ) AS coach_check,
    EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.team_id = 'YOUR_TEAM_ID'::uuid
        AND tm.user_id = 'PLAYER_USER_ID'::uuid  -- player being marked
    ) AS player_in_team;
```

### Step 6: Check if there are conflicting policies
```sql
-- Check all policies (not just INSERT)
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'event_attendance'
ORDER BY cmd, policyname;
```

### Step 7: Verify the policy was created correctly
```sql
-- Get the exact policy definition
SELECT 
    pol.polname AS policy_name,
    pol.polcmd AS command,
    pg_get_expr(pol.polqual, pol.polrelid) AS using_expression,
    pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check_expression
FROM pg_policy pol
JOIN pg_class pc ON pol.polrelid = pc.oid
WHERE pc.relname = 'event_attendance'
AND pol.polname = 'Coaches insert team attendance';
```

## Common Issues & Solutions

### Issue 1: Function returns false
- **Check**: Run Step 1 and 2
- **Solution**: Verify coach has role='coach' or is_admin=true in team_members, OR has role in ('head_coach', 'assistant_coach', 'team_admin') in team_member_roles

### Issue 2: Target user not in team_members
- **Check**: Run Step 3
- **Solution**: Ensure the player is added to team_members table

### Issue 3: Policy not created/updated
- **Check**: Run Step 4 and 7
- **Solution**: Re-run the fix SQL file

### Issue 4: Multiple conflicting policies
- **Check**: Run Step 6
- **Solution**: Ensure only one INSERT policy exists for coaches, or that policies use OR logic correctly

## Quick Test Query
Run this with your actual values to see all checks at once:

```sql
-- Replace these values:
-- @team_id: The team ID
-- @coach_user_id: The coach's auth.uid() 
-- @player_user_id: The player being marked

WITH checks AS (
    SELECT 
        -- Check 1: Coach in team_member_roles
        EXISTS (
            SELECT 1 FROM team_member_roles
            WHERE team_id = '@team_id'::uuid
            AND user_id = '@coach_user_id'::uuid
            AND role IN ('head_coach', 'assistant_coach', 'team_admin')
        ) AS coach_in_roles,
        
        -- Check 2: Coach in team_members
        EXISTS (
            SELECT 1 FROM team_members
            WHERE team_id = '@team_id'::uuid
            AND user_id = '@coach_user_id'::uuid
            AND (role = 'coach' OR is_admin = true)
        ) AS coach_in_members,
        
        -- Check 3: Function result
        is_coach_or_admin('@team_id'::uuid, '@coach_user_id'::uuid) AS function_result,
        
        -- Check 4: Player in team
        EXISTS (
            SELECT 1 FROM team_members
            WHERE team_id = '@team_id'::uuid
            AND user_id = '@player_user_id'::uuid
        ) AS player_in_team
)
SELECT 
    *,
    (coach_in_roles OR coach_in_members) AS coach_found_anywhere,
    (function_result AND player_in_team) AS policy_should_pass
FROM checks;
```

