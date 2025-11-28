-- Add database-side validation for recurring_pattern
-- This prevents invalid patterns from being stored and breaking the calendar
-- Updates the constraint to include 'custom_weekly' pattern

-- Drop existing constraint (handles both named and auto-named constraints)
DO $$ 
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find the constraint name for recurring_pattern
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'events'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%recurring_pattern%'
    LIMIT 1;
    
    -- Drop it if found
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE events DROP CONSTRAINT ' || quote_ident(constraint_name);
    END IF;
END $$;

-- Add updated constraint with custom_weekly
ALTER TABLE events 
ADD CONSTRAINT events_recurring_pattern_check 
CHECK (recurring_pattern IS NULL OR recurring_pattern IN ('daily', 'weekly', 'biweekly', 'monthly', 'custom_weekly'));

