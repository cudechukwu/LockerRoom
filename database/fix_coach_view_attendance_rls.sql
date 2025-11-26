-- Fix RLS Policy: Coaches can't view attendance because policy only checks team_member_roles
-- This updates the SELECT policy to also check team_members table (like is_coach_or_admin function does)

-- Drop the existing policy
DROP POLICY IF EXISTS "Coaches view team attendance" ON event_attendance;

-- Recreate the policy with fallback to team_members
CREATE POLICY "Coaches view team attendance" ON event_attendance
    FOR SELECT
    USING (
        is_deleted = FALSE
        AND (
            -- Check 1: User is in team_member_roles with coach/admin role
            EXISTS (
                SELECT 1 FROM team_member_roles tmr
                WHERE tmr.team_id = event_attendance.team_id
                AND tmr.user_id = auth.uid()
                AND (
                    tmr.role IN ('head_coach', 'assistant_coach', 'team_admin')
                    OR (
                        tmr.role = 'position_coach'
                        AND EXISTS (
                            SELECT 1 FROM team_position_groups tpg
                            WHERE tpg.user_id = event_attendance.user_id
                            AND tpg.assigned_coach_id = auth.uid()
                        )
                    )
                )
            )
            -- Check 2: Fallback to team_members table (for coaches who are only in team_members)
            OR EXISTS (
                SELECT 1 FROM team_members tm
                WHERE tm.team_id = event_attendance.team_id
                AND tm.user_id = auth.uid()
                AND (
                    tm.role = 'coach'
                    OR tm.is_admin = TRUE
                )
            )
        )
    );

-- Verify the policy was created
SELECT 
    'Policy updated' AS status,
    policyname,
    cmd,
    qual AS policy_condition
FROM pg_policies
WHERE tablename = 'event_attendance'
AND cmd = 'SELECT'
AND policyname = 'Coaches view team attendance';




