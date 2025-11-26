# Custom Attendance Groups - Implementation Status

## 📋 Overview

This document tracks the implementation status of the Custom Attendance Groups feature, from database setup through UI completion.

---

## ✅ **COMPLETED PHASES**

### **Phase 1: Database Setup** ✅
- [x] Created `attendance_groups` table
- [x] Created `attendance_group_members` table
- [x] Added `assigned_attendance_groups` (JSONB) to `events` table
- [x] Added `is_full_team_event` (BOOLEAN) to `events` table
- [x] Created indexes for performance
- [x] Created RLS policies (basic structure)
- [x] Created helper functions (`is_user_in_group`, `get_user_attendance_groups`)

**Files:**
- `database/attendance_groups_schema.sql`

---

### **Phase 2: API Functions** ✅
- [x] `getTeamAttendanceGroups(teamId)` - Get all groups for a team
- [x] `getAttendanceGroup(groupId)` - Get single group with members
- [x] `createAttendanceGroup(teamId, groupData)` - Create new group
- [x] `updateAttendanceGroup(groupId, updates)` - Update group
- [x] `deleteAttendanceGroup(groupId)` - Delete group
- [x] `getGroupMembers(groupId)` - Get members in a group
- [x] `addMemberToGroup(groupId, userId)` - Add member
- [x] `removeMemberFromGroup(groupId, userId)` - Remove member
- [x] `bulkAddMembersToGroup(groupId, userIds)` - Bulk add
- [x] `bulkRemoveMembersFromGroup(groupId, userIds)` - Bulk remove
- [x] `getUserAttendanceGroups(teamId, userId)` - Get user's groups
- [x] `isUserInGroup(userId, groupId)` - Check membership
- [x] `isUserInAnyGroup(userId, groupIds)` - Check if in any group
- [x] Updated `formatEventData()` to include group assignments
- [x] Created `isEventVisibleToUser()` helper function
- [x] Created `filterEventsByUserGroups()` helper function

**Files:**
- `src/api/attendanceGroups.js` ✅
- `src/api/events.js` (updated) ✅

---

### **Phase 3: Attendance Groups Management UI** ✅
- [x] Created `AttendanceGroupsScreen` - List all groups
- [x] Created `AttendanceGroupModal` - Create/edit groups
- [x] Member selection with checkboxes
- [x] Search functionality for team members
- [x] Bulk add/remove members
- [x] Group name, description, color fields
- [x] Edit/delete groups
- [x] Member count display
- [x] Pull-to-refresh
- [x] Loading and empty states
- [x] Added navigation to Actions screen (coach-only)

**Files:**
- `src/screens/AttendanceGroupsScreen.jsx` ✅
- `src/components/AttendanceGroupModal.jsx` ✅
- `src/constants/actions.js` (updated) ✅
- `src/screens/ActionsScreen.jsx` (updated) ✅
- `App.js` (navigation added) ✅

---

### **Phase 4: Event Creation Integration** ✅
- [x] Added "Event Visibility" section to `EventCreationModal`
- [x] Radio buttons: "Full Team" vs "Specific Groups"
- [x] Group selector dropdown with search
- [x] Selected groups displayed as chips
- [x] Add/remove groups functionality
- [x] Validation (at least one group if "Specific Groups" selected)
- [x] Pre-fill groups in edit mode
- [x] Debounced search for performance
- [x] Handles stale group IDs
- [x] Prevents overwriting user changes
- [x] Empty state messages
- [x] Updated `handleCreateEvent` to include group data

**Files:**
- `src/components/EventCreationModal.jsx` ✅
- `src/hooks/useDebounce.js` ✅

---

### **Phase 6: Check-in Authorization (API)** ✅
- [x] `checkInToEvent()` verifies group membership
- [x] Checks if event is full team or has assigned groups
- [x] Verifies user is in at least one assigned group
- [x] Returns clear error: "This event is only for [Group Names]"
- [x] Handles manual check-ins by coaches (bypasses group check)

**Files:**
- `src/api/attendance.js` (updated) ✅

---

## ⚠️ **REMAINING TASKS**

### **🔴 CRITICAL: RLS Policy Fix** (BLOCKING)

**Status:** SQL file created, but **NOT RUN in Supabase yet**

**Issue:** 
- RLS policies only check `team_member_roles` table
- Users with roles in `team_members` table can't create groups
- Error: `"new row violates row-level security policy"`

**Fix:**
- File: `database/fix_attendance_groups_rls.sql`
- Creates `is_coach_or_admin()` function that checks both tables
- Updates all RLS policies to use the function

**Action Required:**
1. Run `database/fix_attendance_groups_rls.sql` in Supabase SQL Editor
2. Verify coaches can create groups

---

### **🟡 Phase 5: Event Filtering & Visibility** (NOT IMPLEMENTED)

**Status:** Helper functions exist, but not integrated into calendar

**What's Missing:**

1. **`useCalendarData` Hook** - Doesn't filter events
   - Currently returns ALL events for the team
   - Should fetch user's attendance groups
   - Should filter events using `filterEventsByUserGroups()`

2. **Calendar Screen** - Shows all events
   - Should only show events user can see
   - Should show badge/indicator for group-specific events

