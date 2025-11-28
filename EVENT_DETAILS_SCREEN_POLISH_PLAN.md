# EventDetailsScreen Polish Plan

## Overview
This plan addresses 8 critical issues in `EventDetailsScreen.jsx` to improve maintainability, performance, and code quality.

---

## Issue 1: Extract handleDelete into Controller Functions

### Problem
- `handleDelete` is 250+ LOC in a callback
- Contains 3 separate delete flows with duplicated logic
- Hard to test, modify, and maintain
- Tight coupling between UI ↔ cache logic ↔ RPC logic

### Solution
Create controller functions in `useEventDetailsScreenController`:
- `deleteInstance(originalEventId, instanceDate)`
- `deleteSeries(originalEventId)`
- `deleteSingle(eventId)`

### Implementation Steps
1. **Create utility function for cache refresh** (see Issue 2)
2. **Add delete functions to controller**:
   ```javascript
   // In useEventDetailsScreenController.js
   const deleteInstance = useCallback(async (originalEventId, instanceDate) => {
     // 1. Call deleteRecurringInstance API
     // 2. Call refreshCalendar utility
     // 3. Return { success, error }
   }, [supabase, teamId, queryClient, navigation]);
   
   const deleteSeries = useCallback(async (originalEventId) => {
     // 1. Call deleteEvent API
     // 2. Call refreshCalendar utility
     // 3. Return { success, error }
   }, [supabase, teamId, queryClient, navigation]);
   
   const deleteSingle = useCallback(async (eventId) => {
     // 1. Call deleteEvent API
     // 2. Call refreshCalendar utility
     // 3. Return { success, error }
   }, [supabase, teamId, queryClient, navigation]);
   ```
3. **Update controller return** to include delete functions
4. **Simplify handleDelete in EventDetailsScreen**:
   ```javascript
   const handleDelete = useCallback(async () => {
     if (!event || !actions) return;
     
     if (isRecurringInstance) {
       Alert.alert(
         'Delete Recurring Event',
         `"${event.title}" is part of a recurring series. What would you like to delete?`,
         [
           { text: 'Cancel', style: 'cancel' },
           {
             text: 'This occurrence only',
             onPress: async () => {
               const instanceDate = event.instanceDate || extractDateFromStartTime(event.startTime);
               const result = await actions.deleteInstance(originalEventId, instanceDate);
               if (!result.success) {
                 Alert.alert('Error', result.error?.message || 'Failed to delete occurrence');
               }
             }
           },
           {
             text: 'All occurrences',
             style: 'destructive',
             onPress: async () => {
               Alert.alert(
                 'Delete All Occurrences',
                 `Are you sure? This cannot be undone.`,
                 [
                   { text: 'Cancel', style: 'cancel' },
                   {
                     text: 'Delete All',
                     style: 'destructive',
                     onPress: async () => {
                       const result = await actions.deleteSeries(originalEventId);
                       if (!result.success) {
                         Alert.alert('Error', result.error?.message || 'Failed to delete series');
                       }
                     }
                   }
                 ]
               );
             }
           }
         ]
       );
       return;
     }
     
     if (isRecurringSeries) {
       Alert.alert(
         'Delete Recurring Event',
         `Are you sure you want to delete all occurrences?`,
         [
           { text: 'Cancel', style: 'cancel' },
           {
             text: 'Delete All',
             style: 'destructive',
             onPress: async () => {
               const result = await actions.deleteSeries(originalEventId);
               if (!result.success) {
                 Alert.alert('Error', result.error?.message || 'Failed to delete series');
               }
             }
           }
         ]
       );
       return;
     }
     
     // Non-recurring event
     Alert.alert(
       'Delete Event',
       `Are you sure you want to delete "${event.title}"?`,
       [
         { text: 'Cancel', style: 'cancel' },
         {
           text: 'Delete',
           style: 'destructive',
           onPress: async () => {
             const result = await actions.deleteSingle(event.id);
             if (!result.success) {
               Alert.alert('Error', result.error?.message || 'Failed to delete event');
             }
           }
         }
       ]
     );
   }, [event, actions, isRecurringInstance, isRecurringSeries, originalEventId]);
   ```

