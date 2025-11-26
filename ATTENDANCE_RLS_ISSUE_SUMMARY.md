# Attendance RLS Policy Issue - Summary

## Problem
When a coach tries to manually mark attendance for a team member, they get an RLS policy violation error:
```
ERROR: 42501: new row violates row-level security policy for table "event_attendance"
```

## Current Status
- ✅ User is verified as coach/admin in database (`team_members` table: `role='coach'`, `is_admin=true`)
- ✅ Target user (Chiamaka) is verified as being in the team
- ✅ Session is valid (`hasSession: true`, `hasAccessToken: true`)
- ✅ Helper functions (`is_coach_or_admin`, `is_user_in_team`) work correctly when tested directly
- ❌ RLS policy still blocks the INSERT operation

## User IDs
- **Current User (Coach)**: `<USER_ID>`
- **Target User (Being Marked)**: `e163e9b2-55ea-49aa-a8e7-3c83bf550d74` (Chiamaka)
- **Team ID**: `<TEAM_ID>`

## Relevant Files

### Database Files
1. **`database/fix_attendance_insert_rls.sql`** - Original fix with helper functions
2. **`database/fix_attendance_rls_complete.sql`** - Complete fix that drops all policies and recreates
3. **`database/fix_attendance_rls_v2.sql`** - Added explicit `auth.uid() IS NOT NULL` check
4. **`database/fix_attendance_rls_v3.sql`** - Direct checks in policy (no helper functions)
5. **`database/fix_attendance_rls_v4.sql`** - Direct column references (no table prefix)
6. **`database/get_current_rls_policies.sql`** - Query to export current RLS policies

### Diagnostic Files
1. **`database/check_current_user_coach.sql`** - Verify user is coach/admin
2. **`database/check_user_role.sql`** - Check user roles in both tables
3. **`database/verify_user_exists.sql`** - Verify user exists in database
4. **`database/test_policy_condition.sql`** - Test policy condition logic
5. **`database/diagnose_exact_issue.sql`** - Comprehensive diagnostic queries

### Code Files
1. **`src/api/attendance.js`** - Main attendance API (lines 119-387)
   - `checkInToEvent()` function handles manual check-ins
   - Added session verification and debug logging

2. **`src/components/AttendanceList.jsx`** - UI component for attendance list
   - `handleManualMark()` function (line 119) calls the API

3. **`src/hooks/useEventRole.js`** - Hook that determines if user is coach
   - Used by `EventDetailsModal` to show/hide coach UI

## What We've Tried

1. ✅ Created helper functions (`is_coach_or_admin`, `is_user_in_team`) to check roles
2. ✅ Updated `is_user_in_team` to check both `team_members` and `team_member_roles` tables
3. ✅ Added explicit `auth.uid() IS NOT NULL` check in policy
4. ✅ Tried direct checks in policy (no helper functions)
5. ✅ Added session verification in code before INSERT
6. ✅ Added debug logging to verify session/auth context

## Current Policy (from v3/v4)
```sql
CREATE POLICY "Coaches insert team attendance" ON event_attendance
    FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND (
            EXISTS (
                SELECT 1 FROM team_member_roles tmr
                WHERE tmr.team_id = team_id
                AND tmr.user_id = auth.uid()
                AND tmr.role IN ('head_coach', 'assistant_coach', 'team_admin')
            )
            OR EXISTS (
                SELECT 1 FROM team_members tm
                WHERE tm.team_id = team_id
                AND tm.user_id = auth.uid()
                AND (tm.role = 'coach' OR tm.is_admin = TRUE)
            )
        )
        AND (
            EXISTS (
                SELECT 1 FROM team_members tm
                WHERE tm.team_id = team_id
                AND tm.user_id = user_id
            )
            OR EXISTS (
                SELECT 1 FROM team_member_roles tmr
                WHERE tmr.team_id = team_id
                AND tmr.user_id = user_id
            )
        )
    );
```

## Next Steps for Engineer

1. **Run `database/get_current_rls_policies.sql`** to see the exact current policy definition
2. **Run `database/test_policy_condition.sql`** to verify the logic works with actual values
3. **Check for other INSERT policies** that might be interfering
4. **Verify `auth.uid()` is being evaluated correctly** in the RLS context
5. **Check Supabase logs** for more detailed error information
6. **Consider using a stored procedure** instead of direct INSERT with RLS

## Possible Root Causes

1. **RLS Policy Evaluation Issue**: `auth.uid()` might not be available in the policy context
2. **Multiple Policies Conflict**: Another INSERT policy might be blocking
3. **Supabase RLS Caching**: Policy changes might not be applied immediately
4. **Function Permission Issue**: SECURITY DEFINER functions might not have correct permissions
5. **Column Reference Issue**: Column names in WITH CHECK might need different syntax

## Debug Logs from App
```
LOG  🔍 Manual check-in attempt: {
  "currentUserId": "<USER_ID>",
  "sessionUserId": "<USER_ID>",
  "hasSession": true,
  "hasAccessToken": true,
  "targetUserId": "e163e9b2-55ea-49aa-a8e7-3c83bf550d74",
  "teamId": "<TEAM_ID>"
}
ERROR  🚨 RLS Policy Violation: {
  "code": "42501",
  "message": "new row violates row-level security policy for table \"event_attendance\""
}
```

