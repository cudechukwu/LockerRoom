-- Add Attendance Settings Fields to Events Table
-- Part of Event Creation Modal Redesign

-- Add attendance_requirement field
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS attendance_requirement VARCHAR(20) DEFAULT 'required'
    CHECK (attendance_requirement IN ('required', 'coaches_only', 'players_only'));

-- Add check_in_methods array field
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS check_in_methods TEXT[] DEFAULT ARRAY['qr_code', 'location', 'manual'];

-- Add index for attendance_requirement queries
CREATE INDEX IF NOT EXISTS idx_events_attendance_requirement 
ON events(attendance_requirement) WHERE attendance_requirement IS NOT NULL;

-- Add GIN index for check_in_methods array queries
CREATE INDEX IF NOT EXISTS idx_events_check_in_methods_gin 
ON events USING GIN (check_in_methods);

