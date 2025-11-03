-- Delete old broken image attachments from database
-- This removes attachments that were uploaded with broken code

-- First, check how many will be deleted
SELECT COUNT(*) as count_to_delete
FROM message_attachments
WHERE s3_key LIKE '%message-attachments/%'
  OR file_size = 0;

-- Then delete them
DELETE FROM message_attachments
WHERE s3_key LIKE '%message-attachments/%'
  OR file_size = 0;

-- Verify deletion
SELECT COUNT(*) as remaining_count
FROM message_attachments;

