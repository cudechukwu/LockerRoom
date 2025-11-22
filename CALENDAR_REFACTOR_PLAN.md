# Calendar System Refactor Plan
## Moving from Fixed Array to Virtualized Infinite Scroll

### 🎯 Goal
Transform the calendar from a pre-generated 730-day array to a professional-grade virtualized infinite scroll model (like Teamworks, Apple Calendar, Google Calendar).

---

## 📋 Current Architecture Issues

### Problems:
1. **Pre-generates 730 Date objects** → Memory overhead, slow initial render
2. **Fixed ±365 day range** → Can't scroll beyond one year, breaks at year boundaries
3. **scrollToIndex failures** → Items not measured yet, causes bugs
4. **UI-driven, not date-driven** → Builds entire list then picks from it
5. **Doesn't scale** → Breaks on low-end devices, expensive when years change

---

## 🏗️ New Architecture: Virtual Date Model

### Core Concept:
- Store **current date** (single Date object or ISO string)
- Represent dates as **offsets** from today
- Generate dates **on-demand** as FlatList requests them
- Use **infinite scroll** with large initialScrollIndex

### Offset Model:
```
offset = 0  → today
offset = -1 → yesterday  
offset = 1  → tomorrow
offset = n  → today + n days
```

---

## 📝 Implementation Plan

### Phase 1: Core Utilities (Foundation)
**File: `src/utils/dateUtils.js`**

Create utility functions:
- `addDays(date, offset)` - Add/subtract days from a date
- `getDateFromOffset(offset, baseDate = today)` - Convert offset to Date
- `getOffsetFromDate(date, baseDate = today)` - Convert Date to offset
- `normalizeDate(date)` - Normalize date to midnight (existing logic)
- `formatDateLabel(date, showToday = true)` - Format date for display

**Benefits:**
- Single source of truth for date calculations
- Reusable across components
- Easy to test

---

### Phase 2: Refactor DateSelector Component
**File: `src/components/DateSelector.jsx`**

#### Changes:
1. **Remove pre-generated dateRange array**
   - Delete: `const dateRange = useMemo(() => { ... }, [])`
   - Delete: `PAST_DAYS` and `FUTURE_DAYS` constants

2. **Implement offset-based data model**
   ```javascript
   const TOTAL_ITEMS = 20000; // Large number for infinite scroll
   const INITIAL_INDEX = 10000; // Middle = "today"
   const TODAY_OFFSET = 0; // Today is always offset 0
   
   // FlatList data is just array of offsets
   const dateOffsets = useMemo(() => {
     return Array.from({ length: TOTAL_ITEMS }, (_, i) => i - INITIAL_INDEX);
   }, []);
   ```

3. **Update renderItem to calculate date from offset**
   ```javascript
   const renderItem = ({ item: offset, index }) => {
     const date = getDateFromOffset(offset);
     const norm = normalizeDate(date);
     const isToday = getOffsetFromDate(norm) === 0;
     const isSelected = getOffsetFromDate(currentDate) === offset;
     // ... rest of rendering
   };
   ```

4. **Fix scroll-to-today**
   ```javascript
   // No more scrollToIndex hacks!
   const scrollToToday = () => {
     listRef.current?.scrollToIndex({
       index: INITIAL_INDEX,
       animated: true,
       viewPosition: 0.5
     });
   };
   ```

5. **Add getItemLayout for performance**
   ```javascript
   const ITEM_WIDTH = 74; // Fixed width from styles
   const getItemLayout = (data, index) => ({
     length: ITEM_WIDTH,
     offset: ITEM_WIDTH * index,
     index,
   });
   ```

6. **Update FlatList props**
   ```javascript
   <FlatList
     data={dateOffsets}
     getItemLayout={getItemLayout}
     initialScrollIndex={INITIAL_INDEX}
     initialNumToRender={10}
     windowSize={21}
     maxToRenderPerBatch={10}
     // ... other props
   />
   ```

---

### Phase 3: Update Event Fetching
**File: `src/hooks/useCalendarData.js`**

#### Changes:
1. **Remove fixed ±365 day range**
   - Current: Fetches -365 to +365 days
   - New: Fetch events based on visible date range or selected date

2. **Smart fetching strategy**
   ```javascript
   // Option A: Fetch for selected date ± buffer
   const fetchEventsForDate = async (date, bufferDays = 7) => {
     const start = addDays(date, -bufferDays);
     const end = addDays(date, bufferDays);
     return getEventsInRange(teamId, start, end);
   };
   
   // Option B: Fetch full year but cache intelligently
   // Keep current approach but make it more efficient
   ```

3. **Update cache keys**
   - Keep stable cache key for full year
   - Or implement date-range-based caching

---

### Phase 4: Update CalendarScreen
**File: `src/screens/CalendarScreen.jsx`**

