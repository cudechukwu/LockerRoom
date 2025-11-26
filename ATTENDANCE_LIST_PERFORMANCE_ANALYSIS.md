# AttendanceList Performance Analysis

## Problem Summary
- AttendanceList takes longer to load than other sections
- It doesn't memoize and loads every time the screen opens
- Other sections load first, then attendance list appears later
- Content "jumps around" during loading (cascade effect)
- Even with caching, it still loads slowly every time (unstable references)

## 🚨 TOP 3 CRITICAL ISSUES (Fix These First!)

1. **Real-time subscription cascade** - Subscription fires before initial fetch completes, causing 4-8 refetches
2. **Unstable object references** - `useTeamMembers` returns new array references every time, making React.memo() useless
3. **Aggressive refetching** - `useAttendance` has `staleTime: 0` and `refetchOnMount: true`, always refetches

**These 3 issues explain why:**
- It loads last (cascade delays everything)
- It loads slow EVERY time (unstable refs + always refetch)
- Memoization doesn't work (unstable refs)
- Content jumps around (multiple refetches)
- Content "jumps around" during loading
- Even with caching, it still loads slowly every time

## 🔥 CRITICAL ISSUES (Most Important - Must Fix First)

### ⭐ A. Real-time Subscription Cascade (CRITICAL)
**Files:** 
- `src/hooks/useRealtimeAttendance.js` (lines 20-76)
- `src/hooks/useAttendance.js` (line 37)

**Problem:**
1. `useAttendance` calls `useRealtimeAttendance` immediately on mount (line 37)
2. Real-time subscription is set up BEFORE initial fetch completes
3. Supabase sends "initial sync" events when subscription connects
4. These events trigger `invalidateQueries` (line 45-46 in useRealtimeAttendance)
5. This causes a refetch while the initial fetch is still in progress
6. Controller also has its own attendance query that refetches
7. This creates a cascade: **Fetch #1 → subscription → refetch #2 → controller refetch #3 → recompute → subscription event #4**

**Evidence:**
```javascript
// useAttendance.js line 37 - subscription happens immediately
useRealtimeAttendance(eventId, shouldFetch);

// useRealtimeAttendance.js line 45 - invalidates on ANY change
queryClient.invalidateQueries({
  queryKey: queryKeys.eventAttendance(eventId),
});
```

**Impact:** CRITICAL - Causes multiple unnecessary refetches and makes list load last

**Fix:** Delay real-time subscription until AFTER initial fetch completes:
```javascript
// In useAttendance.js
const attendanceQuery = useQuery({...});

// Only subscribe AFTER data is loaded
useRealtimeAttendance(
  eventId, 
  shouldFetch && !!attendanceQuery.data // Only enable after initial load
);
```

---

### ⭐ B. Unstable Object References - React.memo Won't Work (CRITICAL)
**File:** `src/hooks/useTeamMembers.js` (lines 199-201)

**Problem:**
```javascript
return {
  members: teamMembers, // ❌ New array reference every state update
  filteredMembers,      // ❌ Even though memoized, depends on teamMembers
  isLoading,
  error,
};
```

- `teamMembers` is a state variable - new reference on every update
- `filteredMembers` is memoized but just returns `teamMembers` directly
- React.memo() uses shallow comparison - sees new reference → re-renders
- Even if data is identical, component re-renders because reference changed

**Impact:** CRITICAL - Makes memoization useless, causes re-renders every time

**Fix:** Return stable references:
```javascript
// Memoize the return object itself
return useMemo(() => ({
  members: teamMembers,
  filteredMembers,
  isLoading,
  error,
}), [teamMembers, filteredMembers, isLoading, error]);
```

**OR** better: Convert to React Query which handles this automatically.

---

### ⭐ C. Sorting/Grouping Performance (MODERATE - Already Partially Fixed)
**File:** `src/components/AttendanceList.jsx` (lines 40-42)

**Status:** ✅ Sorting IS wrapped in `useMemo` - this is OK

**However:** The sorting function `sortMembersByAttendance` (in `attendanceService.js`) creates a new array with spread operator `[...members]` and sorts it. For large teams (80-120 players), this can still take 50-200ms.

**Current Code:**
```javascript
const sortedMembers = useMemo(() => {
  return sortMembersByAttendance(filteredMembers, attendanceByUserId);
}, [filteredMembers, attendanceByUserId]);
```

**Issue:** If `filteredMembers` reference changes (which it does - see Issue B), this recomputes even if data is identical.

**Impact:** MODERATE - Adds 50-200ms delay when recomputing

**Fix:** Already using useMemo, but fix Issue B first to prevent unnecessary recomputes.

---

## Root Causes Identified (Original Issues)

### 1. **CRITICAL: AttendanceList Component Not Memoized**
**File:** `src/components/AttendanceList.jsx`
- Component is NOT wrapped with `React.memo()`
- Re-renders on every parent component update
- Re-creates all hooks and fetches data on every render

**Impact:** High - Causes unnecessary re-fetches and re-renders

---

