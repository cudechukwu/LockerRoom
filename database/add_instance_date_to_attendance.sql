-- Add instance_date column to event_attendance table for recurring event instances
-- This allows each instance of a recurring event to have its own attendance records

-- Add instance_date column (nullable - only populated for recurring event instances)
ALTER TABLE event_attendance
ADD COLUMN IF NOT EXISTS instance_date DATE;

-- Drop the old unique constraint
ALTER TABLE event_attendance
DROP CONSTRAINT IF EXISTS event_attendance_event_id_user_id_key;

-- Add new unique constraint that includes instance_date
-- For non-recurring events (instance_date IS NULL), enforce uniqueness on (event_id, user_id)
-- For recurring instances (instance_date IS NOT NULL), enforce uniqueness on (event_id, user_id, instance_date)
CREATE UNIQUE INDEX IF NOT EXISTS event_attendance_unique_non_recurring
ON event_attendance(event_id, user_id)
WHERE instance_date IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS event_attendance_unique_recurring
ON event_attendance(event_id, user_id, instance_date)
WHERE instance_date IS NOT NULL;

-- Add index for fast lookups by instance_date
CREATE INDEX IF NOT EXISTS idx_event_attendance_instance_date
ON event_attendance(instance_date)
WHERE instance_date IS NOT NULL;

-- Add composite index for common query pattern: event_id + instance_date
CREATE INDEX IF NOT EXISTS idx_event_attendance_event_instance
ON event_attendance(event_id, instance_date)
WHERE instance_date IS NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN event_attendance.instance_date IS 
'For recurring events: the specific date of the instance (YYYY-MM-DD). NULL for non-recurring events.';

