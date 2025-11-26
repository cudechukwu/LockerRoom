# Custom Attendance Groups - Implementation Plan

## 🎯 Overview

Allow coaches to create **flexible, custom groups** with any name and assign any players to them. These groups can be attached to events, and only group members can see and check in to those events.

**Examples:**
- "D-Line" (not necessarily the position group - could be current D-Line players)
- "Special Teams"
- "Scout O"
- "Film Crew"
- "Captains"
- "All Seniors"
- "Traveling Squad"
- "Rehab Guys"
- "Leadership Council"
- "Red Zone Package"
- "Nickel Defense"
- "Goal Line Offense"

**Key Difference from Position Groups:**
- Position groups = tied to actual positions (QB, OL, etc.)
- **Custom attendance groups = flexible, arbitrary groupings for any purpose**

## 🗄️ Database Schema

### New Table: `attendance_groups`

```sql
CREATE TABLE IF NOT EXISTS attendance_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    
    -- Group details
    name VARCHAR(100) NOT NULL, -- e.g., "D-Line", "Traveling Squad", "Film Crew"
    description TEXT, -- Optional description
    color VARCHAR(7), -- Optional color for UI (hex code)
    
    -- Metadata
    created_by UUID NOT NULL, -- References auth.users (coach who created it)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(team_id, name) -- One group per name per team
);

CREATE INDEX idx_attendance_groups_team_id ON attendance_groups(team_id);
CREATE INDEX idx_attendance_groups_created_by ON attendance_groups(created_by);
```

### New Table: `attendance_group_members`

```sql
CREATE TABLE IF NOT EXISTS attendance_group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES attendance_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- References auth.users (player)
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE, -- Denormalized for RLS
    
    -- Metadata
    added_by UUID NOT NULL, -- References auth.users (who added this member)
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(group_id, user_id) -- One membership per user per group
);

CREATE INDEX idx_attendance_group_members_group_id ON attendance_group_members(group_id);
CREATE INDEX idx_attendance_group_members_user_id ON attendance_group_members(user_id);
CREATE INDEX idx_attendance_group_members_team_id ON attendance_group_members(team_id);
```

### Update Events Table

```sql
-- Add field to store assigned attendance groups
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS assigned_attendance_groups JSONB DEFAULT '[]'::jsonb;

-- Index for filtering
CREATE INDEX idx_events_attendance_groups 
ON events USING GIN (assigned_attendance_groups);

-- Also add a flag for "Full Team" events
ALTER TABLE events
ADD COLUMN IF NOT EXISTS is_full_team_event BOOLEAN DEFAULT TRUE;
```

**Note:** `assigned_attendance_groups` will store an array of group IDs:
```json
["uuid-1", "uuid-2", "uuid-3"]
```

If `is_full_team_event = true` OR `assigned_attendance_groups` is empty → event visible to all team members.

## 🔐 Row Level Security (RLS)

### Attendance Groups Policies

```sql
ALTER TABLE attendance_groups ENABLE ROW LEVEL SECURITY;

-- Team members can view all groups for their team
CREATE POLICY "Team members can view attendance groups" ON attendance_groups
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = attendance_groups.team_id
            AND tm.user_id = auth.uid()
        )
    );

-- Only coaches/admins can create/edit/delete groups
CREATE POLICY "Coaches can manage attendance groups" ON attendance_groups
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM team_member_roles tmr
            WHERE tmr.team_id = attendance_groups.team_id
            AND tmr.user_id = auth.uid()
            AND tmr.role IN ('head_coach', 'assistant_coach', 'team_admin')
        )
    );
```

### Attendance Group Members Policies

```sql
ALTER TABLE attendance_group_members ENABLE ROW LEVEL SECURITY;

-- Team members can view group memberships
CREATE POLICY "Team members can view group members" ON attendance_group_members
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = attendance_group_members.team_id
            AND tm.user_id = auth.uid()
        )
    );

-- Only coaches/admins can manage memberships
CREATE POLICY "Coaches can manage group members" ON attendance_group_members
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM team_member_roles tmr
            WHERE tmr.team_id = attendance_group_members.team_id
            AND tmr.user_id = auth.uid()
            AND tmr.role IN ('head_coach', 'assistant_coach', 'team_admin')
        )
    );
```

## 📋 Implementation Phases

### Phase 1: Database Setup (30 min)

