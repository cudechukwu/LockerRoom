-- Add channel image support and visibility system
-- Run this in your Supabase SQL editor

-- Add image_url and visibility fields to channels table
ALTER TABLE channels ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'discoverable' CHECK (visibility IN ('discoverable', 'hidden'));

-- Create storage bucket for channel images
INSERT INTO storage.buckets (id, name, public) VALUES ('channel-images', 'channel-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for channel images
CREATE POLICY "Channel members can view channel images" ON storage.objects
  FOR SELECT USING (bucket_id = 'channel-images');

CREATE POLICY "Channel creators can upload channel images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'channel-images');

CREATE POLICY "Channel creators can update channel images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'channel-images');

CREATE POLICY "Channel creators can delete channel images" ON storage.objects
  FOR DELETE USING (bucket_id = 'channel-images');

-- Update existing channels to be discoverable by default
UPDATE channels SET visibility = 'discoverable' WHERE visibility IS NULL;

-- Add index for visibility queries
CREATE INDEX IF NOT EXISTS idx_channels_visibility ON channels(visibility);
CREATE INDEX IF NOT EXISTS idx_channels_team_visibility ON channels(team_id, visibility);
