-- Fix attendance_audit_log foreign key constraint
-- The issue: When an event is deleted, event_attendance records are CASCADE deleted,
-- but the trigger tries to log to attendance_audit_log with the deleted attendance_id,
-- causing a foreign key constraint violation.

-- Solution: Change the foreign key to ON DELETE SET NULL so audit logs persist
-- even after the attendance record is deleted.

-- Drop the existing foreign key constraint
ALTER TABLE attendance_audit_log
    DROP CONSTRAINT IF EXISTS attendance_audit_log_attendance_id_fkey;

-- Recreate with ON DELETE SET NULL
ALTER TABLE attendance_audit_log
    ADD CONSTRAINT attendance_audit_log_attendance_id_fkey
    FOREIGN KEY (attendance_id)
    REFERENCES event_attendance(id)
    ON DELETE SET NULL;

-- Note: This means attendance_id can be NULL in audit logs for records
-- that were deleted as part of event deletion. The event_id and other
-- denormalized fields will still be present for audit purposes.