### Files to Modify
- `src/hooks/useEventDetailsScreenController.js` - Add delete functions
- `src/screens/EventDetailsScreen.jsx` - Simplify handleDelete

---

## Issue 2: Extract Query Invalidation Logic

### Problem
- Cache refresh logic duplicated 3 times (delete instance, delete series, delete single)
- Same pattern: `dataCache.clear()` → `invalidateQueries()` → `refetchQueries()` → `navigation.goBack()`

### Solution
Create reusable utility function: `refreshCalendar(teamId, originalEventId, navigation)`

### Implementation Steps
1. **Create utility file**: `src/utils/refreshCalendar.js`
   ```javascript
   import { dataCache } from './dataCache';
   import { queryKeys } from '../hooks/queryKeys';
   
   export async function refreshCalendar(queryClient, teamId, originalEventId, navigation) {
     // Clear dataCache FIRST
     const knownEventKeys = [
       `calendarEvents_${teamId}_day_fullYear`,
       `upcomingEvents_${teamId}`,
     ];
     knownEventKeys.forEach(key => {
       dataCache.clear(key);
     });
     
     // Invalidate React Query caches
     await Promise.all([
       queryClient.invalidateQueries({ queryKey: ['calendarEvents', teamId] }),
       queryClient.invalidateQueries({ queryKey: queryKeys.upcomingEvents(teamId) }),
       queryClient.invalidateQueries({ queryKey: queryKeys.eventAttendance(originalEventId) }),
     ]);
     
     // Force refetch of active queries
     await Promise.all([
       queryClient.refetchQueries({ 
         queryKey: ['calendarEvents', teamId], 
         exact: false,
         type: 'active'
       }),
       queryClient.refetchQueries({ 
         queryKey: queryKeys.upcomingEvents(teamId),
         type: 'active'
       }),
     ]);
     
     // Navigate back using requestAnimationFrame for smoother UX
     requestAnimationFrame(() => {
       navigation.goBack();
     });
   }
   ```

2. **Use in controller delete functions** (from Issue 1)

### Files to Create
- `src/utils/refreshCalendar.js`

### Files to Modify
- `src/hooks/useEventDetailsScreenController.js` - Use refreshCalendar in delete functions

---

## Issue 3: Break renderSections into Separate Memoized Components

### Problem
- `renderSections` returns huge object arrays each render
- Dependencies include massive structures causing unnecessary re-renders
- Any change → entire rebuild → entire FlatList re-renders

### Solution
Break each section into its own memoized component with pure props.

### Implementation Steps
1. **Create section components**:
   - `src/components/EventDetails/Sections/HeroSection.jsx`
   - `src/components/EventDetails/Sections/DetailsSection.jsx`
   - `src/components/EventDetails/Sections/NotesSection.jsx`
   - `src/components/EventDetails/Sections/AttachmentsSection.jsx`
   - `src/components/EventDetails/Sections/CheckInSection.jsx`
   - `src/components/EventDetails/Sections/AttendanceSummarySection.jsx`
   - `src/components/EventDetails/Sections/AttendanceListSection.jsx`

2. **Example HeroSection**:
   ```javascript
   import React, { memo } from 'react';
   import EventHero from '../EventHero';
   
   const HeroSection = memo(({ event, creatorName, permissions, onClose, onEdit, onDelete }) => {
     return (
       <EventHero
         event={event}
         creatorName={creatorName}
         permissions={permissions}
         onClose={onClose}
         onEdit={onEdit}
         onDelete={onDelete}
       />
     );
   });
   
   HeroSection.displayName = 'HeroSection';
   export default HeroSection;
   ```

3. **Update renderSections** to return component references:
   ```javascript
   const renderSections = useCallback(() => {
     if (!event || !sections) return [];
     
     const items = [];
     
     items.push({
       id: 'hero',
       type: 'hero',
       component: HeroSection,
       props: { event, creatorName, permissions, onClose: handleClose, onEdit: handleEdit, onDelete: handleDelete },
     });
     
     // ... other sections
     
     return items;
   }, [event, sections, creatorName, permissions, handleClose, handleEdit, handleDelete, /* minimal deps */]);
   ```

