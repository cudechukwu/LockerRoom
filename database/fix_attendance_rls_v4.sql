-- Fix v4: Use column names directly in WITH CHECK (no table prefix)
-- In WITH CHECK for INSERT, columns can be referenced directly

-- Drop existing policy
DROP POLICY IF EXISTS "Coaches insert team attendance" ON event_attendance;

-- Create policy with direct column references (no event_attendance. prefix)
CREATE POLICY "Coaches insert team attendance" ON event_attendance
    FOR INSERT
    WITH CHECK (
        -- Ensure auth.uid() is not null
        auth.uid() IS NOT NULL
        -- Check if current user is a coach/admin
        AND (
            -- Check team_member_roles first
            EXISTS (
                SELECT 1 FROM team_member_roles tmr
                WHERE tmr.team_id = team_id  -- Direct column reference
                AND tmr.user_id = auth.uid()
                AND tmr.role IN ('head_coach', 'assistant_coach', 'team_admin')
            )
            -- OR check team_members
            OR EXISTS (
                SELECT 1 FROM team_members tm
                WHERE tm.team_id = team_id  -- Direct column reference
                AND tm.user_id = auth.uid()
                AND (tm.role = 'coach' OR tm.is_admin = TRUE)
            )
        )
        -- Target user must be in the team
        AND (
            EXISTS (
                SELECT 1 FROM team_members tm
                WHERE tm.team_id = team_id  -- Direct column reference
                AND tm.user_id = user_id  -- Direct column reference
            )
            OR EXISTS (
                SELECT 1 FROM team_member_roles tmr
                WHERE tmr.team_id = team_id  -- Direct column reference
                AND tmr.user_id = user_id  -- Direct column reference
            )
        )
    );

-- Verify the policy
SELECT 
    'Policy recreated (v4 - direct column refs)' AS status,
    policyname,
    cmd,
    with_check AS policy_condition
FROM pg_policies
WHERE tablename = 'event_attendance'
AND cmd = 'INSERT';

