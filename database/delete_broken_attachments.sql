-- Delete old attachment records with broken URLs
-- This will allow users to re-upload the images properly

DELETE FROM message_attachments
WHERE s3_key LIKE 'message-attachments/%'
  AND created_at < NOW() - INTERVAL '1 hour';

-- Or to be safe, just update messages to remove references:
UPDATE messages
SET id = id  -- No-op, but this will trigger a refresh
WHERE id IN (
  SELECT message_id FROM message_attachments 
  WHERE s3_key LIKE 'message-attachments/%'
);

-- Then delete attachments:
DELETE FROM message_attachments
WHERE s3_key LIKE 'message-attachments/%';

