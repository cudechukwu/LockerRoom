-- Fix RLS policy for coaches to insert attendance records
-- This allows coaches to manually mark attendance even if they only have a role in team_members
-- (not just team_member_roles)

-- Create SECURITY DEFINER function to check if user is a coach/admin (if it doesn't exist)
-- This checks both team_member_roles and team_members tables
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_coach_or_admin(UUID, UUID) TO authenticated;

-- Create helper function to check if user is in team
-- This avoids subquery scope issues in RLS policies
-- Checks both team_members and team_member_roles tables
-- (coaches might only be in team_member_roles, but still need attendance tracking)
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_user_in_team(UUID, UUID) TO authenticated;

-- Drop existing policy
DROP POLICY IF EXISTS "Coaches insert team attendance" ON event_attendance;

-- Recreate the INSERT policy using helper functions
-- This avoids subquery scope issues where columns get confused with aliases
CREATE POLICY "Coaches insert team attendance" ON event_attendance
    FOR INSERT
    WITH CHECK (
        -- Coach must be a coach/admin
        is_coach_or_admin(team_id, auth.uid())
        -- Target user must be a member of the team
        AND is_user_in_team(team_id, user_id)
    );

