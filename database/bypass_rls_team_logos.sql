-- Bypass RLS for team logos - temporary solution
-- Run this in your Supabase SQL editor

-- Drop ALL existing policies for team-logos bucket
DROP POLICY IF EXISTS "Anyone can view team logos" ON storage.objects;
DROP POLICY IF EXISTS "Team admins and coaches can upload team logos" ON storage.objects;
DROP POLICY IF EXISTS "Team admins and coaches can update team logos" ON storage.objects;
DROP POLICY IF EXISTS "Team admins and coaches can delete team logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload team logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update team logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete team logos" ON storage.objects;

-- Create completely open policies (no RLS restrictions)
CREATE POLICY "Open access for team logos" ON storage.objects
    FOR ALL USING (bucket_id = 'team-logos');

-- Alternative: Disable RLS entirely for this bucket (if above doesn't work)
-- ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
