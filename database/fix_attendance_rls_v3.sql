-- Fix v3: Use direct checks in the policy instead of passing auth.uid() to functions
-- This avoids potential issues with auth context in SECURITY DEFINER functions

-- Drop existing policy
DROP POLICY IF EXISTS "Coaches insert team attendance" ON event_attendance;

-- Create policy with direct checks (no function calls for auth.uid())
-- This checks auth.uid() directly in the policy context
CREATE POLICY "Coaches insert team attendance" ON event_attendance
    FOR INSERT
    WITH CHECK (
        -- Ensure auth.uid() is not null
        auth.uid() IS NOT NULL
        -- Check if current user is a coach/admin (direct check in policy)
        AND (
            -- Check team_member_roles first
            EXISTS (
                SELECT 1 FROM team_member_roles tmr
                WHERE tmr.team_id = event_attendance.team_id
                AND tmr.user_id = auth.uid()
                AND tmr.role IN ('head_coach', 'assistant_coach', 'team_admin')
            )
            -- OR check team_members
            OR EXISTS (
                SELECT 1 FROM team_members tm
                WHERE tm.team_id = event_attendance.team_id
                AND tm.user_id = auth.uid()
                AND (tm.role = 'coach' OR tm.is_admin = TRUE)
            )
        )
        -- Target user must be in the team (direct check)
        AND (
            EXISTS (
                SELECT 1 FROM team_members tm
                WHERE tm.team_id = event_attendance.team_id
                AND tm.user_id = event_attendance.user_id
            )
            OR EXISTS (
                SELECT 1 FROM team_member_roles tmr
                WHERE tmr.team_id = event_attendance.team_id
                AND tmr.user_id = event_attendance.user_id
            )
        )
    );

-- Verify the policy
SELECT 
    'Policy recreated (v3 - direct checks)' AS status,
    policyname,
    cmd,
    with_check AS policy_condition
FROM pg_policies
WHERE tablename = 'event_attendance'
AND cmd = 'INSERT';

