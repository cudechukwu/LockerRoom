-- Fix attendance unique constraint to properly support instance_date
-- This migration drops any old constraints and ensures the correct partial indexes are in place

-- Step 1: Drop any old unique constraints/indexes that don't include instance_date
-- These might have different names depending on how they were created

-- Drop old unique constraint by name (if it exists)
ALTER TABLE event_attendance
DROP CONSTRAINT IF EXISTS event_attendance_event_id_user_id_key;

-- Drop old unique index (if it exists)
DROP INDEX IF EXISTS idx_event_attendance_unique;
DROP INDEX IF EXISTS event_attendance_event_id_user_id_key;
DROP INDEX IF EXISTS event_attendance_event_id_user_id_idx;

-- Step 2: Ensure instance_date column exists
ALTER TABLE event_attendance
ADD COLUMN IF NOT EXISTS instance_date DATE;

-- Step 3: Drop the partial indexes if they exist (to recreate them cleanly)
DROP INDEX IF EXISTS event_attendance_unique_non_recurring;
DROP INDEX IF EXISTS event_attendance_unique_recurring;

-- Step 4: Create the correct partial unique indexes
-- For non-recurring events (instance_date IS NULL), enforce uniqueness on (event_id, user_id)
CREATE UNIQUE INDEX event_attendance_unique_non_recurring
ON event_attendance(event_id, user_id)
WHERE instance_date IS NULL;

-- For recurring instances (instance_date IS NOT NULL), enforce uniqueness on (event_id, user_id, instance_date)
CREATE UNIQUE INDEX event_attendance_unique_recurring
ON event_attendance(event_id, user_id, instance_date)
WHERE instance_date IS NOT NULL;

-- Step 5: Ensure other indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_event_attendance_instance_date
ON event_attendance(instance_date)
WHERE instance_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_event_attendance_event_instance
ON event_attendance(event_id, instance_date)
WHERE instance_date IS NOT NULL;

-- Step 6: Add comment explaining the column
COMMENT ON COLUMN event_attendance.instance_date IS 
'For recurring events: the specific date of the instance (YYYY-MM-DD). NULL for non-recurring events.';

-- Step 7: Optional cleanup - Delete old attendance records for recurring events that have instance_date = NULL
-- This is safe because these records are from before instance-specific attendance was implemented
-- Users will need to check in again for specific instances
-- 
-- WARNING: Only run this if you want to delete old attendance records for recurring events
-- Uncomment the following lines if you want to clean up old records:
--
-- DELETE FROM event_attendance
-- WHERE instance_date IS NULL
-- AND event_id IN (
--   SELECT id FROM events WHERE is_recurring = true
-- );
--
-- If you don't want to delete old records, you can manually update them to have the correct instance_date
-- based on when they were checked in. However, this requires knowing which instance they were for.

