-- Complete Fix for Attendance RLS Policy
-- This will drop all INSERT policies and recreate the correct one

-- Step 1: Drop ALL existing INSERT policies on event_attendance
DROP POLICY IF EXISTS "Coaches insert team attendance" ON event_attendance;
DROP POLICY IF EXISTS "Players insert own attendance" ON event_attendance;
DROP POLICY IF EXISTS "Users can insert attendance" ON event_attendance;
-- Drop any other INSERT policies that might exist
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'event_attendance' 
        AND cmd = 'INSERT'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON event_attendance';
    END LOOP;
END $$;

-- Step 2: Ensure the helper functions exist and are correct
CREATE OR REPLACE FUNCTION is_coach_or_admin(p_team_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_role VARCHAR(50);
    v_is_admin BOOLEAN;
BEGIN
    SET search_path = public;
    
    -- First check team_member_roles table
    SELECT role INTO v_role
    FROM team_member_roles
    WHERE team_id = p_team_id
    AND user_id = p_user_id;
    
    -- If found in team_member_roles, check if it's a coach/admin role
    IF v_role IS NOT NULL THEN
        RETURN v_role IN ('head_coach', 'assistant_coach', 'team_admin');
    END IF;
    
    -- Fallback: Check team_members table for role or is_admin
    SELECT role, is_admin INTO v_role, v_is_admin
    FROM team_members
    WHERE team_id = p_team_id
    AND user_id = p_user_id;
    
    -- Return true if role is 'coach' or is_admin is true
    IF v_role = 'coach' OR v_is_admin = TRUE THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION is_coach_or_admin(UUID, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION is_user_in_team(p_team_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    SET search_path = public;
    
    -- Check if user is in team_members table
    IF EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.team_id = p_team_id
        AND tm.user_id = p_user_id
    ) THEN
        RETURN TRUE;
    END IF;
    
    -- Also check if user is in team_member_roles table (for coaches/admins)
    IF EXISTS (
        SELECT 1 FROM team_member_roles tmr
        WHERE tmr.team_id = p_team_id
        AND tmr.user_id = p_user_id
    ) THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION is_user_in_team(UUID, UUID) TO authenticated;

-- Step 3: Create the INSERT policy for coaches to mark attendance
-- This allows coaches/admins to insert attendance for any team member
CREATE POLICY "Coaches insert team attendance" ON event_attendance
    FOR INSERT
    WITH CHECK (
        -- Coach must be a coach/admin (check using auth.uid() from the request context)
        is_coach_or_admin(team_id, auth.uid())
        -- Target user must be a member of the team
        AND is_user_in_team(team_id, user_id)
    );

-- Step 4: Verify the policy was created
SELECT 
    'Policy created' AS status,
    policyname,
    cmd,
    with_check AS policy_condition
FROM pg_policies
WHERE tablename = 'event_attendance'
AND cmd = 'INSERT';

