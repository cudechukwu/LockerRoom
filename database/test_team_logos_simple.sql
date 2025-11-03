-- Simple test for team logos upload - temporary permissive policy
-- Run this in your Supabase SQL editor

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view team logos" ON storage.objects;
DROP POLICY IF EXISTS "Team admins and coaches can upload team logos" ON storage.objects;
DROP POLICY IF EXISTS "Team admins and coaches can update team logos" ON storage.objects;
DROP POLICY IF EXISTS "Team admins and coaches can delete team logos" ON storage.objects;

-- Create very permissive policies for testing
CREATE POLICY "Anyone can view team logos" ON storage.objects
    FOR SELECT USING (bucket_id = 'team-logos');

-- Allow any authenticated user to upload (for testing)
CREATE POLICY "Authenticated users can upload team logos" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'team-logos' 
        AND auth.uid() IS NOT NULL
    );

-- Allow any authenticated user to update (for testing)
CREATE POLICY "Authenticated users can update team logos" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'team-logos' 
        AND auth.uid() IS NOT NULL
    );

-- Allow any authenticated user to delete (for testing)
CREATE POLICY "Authenticated users can delete team logos" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'team-logos' 
        AND auth.uid() IS NOT NULL
    );