#### Changes:
1. **Update navigateToDate**
   ```javascript
   const navigateToDate = useCallback((date) => {
     const normalized = normalizeDate(date);
     setCurrentDate(normalized);
     // DateSelector will handle scrolling via offset
   }, []);
   ```

2. **Update navigateToToday**
   ```javascript
   const navigateToToday = useCallback(() => {
     const today = normalizeDate(new Date());
     setCurrentDate(today);
     // DateSelector scrolls to offset 0
   }, []);
   ```

3. **Ensure date normalization consistency**
   - All dates normalized to midnight
   - Use utility functions from dateUtils

---

### Phase 5: Performance Optimization

#### FlatList Configuration:
```javascript
{
  initialNumToRender: 10,        // Render 10 items initially
  windowSize: 21,                // Keep 21 items in memory
  maxToRenderPerBatch: 10,       // Render 10 at a time
  updateCellsBatchingPeriod: 50, // Batch updates
  removeClippedSubviews: true,   // Remove off-screen views
  getItemLayout: getItemLayout,  // Fixed item size
}
```

#### Memory Management:
- Only render visible items + buffer
- Recycle date calculations
- Cache formatted date labels

---

### Phase 6: Testing & Edge Cases

#### Test Scenarios:
1. ✅ Scroll to past dates (years ago)
2. ✅ Scroll to future dates (years ahead)
3. ✅ Click "back to today" from far dates
4. ✅ Date label shows "TODAY" correctly
5. ✅ Events filter correctly for selected date
6. ✅ Smooth scrolling on low-end devices
7. ✅ Year boundary transitions
8. ✅ Timezone handling
9. ✅ Initial load performance
10. ✅ Memory usage over time

---

## 🎨 Benefits of New Architecture

### Performance:
- ✅ No pre-generated 730-item array
- ✅ Only renders visible items
- ✅ Smooth infinite scrolling
- ✅ Lower memory footprint
- ✅ Faster initial load

### Scalability:
- ✅ No fixed date range limits
- ✅ Can scroll infinitely in both directions
- ✅ Works for any date range
- ✅ Handles year boundaries gracefully

### Reliability:
- ✅ No scrollToIndex failures
- ✅ No layout measurement issues
- ✅ Predictable behavior
- ✅ Easier to debug

### Maintainability:
- ✅ Cleaner code structure
- ✅ Single source of truth for dates
- ✅ Easier to test
- ✅ Follows industry best practices

---

## 📦 File Structure

```
src/
├── utils/
│   └── dateUtils.js          # NEW: Date utility functions
├── components/
│   └── DateSelector.jsx      # REFACTOR: Use offset model
├── hooks/
│   └── useCalendarData.js    # UPDATE: Smart event fetching
└── screens/
    └── CalendarScreen.jsx    # UPDATE: Use new date utilities
```

---

## 🚀 Migration Strategy

### Step 1: Create utilities (non-breaking)
- Add `dateUtils.js` with new functions
- Keep existing code working

### Step 2: Refactor DateSelector (breaking)
- Replace dateRange with offset model
- Test thoroughly before moving on

### Step 3: Update event fetching (non-breaking)
- Optimize fetching strategy
- Maintain backward compatibility

### Step 4: Clean up (non-breaking)
- Remove old code
- Optimize performance
- Add tests

---

## ⚠️ Risks & Mitigation

### Risk: Breaking existing functionality
**Mitigation:** 
- Test each phase independently
- Keep old code until new code is verified
- Use feature flags if needed

### Risk: Performance regression
**Mitigation:**
- Profile before and after
- Test on low-end devices
- Optimize FlatList configuration

### Risk: Date/timezone bugs
**Mitigation:**
- Use consistent date normalization
- Test across timezones
- Add comprehensive date utility tests

---

## 📊 Success Metrics

### Performance:
- Initial render time < 100ms
- Scroll FPS > 60
- Memory usage < 50MB for calendar

### Functionality:
- ✅ All existing features work
- ✅ No scrollToIndex failures
- ✅ Infinite scroll in both directions
- ✅ Correct date labels and event filtering

### Code Quality:
- ✅ Reduced code complexity
- ✅ Better test coverage
- ✅ Follows best practices
- ✅ Easier to maintain

---

## 🎯 Next Steps

1. **Review this plan** with team
2. **Create dateUtils.js** with core functions
3. **Refactor DateSelector** component
4. **Test thoroughly** before proceeding
5. **Iterate** based on feedback

---

## 📚 References

- [React Native FlatList Performance](https://reactnative.dev/docs/optimizing-flatlist-configuration)
- [Infinite Scroll Patterns](https://github.com/facebook/react-native/issues/16067)
- Teamworks Calendar (reference implementation)
- Apple Calendar (reference implementation)

---

**Status:** 🟡 Planning Phase
**Priority:** High
**Estimated Effort:** 2-3 days
**Dependencies:** None

