# Cause 1 Fix: auth.uid() is NULL in RLS Context

## Problem
The Supabase client is not passing the authentication token to the database, causing `auth.uid()` to be NULL in RLS policies.

## Root Cause
The Supabase JS client should automatically include the session token in requests, but it's not working. This can happen if:
1. The client was created before login
2. The session is not being persisted correctly
3. The client is not reading the stored session

## Solution Options

### Option 1: Verify Session is Being Used (Current Fix)
I've added session verification before the INSERT. This ensures:
- Session exists
- Access token exists
- Session user matches expected user

**However**, this doesn't guarantee the token is being sent. The Supabase client should handle this automatically.

### Option 2: Use RPC Function Instead (Recommended)
Instead of direct INSERT, use a stored procedure that can verify the user context:

```sql
CREATE OR REPLACE FUNCTION insert_event_attendance(
  p_event_id UUID,
  p_user_id UUID,
  p_team_id UUID,
  p_check_in_method VARCHAR,
  p_status VARCHAR,
  -- ... other params
)
RETURNS event_attendance AS $$
DECLARE
  v_current_user_id UUID;
BEGIN
  -- Get current user from auth context
  v_current_user_id := auth.uid();
  
  -- Verify user is coach/admin
  IF NOT is_coach_or_admin(p_team_id, v_current_user_id) THEN
    RAISE EXCEPTION 'Not authorized to mark attendance';
  END IF;
  
  -- Insert attendance
  INSERT INTO event_attendance (...)
  VALUES (...)
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Option 3: Check Supabase Client Configuration
Verify the client is configured correctly:
- `persistSession: true` ✅ (already set)
- `autoRefreshToken: true` ✅ (already set)

### Option 4: Force Session Refresh
Before making the INSERT, explicitly refresh the session:

```javascript
await supabase.auth.refreshSession();
```

## Next Steps

1. **Try the current fix first** - The session verification might help
2. **If it still fails**, check Supabase logs to see if the Authorization header is being sent
3. **Consider using RPC function** - This gives more control over the auth context
4. **Check if other INSERTs work** - If other tables work, it might be specific to this policy

## Debugging

Check Supabase logs for:
- Is the Authorization header present in the request?
- What does `auth.uid()` return in the logs?
- Are there any auth-related errors?

## Alternative: Bypass RLS Temporarily (For Testing Only)

To test if RLS is the issue, you can temporarily disable RLS:

```sql
ALTER TABLE event_attendance DISABLE ROW LEVEL SECURITY;
```

**⚠️ WARNING: Only for testing! Re-enable RLS immediately after.**

