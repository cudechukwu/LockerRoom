-- Alternative Fix: Use a different approach that doesn't rely on auth.uid() in SECURITY DEFINER
-- This version passes auth.uid() as a parameter explicitly

-- Drop and recreate the policy with explicit auth.uid() handling
DROP POLICY IF EXISTS "Coaches insert team attendance" ON event_attendance;

-- Create a new policy that explicitly uses auth.uid() in the WITH CHECK clause
-- The key is that auth.uid() is evaluated in the policy context, not inside the function
CREATE POLICY "Coaches insert team attendance" ON event_attendance
    FOR INSERT
    WITH CHECK (
        -- Explicitly check auth.uid() is not null (safety check)
        auth.uid() IS NOT NULL
        -- Coach must be a coach/admin (auth.uid() is evaluated here in policy context)
        AND is_coach_or_admin(team_id, auth.uid())
        -- Target user must be a member of the team
        AND is_user_in_team(team_id, user_id)
    );

-- Verify the policy
SELECT 
    'Policy recreated' AS status,
    policyname,
    cmd,
    with_check AS policy_condition
FROM pg_policies
WHERE tablename = 'event_attendance'
AND cmd = 'INSERT';

