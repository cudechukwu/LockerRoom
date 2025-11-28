-- Event Exceptions Table
-- Tracks deleted or modified instances of recurring events
-- 
-- This table allows users to delete individual instances of recurring events
-- without deleting the entire series. Exceptions are stored as dates (DATE type)
-- to avoid timezone issues.

CREATE TABLE IF NOT EXISTS event_exceptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  exception_date DATE NOT NULL, -- The specific date to exclude (YYYY-MM-DD)
  exception_type VARCHAR(20) DEFAULT 'deleted' CHECK (exception_type IN ('deleted', 'modified')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL, -- References auth.users (who deleted/modified it)
  UNIQUE(event_id, exception_date)
);

-- Index for fast lookups when filtering events
CREATE INDEX IF NOT EXISTS idx_event_exceptions_event_date 
  ON event_exceptions(event_id, exception_date);

-- Index for fetching exceptions by event (used in get_event_exceptions RPC)
CREATE INDEX IF NOT EXISTS idx_event_exceptions_event_id 
  ON event_exceptions(event_id);

-- RLS Policies
ALTER TABLE event_exceptions ENABLE ROW LEVEL SECURITY;

-- Users can view exceptions for events they can view
CREATE POLICY "Users can view exceptions for visible events"
  ON event_exceptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_exceptions.event_id
      AND (
        e.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.team_id = e.team_id
          AND tm.user_id = auth.uid()
        )
      )
    )
  );

-- Users can create exceptions for events they can delete
CREATE POLICY "Users can create exceptions for deletable events"
  ON event_exceptions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_exceptions.event_id
      AND (
        e.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.team_id = e.team_id
          AND tm.user_id = auth.uid()
          AND tm.role IN ('coach', 'admin')
        )
      )
    )
  );

-- Users can delete exceptions they created
CREATE POLICY "Users can delete their own exceptions"
  ON event_exceptions FOR DELETE
  USING (created_by = auth.uid());

