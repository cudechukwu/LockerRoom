-- Check if user_profiles table exists and has the required columns
-- Run this in Supabase SQL Editor to verify your database schema

-- Check if user_profiles table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles'
) as table_exists;

-- Check columns in user_profiles table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- If the table doesn't exist, you need to run database/profile_schema.sql first
-- If the table exists but is missing columns, you may need to add them:
-- ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
