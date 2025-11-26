-- Test RLS Policy for Manual Attendance Marking
-- This will help diagnose why manual attendance marking is failing

-- Step 1: Check current user (replace with your actual user ID)
-- Get your user ID from the app logs or Supabase auth.users table
SELECT 
    'Current User Check' AS test_name,
    auth.uid() AS current_user_id;

-- Step 2: Test is_coach_or_admin function
-- Replace 'YOUR_TEAM_ID' and 'YOUR_USER_ID' with actual values
SELECT 
    'Coach Check' AS test_name,
    is_coach_or_admin(
        'ddced7b8-e45b-45f9-ac31-96b2045f40e8'::uuid,  -- Your team ID
        auth.uid()  -- Current authenticated user
    ) AS is_coach;

-- Step 3: Test is_user_in_team for the coach being marked
-- Replace 'TARGET_USER_ID' with the coach you're trying to mark
SELECT 
    'Target User in Team Check' AS test_name,
    is_user_in_team(
        'ddced7b8-e45b-45f9-ac31-96b2045f40e8'::uuid,  -- Your team ID
        'e163e9b2-55ea-49aa-a8e7-3c83bf550d74'::uuid  -- Coach ID (Chiamaka from logs)
    ) AS target_in_team;

-- Step 4: Check if coach exists in team_members
SELECT 
    'Coach in team_members' AS test_name,
    EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.team_id = 'ddced7b8-e45b-45f9-ac31-96b2045f40e8'::uuid
        AND tm.user_id = 'e163e9b2-55ea-49aa-a8e7-3c83bf550d74'::uuid
    ) AS in_team_members;

-- Step 5: Check if coach exists in team_member_roles
SELECT 
    'Coach in team_member_roles' AS test_name,
    EXISTS (
        SELECT 1 FROM team_member_roles tmr
        WHERE tmr.team_id = 'ddced7b8-e45b-45f9-ac31-96b2045f40e8'::uuid
        AND tmr.user_id = 'e163e9b2-55ea-49aa-a8e7-3c83bf550d74'::uuid
    ) AS in_team_member_roles;

-- Step 6: Simulate the full RLS policy check
-- This simulates what happens when you try to insert attendance
SELECT 
    'Full RLS Policy Simulation' AS test_name,
    is_coach_or_admin(
        'ddced7b8-e45b-45f9-ac31-96b2045f40e8'::uuid,
        auth.uid()
    ) AS coach_check_passes,
    is_user_in_team(
        'ddced7b8-e45b-45f9-ac31-96b2045f40e8'::uuid,
        'e163e9b2-55ea-49aa-a8e7-3c83bf550d74'::uuid
    ) AS target_in_team_check_passes,
    (
        is_coach_or_admin('ddced7b8-e45b-45f9-ac31-96b2045f40e8'::uuid, auth.uid())
        AND is_user_in_team('ddced7b8-e45b-45f9-ac31-96b2045f40e8'::uuid, 'e163e9b2-55ea-49aa-a8e7-3c83bf550d74'::uuid)
    ) AS policy_should_allow;

-- Step 7: Check who is currently authenticated
-- This will show your current user ID
SELECT 
    'Who am I?' AS test_name,
    auth.uid() AS my_user_id,
    (SELECT email FROM auth.users WHERE id = auth.uid()) AS my_email;

