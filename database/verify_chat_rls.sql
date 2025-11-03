-- RLS Verification Script for Chat System
-- This script checks if all necessary RLS policies exist and are properly configured

-- =============================================
-- 1. CHECK IF RLS IS ENABLED
-- =============================================

SELECT 
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN (
    'teams',
    'team_members',
    'channels',
    'channel_members',
    'messages',
    'message_attachments',
    'message_reads',
    'user_profiles',
    'reactions'
)
ORDER BY tablename;

-- Expected: All rows should show rowsecurity = true

-- =============================================
-- 2. CHECK EXISTING POLICIES
-- =============================================

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN (
    'teams',
    'team_members',
    'channels',
    'channel_members',
    'messages',
    'message_attachments',
    'message_reads',
    'user_profiles'
)
ORDER BY tablename, policyname;

-- Expected: Should see policies for SELECT, INSERT, UPDATE, DELETE where appropriate

-- =============================================
-- 3. TEST QUERY ACCESSIBILITY (Run as authenticated user)
-- =============================================

-- Test 3.1: Can authenticated user see channels they're members of?
-- This should return channels without errors (may return 0 rows if no channels exist)
SELECT 
    'Channels accessible' as test_name,
    COUNT(*) as accessible_count
FROM channels c
WHERE EXISTS (
    SELECT 1 FROM channel_members cm 
    WHERE cm.channel_id = c.id 
    AND cm.user_id = auth.uid()
);

-- Test 3.2: Can authenticated user see messages in channels they have access to?
-- This should return messages count without errors
SELECT 
    'Messages accessible' as test_name,
    COUNT(*) as accessible_count
FROM messages m
WHERE EXISTS (
    SELECT 1 FROM channel_members cm 
    WHERE cm.channel_id = m.channel_id 
    AND cm.user_id = auth.uid()
);

-- Test 3.3: Can authenticated user see user profiles?
SELECT 
    'User profiles viewable' as test_name,
    COUNT(*) as profile_count
FROM user_profiles
LIMIT 10;

-- Test 3.4: Get actual channels for current user (use these IDs in manual testing)
SELECT 
    'Your channels' as test_name,
    id as channel_id,
    name,
    type
FROM channels c
WHERE EXISTS (
    SELECT 1 FROM channel_members cm 
    WHERE cm.channel_id = c.id 
    AND cm.user_id = auth.uid()
)
LIMIT 5;

-- =============================================
-- 4. IDENTIFY MISSING POLICIES
-- =============================================

-- Check for messages UPDATE policy (might be missing syntax)
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'messages'
AND policyname = 'Users can edit their own recent messages';

-- Expected: Should return 1 row with cmd = 'UPDATE'

-- =============================================
-- 5. VERIFY AUTH.UID() ACCESSIBILITY
-- =============================================

-- This should work if user is authenticated
SELECT auth.uid() as current_user_id;

-- Expected: Should return the authenticated user's UUID

