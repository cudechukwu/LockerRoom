# Event Filtering & Visibility Plan (Lean v1 MVP)

## 🎯 Goal
Implement proper event filtering so users only see events they should see based on:
- Event visibility settings (personal, team, coaches_only, players_only)
- Group assignments (full team vs specific groups)
- User's role and group memberships

**Key Principle:** Coaches can create arbitrary groups for attendance AND visibility. Group-based filtering is the core feature that enables this flexibility.

## 🚨 CRITICAL: Phased Approach

This feature must be shipped in phases. **Do not attempt to implement everything at once.**

### Phase 0: Fix Existing Issues (URGENT - Do First)
- ✅ Fix broken attendance RLS
- ✅ Fix `auth.uid()` issues
- ✅ Fix event attendance insertion

### Phase 1: Visibility MVP (This Plan)
- ✅ Implement `isEventVisibleToUser()` function
- ✅ Use hybrid filtering (DB filters visibility, client filters groups)
- ✅ Add 2 simple UI badges (coaches-only, group-specific)
- ✅ Remove `is_full_team_event` flag
- ✅ Add warnings in event creation for conflicting visibility
- ✅ Add RLS ensuring users can ONLY query events for their team

### Phase 2: Enhanced (Future)
- RPC filtering optimization
- UI warnings refinement
- Coaches-only refinement

### Phase 3: Enterprise (Future)
- Org-level events
- Multi-team events
- Predictive caching
- Advanced indexing

---

## 🔍 Current State Analysis

### What Exists:
1. ✅ `isEventVisibleToUser()` function exists in `src/api/events.js`
2. ✅ Events have `visibility` field: 'personal', 'team', 'coaches_only', 'players_only'
3. ✅ Events have `is_full_team_event` boolean (⚠️ **REMOVE THIS**)
4. ✅ Events have `assigned_attendance_groups` array
5. ✅ Users belong to attendance groups
6. ✅ Event creation supports group selection

