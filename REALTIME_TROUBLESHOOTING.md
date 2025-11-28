# Supabase Realtime Troubleshooting Guide

## Error: "Channel closed too many times"

This error indicates that the Supabase Realtime WebSocket connection is failing repeatedly. Here's how to fix it:

## Step 1: Check Realtime is Enabled

1. Go to your **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Scroll down to **Realtime** section
5. Ensure **Realtime** is **Enabled**

## Step 2: Check Database Replication

Supabase Realtime requires **database replication** to be enabled for the tables you're subscribing to.

1. Go to **Database** → **Replication** in your Supabase Dashboard
2. Find the following tables and ensure they're enabled:
   - `call_sessions` ✅
   - `call_participants` ✅
   - `user_profiles` (if needed)
3. If they're not enabled, click the toggle to enable replication for each table

## Step 3: Check RLS Policies

Row-Level Security (RLS) policies must allow the current user to read from these tables:

1. Go to **Database** → **Tables** → `call_sessions`
2. Click on **Policies** tab
3. Ensure there's a SELECT policy that allows authenticated users to read call sessions
4. Repeat for `call_participants` table

## Step 4: Check Network/Firewall

If you're on a corporate network or behind a firewall:

1. Ensure WebSocket connections (wss://) are allowed
2. Check if your network blocks connections to `*.supabase.co`
3. Try connecting from a different network (e.g., mobile hotspot)

## Step 5: Verify Realtime Connection

Run this test query in your Supabase SQL Editor:

```sql
-- Check if Realtime is enabled
SELECT 
    schemaname,
    tablename,
    CASE 
        WHEN schemaname = 'realtime' THEN 'Realtime enabled'
        ELSE 'Not realtime'
    END as realtime_status
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';
```

## Step 6: Enable Replication for Tables (SQL)

If replication isn't enabled, run this in your Supabase SQL Editor:

```sql
-- Enable replication for call_sessions
ALTER PUBLICATION supabase_realtime ADD TABLE call_sessions;

-- Enable replication for call_participants  
ALTER PUBLICATION supabase_realtime ADD TABLE call_participants;

-- Verify
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename IN ('call_sessions', 'call_participants');
```

## Step 7: Restart API

After making changes:

1. Go to **Database** → **Restart API** in Supabase Dashboard
2. Or run: `NOTIFY pgrst, 'reload schema';` in SQL Editor

## Common Issues

### Issue: "Realtime not enabled"
**Solution**: Enable Realtime in Settings → API → Realtime

### Issue: "Table not in replication"
**Solution**: Add table to `supabase_realtime` publication (see Step 6)

### Issue: "RLS blocking access"
**Solution**: Check and update RLS policies to allow SELECT for authenticated users

### Issue: "Network blocking WebSockets"
**Solution**: Check firewall/network settings, try different network

## Testing the Connection

After fixing the configuration, reload your app. You should see:
- `✅ Global call listener subscribed for user [user-id]` in logs
- No more "Channel closed" errors

If it still fails, check the browser/device console for WebSocket connection errors.