4. **Update renderItem** to render component:
   ```javascript
   const renderItem = useCallback(({ item }) => {
     const Component = item.component;
     return <Component {...item.props} />;
   }, []);
   ```

### Files to Create
- `src/components/EventDetails/Sections/HeroSection.jsx`
- `src/components/EventDetails/Sections/DetailsSection.jsx`
- `src/components/EventDetails/Sections/NotesSection.jsx`
- `src/components/EventDetails/Sections/AttachmentsSection.jsx`
- `src/components/EventDetails/Sections/CheckInSection.jsx`
- `src/components/EventDetails/Sections/AttendanceSummarySection.jsx`
- `src/components/EventDetails/Sections/AttendanceListSection.jsx`

### Files to Modify
- `src/screens/EventDetailsScreen.jsx` - Update renderSections and renderItem

---

## Issue 4: Fix renderItem Stability

### Problem
- `actions` object is likely recreated every render
- `renderItem` depends on `actions`, causing FlatList to re-render every row on any state change

### Solution
- Ensure `actions` object is stable in controller (use `useMemo`)
- Or pass only necessary callbacks to renderItem

### Implementation Steps
1. **Ensure actions is memoized in controller**:
   ```javascript
   // In useEventDetailsScreenController.js
   const actions = useMemo(() => ({
     handleQRScanSuccess,
     viewAttachment,
     handleLocationCheckIn,
     handleCheckOut,
     deleteInstance,
     deleteSeries,
     deleteSingle,
     retry,
   }), [handleQRScanSuccess, viewAttachment, handleLocationCheckIn, handleCheckOut, deleteInstance, deleteSeries, deleteSingle, retry]);
   ```

2. **Or pass only necessary callbacks to sections** (preferred):
   - Each section component receives only the callbacks it needs
   - Reduces dependency surface area

### Files to Modify
- `src/hooks/useEventDetailsScreenController.js` - Memoize actions object
- `src/screens/EventDetailsScreen.jsx` - Pass only necessary callbacks to sections

---

## Issue 5: Fix instanceDate Handling

### Problem
- UI uses `event.startTime` as `instanceDate`
- For recurring events, should use `event.instanceDate` explicitly
- May delete wrong instance due to timezone conversions

### Solution
Always use `event.instanceDate` if available, only fallback to `startTime` if necessary.

### Implementation Steps
1. **Create utility function**:
   ```javascript
   // src/utils/eventInstanceUtils.js
   export function getInstanceDate(event) {
     // Prefer explicit instanceDate (YYYY-MM-DD format)
     if (event.instanceDate) {
       return event.instanceDate;
     }
     
     // Fallback: extract date from startTime
     if (event.startTime) {
       const date = new Date(event.startTime);
       const year = date.getFullYear();
       const month = String(date.getMonth() + 1).padStart(2, '0');
       const day = String(date.getDate()).padStart(2, '0');
       return `${year}-${month}-${day}`;
     }
     
     return null;
   }
   ```

2. **Use in handleDelete**:
   ```javascript
   const instanceDate = getInstanceDate(event);
   ```

### Files to Create
- `src/utils/eventInstanceUtils.js`

### Files to Modify
- `src/screens/EventDetailsScreen.jsx` - Use getInstanceDate
- `src/hooks/useEventDetailsScreenController.js` - Use getInstanceDate in deleteInstance

---

## Issue 6: Replace setTimeout Navigation Hack

### Problem
- Using `setTimeout(() => navigation.goBack(), 50)` is a code smell
- React Navigation glitching due to simultaneous navigation + rerender

### Solution
Use `requestAnimationFrame()` or `navigation.replace()`

### Implementation Steps
1. **Update refreshCalendar utility** (from Issue 2):
   ```javascript
   // Use requestAnimationFrame for smoother navigation
   requestAnimationFrame(() => {
     navigation.goBack();
   });
   ```

2. **Remove all setTimeout calls** from EventDetailsScreen

### Files to Modify
- `src/utils/refreshCalendar.js` - Use requestAnimationFrame
- `src/screens/EventDetailsScreen.jsx` - Remove setTimeout calls

---

## Issue 7: Clarify event.id vs originalEventId

