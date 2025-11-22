# Calendar System - Testing Checklist

## ✅ Code Implementation Complete

All code implementation for the calendar refactor is complete. The following checklist is for manual testing to verify everything works correctly.

---

## 🧪 Manual Testing Checklist

### **Date Selector Tests**

#### Basic Functionality
- [ ] Calendar opens and shows today's date centered
- [ ] Date pills display correctly with "TODAY" label for today
- [ ] Can scroll left to see past dates
- [ ] Can scroll right to see future dates
- [ ] Can scroll infinitely in both directions (no limits)
- [ ] Tapping a date selects it and shows its events
- [ ] Selected date is visually highlighted

#### Edge Cases
- [ ] Scrolling to dates 1 year ago works
- [ ] Scrolling to dates 1 year ahead works
- [ ] Scrolling to dates 2+ years works
- [ ] "Back to Today" button appears when >10 days away
- [ ] "Back to Today" button scrolls to today correctly
- [ ] Date labels show correct day of week and date
- [ ] "TODAY" label updates correctly (if app runs past midnight)

#### Performance
- [ ] Smooth scrolling (60 FPS)
- [ ] No lag when scrolling quickly
- [ ] No memory leaks after extended scrolling
- [ ] Initial load is fast (< 100ms)

---

### **Event Display Tests**

#### Event Filtering
- [ ] Events for today show when viewing today
- [ ] Events for a specific date show when viewing that date
- [ ] Events created for today appear immediately (optimistic update)
- [ ] Events created for future dates appear when viewing that date
- [ ] Events created for past dates appear when viewing that date
- [ ] No events show for dates without events

#### Event Creation
- [ ] Create event for today → appears immediately
- [ ] Create event for tomorrow → appears when viewing tomorrow
- [ ] Create event for past date → appears when viewing that date
- [ ] Event appears without needing to reload app
- [ ] Event details are correct (title, time, location, type)

#### Event Editing
- [ ] Edit event → changes appear immediately
- [ ] Change event date → event moves to new date
- [ ] Change event time → time updates correctly

#### Event Deletion
- [ ] Delete event → disappears immediately
- [ ] Deleted event doesn't reappear after refresh

---

### **Date Comparison Tests**

#### Today vs Specific Date
- [ ] Viewing "today" shows same events as viewing today's date (e.g., "Nov 21")
- [ ] "TODAY" label appears on today's date pill
- [ ] "Today's Events" header shows when viewing today
- [ ] Date-specific header shows when viewing other dates

#### Date Navigation
- [ ] Navigate to yesterday → shows yesterday's events
- [ ] Navigate to tomorrow → shows tomorrow's events
- [ ] Navigate to date 1 week ago → shows that date's events
- [ ] Navigate to date 1 month ago → shows that date's events

---

### **Performance Tests**

#### Memory Usage
- [ ] Memory usage stays reasonable after scrolling
- [ ] No memory leaks after creating/deleting events
- [ ] Memory doesn't grow unbounded during extended use

#### Scroll Performance
- [ ] Smooth scrolling on iOS device
- [ ] Smooth scrolling on Android device
- [ ] No jank or stuttering
- [ ] Fast initial render

#### Network Performance
- [ ] Events load quickly on first open
- [ ] Cached events show immediately
- [ ] Refetch doesn't cause UI freeze

---

### **Edge Cases & Error Handling**

#### Timezone Tests
- [ ] Events created in one timezone display correctly
- [ ] Date comparisons work across timezones
- [ ] "Today" label is correct regardless of timezone

#### Year Boundaries
- [ ] Scrolling from Dec 31 to Jan 1 works
- [ ] Events on year boundaries display correctly
- [ ] Date labels show correct year

#### Empty States
- [ ] Empty state shows when no events for today
- [ ] Empty state shows when no events for selected date
- [ ] "Add Event" button works from empty state

#### Error Handling
- [ ] Network error → shows error message
- [ ] Invalid event data → shows error message
- [ ] Failed event creation → optimistic event removed
- [ ] Failed event deletion → event reappears

---

### **Integration Tests**

#### With Home Screen
- [ ] Next event on home screen updates after creating event
- [ ] Next event on home screen updates after deleting event
- [ ] Navigation from home screen to calendar works

#### With Event Modals
- [ ] Create event modal pre-fills current date
- [ ] Edit event modal shows correct event data
- [ ] Delete confirmation works correctly

---

## 🐛 Known Issues to Watch For

### Fixed Issues (Should Not Occur)
- ✅ Overshooting scroll position by years
- ✅ Events not appearing after creation
- ✅ Date comparison mismatches
- ✅ Cache invalidation failures
- ✅ Race conditions in scrolling

### Potential Issues to Monitor
- ⚠️ Very old Android devices may have slight lag on initial scroll
- ⚠️ Rapid date tapping might cause brief UI flicker
- ⚠️ Network delays might cause optimistic event to show briefly before real event

---

## 📊 Success Criteria

### Must Pass (Critical)
- ✅ Events appear immediately after creation
- ✅ No scroll position overshooting
- ✅ Correct date filtering
- ✅ Smooth scrolling performance

### Should Pass (Important)
- ✅ Infinite scroll works in both directions
- ✅ "Back to Today" button works correctly
- ✅ Date labels are accurate
- ✅ Memory usage is reasonable

### Nice to Have (Optional)
- ⚠️ Perfect 60 FPS on all devices
- ⚠️ Instant cache updates
- ⚠️ Zero flicker during updates

---

## 🚀 Quick Test Script

### 5-Minute Smoke Test
1. Open calendar → verify today is centered
2. Create event for today → verify it appears immediately
3. Scroll to tomorrow → verify tomorrow's events show
4. Create event for tomorrow → verify it appears
5. Scroll back to today → verify today's events still show
6. Delete an event → verify it disappears immediately
7. Scroll to 1 month ago → verify past events show
8. Click "Back to Today" → verify it scrolls to today

If all 8 steps pass, the calendar is working correctly! ✅

---

## 📝 Test Results Template

```
Date: __________
Tester: __________
Device: __________
OS Version: __________

Basic Functionality: [ ] Pass [ ] Fail
Event Creation: [ ] Pass [ ] Fail
Event Filtering: [ ] Pass [ ] Fail
Scroll Performance: [ ] Pass [ ] Fail
Edge Cases: [ ] Pass [ ] Fail

Issues Found:
1. 
2. 
3. 

Notes:
```

---

**Status:** Ready for Testing
**Last Updated:** Just now