### 2. **CRITICAL: useAttendance Hook Has Aggressive Refetching**
**File:** `src/hooks/useAttendance.js` (lines 69-74)

```javascript
staleTime: 0, // Always refetch to ensure fresh data
refetchOnMount: true, // Always refetch when component mounts (modal reopens)
refetchOnWindowFocus: true,
refetchOnReconnect: true,
```

**Problems:**
- `staleTime: 0` means data is ALWAYS considered stale
- `refetchOnMount: true` means it ALWAYS refetches when component mounts
- This causes a network request EVERY TIME the screen opens, even if data is fresh

**Impact:** Critical - This is the main reason for slow loading

**Comparison with useEventAttendance:**
- `useEventAttendance` has `staleTime: 1 * 60 * 1000` (1 minute cache)
- `useAttendance` has `staleTime: 0` (no cache)

---

### 3. **CRITICAL: useTeamMembers Has No Caching**
**File:** `src/hooks/useTeamMembers.js`
- Uses `useState` + `useEffect` instead of React Query
- No caching mechanism
- Fetches data on every mount
- Makes multiple sequential database queries:
  1. `event_expected_attendees` table
  2. `team_members` table  
  3. `user_profiles` table
  4. Potentially `attendance_group_members` table

**Impact:** High - Multiple sequential queries slow down initial load

---

### 4. **MODERATE: AttendanceList Rendered Inside FlatList**
**File:** `src/screens/EventDetailsScreen.jsx` (lines 289-299)

```javascript
case 'attendance-list':
  return (
    <View style={styles.sectionContainer}>
      <AttendanceList
        eventId={item.data.eventId}
        teamId={item.data.teamId}
        isCoach={item.data.isCoach}
        event={item.data.event}
      />
    </View>
  );
```

**Problems:**
- Component is created fresh on every FlatList render
- Props are recreated on every render (no memoization)
- No `React.memo()` on AttendanceList

**Impact:** Moderate - Contributes to unnecessary re-renders

---

### 5. **MODERATE: Duplicate Data Fetching**
**Files:** 
- `src/hooks/useEventAttendance.js` (used in controller)
- `src/hooks/useAttendance.js` (used in AttendanceList)

**Problem:**
- Controller fetches attendance via `useEventAttendance`
- AttendanceList ALSO fetches attendance via `useAttendance`
- Both use the same query key but different caching strategies
- This causes TWO separate network requests for the same data

**Impact:** Moderate - Wastes network bandwidth and time

---

### 6. **MINOR: Real-time Subscription Overhead**
**File:** `src/hooks/useAttendance.js` (line 37)
- Calls `useRealtimeAttendance` which sets up a real-time subscription
- This adds overhead even if not needed immediately

**Impact:** Minor - Adds small delay but provides real-time updates

---

## Data Flow Analysis

### Current Flow (Slow):
```
EventDetailsScreen opens
  ↓
Controller fetches attendance (useEventAttendance) - 1st request
  ↓
FlatList renders sections
  ↓
AttendanceList component mounts
  ↓
useTeamMembers starts fetching (3-4 sequential queries) - SLOW
  ↓
useAttendance starts fetching (staleTime: 0, refetchOnMount: true) - 2nd request
  ↓
Both hooks complete
  ↓
AttendanceList finally renders
```

### Why Other Sections Load First:
- Other sections use data from controller (already fetched)
- AttendanceList makes NEW requests on mount
- Sequential queries in useTeamMembers add delay

---

## Recommended Fixes (Priority Order)

### 🔥 Fix 0A: Delay Real-time Subscription (CRITICAL - DO THIS FIRST)
**File:** `src/hooks/useAttendance.js`

**Change:**
```javascript
// BEFORE (line 37):
useRealtimeAttendance(eventId, shouldFetch);

// AFTER:
// Only subscribe AFTER initial data is loaded
useRealtimeAttendance(
  eventId, 
  shouldFetch && !!attendanceQuery.data && !attendanceQuery.isLoading
);
```

**Impact:** Eliminates cascade of refetches, makes list load much faster

---

### 🔥 Fix 0B: Stabilize useTeamMembers Return Values (CRITICAL - DO THIS SECOND)
**File:** `src/hooks/useTeamMembers.js`

**Change:**
```javascript
// BEFORE (lines 199-204):
return {
  members: teamMembers,
  filteredMembers,
  isLoading,
  error,
};

// AFTER:
return useMemo(() => ({
  members: teamMembers,
  filteredMembers,
  isLoading,
  error,
}), [teamMembers, filteredMembers, isLoading, error]);
```

**Impact:** Makes React.memo() actually work, prevents unnecessary re-renders

---

### Fix 1: Memoize AttendanceList Component (HIGH PRIORITY)
**File:** `src/components/AttendanceList.jsx`

```javascript
// Add at the end of the file, before export
export default React.memo(AttendanceList);
```

**Impact:** Prevents unnecessary re-renders and re-fetches

---

### Fix 2: Fix useAttendance Caching (CRITICAL)
**File:** `src/hooks/useAttendance.js`

