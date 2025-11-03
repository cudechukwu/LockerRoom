-- Add foreign key relationship between channel_members and user_profiles
-- This enables Supabase's nested select functionality

-- First, ensure the user_profiles table has the proper index
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- Add an index for better query performance
CREATE INDEX IF NOT EXISTS idx_channel_members_user_id ON channel_members(user_id);

-- Add foreign key constraint (optional - Supabase can infer relationship via auth.users)
-- The constraint ensures referential integrity
-- Using DO block to conditionally add constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_channel_members_user_profiles'
        AND table_name = 'channel_members'
    ) THEN
        ALTER TABLE channel_members
        ADD CONSTRAINT fk_channel_members_user_profiles
        FOREIGN KEY (user_id)
        REFERENCES user_profiles(user_id)
        ON DELETE CASCADE;
    END IF;
END $$;

