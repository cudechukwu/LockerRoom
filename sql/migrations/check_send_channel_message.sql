-- Quick check to verify send_channel_message function has the fix
-- Run this to see the function definition

SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE proname = 'send_channel_message'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Also check if v_parent_fetched exists in the function
SELECT 
  CASE 
    WHEN pg_get_functiondef(oid) LIKE '%v_parent_fetched%' THEN '✅ Fix is present'
    ELSE '❌ Fix is missing - v_parent_fetched not found'
  END as fix_status
FROM pg_proc 
WHERE proname = 'send_channel_message'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

