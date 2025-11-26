-- Add/Update RLS Policy for Events (Simplified)
-- Purpose: Ensure users can only see events for teams they belong to
-- This is the base security layer - all nuanced filtering happens client-side

-- Drop existing policy if it exists (we'll replace it with a simpler version)
DROP POLICY IF EXISTS "Team members can view team events" ON events;

-- Create simplified RLS policy: Users can only see events for teams they belong to
-- This prevents a user from seeing ANY events outside their team
-- Then all nuanced filtering (visibility, groups, roles) happens client-side
CREATE POLICY "Team members can view team events" ON events
FOR SELECT USING (
  team_id IN (
    SELECT team_id 
    FROM team_members 
    WHERE user_id = auth.uid()
  )
);

