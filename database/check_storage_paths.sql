-- Check where the files actually are in Supabase Storage
-- This query shows the s3_key stored in the database

SELECT 
  id,
  filename,
  s3_key,
  s3_url,
  created_at
FROM message_attachments
ORDER BY created_at DESC
LIMIT 10;

