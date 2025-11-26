-- Add RLS policies for event_attachments table

-- Enable RLS on event_attachments table
ALTER TABLE event_attachments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Team members can view event attachments" ON event_attachments;
DROP POLICY IF EXISTS "Event creators can upload attachments" ON event_attachments;
DROP POLICY IF EXISTS "Event creators can update attachments" ON event_attachments;
DROP POLICY IF EXISTS "Event creators can delete attachments" ON event_attachments;

-- 🔓 Allow team members to view attachments for events they can access
CREATE POLICY "Team members can view event attachments"
ON event_attachments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM events e
    JOIN team_members tm ON tm.team_id = e.team_id
    WHERE 
      event_attachments.event_id = e.id
      AND tm.user_id = auth.uid()
      -- Ensure user can see the event (visibility check)
      AND (
        e.visibility = 'team'
        OR (e.visibility = 'personal' AND e.created_by = auth.uid())
        OR EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(e.assigned_attendance_groups) AS group_id
          JOIN attendance_groups ag ON ag.id::text = group_id
          JOIN attendance_group_members agm ON agm.group_id = ag.id
          WHERE agm.user_id = auth.uid()
        )
      )
  )
);

-- ✏️ Allow event creators to upload attachments
-- Simplified: Only event creator can upload attachments (as confirmed by user requirement)
CREATE POLICY "Event creators can upload attachments"
ON event_attachments
FOR INSERT
WITH CHECK (
  auth.uid() = event_attachments.uploaded_by
  AND EXISTS (
    SELECT 1 FROM events e
    WHERE 
      e.id = event_attachments.event_id
      AND e.team_id = event_attachments.team_id
      AND e.created_by = auth.uid()
  )
);

-- 🛠 Allow event creators to update their attachments
CREATE POLICY "Event creators can update attachments"
ON event_attachments
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM events e
    WHERE 
      event_attachments.event_id = e.id
      AND e.created_by = auth.uid()
      AND event_attachments.uploaded_by = auth.uid()
  )
);

-- 🗑 Allow event creators to delete their attachments
CREATE POLICY "Event creators can delete attachments"
ON event_attachments
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM events e
    WHERE 
      event_attachments.event_id = e.id
      AND e.created_by = auth.uid()
      AND event_attachments.uploaded_by = auth.uid()
  )
);

