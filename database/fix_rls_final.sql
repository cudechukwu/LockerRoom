-- Final RLS Fix - Idempotent (Safe to run multiple times)
-- This consolidates all fixes from both engineer review and original Phase 1 work

-- =============================================
-- 1. DROP ALL EXISTING POLICIES (Safe drop)
-- =============================================

DROP POLICY IF EXISTS "Users can view messages in accessible channels" ON messages;
DROP POLICY IF EXISTS "Channel members can send messages" ON messages;
DROP POLICY IF EXISTS "Users can edit their own recent messages" ON messages;
DROP POLICY IF EXISTS "Users can delete their own messages within 15 minutes" ON messages;

DROP POLICY IF EXISTS "Users can view channels they have access to" ON channels;

DROP POLICY IF EXISTS "Users can view channel members they have access to" ON channel_members;

DROP POLICY IF EXISTS "Users can view read receipts for accessible messages" ON message_reads;
DROP POLICY IF EXISTS "Users can mark messages as read" ON message_reads;
DROP POLICY IF EXISTS "Users can insert their own read receipts" ON message_reads;
DROP POLICY IF EXISTS "Users can update their own read receipts" ON message_reads;

-- =============================================
-- 2. CREATE/RECREATE POLICIES (All FOR clauses)
-- =============================================

-- Messages: SELECT policy (for viewing)
CREATE POLICY "Users can view messages in accessible channels" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM channel_members 
            WHERE channel_id = messages.channel_id 
            AND user_id = auth.uid()
        )
    );

-- Messages: INSERT policy (for sending)
CREATE POLICY "Channel members can send messages" ON messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM channel_members 
            WHERE channel_id = messages.channel_id 
            AND user_id = auth.uid()
        )
    );

-- Messages: UPDATE policy (for editing - 15 min window)
CREATE POLICY "Users can edit their own recent messages" ON messages
    FOR UPDATE USING (
        sender_id = auth.uid() AND
        created_at > NOW() - INTERVAL '15 minutes'
    );

-- Messages: DELETE policy (for deleting - 15 min window)
CREATE POLICY "Users can delete their own messages within 15 minutes" ON messages
    FOR DELETE USING (
        sender_id = auth.uid() AND
        created_at > NOW() - INTERVAL '15 minutes'
    );

-- Channels: SELECT policy
CREATE POLICY "Users can view channels they have access to" ON channels
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM channel_members 
            WHERE channel_id = channels.id 
            AND user_id = auth.uid()
        )
    );

-- Channel members: SELECT policy
CREATE POLICY "Users can view channel members they have access to" ON channel_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM channel_members cm2
            WHERE cm2.channel_id = channel_members.channel_id 
            AND cm2.user_id = auth.uid()
        )
    );

-- Message reads: SELECT policy
CREATE POLICY "Users can view read receipts for accessible messages" ON message_reads
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM messages m
            JOIN channel_members cm ON cm.channel_id = m.channel_id
            WHERE m.id = message_reads.message_id 
            AND cm.user_id = auth.uid()
        )
    );

-- Message reads: INSERT policy
CREATE POLICY "Users can insert their own read receipts" ON message_reads
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM messages m
            JOIN channel_members cm ON cm.channel_id = m.channel_id
            WHERE m.id = message_reads.message_id 
            AND cm.user_id = auth.uid()
        )
    );

-- Message reads: UPDATE policy
CREATE POLICY "Users can update their own read receipts" ON message_reads
    FOR UPDATE USING (user_id = auth.uid());

-- =============================================
-- 3. ADD MISSING INDEXES (Performance)
-- =============================================

CREATE INDEX IF NOT EXISTS idx_messages_channel_created_at 
ON messages(channel_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_sender 
ON messages(sender_id);

CREATE INDEX IF NOT EXISTS idx_reads_user_message 
ON message_reads(user_id, message_id);

CREATE INDEX IF NOT EXISTS idx_tombstones_message_id 
ON message_tombstones(message_id);

CREATE INDEX IF NOT EXISTS idx_reactions_message_id 
ON reactions(message_id);

CREATE INDEX IF NOT EXISTS idx_channel_members_channel_user 
ON channel_members(channel_id, user_id);

-- =============================================
-- 4. ADD UNIQUE CONSTRAINT FOR MUTES
-- =============================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'mutes_unique'
    ) THEN
        ALTER TABLE mutes 
        ADD CONSTRAINT mutes_unique UNIQUE (user_id, channel_id);
    END IF;
END $$;

-- =============================================
-- 5. VERIFICATION (Optional - can comment out after first run)
-- =============================================

-- Show all policies that were created
SELECT 
    tablename,
    policyname,
    cmd
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('messages', 'channels', 'channel_members', 'message_reads')
ORDER BY tablename, cmd;

-- Show all indexes that were created
SELECT 
    tablename,
    indexname
FROM pg_indexes 
WHERE schemaname = 'public'
AND tablename IN ('messages', 'channel_members', 'message_reads', 'reactions')
ORDER BY tablename;

