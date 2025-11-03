-- Add team logos storage bucket and RLS policies
-- Run this in your Supabase SQL editor

-- Create storage bucket for team logos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('team-logos', 'team-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view team logos" ON storage.objects;
DROP POLICY IF EXISTS "Team admins can upload team logos" ON storage.objects;
DROP POLICY IF EXISTS "Team admins can update team logos" ON storage.objects;
DROP POLICY IF EXISTS "Team admins can delete team logos" ON storage.objects;

-- Storage policies for team logos
CREATE POLICY "Anyone can view team logos" ON storage.objects
    FOR SELECT USING (bucket_id = 'team-logos');

-- Team admins and coaches can upload team logos
CREATE POLICY "Team admins and coaches can upload team logos" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'team-logos' 
        AND EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.user_id = auth.uid()
            AND (tm.is_admin = true OR tm.role IN ('coach', 'trainer'))
            AND tm.team_id::text = (storage.foldername(name))[1]
        )
    );

-- Team admins and coaches can update team logos
CREATE POLICY "Team admins and coaches can update team logos" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'team-logos' 
        AND EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.user_id = auth.uid()
            AND (tm.is_admin = true OR tm.role IN ('coach', 'trainer'))
            AND tm.team_id::text = (storage.foldername(name))[1]
        )
    );

-- Team admins and coaches can delete team logos
CREATE POLICY "Team admins and coaches can delete team logos" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'team-logos' 
        AND EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.user_id = auth.uid()
            AND (tm.is_admin = true OR tm.role IN ('coach', 'trainer'))
            AND tm.team_id::text = (storage.foldername(name))[1]
        )
    );