1. Create `attendance_groups` table
2. Create `attendance_group_members` table
3. Add `assigned_attendance_groups` and `is_full_team_event` to events table
4. Add RLS policies
5. Create indexes

### Phase 2: API Functions (1-2 hours)

**New file: `src/api/attendanceGroups.js`**

1. `getTeamAttendanceGroups(teamId)` - Get all groups for a team
2. `createAttendanceGroup(teamId, groupData)` - Create new group
3. `updateAttendanceGroup(groupId, updates)` - Update group name/description
4. `deleteAttendanceGroup(groupId)` - Delete group
5. `getGroupMembers(groupId)` - Get all members in a group
6. `addMemberToGroup(groupId, userId)` - Add player to group
7. `removeMemberFromGroup(groupId, userId)` - Remove player from group
8. `getUserAttendanceGroups(teamId, userId)` - Get all groups a user belongs to
9. `isUserInGroup(userId, groupId)` - Check if user is in group
10. `bulkAddMembersToGroup(groupId, userIds)` - Add multiple members at once

**Update: `src/api/events.js`**

1. Update `createEvent()` - Accept `assignedAttendanceGroups` array and `isFullTeamEvent` flag
2. Update `formatEventData()` - Include group assignments
3. Update `getEventsForDay()` and related functions - Filter by user's groups
4. Add `isEventVisibleToUser(event, userId)` - Check visibility

**Update: `src/api/attendance.js`**

1. Update `checkInToEvent()` - Verify user is in assigned group(s)
2. Return clear error if user not authorized

### Phase 3: Attendance Groups Management UI (2-3 hours)

**New: `src/screens/AttendanceGroupsScreen.jsx`**

- List all custom groups
- Create new group button
- Edit/delete groups
- View members per group
- Search/filter groups

**New: `src/components/AttendanceGroupModal.jsx`**

- Create/edit group form
- Group name input (required)
- Description input (optional)
- Color picker (optional)
- Member selection (multi-select from team members)
- Save/cancel buttons

**New: `src/components/AttendanceGroupMemberList.jsx`**

- Show members in a group
- Add/remove members
- Search/filter team members
- Bulk add/remove

### Phase 4: Event Creation Updates (1-2 hours)

**Update: `src/components/EventCreationModal.jsx`**

1. Add "Event Visibility" section:
   ```
   ┌─────────────────────────────┐
   │ Event Visibility             │
   ├─────────────────────────────┤
   │ ○ Full Team (everyone)      │
   │ ● Specific Groups            │
   │                              │
   │ Selected Groups:             │
   │ 🏈 D-Line              [×]   │
   │ 🏈 Traveling Squad     [×]   │
   │                              │
   │ [+ Add Group]                │
   └─────────────────────────────┘
   ```

2. Multi-select dropdown for groups
3. Show selected groups as chips
4. Default to "Full Team" for backward compatibility

**Update: `src/api/events.js`**

- `formatEventData()` - Include `assigned_attendance_groups` and `is_full_team_event`

### Phase 5: Event Filtering & Visibility (1-2 hours)

**Update: `src/hooks/useCalendarData.js`**

1. Fetch user's attendance groups on mount
2. Filter events:
   - Show if `is_full_team_event = true`, OR
   - Show if `assigned_attendance_groups` is empty, OR
   - Show if user is in at least one assigned group

**Update: `src/screens/CalendarScreen.jsx`**

- Pass filtered events to EventsList
- Show badge for group-specific events

**Update: `src/components/EventsList.jsx`**

- Only render events user can see
- Add visual indicator for group-specific events

### Phase 6: Check-in Authorization (30 min)

**Update: `src/api/attendance.js`**

1. In `checkInToEvent()`:
   - Check if event has assigned groups
   - If `is_full_team_event = false` AND groups assigned:
     - Verify user is in at least one assigned group
     - If not → return error: "This event is only for [Group Names]"

**Update: `src/components/EventDetailsModal.jsx`**

1. Hide check-in buttons if user not in group
2. Show message: "This event is only for [Group Names]. You are not a member of any assigned group."

## 🎨 UI/UX Design

### Attendance Groups Screen
```
┌─────────────────────────────────┐
│ Attendance Groups        [+ New] │
├─────────────────────────────────┤
│ 🏈 D-Line                [Edit] │
│   5 members                      │
│   "Current defensive line"       │
│                                  │
│ 🏈 Traveling Squad       [Edit] │
│   12 members                     │
│   "Players traveling to away..." │
│                                  │
│ 🏈 Film Crew             [Edit] │
│   3 members                      │
│                                  │
│ 🏈 Captains              [Edit] │
│   4 members                      │
└─────────────────────────────────┘
```

