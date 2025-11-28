-- Enable Realtime Replication for Calling Tables
-- Run this in Supabase SQL Editor to fix "Channel closed" errors
--
-- IMPORTANT: After running, restart the API:
-- Dashboard → Database → Restart API

-- Step 1: Enable replication for call_sessions
ALTER PUBLICATION supabase_realtime ADD TABLE call_sessions;

-- Step 2: Enable replication for call_participants
ALTER PUBLICATION supabase_realtime ADD TABLE call_participants;

-- Step 3: Verify replication is enabled
SELECT 
    schemaname,
    tablename,
    '✅ Replication enabled' as status
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND tablename IN ('call_sessions', 'call_participants')
ORDER BY tablename;

-- Expected output:
-- schemaname | tablename        | status
-- public     | call_participants | ✅ Replication enabled
-- public     | call_sessions     | ✅ Replication enabled

-- If you see both tables, replication is enabled!
-- If not, check that the tables exist and you have permissions.





