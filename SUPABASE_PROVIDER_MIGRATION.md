# Supabase Provider Migration - In Progress

## ✅ Completed
1. Created `src/providers/SupabaseProvider.jsx` - Provider that waits for session hydration
2. Wrapped App.js in SupabaseProvider
3. Updated `checkInToEvent()` to accept supabase as first parameter
4. Updated `AttendanceList.jsx` to use `useSupabase()` hook
5. Updated `useEventCheckIn.js` to use `useSupabase()` hook

## ⚠️ Still Need to Update

### Functions in `src/api/attendance.js` that need supabase parameter:
- [ ] `checkOutOfEvent(supabase, eventId)` - Currently called from `useEventCheckIn.js`
- [ ] `getEventAttendance(supabase, eventId, filters)` - Called from `AttendanceList.jsx` and `useEventAttendance.js`
- [ ] `getUserAttendanceStatus(supabase, eventId)` - Check where it's called
- [ ] `getAttendanceHistory(supabase, userId, startDate, endDate)` - Check where it's called
- [ ] `generateEventQRCode(supabase, eventId)` - Check where it's called

### Files that need to use `useSupabase()` hook:
- [ ] `src/hooks/useEventAttendance.js` - Uses `getEventAttendance()`
- [ ] `src/components/AttendanceList.jsx` - Uses `getEventAttendance()` (already updated for checkInToEvent)
- [ ] `src/hooks/useEventCheckIn.js` - Uses `checkOutOfEvent()` (already updated for checkInToEvent)

### App.js
- [ ] App.js still uses `supabase` directly in many places
- [ ] Need to create an inner component that uses `useSupabase()` hook, or refactor to pass supabase down

## Quick Fix for Remaining Functions

For each function in `attendance.js`:
1. Add `supabaseClient` as first parameter
2. Add validation: `if (!supabaseClient) throw new Error('Supabase client required')`
3. Use `const supabase = supabaseClient;` inside function
4. Update all call sites to pass supabase from `useSupabase()` hook

## Testing
After migration:
1. Restart app completely
2. Try marking attendance
3. Run SQL: `SELECT auth.uid();` - Should return user ID, not NULL
4. Verify RLS policy allows the insert