3. **EventsList Component** - Renders all events
   - Should only render visible events (already filtered upstream)
   - Should add visual indicator for group-specific events

**Implementation Plan:**

```javascript
// In useCalendarData.js:
1. Fetch user's attendance groups on mount
   - Use: getUserAttendanceGroups(teamId, userId)
   
2. Filter events after fetching
   - Use: filterEventsByUserGroups(events, userId, userGroupIds)
   
3. Return filtered events instead of all events
```

**Files to Update:**
- `src/hooks/useCalendarData.js` ⚠️
- `src/screens/CalendarScreen.jsx` ⚠️
- `src/components/EventsList.jsx` ⚠️

---

### **🟡 Phase 6: Check-in UI Updates** (PARTIALLY DONE)

**Status:** API works, but UI doesn't show restrictions

**What's Missing:**

1. **`EventDetailsModal`** - Doesn't check group membership before showing check-in buttons
   - Should fetch user's groups when modal opens
   - Should check if user is in assigned groups
   - Should hide check-in buttons if user not in group
   - Should show message: "This event is only for [Group Names]. You are not a member of any assigned group."

**Implementation Plan:**

```javascript
// In EventDetailsModal.jsx:
1. Fetch user's attendance groups when modal opens
2. Check if event has assigned groups
3. If is_full_team_event = false AND groups assigned:
   - Check if user is in any assigned group
   - If NOT in group:
     - Hide check-in buttons
     - Show message with group names
   - If IN group:
     - Show check-in buttons normally
```

**Files to Update:**
- `src/components/EventDetailsModal.jsx` ⚠️

---

## 🐛 **KNOWN ISSUES**

### **Issue 1: Temp Event IDs in Attendance Status**
**Status:** ✅ FIXED
- Problem: Attendance status fetch tried to use temp IDs like `"temp-1763860291460"`
- Fix: Filter out temp IDs before fetching attendance status
- File: `src/screens/CalendarScreen.jsx`

### **Issue 2: RLS Policy Doesn't Check team_members**
**Status:** ⚠️ FIX FILE EXISTS, NOT RUN
- Problem: Coaches with roles in `team_members` can't create groups
- Fix: `database/fix_attendance_groups_rls.sql` (needs to be run)

---

## 📝 **TESTING CHECKLIST**

### **Before Moving Forward:**
- [ ] Run RLS fix SQL in Supabase
- [ ] Test creating an attendance group (should work after RLS fix)
- [ ] Test adding members to a group
- [ ] Test creating an event with specific groups
- [ ] Test that all team members can see full team events
- [ ] Test that only group members see group-specific events (after Phase 5)
- [ ] Test that non-group members can't check in (after Phase 6 UI)

---

## 🎯 **NEXT STEPS (Priority Order)**

### **Step 1: Fix RLS Policy** 🔴
1. Open Supabase SQL Editor
2. Run `database/fix_attendance_groups_rls.sql`
3. Test creating a group
4. Verify it works

### **Step 2: Implement Phase 5 - Event Filtering** 🟡
1. Update `useCalendarData.js` to fetch user's groups
2. Filter events by group membership
3. Update `EventsList.jsx` to show group indicators
4. Test that events are properly filtered

### **Step 3: Complete Phase 6 - Check-in UI** 🟡
1. Update `EventDetailsModal.jsx` to check group membership
2. Hide check-in buttons for non-members
3. Show helpful error message
4. Test check-in restrictions

---

## 📊 **COMPLETION STATUS**

| Phase | Status | Completion |
|-------|--------|------------|
| Phase 1: Database Setup | ✅ Complete | 100% |
| Phase 2: API Functions | ✅ Complete | 100% |
| Phase 3: Management UI | ✅ Complete | 100% |
| Phase 4: Event Creation | ✅ Complete | 100% |
| Phase 5: Event Filtering | ⚠️ Not Started | 0% |
| Phase 6: Check-in UI | 🟡 Partial | 50% |
| RLS Fix | ⚠️ File Ready | 0% (needs to run) |

**Overall Progress: ~75% Complete**

---

## 🔍 **CODE REFERENCES**

### **Helper Functions (Already Exist):**
- `src/api/events.js`:
  - `isEventVisibleToUser(event, userId, userGroupIds)` ✅
  - `filterEventsByUserGroups(events, userId, userGroupIds)` ✅

- `src/api/attendanceGroups.js`:
  - `getUserAttendanceGroups(teamId, userId)` ✅
  - `isUserInAnyGroup(userId, groupIds)` ✅

### **Files That Need Updates:**
- `src/hooks/useCalendarData.js` - Add group filtering
- `src/components/EventDetailsModal.jsx` - Add group check UI
- `src/components/EventsList.jsx` - Add group indicators

---

## 💡 **NOTES**

1. **Backward Compatibility:** All existing events default to `is_full_team_event = true`, so they'll continue to work for everyone.

2. **Performance:** Group filtering happens client-side after fetching events. For large teams, consider server-side filtering in the future.

3. **Coaches:** Coaches should be able to see all events regardless of group membership (for management purposes). This may need to be added.

4. **Visual Indicators:** Consider adding badges/icons to show which events are group-specific vs full team.

---

**Last Updated:** Current Date
**Next Review:** After RLS fix is run and Phase 5 is implemented

