# Quick Fix: Enable Realtime Replication

The Realtime connection is failing because database replication isn't enabled for the calling tables.

## ✅ Quick Fix (2 minutes)

### Step 1: Run this SQL in Supabase Dashboard

1. Go to: **Supabase Dashboard → SQL Editor**
2. Copy and paste this SQL:

```sql
-- Enable Realtime Replication for Calling Tables
ALTER PUBLICATION supabase_realtime ADD TABLE call_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE call_participants;

-- Verify it worked
SELECT tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename IN ('call_sessions', 'call_participants');
```

3. Click **Run**
4. You should see both tables listed in the results

### Step 2: Restart API

1. Go to: **Supabase Dashboard → Database → Restart API**
2. Click **Restart API**

### Step 3: Reload Your App

After restarting the API, reload your app. The Realtime connection should work now.

---

## 🔍 If It Still Doesn't Work

### Check Realtime is Enabled

1. Go to: **Settings → API**
2. Scroll to **Realtime** section
3. Ensure **Realtime** toggle is **ON**

### Check RLS Policies

Make sure your RLS policies allow SELECT for authenticated users on:
- `call_sessions`
- `call_participants`

---

## 📝 Alternative: Disable Call Listener Temporarily

If you want to use the app without incoming call notifications for now, you can comment out the call listener setup in `App.js`. The app will work, but you won't get incoming call notifications.





