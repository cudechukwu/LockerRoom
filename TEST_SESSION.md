# Testing Session Hydration

## Important Note

**`SELECT auth.uid()` in the Supabase SQL Editor will ALWAYS return NULL** because:
- The SQL editor runs in the Supabase dashboard context
- It doesn't use your app's session/JWT token
- It's a separate authentication context

## How to Actually Test

### 1. Check App Logs
When the app starts, you should see:
```
✅ SupabaseProvider: Session hydrated successfully
  userId: 8d99f216-1454-4500-9652-f87922774f5c
  hasAccessToken: true
  expiresAt: ...
```

### 2. Try Marking Attendance
1. Open the app
2. Go to an event
3. Try to mark attendance (manual or QR code)
4. Check the console logs - you should see:
```
✅ Check-in request authenticated:
  userId: 8d99f216-1454-4500-9652-f87922774f5c
  hasAccessToken: true
  sessionUserId: 8d99f216-1454-4500-9652-f87922774f5c
  match: true
```

### 3. If You Still Get RLS Errors
Check the logs for:
- `❌ No access token in session` - Session not hydrated
- `❌ Error getting session` - Session fetch failed
- `User not authenticated` - User is null

### 4. Verify in Database
After a successful check-in, run:
```sql
SELECT 
  user_id,
  event_id,
  status,
  checked_in_at
FROM event_attendance
WHERE user_id = '8d99f216-1454-4500-9652-f87922774f5c'
ORDER BY checked_in_at DESC
LIMIT 5;
```

This will show if the insert actually worked (RLS allowed it).

## Expected Behavior

✅ **Working correctly:**
- App logs show session hydrated
- Check-in logs show authenticated request
- Attendance record is created in database
- No RLS errors

❌ **Still broken:**
- App logs show "No active session" when you're logged in
- Check-in fails with RLS error
- Logs show "No access token in session"

