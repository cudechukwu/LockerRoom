-- Fix RLS policy for call_participants INSERT
-- Allow initiators to add recipients when creating a call

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can join calls in their team" ON call_participants;

-- Create a new policy that allows:
-- 1. Users to add themselves (when joining)
-- 2. Initiators to add recipients (when creating a call)
CREATE POLICY "Users can join calls in their team"
  ON call_participants FOR INSERT
  WITH CHECK (
    -- User is adding themselves
    (user_id = auth.uid())
    OR
    -- OR user is the initiator of the call and adding team members
    (
      EXISTS (
        SELECT 1 FROM call_sessions cs
        WHERE cs.id = call_participants.call_session_id
        AND cs.initiator_id = auth.uid()
        AND cs.team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
      )
      AND EXISTS (
        -- Recipient must be in the same team as the call
        SELECT 1 FROM call_sessions cs
        JOIN team_members tm ON tm.team_id = cs.team_id
        WHERE cs.id = call_participants.call_session_id
        AND tm.user_id = call_participants.user_id
      )
    )
  );

