-- Add Indexes for Event Filtering (Performance)
-- Purpose: Enable fast filtering by visibility, groups, and team membership

-- GIN index for array column (CRITICAL - enables fast group filtering)
-- This is essential for efficient array operations on assigned_attendance_groups
CREATE INDEX IF NOT EXISTS idx_events_assigned_groups_gin 
ON events USING GIN (assigned_attendance_groups);

-- Indexes for visibility filtering
CREATE INDEX IF NOT EXISTS idx_events_visibility 
ON events(visibility) WHERE visibility IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_created_by 
ON events(created_by) WHERE visibility = 'personal';

-- Composite index for common queries (team + visibility + time)
CREATE INDEX IF NOT EXISTS idx_events_team_visibility 
ON events(team_id, visibility, start_time);

