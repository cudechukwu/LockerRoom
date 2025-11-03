-- Fix duplicated bucket name in message_attachments URLs
-- This fixes URLs that have message-attachments/message-attachments/ instead of message-attachments/

UPDATE message_attachments
SET 
  s3_url = REPLACE(s3_url, 'message-attachments/message-attachments/', 'message-attachments/'),
  thumbnail_url = REPLACE(thumbnail_url, 'message-attachments/message-attachments/', 'message-attachments/')
WHERE s3_url LIKE '%message-attachments/message-attachments/%'
   OR thumbnail_url LIKE '%message-attachments/message-attachments/%';

-- Verify the fix
SELECT 
  id,
  filename,
  s3_url,
  thumbnail_url
FROM message_attachments
WHERE s3_url LIKE '%message-attachments/%'
ORDER BY created_at DESC
LIMIT 10;

