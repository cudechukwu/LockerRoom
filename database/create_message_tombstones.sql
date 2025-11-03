-- Create message_tombstones table for soft delete functionality
CREATE TABLE IF NOT EXISTS message_tombstones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  deleted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delete_reason TEXT NOT NULL CHECK (delete_reason IN ('sender', 'moderator', 'admin')),
  tombstone_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_message_tombstones_message_id ON message_tombstones(message_id);
CREATE INDEX IF NOT EXISTS idx_message_tombstones_deleted_by ON message_tombstones(deleted_by);

-- Add comments
COMMENT ON TABLE message_tombstones IS 'Tracks soft-deleted messages for audit and recovery purposes';
COMMENT ON COLUMN message_tombstones.delete_reason IS 'Reason for deletion: sender, moderator, or admin';
COMMENT ON COLUMN message_tombstones.tombstone_text IS 'Display text shown in place of deleted message';

