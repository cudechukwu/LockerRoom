-- Complete Fix for Attendance RPC Function and RLS
-- This fixes both the type casting issue and ensures RLS policies allow coaches to insert

-- =============================================
-- Step 1: Fix the RPC Function with proper type casts
-- =============================================

CREATE OR REPLACE FUNCTION insert_event_attendance_manual(
  p_event_id UUID,
  p_user_id UUID,
  p_team_id UUID,
  p_status VARCHAR DEFAULT 'present',
  p_check_in_method VARCHAR DEFAULT 'manual',
  p_checked_in_at TIMESTAMPTZ DEFAULT NOW(),
  p_is_late BOOLEAN DEFAULT FALSE,
  p_late_minutes INTEGER DEFAULT NULL,
  p_late_category VARCHAR DEFAULT 'on_time'
)
RETURNS event_attendance AS $$
DECLARE
  v_current_user_id UUID;
  v_result event_attendance;
BEGIN
  -- Set search_path explicitly to avoid issues
  SET search_path = public;
  
  -- Get current user from auth context (this should work in SECURITY DEFINER)
  v_current_user_id := auth.uid();
  
  -- Verify we have an authenticated user
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated - auth.uid() is NULL';
  END IF;
  
  -- Verify current user is coach/admin
  IF NOT is_coach_or_admin(p_team_id, v_current_user_id) THEN
    RAISE EXCEPTION 'Not authorized to mark attendance - user is not a coach/admin';
  END IF;
  
  -- Verify target user is in team
  IF NOT is_user_in_team(p_team_id, p_user_id) THEN
    RAISE EXCEPTION 'Target user is not a member of the team';
  END IF;
  
  -- Check if attendance already exists (non-deleted)
  IF EXISTS (
    SELECT 1 FROM event_attendance
    WHERE event_id = p_event_id
    AND user_id = p_user_id
    AND is_deleted = FALSE
  ) THEN
    -- Update existing record
    UPDATE event_attendance
    SET 
      status = p_status::attendance_status, -- Cast VARCHAR to ENUM
      is_late = p_is_late,
      late_minutes = p_late_minutes,
      late_category = p_late_category,
      updated_at = NOW()
    WHERE event_id = p_event_id
    AND user_id = p_user_id
    AND is_deleted = FALSE
    RETURNING * INTO v_result;
  ELSE
    -- Insert new record
    INSERT INTO event_attendance (
      event_id,
      user_id,
      team_id,
      check_in_method,
      checked_in_at,
      status,
      is_late,
      late_minutes,
      late_category,
      device_fingerprint,
      is_flagged,
      is_deleted
    ) VALUES (
      p_event_id,
      p_user_id,
      p_team_id,
      p_check_in_method::check_in_method_type, -- Cast VARCHAR to ENUM
      p_checked_in_at,
      p_status::attendance_status, -- Cast VARCHAR to ENUM
      p_is_late,
      p_late_minutes,
      p_late_category,
      NULL, -- Manual check-ins have no device fingerprint
      FALSE,
      FALSE
    )
    RETURNING * INTO v_result;
  END IF;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION insert_event_attendance_manual(
  UUID, UUID, UUID, VARCHAR, VARCHAR, TIMESTAMPTZ, BOOLEAN, INTEGER, VARCHAR
) TO authenticated;

-- =============================================
-- Step 2: Ensure RLS policies allow coaches to insert
-- (Even though SECURITY DEFINER should bypass RLS, 
--  we ensure the policy exists for direct inserts)
-- =============================================

-- Drop existing INSERT policies
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

-- Ensure helper functions exist
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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

GRANT EXECUTE ON FUNCTION is_user_in_team(UUID, UUID) TO authenticated;

-- Create the INSERT policy for coaches to mark attendance
-- This allows coaches/admins to insert attendance for any team member
CREATE POLICY "Coaches insert team attendance" ON event_attendance
    FOR INSERT
    WITH CHECK (
        -- Coach must be a coach/admin (check using auth.uid() from the request context)
        is_coach_or_admin(team_id, auth.uid())
        -- Target user must be a member of the team
        AND is_user_in_team(team_id, user_id)
    );

-- Also allow players to insert their own attendance (for QR code/location check-ins)
CREATE POLICY "Players insert own attendance" ON event_attendance
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        AND is_user_in_team(team_id, user_id)
    );

-- Verify the policies were created
SELECT 
    'Policy created' AS status,
    policyname,
    cmd,
    with_check AS policy_condition
FROM pg_policies
WHERE tablename = 'event_attendance'
AND cmd = 'INSERT'
ORDER BY policyname;

