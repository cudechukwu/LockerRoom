-- Fix attendance_audit_log foreign key constraints for event_id and attendance_id
-- 
-- Problem: When deleting an event, the deletion cascades to event_attendance records.
-- A trigger on event_attendance deletion (AFTER DELETE) tries to log to attendance_audit_log
-- with the event_id, but the event has already been deleted, causing a foreign key constraint violation.
--
-- Root Cause: The trigger runs AFTER the event is deleted, so when it tries to INSERT into
-- attendance_audit_log with event_id, the FK constraint fails because the event no longer exists.
--
-- Solution: Remove the foreign key constraint on event_id entirely (Option 2A from friend's analysis).
-- The audit log already stores denormalized data (user_id, team_id, etc.), so we don't need
-- a strict FK constraint. The event_id is just for reference and can reference deleted events.
--
-- For attendance_id, we'll also remove the FK constraint entirely because the same issue occurs:
-- the trigger runs AFTER DELETE, so the attendance record is already deleted when we try to insert
-- the audit log. The FK constraint fails on INSERT, before ON DELETE SET NULL can take effect.

-- Step 1: Make event_id nullable (if not already)
ALTER TABLE attendance_audit_log
    ALTER COLUMN event_id DROP NOT NULL;

-- Step 2: Make attendance_id nullable (if not already)
ALTER TABLE attendance_audit_log
    ALTER COLUMN attendance_id DROP NOT NULL;

-- Step 3: Drop the event_id foreign key constraint entirely
-- This allows audit logs to reference deleted events (important for audit trails)
ALTER TABLE attendance_audit_log
    DROP CONSTRAINT IF EXISTS attendance_audit_log_event_id_fkey;

-- Step 4: Drop the attendance_id foreign key constraint entirely
-- Same reason as event_id - the trigger runs AFTER DELETE, so the attendance record
-- is already deleted when we try to insert the audit log. We need to remove the FK
-- constraint to allow audit logs to reference deleted attendance records.
ALTER TABLE attendance_audit_log
    DROP CONSTRAINT IF EXISTS attendance_audit_log_attendance_id_fkey;

-- Note: This solution:
-- 1. Removes the FK constraint on event_id - audit logs can reference deleted events
-- 2. Removes the FK constraint on attendance_id - audit logs can reference deleted attendance records
-- 3. Allows the AFTER DELETE trigger to work correctly
-- 4. Preserves audit trail even after events/attendance are deleted
-- 5. Both event_id and attendance_id are stored for reference but don't enforce referential integrity
--    (which is fine for audit logs - they should persist even after referenced data is deleted)
-- 6. The audit log already stores denormalized data (user_id, team_id, etc.) for compliance purposes

