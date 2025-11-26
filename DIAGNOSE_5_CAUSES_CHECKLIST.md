# Diagnostic Checklist for 5 Root Causes

## Quick Action Items

### 1. Run SQL Diagnostics
Run `database/diagnose_5_root_causes.sql` in Supabase SQL Editor. This will check:
- ✅ Cause 1: If `auth.uid()` is NULL in RLS context
- ✅ Cause 3: All INSERT policies (check for conflicts)
- ✅ Cause 4: SECURITY DEFINER function permissions
- ✅ Cause 5: RLS caching issues

### 2. Check Code (Cause 1 & 2)

#### Cause 1: Service Role Client Check
✅ **VERIFIED**: `src/lib/supabase.js` uses `supabaseAnonKey` (not service role)
- The client is created with anon key
- Session is verified before INSERT
- **Action**: Check if the supabase client instance is being reused from before login

#### Cause 2: NULL Values in INSERT Payload
✅ **ADDED LOGGING**: Check console logs for:
- `payloadCheck.hasNullValues` - Should be `false`
- `payloadCheck.team_id` - Should be a valid UUID
- `payloadCheck.user_id` - Should be a valid UUID
- `payloadCheck.event_id` - Should be a valid UUID

**Look for this in logs:**
```
❌ CAUSE 2 DETECTED: NULL values in critical fields!
```

### 3. Check for Multiple Policies (Cause 3)
Run this query:
```sql
SELECT policyname, cmd, with_check 
FROM pg_policies 
WHERE tablename = 'event_attendance' 
AND cmd = 'INSERT';
```

**Look for:**
- Multiple INSERT policies (should only be one)
- Policies with `USING (false)` 
- Policies without `WITH CHECK` clause

### 4. Verify Function Permissions (Cause 4)
The diagnostic SQL will check:
- Functions are `SECURITY DEFINER`
- Functions are in `public` schema
- Functions are granted to `authenticated` role

### 5. Force Policy Refresh (Cause 5)
If policies are cached:
1. Drop and recreate the policy
2. Or restart Supabase project
3. Or run policy creation through Supabase dashboard

## Expected Results

### If Cause 1 (auth.uid() is NULL):
```
auth_uid_value: NULL
status: ❌ PROBLEM: auth.uid() is NULL - RLS will fail
```

### If Cause 2 (NULL values):
Look in console logs for:
```
payloadCheck.hasNullValues: true
```

### If Cause 3 (Multiple policies):
You'll see multiple rows in the policy query results

### If Cause 4 (Function permissions):
```
is_security_definer: false
status: ❌ PROBLEM: Not SECURITY DEFINER
```

### If Cause 5 (Caching):
Policies might show old definitions or RLS might be disabled

## Next Steps Based on Results

1. **If Cause 1**: Ensure supabase client is created after login, or recreate it
2. **If Cause 2**: Fix the attendanceData object to ensure no NULLs
3. **If Cause 3**: Drop conflicting policies
4. **If Cause 4**: Recreate functions with correct permissions
5. **If Cause 5**: Force policy refresh or restart