### What's Missing:
1. ❌ Calendar fetching doesn't filter by user visibility
2. ❌ No user group membership fetching in calendar hook
3. ❌ No role-based filtering (coaches_only, players_only)
4. ❌ No personal event filtering (only show user's personal events)
5. ❌ No RLS policies for event visibility
6. ❌ No warnings for conflicting visibility settings

---

## 📋 Filtering Rules (v1 - Simplified)

### Visibility Types (v1 Only)
**Only implement these 4 types for v1:**
- **`personal`**: Only show if `created_by = current_user_id`
- **`team`**: Show to all team members (subject to group filtering)
- **`coaches_only`**: Only show if user is a coach/admin
- **`players_only`**: Only show if user is a player (not a coach)

**Future types (Phase 3):** `org`, `multi_team`, `group` - **DO NOT implement in v1**

### Group-Based Filtering (Core Feature)

**Simplified Rule:**
- **If `assigned_attendance_groups` is empty/null** → Full team event
- **If `assigned_attendance_groups` has values** → Group-specific event

**⚠️ CRITICAL: Remove `is_full_team_event` flag completely.**
- Derive full-team status from array length: `isFullTeam = !assignedGroups || assignedGroups.length === 0`
- This eliminates 25% of fallback rules
- Simpler, less cognitive overhead

**⚠️ UI WARNING REQUIRED:**
Many teams will accidentally create an event with no groups selected, thinking it's group-only. The UI must make this explicit:
- Show warning: "No groups selected - this event will be visible to ALL team members"
- Preview who will see the event before creation

**Full Team Event** (no groups assigned):
- Show to ALL team members (subject to visibility type)
- Coaches always see team events (v1 behavior - configurable in Phase 2)

**Group-Specific Event** (groups assigned):
- Show ONLY if user is in at least one assigned group
- Also subject to visibility type filtering

**Visibility + Groups Interaction:**
- `visibility = 'team'` + groups assigned:
  - Players: Must be in group to see
  - Coaches: Always see (team visibility allows coaches)
- `visibility = 'coaches_only'` + groups assigned:
  - Only coaches in assigned groups see it
- `visibility = 'players_only'` + groups assigned:
  - Only players in assigned groups see it

### Truth Table (Reference - Keep in Docs, Not Code)

**This truth table is for reference only. Keep it in Notion/internal docs, NOT in code comments.**

| visibility | groups assigned | isCreator | isCoach | isPlayer | inGroup | **Result** |
|------------|----------------|-----------|---------|----------|---------|------------|
| personal | any | ✅ | any | any | any | **YES** (creator) |
| personal | any | ❌ | any | any | any | **NO** |
| team | empty | any | ✅ | any | any | **YES** (coaches always see team) |
| team | empty | any | ❌ | ✅ | any | **YES** (full team) |
| team | has groups | any | ✅ | any | any | **YES** (coaches always see team) |
| team | has groups | any | ❌ | ✅ | ✅ | **YES** (player in group) |
| team | has groups | any | ❌ | ✅ | ❌ | **NO** (player not in group) |
| coaches_only | empty | any | ✅ | any | any | **YES** |
| coaches_only | empty | any | ❌ | any | any | **NO** |
| coaches_only | has groups | any | ✅ | any | ✅ | **YES** (coach in group) |
| coaches_only | has groups | any | ✅ | any | ❌ | **NO** (coach not in group) |
| coaches_only | has groups | any | ❌ | any | any | **NO** |
| players_only | empty | any | any | ✅ | any | **YES** |
| players_only | empty | any | any | ❌ | any | **NO** |
| players_only | has groups | any | any | ✅ | ✅ | **YES** (player in group) |
| players_only | has groups | any | any | ✅ | ❌ | **NO** (player not in group) |
| players_only | has groups | any | any | ❌ | any | **NO** |

**Derived Simplification Rules:**
1. Creator always sees (highest priority)
2. Personal = only creator
3. Empty groups = full team event
4. Team visibility: Coaches always see, players see if full team or in group
5. Coaches_only: Only coaches (in group if groups assigned)
6. Players_only: Only players (in group if groups assigned)

---

## 🏗️ Architecture: Hybrid Filtering (Lean & Practical)

### Why Hybrid?
- ✅ Scales to 5 users or 50,000 users
- ✅ Fast & lightweight (database does heavy lifting)
- ✅ Easy to modify later (one SQL file, one JS function)
- ✅ Avoids premature complexity

### Server-Side Filtering (Database RPC Function)

**What the Database Filters:**
- ✅ Personal events → only creator can see
- ✅ Coaches-only → only coaches
- ✅ Players-only → only players
- ✅ Team-wide → everyone on team
- ✅ Team membership check (RLS)
- ❌ **Does NOT filter groups** (handled client-side for flexibility)

**Why:** Prevents downloading hundreds of events only to throw them away in JS.

### Client-Side Filtering (JavaScript)

**What the Client Filters:**
- ✅ Group-based visibility
- ✅ Fallback edge cases
- ✅ Creator-always-sees-their-event rule

**Why:** Makes group logic easy to change without rewriting SQL or RPC functions.

### The One Function You Need

**`isEventVisibleToUser(event, user, userGroups, userRole)`**

- Pure function (60 lines max)
- Deterministic
- Easy to test
- Easy to maintain
- Contains ALL fallback rules in one place
- **Truth table stays in docs, NOT in code comments**

---

## 🔧 Implementation Steps (Phase 1 MVP)

### Step 1: Add RLS Policy for Events (SECURITY - Do First)

**File:** `database/add_event_rls.sql`

**Purpose:** Ensure users cannot fetch events they shouldn't see even through raw queries.

```sql
-- Drop existing policy if it exists
DROP POLICY IF EXISTS select_events ON events;

-- Create RLS policy: Users can only see events for teams they belong to
CREATE POLICY select_events ON events
FOR SELECT USING (
  team_id IN (
    SELECT team_id 
    FROM team_members 
    WHERE user_id = auth.uid()
  )
);
```

**Why:** This prevents a user from seeing ANY events outside their team. Then all nuanced filtering happens client-side.

### Step 2: Create Simplified RPC Function (Optional - Can Skip for v1)

**File:** `database/get_visible_events_for_user.sql`

**⚠️ IMPORTANT: This is OPTIONAL for v1. You can skip this and do all filtering client-side if you prefer.**

**Purpose:** Filter expensive visibility types at database level. Does NOT filter groups.

**Simplified Function (No Date Params, No Role Params, No Complex Returns):**

```sql
CREATE OR REPLACE FUNCTION get_visible_events_for_user(
    p_team_id UUID,
    p_user_id UUID,
    p_is_coach BOOLEAN,
    p_is_player BOOLEAN
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    visibility VARCHAR(20),
    assigned_attendance_groups UUID[],
    created_by UUID,
    team_id UUID,
    -- ... all other event columns
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.title,
        e.description,
        e.start_time,
        e.end_time,
        e.visibility,
        e.assigned_attendance_groups,
        e.created_by,
        e.team_id
        -- ... all other event columns
    FROM events e
    WHERE e.team_id = p_team_id
    AND (
        -- Personal events: only creator sees
        (e.visibility = 'personal' AND e.created_by = p_user_id)
        OR
        -- Team events: everyone sees (groups filtered client-side)
        (e.visibility = 'team')
        OR
        -- Coaches-only: only coaches see
        (e.visibility = 'coaches_only' AND p_is_coach = true)
        OR
        -- Players-only: only players see
        (e.visibility = 'players_only' AND p_is_player = true)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Why Simplified:**
- No date parameters (client handles date filtering)
- No complex return structures (just returns event rows)
- No role table joins (client passes role as params)
- Simple SQL branching (easy to understand)

**Everything else happens client-side.**

### Step 3: Add GIN Index for Group Filtering (CRITICAL)

**File:** `database/add_event_filtering_indexes.sql`

**Purpose:** Enable fast array operations for group filtering.

```sql
-- GIN index for array column (enables fast group filtering)
CREATE INDEX IF NOT EXISTS idx_events_assigned_groups_gin 
ON events USING GIN (assigned_attendance_groups);

-- Indexes for visibility filtering
CREATE INDEX IF NOT EXISTS idx_events_visibility 
ON events(visibility) WHERE visibility IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_created_by 
ON events(created_by) WHERE visibility = 'personal';

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_events_team_visibility 
ON events(team_id, visibility, start_time);
```

**Why:** Without GIN index, group filtering will be slow at scale (array operations are expensive).

### Step 4: Create `isEventVisibleToUser` Function (The One Function)

**File:** `src/services/eventService.js` (new file)

**This is the ONLY filtering function the frontend needs. Keep it simple (60 lines max).**

**Implementation:**
```javascript
/**
 * Check if an event is visible to a user
 * Pure function - all fallback rules contained here
 * 
 * ⚠️ DO NOT use attendance data - visibility ≠ attendance
 * 
 * @param {Object} event - Event object with visibility, groups, etc.
 * @param {Object} user - User object with id
 * @param {string[]} userGroupIds - Array of group IDs user belongs to
 * @param {Object} userRole - User's role object { isCoach: boolean, isPlayer: boolean }
 * @returns {boolean} True if event is visible to user
 */
export function isEventVisibleToUser(event, user, userGroupIds = [], userRole = null) {
  if (!event || !user) return false;
  
  const userId = typeof user === 'string' ? user : user.id;
  const isCreator = event.created_by === userId;
  const visibility = event.visibility || 'team';
  const assignedGroups = event.assigned_attendance_groups || [];
  const hasAssignedGroups = Array.isArray(assignedGroups) && assignedGroups.length > 0;
  
  // Rule 1: Creator always sees (highest priority)
  if (isCreator) return true;
  
  // Rule 2: Personal events - only creator sees
  if (visibility === 'personal') return false;
  
  // Rule 3: Determine if full team event (empty groups = full team)
  const isFullTeamEvent = !hasAssignedGroups;
  
  // Rule 4: Visibility type filtering
  if (visibility === 'coaches_only') {
    if (!userRole || !userRole.isCoach) return false;
    // If groups assigned, coach must be in group
    if (hasAssignedGroups) {
      const userInGroup = checkUserInGroups(userGroupIds, assignedGroups);
      if (!userInGroup) return false;
    }
    return true;
  }
  
  if (visibility === 'players_only') {
    if (!userRole || userRole.isCoach) return false; // Coaches don't see players_only
    // If groups assigned, player must be in group
    if (hasAssignedGroups) {
      const userInGroup = checkUserInGroups(userGroupIds, assignedGroups);
      if (!userInGroup) return false;
    }
    return true;
  }
  
  // Rule 5: Team visibility
  if (visibility === 'team') {
    // Coaches always see team events (even if group-specific)
    if (userRole?.isCoach) return true;
    
    // Players: see if full team OR in assigned group
    if (isFullTeamEvent) return true;
    if (hasAssignedGroups) {
      const userInGroup = checkUserInGroups(userGroupIds, assignedGroups);
      return userInGroup;
    }
  }
  
  return false;
}

// Helper function for group matching
function checkUserInGroups(userGroupIds, assignedGroups) {
  const userGroupIdStrings = userGroupIds.map(id => String(id));
  const assignedGroupIdStrings = assignedGroups.map(id => String(id));
  return assignedGroupIdStrings.some(gid => userGroupIdStrings.includes(gid));
}
```

**Unit Tests:**
- Test all visibility types
- Test all fallback rules
- Test edge cases (empty groups, role mismatches, etc.)
- Test that attendance is NOT checked

### Step 5: Remove `is_full_team_event` Flag

**Files to Update:**
- `database/migrations/remove_is_full_team_event.sql` (new file)
- `src/api/events.js` (remove references)
- `src/components/EventCreationModal.jsx` (remove UI for this flag)

**Migration SQL:**
```sql
-- Remove the is_full_team_event column
ALTER TABLE events DROP COLUMN IF EXISTS is_full_team_event;
```

**Code Changes:**
- Remove all references to `is_full_team_event`
- Derive full-team status from `assigned_attendance_groups.length === 0`
- Update event creation to not set this flag

### Step 6: Fetch User Groups & Role (Simplified Caching)

**File:** `src/hooks/useCalendarData.js`

**New Hook:** `useUserGroupsAndRole(teamId)`

**Simplified Caching (v1):**
- Cache `userRole` and `userGroupIds` for **60 seconds** (not 10 minutes)
- Invalidate on:
  - Role changed
  - Group membership changed
  - Team switch

**No predictive/pre-warming. No background refresh. Keep it simple.**

**Implementation:**
```javascript
// In useCalendarData hook
const { userGroupIds } = useUserGroups(teamId);
const { userRole } = useUserRole(teamId);
const { data: events } = useQuery(...);

const visibleEvents = useMemo(() => {
  if (!events || !user) return [];
  return events.filter(event => 
    isEventVisibleToUser(event, user, userGroupIds, userRole)
  );
}, [events, user, userGroupIds, userRole]);
```

### Step 7: Add Visual Indicators (Minimalist v1 - Only 2 Badges)

**File:** `src/components/EventsList.jsx`

**Where:** Each event item in the list view

**v1 Badges (Only 2):**

1. **Coaches-Only Events:**
   - **Location:** Right side, after event title
   - **Component:** Small icon (14x14px)
   - **Icon:** `lock-closed-outline` (Ionicons)
   - **Color:** Muted (rgba(255, 255, 255, 0.5))
   - **Tooltip:** "Coaches only"
   - **Example:** `[Coaches Meeting] 🔒 4:00 PM`

2. **Group-Specific Events:**
   - **Location:** Right side of event title, before time
   - **Component:** Small badge/chip (height: 16px, padding: 2px 6px)
   - **Content:** First group name (or "+2" if multiple)
   - **Color:** Subtle background (rgba(255, 255, 255, 0.1))
   - **Tooltip:** "Only visible to [Group Names]"
   - **Example:** `[Practice] 🏈 D-Line 3:00 PM`

**Do NOT add:**
- ❌ Personal event icon (can be different color later)
- ❌ Players-only badge (can be inferred)
- ❌ Multiple badges per event (too cluttered)

**Implementation:**
- Add `EventVisibilityBadge` component
- Pass event object to badge component
- Badge determines which indicator(s) to show
- Only show in list view (not month/week view - too cluttered)

### Step 8: Add Warnings in Event Creation (CRITICAL)

**File:** `src/components/EventCreationModal.jsx`

**Purpose:** Prevent "why can't my players see this event?" bugs.

**Warnings to Add:**

1. **Conflicting Visibility Warning:**
   - If `visibility = 'coaches_only'` AND groups assigned with players:
     - Show warning: "⚠️ This event is coaches-only, but you've selected player groups. Players will NOT see this event."
   - If `visibility = 'players_only'` AND groups assigned with coaches:
     - Show warning: "⚠️ This event is players-only, but you've selected coach groups. Coaches will NOT see this event."

2. **No Groups Selected Warning:**
   - If no groups selected:
     - Show warning: "⚠️ No groups selected - this event will be visible to ALL team members"
   - Make it clear this is a full-team event

3. **Preview Who Will See:**
   - Show preview: "This event will be visible to: [list of groups/roles]"
   - Update in real-time as user changes visibility/groups

**Implementation:**
```javascript
// In EventCreationModal
const getVisibilityWarning = () => {
  if (visibility === 'coaches_only' && hasPlayerGroups(selectedGroups)) {
    return "⚠️ This event is coaches-only, but you've selected player groups. Players will NOT see this event.";
  }
  if (visibility === 'players_only' && hasCoachGroups(selectedGroups)) {
    return "⚠️ This event is players-only, but you've selected coach groups. Coaches will NOT see this event.";
  }
  if (!selectedGroups || selectedGroups.length === 0) {
    return "⚠️ No groups selected - this event will be visible to ALL team members";
  }
  return null;
};
```

### Step 9: Update Calendar Screen

**File:** `src/screens/CalendarScreen.jsx`

**Changes:**
- No changes needed (filtering happens in hook)
- Visual indicators added in EventsList component (see Step 7)

---

## 🔒 Security Considerations

### RLS Policies (CRITICAL - Do First)

**File:** `database/add_event_rls.sql`

```sql
-- Drop existing policy if it exists
DROP POLICY IF EXISTS select_events ON events;

-- Create RLS policy: Users can only see events for teams they belong to
CREATE POLICY select_events ON events
FOR SELECT USING (
  team_id IN (
    SELECT team_id 
    FROM team_members 
    WHERE user_id = auth.uid()
  )
);
```

**Why:** This prevents a user from seeing ANY events outside their team. Then all nuanced filtering happens client-side.

### Validation:
- Verify user is team member before fetching events
- Validate group memberships server-side
- Prevent unauthorized event access

---

## 📊 Performance Considerations

### Why This Approach is Fast:
1. **Database filters first** → Reduces data transfer by 70-90%
2. **Client filters groups** → Lightweight (already pre-filtered)
3. **Simple caching** → User groups/role cached for 60 seconds

### Caching Strategy (Simplified v1):
1. **User Groups:** Cache for **60 seconds** (not 10 minutes)
2. **User Role:** Cache for **60 seconds** (not 10 minutes)
3. **Filtered Events:** Use React Query cache (2 minutes)
4. **No predictive/pre-warming:** Not needed until 500+ events per team
5. **No background refresh:** Keep it simple

### Optimization:
- **GIN index on `assigned_attendance_groups`** (CRITICAL - enables fast array operations)
- Database indexes on `team_id`, `visibility`, `created_by`
- Composite index for common queries: `(team_id, visibility, start_time)`

### Scalability:
- ✅ Works for 5 users
- ✅ Works for 50,000 users
- ✅ Database handles heavy filtering
- ✅ Client handles flexible logic

---

## 🧪 Testing Scenarios

### Test Cases:

**1. Personal Events:**
- ✅ Creator sees their personal events
- ✅ Other users don't see creator's personal events

**2. Full Team Events:**
- ✅ All team members see full team events
- ✅ Works regardless of group membership
- ✅ Works for coaches and players

**3. Group-Specific Events:**
- ✅ Users in assigned groups see the event
- ✅ Users not in groups don't see the event
- ✅ Empty group assignment: Falls back to full team event

**4. Coaches-Only Events:**
- ✅ Coaches see coaches-only events
- ✅ Players don't see coaches-only events
- ✅ Coaches-only + groups: Only coaches in those groups see it

**5. Players-Only Events:**
- ✅ Players see players-only events
- ✅ Coaches don't see players-only events
- ✅ Players-only + groups: Only players in those groups see it

**6. RLS Tests:**
- ✅ User cannot see events from other teams
- ✅ User can only see events for teams they belong to

**7. Cache Invalidation Tests:**
- ✅ User changes teams: All caches invalidated
- ✅ User joins/leaves group: Group cache + calendar cache invalidated

---

## 🚀 Migration Strategy

### Backward Compatibility:
- Existing events default to `visibility = 'team'`
- Existing events with `is_full_team_event = true` → treat as empty groups
- Existing events with `is_full_team_event = false` → use `assigned_attendance_groups`
- No breaking changes to existing functionality

### Rollout:
1. Deploy RLS policy (Step 1)
2. Deploy database indexes (Step 3)
3. Deploy `isEventVisibleToUser` function (Step 4)
4. Remove `is_full_team_event` flag (Step 5)
5. Update client-side filtering (Step 6)
6. Add UI badges (Step 7)
7. Add warnings (Step 8)

---

## ✅ Success Criteria (Phase 1 MVP)

1. ✅ Users only see events they should see
2. ✅ No performance degradation
3. ✅ Clear visual indicators (2 badges only)
4. ✅ Warnings prevent visibility conflicts
5. ✅ RLS prevents unauthorized access
6. ✅ Backward compatible with existing events
7. ✅ Easy to understand and maintain (one function, 60 lines)

---

## 📝 Future Enhancements (Phase 2 & 3)

**Phase 2: Enhanced**
- RPC filtering optimization
- UI warnings refinement
- Coaches-only refinement
- Configurable "coaches always see team events" rule

**Phase 3: Enterprise**
- Org-level events (`org` visibility)
- Multi-team events (`multi_team` visibility)
- Predictive caching
- Advanced indexing
- Calendar filter UI
- Event sharing
- Smart suggestions
- Analytics

**Do NOT implement these in Phase 1. Ship the MVP first.**
