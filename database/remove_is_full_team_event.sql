-- Remove is_full_team_event column from events table
-- This flag is redundant - we derive full-team status from assigned_attendance_groups array length
-- If assigned_attendance_groups is empty/null, it's a full team event

-- Drop the column
ALTER TABLE events DROP COLUMN IF EXISTS is_full_team_event;