### Create/Edit Group Modal
```
┌─────────────────────────────────┐
│ Create Attendance Group          │
├─────────────────────────────────┤
│ Group Name: [D-Line          ]  │
│                                  │
│ Description:                     │
│ [Current defensive line players] │
│                                  │
│ Color: [🎨 Pick Color]           │
│                                  │
│ Members:                         │
│ ☑ John Smith                     │
│ ☑ Mike Johnson                   │
│ ☐ Sarah Williams                 │
│ ☑ Tom Brown                      │
│ ☐ Alex Davis                     │
│                                  │
│ [Search members...]              │
│                                  │
│ [Cancel]  [Save]                 │
└─────────────────────────────────┘
```

### Event Creation - Group Selection
```
┌─────────────────────────────────┐
│ Event Visibility                 │
├─────────────────────────────────┤
│ ○ Full Team (all members)       │
│ ● Specific Groups                │
│                                  │
│ Selected Groups:                 │
│ 🏈 D-Line                  [×]   │
│ 🏈 Traveling Squad         [×]   │
│                                  │
│ [+ Add Group ▼]                  │
│   • Film Crew                    │
│   • Captains                     │
│   • Special Teams                │
│   • Scout O                      │
└─────────────────────────────────┘
```

## 🔄 User Flows

### Creating a Group
1. Coach navigates to "Attendance Groups" screen
2. Clicks "+ New Group"
3. Enters name: "D-Line"
4. Optionally adds description
5. Selects team members (multi-select)
6. Saves → Group created with members

### Assigning Groups to Event
1. Coach creates event
2. Selects "Specific Groups" (instead of "Full Team")
3. Selects groups: "D-Line", "Traveling Squad"
4. Saves event → Only members of those groups can see it

### Player Viewing Events
1. Player opens calendar
2. System checks: What groups is player in?
3. Shows:
   - All "Full Team" events
   - Events assigned to player's groups
4. Hides events player is not in

### Player Checking In
1. Player clicks "Check In" on event
2. System verifies:
   - Is it a "Full Team" event? → Allow
   - Is player in at least one assigned group? → Allow
   - Otherwise → Show error

## 🎯 Success Criteria

- ✅ Coaches can create custom groups with any name
- ✅ Coaches can add/remove any players to/from groups
- ✅ Groups are saved permanently and reusable
- ✅ Coaches can assign groups to events
- ✅ "Full Team" option works for all-team events
- ✅ Only group members see group-specific events
- ✅ Only group members can check in to group-specific events
- ✅ Works for any sport (not just football)
- ✅ UI is intuitive and matches existing design

## 📝 Files to Create/Modify

### New Files
- `database/attendance_groups_schema.sql` - Database schema
- `src/api/attendanceGroups.js` - API functions
- `src/screens/AttendanceGroupsScreen.jsx` - Management screen
- `src/components/AttendanceGroupModal.jsx` - Create/edit modal
- `src/components/AttendanceGroupMemberList.jsx` - Member management

### Files to Modify
- `database/events_schema.sql` - Add `assigned_attendance_groups` and `is_full_team_event`
- `src/api/events.js` - Add group filtering and assignment
- `src/components/EventCreationModal.jsx` - Add group selection UI
- `src/hooks/useCalendarData.js` - Filter events by groups
- `src/api/attendance.js` - Verify group membership for check-in
- `src/components/EventDetailsModal.jsx` - Show group restrictions
- `src/components/EventsList.jsx` - Filter visible events

## ⏱️ Estimated Time

- **Phase 1**: 30 minutes
- **Phase 2**: 1-2 hours
- **Phase 3**: 2-3 hours
- **Phase 4**: 1-2 hours
- **Phase 5**: 1-2 hours
- **Phase 6**: 30 minutes

**Total: 6-9 hours**

## 🚀 Benefits

1. **Flexibility**: Create any group for any purpose
2. **Reusability**: Groups saved permanently, use across multiple events
3. **Sport-agnostic**: Works for football, basketball, soccer, etc.
4. **Real-world accurate**: Matches how coaches actually think
5. **Privacy**: Group-specific events only visible to members
6. **Scalability**: Easy to add/remove members as team changes

---

**Status**: 📋 Planning Complete - Ready for Implementation
**Priority**: High (essential for real-world team management)

