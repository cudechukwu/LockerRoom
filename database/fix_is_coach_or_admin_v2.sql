-- Fix is_coach_or_admin function - Version 2
-- This version adds more debugging and handles edge cases
-- The issue might be that the function isn't finding team_admin role

CREATE OR REPLACE FUNCTION is_coach_or_admin(p_team_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_found BOOLEAN := FALSE;
BEGIN
    SET search_path = public;
    
    -- Check 1: team_member_roles with coach/admin roles
    -- This should catch 'team_admin', 'head_coach', 'assistant_coach', 'position_coach'
    SELECT EXISTS (
        SELECT 1 
        FROM team_member_roles
        WHERE team_id = p_team_id
        AND user_id = p_user_id
        AND role IN ('head_coach', 'assistant_coach', 'team_admin', 'position_coach')
    ) INTO v_found;
    
    IF v_found THEN
        RETURN TRUE;
    END IF;
    
    -- Check 2: team_members with role='coach'
    SELECT EXISTS (
        SELECT 1 
        FROM team_members
        WHERE team_id = p_team_id
        AND user_id = p_user_id
        AND role = 'coach'
    ) INTO v_found;
    
    IF v_found THEN
        RETURN TRUE;
    END IF;
    
    -- Check 3: team_members with is_admin=TRUE
    SELECT EXISTS (
        SELECT 1 
        FROM team_members
        WHERE team_id = p_team_id
        AND user_id = p_user_id
        AND is_admin = TRUE
    ) INTO v_found;
    
    IF v_found THEN
        RETURN TRUE;
    END IF;
    
    -- If we get here, user is not a coach/admin
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_coach_or_admin(UUID, UUID) TO authenticated;

-- Test query (run this after updating the function)
-- SELECT is_coach_or_admin('<TEAM_ID>'::UUID, '<USER_ID>'::UUID);

