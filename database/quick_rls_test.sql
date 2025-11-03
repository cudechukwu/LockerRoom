-- Quick RLS Test - Just Copy and Paste into Supabase SQL Editor
-- This will show you what your authenticated user can actually see

-- First, check if you're authenticated
SELECT 
    auth.uid() as your_user_id,
    CASE WHEN auth.uid() IS NOT NULL THEN '✅ Authenticated' ELSE '❌ Not authenticated' END as auth_status;

-- Check what channels you can see
SELECT 
    'Channels' as table_name,
    id,
    name,
    type
FROM channels
LIMIT 5;

-- Check what messages you can see (most recent first)
SELECT 
    'Messages' as table_name,
    id,
    LEFT(content, 50) as content_preview,
    sender_id,
    created_at
FROM messages
ORDER BY created_at DESC
LIMIT 10;

-- Check what user profiles you can see
SELECT 
    'User Profiles' as table_name,
    user_id,
    display_name
FROM user_profiles
LIMIT 10;

-- Summary counts
SELECT 
    (SELECT COUNT(*) FROM channels) as total_channels,
    (SELECT COUNT(*) FROM messages) as total_messages,
    (SELECT COUNT(*) FROM channel_members) as total_channel_members,
    (SELECT COUNT(*) FROM user_profiles) as total_profiles;

