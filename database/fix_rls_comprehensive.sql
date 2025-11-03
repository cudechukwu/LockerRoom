-- Comprehensive RLS Fix Based on Engineer Review
-- This addresses all the issues identified in the code review

-- =============================================
-- 1. ADD MISSING FOR SELECT POLICIES (Critical!)
-- =============================================

-- Messages: Ensure SELECT policy exists with proper USING clause
DROP POLICY IF EXISTS "Users can view messages in accessible channels" ON messages;
CREATE POLICY "Users can view messages in accessible channels" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM channel_members 
            WHERE channel_id = messages.channel_id 
            AND user_id = auth.uid()
        )
    );

-- Channels: Ensure SELECT policy exists
DROP POLICY IF EXISTS "Users can view channels they have access to" ON channels;
CREATE POLICY "Users can view channels they have access to" ON channels
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM channel_members 
            WHERE channel_id = channels.id 
            AND user_id = auth.uid()
        )
    );

-- Channel members: Ensure SELECT policy exists
DROP POLICY IF EXISTS "Users can view channel members they have access to" ON channel_members;
CREATE POLICY "Users can view channel members they have access to" ON channel_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM channel_members cm2
            WHERE cm2.channel_id = channel_members.channel_id 
            AND cm2.user_id = auth.uid()
        )
    );

-- Message reads: Ensure SELECT policy exists
DROP POLICY IF EXISTS "Users can view read receipts for accessible messages" ON message_reads;
CREATE POLICY "Users can view read receipts for accessible messages" ON message_reads
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM messages m
            JOIN channel_members cm ON cm.channel_id = m.channel_id
            WHERE m.id = message_reads.message_id 
            AND cm.user_id = auth.uid()
        )
    );

-- =============================================
-- 2. ADD MISSING FOR INSERT POLICIES
-- =============================================

-- Message reads: Add INSERT policy
DROP POLICY IF EXISTS "Users can insert their own read receipts" ON message_reads;
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

-- Messages: Ensure INSERT policy exists
DROP POLICY IF EXISTS "Channel members can send messages" ON messages;
CREATE POLICY "Channel members can send messages" ON messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM channel_members 
            WHERE channel_id = messages.channel_id 
            AND user_id = auth.uid()
        )
    );

-- =============================================
-- 3. FIX EXISTING POLICIES (UPDATE/DELETE)
-- =============================================

-- Messages: Fix UPDATE policy (already done in fix_message_update_policy.sql)
DROP POLICY IF EXISTS "Users can edit their own recent messages" ON messages;
CREATE POLICY "Users can edit their own recent messages" ON messages
    FOR UPDATE USING (
        sender_id = auth.uid() AND
        created_at > NOW() - INTERVAL '15 minutes'
    );

-- Messages: Add DELETE policy
DROP POLICY IF EXISTS "Users can delete their own messages within 15 minutes" ON messages;
CREATE POLICY "Users can delete their own messages within 15 minutes" ON messages
    FOR DELETE USING (
        sender_id = auth.uid() AND
        created_at > NOW() - INTERVAL '15 minutes'
    );

-- Message reads: Add UPDATE policy
DROP POLICY IF EXISTS "Users can update their own read receipts" ON message_reads;
CREATE POLICY "Users can update their own read receipts" ON message_reads
    FOR UPDATE USING (user_id = auth.uid());

-- =============================================
-- 4. REMOVE UNNECESSARY GRANTS (Security)
-- =============================================

-- Realtime doesn't need explicit SELECT grants - RLS handles it
-- Commenting these out to avoid bypassing RLS
-- REVOKE SELECT ON messages FROM authenticated;
-- REVOKE SELECT ON channels FROM authenticated;
-- REVOKE SELECT ON channel_members FROM authenticated;
-- REVOKE SELECT ON message_reads FROM authenticated;
-- REVOKE SELECT ON user_profiles FROM authenticated;

-- =============================================
-- 5. ADD MISSING FOREIGN KEY CONSTRAINT
-- =============================================

-- Ensure messages can join with user_profiles
-- This is already handled by auth.users reference, but let's verify
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_messages_sender'
    ) THEN
        ALTER TABLE messages 
        ADD CONSTRAINT fk_messages_sender 
        FOREIGN KEY (sender_id) REFERENCES auth.users(id);
    END IF;
END $$;

-- =============================================
-- 6. ADD PERFORMANCE INDEXES (Critical for scale)
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
-- 7. ADD UNIQUE CONSTRAINT FOR MUTES
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
-- VERIFICATION QUERIES
-- =============================================

-- Check all policies are created
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('messages', 'channels', 'channel_members', 'message_reads')
ORDER BY tablename, cmd;

-- Check indexes are created
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
AND tablename IN ('messages', 'channel_members', 'message_reads', 'reactions')
ORDER BY tablename, indexname;

