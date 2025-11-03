-- Check if files are actually in the double path location
-- Run this query to see where files actually are

-- First, list files in the message-attachments bucket
-- You'll need to do this in Supabase Dashboard → Storage → message-attachments

-- If you find files at: message-attachments/message-attachments/channelId/file.jpg
-- Then update the URLs to point to that location (not ideal but will work):

UPDATE message_attachments
SET s3_url = REPLACE(s3_url, 
  '/message-attachments/',
  '/message-attachments/message-attachments/'
)
WHERE s3_key LIKE 'message-attachments/%'
  AND s3_url NOT LIKE '%message-attachments/message-attachments/%';

-- This will temporarily fix URLs to point to where files actually are