Change:
```javascript
staleTime: 0, // Always refetch to ensure fresh data
refetchOnMount: true, // Always refetch when component mounts
```

To:
```javascript
staleTime: 1 * 60 * 1000, // 1 minute cache (same as useEventAttendance)
refetchOnMount: false, // Use cache if available
```

**Impact:** Eliminates unnecessary refetches when data is fresh

---

### Fix 3: Convert useTeamMembers to React Query (HIGH PRIORITY)
**File:** `src/hooks/useTeamMembers.js`

**Current:** Uses useState + useEffect (no caching)
**Recommended:** Convert to React Query with proper caching

**Benefits:**
- Automatic caching
- Background refetching
- Better error handling
- Parallel queries instead of sequential

**Impact:** Significantly faster initial load

---

### Fix 4: Pass Attendance Data as Props (MODERATE PRIORITY)
**File:** `src/screens/EventDetailsScreen.jsx`

Instead of AttendanceList fetching its own data, pass it from controller:

```javascript
// In controller, we already have:
const { attendance, ... } = useEventAttendance(...);

// Pass to AttendanceList:
<AttendanceList
  eventId={item.data.eventId}
  teamId={item.data.teamId}
  isCoach={item.data.isCoach}
  event={item.data.event}
  attendance={attendance} // Pass from controller
  attendanceByUserId={attendanceByUserId} // Pass from controller
/>
```

Then modify AttendanceList to accept these props and skip fetching.

**Impact:** Eliminates duplicate network requests

---

### Fix 5: Memoize FlatList renderItem Props (LOW PRIORITY)
**File:** `src/screens/EventDetailsScreen.jsx`

Memoize the props object passed to AttendanceList:

```javascript
const attendanceListData = useMemo(() => ({
  eventId: event.id,
  teamId,
  isCoach: permissions?.isCoach,
  event,
}), [event.id, teamId, permissions?.isCoach, event]);
```

**Impact:** Prevents unnecessary re-renders from prop changes

---

## Files Involved

1. **`src/components/AttendanceList.jsx`** - Main component (not memoized)
2. **`src/hooks/useAttendance.js`** - Aggressive refetching (staleTime: 0)
3. **`src/hooks/useTeamMembers.js`** - No caching (useState/useEffect)
4. **`src/hooks/useEventAttendance.js`** - Used in controller (has caching)
5. **`src/screens/EventDetailsScreen.jsx`** - Renders AttendanceList
6. **`src/hooks/useEventDetailsScreenController.js`** - Controller that fetches attendance
7. **`src/api/attendance.js`** - API function (getEventAttendance)

---

## Performance Metrics (Estimated)

### Current Performance:
- Initial load: ~2-3 seconds (after other sections)
- Re-open screen: ~2-3 seconds (always refetches + cascade)
- Network requests: 4-8 per open (team members + attendance + cascade refetches)
- Re-renders: 5-10 per open (unstable references)

### After Critical Fixes (0A + 0B):
- Initial load: ~800ms-1.2s (no cascade)
- Re-open screen: ~200-400ms (stable references, cached data)
- Network requests: 1-2 per open (no cascade)
- Re-renders: 1-2 per open (stable references)

### After All Fixes:
- Initial load: ~500ms-800ms
- Re-open screen: ~50-100ms (instant from cache)
- Network requests: 0-1 per open (only if stale)
- Re-renders: 1 per open (memoized)

---

## Quick Wins (Apply These First)

### Quick Win 1: Fix Real-time Subscription Cascade (2 lines)
**File:** `src/hooks/useAttendance.js`

Move `useRealtimeAttendance` call to AFTER the query, and gate it:
```javascript
// Move line 37 to after line 85 (after attendanceQuery)
// Change from:
useRealtimeAttendance(eventId, shouldFetch);

// To:
useRealtimeAttendance(
  eventId, 
  shouldFetch && !!attendanceQuery.data && !attendanceQuery.isLoading
);
```

**Impact:** Eliminates cascade, makes list load 2-3x faster

---

### Quick Win 2: Stabilize useTeamMembers (3 lines)
**File:** `src/hooks/useTeamMembers.js`

Wrap return in useMemo:
```javascript
return useMemo(() => ({
  members: teamMembers,
  filteredMembers,
  isLoading,
  error,
}), [teamMembers, filteredMembers, isLoading, error]);
```

**Impact:** Makes memoization work, prevents re-renders

---

### Quick Win 3: Fix Caching (1 line)
**File:** `src/hooks/useAttendance.js`

Change `staleTime: 0` to `staleTime: 1 * 60 * 1000`

**Impact:** Uses cached data when available

---

## Testing Checklist

After applying fixes, verify:
- [ ] AttendanceList loads faster on initial open
- [ ] AttendanceList loads instantly on re-open (from cache)
- [ ] No duplicate network requests in Network tab
- [ ] Real-time updates still work
- [ ] Component doesn't re-render unnecessarily
- [ ] Other sections still load first (as expected)

