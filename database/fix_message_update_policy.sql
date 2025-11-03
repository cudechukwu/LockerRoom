-- Fix the incomplete message UPDATE policy
-- The original policy was missing the USING clause syntax

-- Drop the incomplete policy if it exists
DROP POLICY IF EXISTS "Users can edit their own recent messages" ON messages;

-- Create the correct policy
CREATE POLICY "Users can edit their own recent messages" ON messages
    FOR UPDATE USING (
        sender_id = auth.uid() AND
        created_at > NOW() - INTERVAL '15 minutes'
    );

-- Also ensure there's a DELETE policy for messages
CREATE POLICY "Users can delete their own messages within 15 minutes" ON messages
    FOR DELETE USING (
        sender_id = auth.uid() AND
        created_at > NOW() - INTERVAL '15 minutes'
    );

-- Add UPDATE policy for message_reads (users should be able to update their read timestamps)
CREATE POLICY "Users can update their own read receipts" ON message_reads
    FOR UPDATE USING (user_id = auth.uid());

-- =============================================
-- GRANT PERMISSIONS FOR ANONYMOUS REALTIME
-- =============================================

-- Ensure authenticated users can trigger realtime updates
GRANT SELECT ON messages TO authenticated;
GRANT SELECT ON channels TO authenticated;
GRANT SELECT ON channel_members TO authenticated;
GRANT SELECT ON message_reads TO authenticated;
GRANT SELECT ON user_profiles TO authenticated;

