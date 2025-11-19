-- Fix foreign key constraints for call_sessions to enable joins with user_profiles
-- This allows Supabase PostgREST to properly join user_profiles in queries
--
-- IMPORTANT: Run this in your Supabase SQL Editor
-- After running, restart the API: Dashboard → Database → Restart API

-- Step 1: Drop existing foreign key constraints that reference auth.users
-- (We'll recreate them to reference user_profiles instead)

-- Drop call_sessions.initiator_id foreign key
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'call_sessions_initiator_id_fkey'
        AND table_name = 'call_sessions'
    ) THEN
        ALTER TABLE public.call_sessions
        DROP CONSTRAINT call_sessions_initiator_id_fkey;
        RAISE NOTICE 'Dropped existing call_sessions_initiator_id_fkey';
    END IF;
END $$;

-- Drop call_participants.user_id foreign key
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'call_participants_user_id_fkey'
        AND table_name = 'call_participants'
    ) THEN
        ALTER TABLE public.call_participants
        DROP CONSTRAINT call_participants_user_id_fkey;
        RAISE NOTICE 'Dropped existing call_participants_user_id_fkey';
    END IF;
END $$;

-- Step 2: Add new foreign key constraints that reference user_profiles
-- This enables PostgREST to automatically join user_profiles in queries

-- Add foreign key from call_sessions.initiator_id to user_profiles.user_id
-- This enables the join: user_profiles!call_sessions_initiator_id_fkey
ALTER TABLE public.call_sessions
ADD CONSTRAINT call_sessions_initiator_id_fkey
FOREIGN KEY (initiator_id)
REFERENCES public.user_profiles (user_id)
ON DELETE SET NULL;

-- Add foreign key from call_participants.user_id to user_profiles.user_id
-- This enables the join: user_profiles!call_participants_user_id_fkey
ALTER TABLE public.call_participants
ADD CONSTRAINT call_participants_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.user_profiles (user_id)
ON DELETE CASCADE;

-- Step 3: Reload PostgREST schema cache
-- This makes the new foreign keys available to PostgREST immediately
NOTIFY pgrst, 'reload schema';

-- Verification query (optional - run to check)
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name IN ('call_sessions', 'call_participants')
    AND ccu.table_name = 'user_profiles';

