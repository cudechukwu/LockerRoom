-- Fix infinite recursion in team_member_roles RLS policy
-- The issue: Policy checks team_member_roles which triggers itself
-- Solution: Use SECURITY DEFINER function to bypass RLS

-- Drop the problematic policy
DROP POLICY IF EXISTS "Admins can manage roles" ON team_member_roles;

-- Create a SECURITY DEFINER function to check if user can manage roles
-- This function bypasses RLS, preventing infinite recursion
CREATE OR REPLACE FUNCTION can_manage_roles(p_team_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_role VARCHAR(50);
BEGIN
    -- Query team_member_roles directly (bypasses RLS due to SECURITY DEFINER)
    SELECT role INTO v_role
    FROM team_member_roles
    WHERE team_id = p_team_id
    AND user_id = p_user_id;
    
    -- Return true if user is head_coach or team_admin
    RETURN v_role IN ('head_coach', 'team_admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the policy using the function
CREATE POLICY "Admins can manage roles" ON team_member_roles
    FOR ALL
    USING (can_manage_roles(team_id, auth.uid()));

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION can_manage_roles(UUID, UUID) TO authenticated;

