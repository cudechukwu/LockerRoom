-- Clean up test/stale DM channels with no messages
-- This removes "Jane Smith", "John Doe", "Mike Johnson" and any other empty DMs

-- Delete empty DM channels
DELETE FROM channels
WHERE type IN ('direct_message', 'group_dm')
AND id IN (
  -- Get DMs with no messages
  SELECT id FROM channels
  WHERE type IN ('direct_message', 'group_dm')
  AND id NOT IN (
    SELECT DISTINCT channel_id FROM messages
  )
);

-- Also delete empty DM memberships
DELETE FROM channel_members
WHERE channel_id NOT IN (
  SELECT id FROM channels
);

-- List remaining channels for verification
SELECT 
  id, 
  name, 
  type, 
  created_at,
  (SELECT COUNT(*) FROM messages WHERE channel_id = channels.id) as message_count
FROM channels
WHERE type IN ('direct_message', 'group_dm')
ORDER BY created_at DESC;