### Problem
- UI components use `event.id` (which may be instanceId)
- Delete logic uses `originalEventId`
- Risk: AttendanceList, CheckInSection may receive instanceId instead of originalId

### Solution
- Document the pattern clearly
- Ensure attendance queries accept both instanceId and originalEventId
- Add comments explaining when to use which

### Implementation Steps
1. **Add documentation comments**:
   ```javascript
   /**
    * Event ID handling:
    * - For recurring instances: event.id = instanceId (format: "uuid:YYYY-MM-DD")
    * - For non-recurring: event.id = original event UUID
    * - event.originalEventId = always the original UUID (even for instances)
    * 
    * Usage:
    * - Attendance queries: Use originalEventId (they handle instanceDate separately)
    * - QR codes: Use originalEventId
    * - Display: Use event.id (works for both)
    */
   ```

2. **Verify attendance queries handle both**:
   - Check `getEventAttendance` accepts instanceId and extracts originalEventId
   - Check `getUserAttendanceStatus` accepts instanceId and extracts originalEventId

3. **Update component props** to be explicit:
   ```javascript
   // Pass both for clarity
   <AttendanceList 
     eventId={event.originalEventId || event.id}
     instanceDate={event.instanceDate}
     teamId={teamId}
   />
   ```

### Files to Modify
- `src/screens/EventDetailsScreen.jsx` - Add comments, update component props
- `src/components/EventDetails/CheckInSection.jsx` - Verify it handles instanceId correctly
- `src/components/AttendanceList.jsx` - Verify it handles instanceId correctly

---

## Issue 8: Split renderItem Switch Cases

### Problem
- Large inline JSX in switch blocks reduces readability
- Hard to test individual cases

### Solution
Extract each case into separate components.

### Implementation Steps
1. **Create renderer components** (if not already done in Issue 3):
   - `src/components/EventDetails/Renderers/HeroRenderer.jsx`
   - `src/components/EventDetails/Renderers/DetailsRenderer.jsx`
   - etc.

2. **Update renderItem**:
   ```javascript
   const renderItem = useCallback(({ item }) => {
     switch (item.type) {
       case 'hero':
         return <HeroRenderer {...item.data} />;
       case 'details':
         return <DetailsRenderer {...item.data} />;
       case 'notes':
         return <NotesRenderer {...item.data} />;
       // ... etc
       default:
         return null;
     }
   }, []);
   ```

3. **Or use component map** (cleaner):
   ```javascript
   const RENDERERS = {
     hero: HeroRenderer,
     details: DetailsRenderer,
     notes: NotesRenderer,
     // ... etc
   };
   
   const renderItem = useCallback(({ item }) => {
     const Renderer = RENDERERS[item.type];
     if (!Renderer) return null;
     return <Renderer {...item.data} />;
   }, []);
   ```

### Files to Create/Modify
- Use the section components from Issue 3, or create separate renderer components
- `src/screens/EventDetailsScreen.jsx` - Update renderItem

---

## Implementation Order

1. **Issue 2** (Query Invalidation) - Foundation for Issue 1
2. **Issue 1** (Extract handleDelete) - Depends on Issue 2
3. **Issue 5** (instanceDate) - Needed for Issue 1
4. **Issue 6** (Navigation) - Simple fix, can be done anytime
5. **Issue 7** (ID Clarification) - Documentation, can be done anytime
6. **Issue 4** (renderItem Stability) - Performance fix
7. **Issue 3** (Section Components) - Major refactor
8. **Issue 8** (Split Switch Cases) - Can be combined with Issue 3

---

## Testing Checklist

After each issue:
- [ ] Event deletion (single, instance, series) works correctly
- [ ] Cache invalidation works correctly
- [ ] Navigation works smoothly
- [ ] No unnecessary re-renders
- [ ] All sections render correctly
- [ ] Attendance queries work for both instanceId and originalEventId
- [ ] QR codes work correctly
- [ ] No console errors or warnings

---

## Success Metrics

- `handleDelete` reduced from 250+ LOC to ~50 LOC
- Cache refresh logic extracted and reusable
- FlatList re-renders only when necessary
- All sections are independently testable
- Code is more maintainable and easier to understand

