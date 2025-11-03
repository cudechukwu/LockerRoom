-- Setup channel-images bucket and policies

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('channel-images', 'channel-images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Public read for channel-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload channel-images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their channel-images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete channel-images" ON storage.objects;

-- Policy: Anyone can view channel images (public read)
CREATE POLICY "Public read for channel-images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'channel-images');

-- Policy: Authenticated users can upload channel images
CREATE POLICY "Authenticated users can upload channel-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'channel-images');

-- Policy: Authenticated users can update channel images
CREATE POLICY "Users can update their channel-images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'channel-images');

-- Policy: Authenticated users can delete channel images
CREATE POLICY "Users can delete channel-images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'channel-images');

