-- Fix RLS policies for attendance_groups
-- Issue: Policies check team_member_roles, but users might only have roles in team_members
-- Solution: Create helper function that checks both tables

-- Drop existing policies
DROP POLICY IF EXISTS "Coaches can insert attendance groups" ON attendance_groups;
DROP POLICY IF EXISTS "Coaches can update attendance groups" ON attendance_groups;
DROP POLICY IF EXISTS "Coaches can delete attendance groups" ON attendance_groups;
DROP POLICY IF EXISTS "Coaches can insert group members" ON attendance_group_members;
DROP POLICY IF EXISTS "Coaches can delete group members" ON attendance_group_members;

-- Create SECURITY DEFINER function to check if user is a coach/admin
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

-- Recreate policies using the helper function

-- Coaches can insert groups
CREATE POLICY "Coaches can insert attendance groups" ON attendance_groups
    FOR INSERT
    WITH CHECK (
        is_coach_or_admin(team_id, auth.uid())
    );

-- Coaches can update groups
CREATE POLICY "Coaches can update attendance groups" ON attendance_groups
    FOR UPDATE
    USING (
        is_coach_or_admin(team_id, auth.uid())
    )
    WITH CHECK (
        is_coach_or_admin(team_id, auth.uid())
    );

-- Coaches can delete groups
CREATE POLICY "Coaches can delete attendance groups" ON attendance_groups
    FOR DELETE
    USING (
        is_coach_or_admin(team_id, auth.uid())
    );

-- Coaches can insert group members
CREATE POLICY "Coaches can insert group members" ON attendance_group_members
    FOR INSERT
    WITH CHECK (
        is_coach_or_admin(team_id, auth.uid())
    );

-- Coaches can delete group members
CREATE POLICY "Coaches can delete group members" ON attendance_group_members
    FOR DELETE
    USING (
        is_coach_or_admin(team_id, auth.uid())
    );

