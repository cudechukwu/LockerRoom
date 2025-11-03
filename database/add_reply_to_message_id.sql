-- Add reply_to_message_id column to messages table
-- This enables reply functionality in the chat system

ALTER TABLE messages 
ADD COLUMN reply_to_message_id UUID REFERENCES messages(id) ON DELETE SET NULL;

-- Add index for better performance when querying replies
CREATE INDEX idx_messages_reply_to_message_id ON messages(reply_to_message_id);

-- Add comment to document the column
COMMENT ON COLUMN messages.reply_to_message_id IS 'ID of the message this message is replying to. NULL if not a reply.';

