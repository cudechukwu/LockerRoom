-- Create storage bucket for event attachments
-- CRITICAL: Use team-scoped paths: /event_attachments/{team_id}/{event_id}/{filename}
-- CRITICAL: Deny global read - files must be signed URL only (private bucket)

INSERT INTO storage.buckets (id, name, public) 
VALUES ('event-attachments', 'event-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- ===================================================
-- Storage policies for event attachments
-- ===================================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Team members can view event attachments" ON storage.objects;
DROP POLICY IF EXISTS "Event creators can upload attachments" ON storage.objects;
DROP POLICY IF EXISTS "Event creators can update attachments" ON storage.objects;
DROP POLICY IF EXISTS "Event creators can delete attachments" ON storage.objects;

-- 🔓 Allow team members to view attachments for events they can access
-- CRITICAL: Supabase stores paths WITHOUT bucket name: "teamId/eventId/filename.pdf"
-- So split_part(name, '/', 1) = team_id, split_part(name, '/', 2) = event_id
CREATE POLICY "Team members can view event attachments"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'event-attachments'
  AND EXISTS (
    SELECT 1 FROM events e
    JOIN team_members tm ON tm.team_id = e.team_id
    WHERE 
      -- Extract team_id and event_id from path: "{team_id}/{event_id}/{filename}"
      tm.team_id::text = split_part(name, '/', 1)
      AND e.id::text = split_part(name, '/', 2)
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
-- CRITICAL: Path pattern must be enforced: "teamId/eventId/filename"
CREATE POLICY "Event creators can upload attachments"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'event-attachments'
  AND auth.uid() IS NOT NULL
  -- Enforce path pattern: must have at least 2 slashes (teamId/eventId/filename)
  AND position('/' in name) > 0
  AND (SELECT array_length(string_to_array(name, '/'), 1)) >= 3
  AND EXISTS (
    SELECT 1 FROM team_members tm
    WHERE 
      tm.team_id::text = split_part(name, '/', 1)
      AND tm.user_id = auth.uid()
  )
);

-- 🛠 Allow event creators to update their attachments
CREATE POLICY "Event creators can update attachments"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'event-attachments'
  AND EXISTS (
    SELECT 1 FROM events e
    WHERE 
      e.team_id::text = split_part(name, '/', 1)
      AND e.id::text = split_part(name, '/', 2)
      AND e.created_by = auth.uid()
  )
);

-- 🗑 Allow event creators to delete their attachments
CREATE POLICY "Event creators can delete attachments"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'event-attachments'
  AND EXISTS (
    SELECT 1 FROM events e
    WHERE 
      e.team_id::text = split_part(name, '/', 1)
      AND e.id::text = split_part(name, '/', 2)
      AND e.created_by = auth.uid()
  )
);

