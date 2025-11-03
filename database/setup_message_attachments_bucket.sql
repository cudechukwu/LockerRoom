-- Create storage bucket for message attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('message-attachments', 'message-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- ===================================================
-- Storage policies for message attachments
-- ===================================================

-- 🔓 Allow users to view attachments for messages they can access
CREATE POLICY "Users can view message attachments"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'message-attachments'
  AND EXISTS (
    SELECT 1 FROM messages m
    JOIN channel_members cm ON cm.channel_id = m.channel_id
    WHERE 
      -- Extract the message_id from the path: "message-attachments/<channelId>/<filename>"
      m.id::text = split_part(name, '/', 2)
      AND cm.user_id = auth.uid()
  )
);

-- ✏️ Allow users to upload attachments if authenticated
CREATE POLICY "Users can upload message attachments"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'message-attachments'
  AND auth.uid() IS NOT NULL
);

-- 🛠 Allow users to update their own attachments
CREATE POLICY "Users can update their message attachments"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'message-attachments'
  AND EXISTS (
    SELECT 1 FROM messages m
    WHERE 
      m.id::text = split_part(name, '/', 2)
      AND m.sender_id = auth.uid()
  )
);

-- 🗑 Allow users to delete their own attachments
CREATE POLICY "Users can delete their message attachments"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'message-attachments'
  AND EXISTS (
    SELECT 1 FROM messages m
    WHERE 
      m.id::text = split_part(name, '/', 2)
      AND m.sender_id = auth.uid()
  )
);
