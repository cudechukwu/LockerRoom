-- Create event_attachments table for storing file attachments to events
-- Similar structure to message_attachments

CREATE TABLE IF NOT EXISTS event_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size BIGINT NOT NULL,
    s3_key VARCHAR(500) NOT NULL,
    s3_url TEXT, -- Signed URL (temporary)
    thumbnail_url TEXT, -- For images/videos
    uploaded_by UUID NOT NULL, -- References auth.users
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_attachments_event_id ON event_attachments(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attachments_team_id ON event_attachments(team_id);
CREATE INDEX IF NOT EXISTS idx_event_attachments_uploaded_by ON event_attachments(uploaded_by);

-- GIN index for assigned_attendance_groups JSONB array (critical for performance in visibility checks)
-- This index is used by storage policies and RLS policies when checking group membership
CREATE INDEX IF NOT EXISTS idx_events_assigned_groups ON events USING gin(assigned_attendance_groups);

-- Add comment
COMMENT ON TABLE event_attachments IS 'Stores file attachments (PDFs, images, etc.) for events';

