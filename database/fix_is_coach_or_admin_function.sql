-- Fix the is_coach_or_admin function to properly detect coaches
-- The issue is that the function might not be checking team_members correctly
-- or the coach might only be in team_members with role='coach' or is_admin=true

-- Use CREATE OR REPLACE instead of DROP to avoid breaking dependent policies

CREATE OR REPLACE FUNCTION is_coach_or_admin(p_team_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    SET search_path = public;
    
    -- First check: Does user have a coach/admin role in team_member_roles?
    -- Use EXISTS for better performance and to avoid NULL issues
    IF EXISTS (
        SELECT 1 
        FROM team_member_roles
        WHERE team_id = p_team_id
        AND user_id = p_user_id
        AND role IN ('head_coach', 'assistant_coach', 'team_admin', 'position_coach')
    ) THEN
        RETURN TRUE;
    END IF;
    
    -- Second check: Does user have role='coach' in team_members?
    -- This handles coaches who are only in team_members (not team_member_roles)
    IF EXISTS (
        SELECT 1 
        FROM team_members
        WHERE team_id = p_team_id
        AND user_id = p_user_id
        AND role = 'coach'
    ) THEN
        RETURN TRUE;
    END IF;
    
    -- Third check: Does user have is_admin=true in team_members?
    -- This handles admins who are only in team_members
    IF EXISTS (
        SELECT 1 
        FROM team_members
        WHERE team_id = p_team_id
        AND user_id = p_user_id
        AND is_admin = TRUE
    ) THEN
        RETURN TRUE;
    END IF;
    
    -- If none of the above checks passed, user is not a coach/admin
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_coach_or_admin(UUID, UUID) TO authenticated;

-- Test the function (replace with your actual IDs)
-- SELECT is_coach_or_admin('<TEAM_ID>'::UUID, auth.uid());

