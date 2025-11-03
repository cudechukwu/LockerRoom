-- Add foreign key constraint between messages.sender_id and user_profiles.user_id
-- This is required for the sender_profile join to work in Supabase queries

-- Check if constraint exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_messages_user_profiles'
    ) THEN
        -- Drop old constraint if it exists (might reference auth.users)
        ALTER TABLE messages DROP CONSTRAINT IF EXISTS fk_messages_sender_profile;
        
        -- Add foreign key constraint linking to user_profiles
        ALTER TABLE messages 
        ADD CONSTRAINT fk_messages_user_profiles
        FOREIGN KEY (sender_id) 
        REFERENCES user_profiles(user_id) 
        ON DELETE CASCADE;
        
        RAISE NOTICE 'Foreign key constraint added: messages.sender_id → user_profiles.user_id';
    ELSE
        RAISE NOTICE 'Foreign key constraint already exists';
    END IF;
END $$;

