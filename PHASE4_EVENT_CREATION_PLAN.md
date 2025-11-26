# Phase 4: Event Creation Integration - Comprehensive Plan

## 🎯 Goal
Add attendance group selection to the event creation modal, allowing coaches to assign events to specific groups or make them visible to the full team.

## 📋 Overview

### What We're Adding
1. **Event Visibility Toggle**: "Full Team" vs "Specific Groups"
2. **Group Selection UI**: Multi-select interface for choosing groups
3. **Visual Feedback**: Show selected groups as chips/tags
4. **Data Integration**: Save group assignments to database
5. **Edit Support**: Pre-fill groups when editing existing events

### User Flow
1. Coach opens event creation modal
2. Fills in event details (title, date, time, etc.)
3. Scrolls to "Event Visibility" section
4. Selects "Full Team" (default) OR "Specific Groups"
5. If "Specific Groups" selected:
   - Dropdown/modal opens showing all available groups
   - Coach selects one or more groups
   - Selected groups appear as removable chips
6. Saves event → Groups are assigned

## 🎨 UI/UX Design

### Section Layout
```
┌─────────────────────────────────────┐
│ Event Visibility                     │
├─────────────────────────────────────┤
│ ○ Full Team (all members)           │
│ ● Specific Groups                    │
│                                      │
│ Selected Groups:                     │
│ ┌─────────────┐  ┌─────────────┐   │
│ │ 🏈 D-Line   │× │ 🏈 Traveling │× │
│ └─────────────┘  └─────────────┘   │
│                                      │
│ [+ Add Group ▼]                      │
└─────────────────────────────────────┘
```

### Design Specifications

**Radio Buttons:**
- Default: "Full Team" selected
- Styling: Match existing modal design (dark theme)
- Spacing: 16px between options

**Selected Groups Display:**
- Chip style: Rounded pills with group name
- Remove button: Small × icon on right
- Max width: Prevent overflow
- Wrap: Multiple rows if needed
- Empty state: Show "+ Add Group" button

**Group Selection Dropdown:**
- Trigger: "+ Add Group" button
- Style: Modal or dropdown (match existing pattern)
- Search: Filter groups by name
- Multi-select: Checkboxes for each group
- "Select All" / "Clear All" options (optional)
- Max height: Scrollable if many groups

## 🔧 Technical Implementation

### 1. State Management

**New State Variables:**
```javascript
const [eventVisibility, setEventVisibility] = useState('fullTeam'); // 'fullTeam' | 'specificGroups'
const [selectedGroups, setSelectedGroups] = useState([]); // Array of group IDs
const [showGroupSelector, setShowGroupSelector] = useState(false);
const [availableGroups, setAvailableGroups] = useState([]); // All groups for team
const [groupSearchQuery, setGroupSearchQuery] = useState('');
const [userModifiedGroups, setUserModifiedGroups] = useState(false); // Track if user manually changed groups

// 🟧 IMPORTANT: Debounced search query for performance
const debouncedSearchQuery = useDebounce(groupSearchQuery, 150);
```

**State Updates:**
- When "Full Team" selected → Clear `selectedGroups`, reset `userModifiedGroups`
- When "Specific Groups" selected → Keep existing selections
- When group added → Add to `selectedGroups` array, set `userModifiedGroups = true`
- When group removed → Remove from `selectedGroups` array, set `userModifiedGroups = true`
- ⚠️ MICRO-ADJUSTMENT: Track user modifications to prevent accidental overwrites in edit mode

### 2. Data Fetching

**Load Groups on Modal Open:**
```javascript
useEffect(() => {
  if (visible && teamId) {
    loadAvailableGroups();
  }
}, [visible, teamId]);

const loadAvailableGroups = async () => {
  const { data, error } = await getTeamAttendanceGroups(teamId);
  if (!error && data) {
    setAvailableGroups(data);
  }
};
```

**🟥 CRITICAL: Filter Stale Group Memberships**
```javascript
// Remove deleted groups from selectedGroups when availableGroups changes
useEffect(() => {
  if (availableGroups.length > 0) {
    setSelectedGroups(prev =>
      prev.filter(id => availableGroups.some(g => g.id === id))
    );
  }
}, [availableGroups]);
```

**Pre-fill for Edit Mode (Fixed Timing Issue + User Modification Protection):**
```javascript
// 🟦 FIX: Wait for both event AND groups to load before pre-filling
// ⚠️ MICRO-ADJUSTMENT: Don't overwrite if user has manually modified groups
useEffect(() => {
  // Don't pre-fill if user has already modified groups manually
  if (!editingEvent || !availableGroups.length || userModifiedGroups) return;
  
  // Check if event has assigned groups
  const assignedGroups = editingEvent.assigned_attendance_groups || [];
  const isFullTeam = editingEvent.is_full_team_event !== false;
  
  // Filter out any groups that no longer exist
  const validGroupIds = assignedGroups.filter(id => 
    availableGroups.some(g => g.id === id)
  );
  
  if (isFullTeam || validGroupIds.length === 0) {
    setEventVisibility('fullTeam');
    setSelectedGroups([]);
  } else {
    setEventVisibility('specificGroups');
    setSelectedGroups(validGroupIds);
  }
}, [editingEvent, availableGroups, userModifiedGroups]); // Wait for both to be ready, respect user changes
```

### 3. Component Structure

**🟩 RECOMMENDED: Separate Component**
Create `GroupSelectorModal.jsx` for better:
- Reusability (messaging, reports, etc.)
- Smaller EventCreationModal file
- Better testability
- Cleaner separation of concerns

**Component Props:**
```javascript
<GroupSelectorModal
  visible={showGroupSelector}
  onClose={() => setShowGroupSelector(false)}
  availableGroups={availableGroups}
  selectedGroups={selectedGroups}
  onSelectGroup={(groupId) => addGroup(groupId)}
  onDeselectGroup={(groupId) => removeGroup(groupId)}
  searchQuery={groupSearchQuery}
  onSearchChange={setGroupSearchQuery}
/>
```

**Or Integrate into EventCreationModal:**
- Inline dropdown (like existing dropdowns)
- Or expandable section
- (Less recommended but acceptable)

### 4. Form Data Integration

**Update `formatEventData()` call:**
```javascript
const handleCreateEvent = () => {
  const formData = {
    // ... existing fields
    isFullTeamEvent: eventVisibility === 'fullTeam',
    assignedAttendanceGroups: eventVisibility === 'specificGroups' 
      ? selectedGroups 
      : [],
  };
  
  onCreateEvent(formData);
};
```

**Update `formatEventData()` in `src/api/events.js`:**
- Already done! ✅ (handles `isFullTeamEvent` and `assignedAttendanceGroups`)

### 5. Validation

**Rules:**
- If "Specific Groups" selected → Must have at least 1 group selected
- Show error message if trying to save without groups
- Disable "Create" button if validation fails

**Validation Function:**
```javascript
const validateForm = () => {
  if (eventVisibility === 'specificGroups' && selectedGroups.length === 0) {
    Alert.alert('Error', 'Please select at least one group for this event.');
    return false;
  }
  return true;
};
```

## 📝 Implementation Steps

### Step 1: Add State Variables (15 min)
- [ ] Add state for `eventVisibility`
- [ ] Add state for `selectedGroups`
- [ ] Add state for `showGroupSelector`
- [ ] Add state for `availableGroups`
- [ ] Add state for `groupSearchQuery`
- [ ] **⚠️ MICRO-ADJUSTMENT**: Add state for `userModifiedGroups` flag

### Step 2: Fetch Groups (20 min)
- [ ] Import `getTeamAttendanceGroups` from API
- [ ] Add `useEffect` to load groups when modal opens
- [ ] Handle loading and error states
- [ ] Store groups in state
- [ ] **🟥 CRITICAL**: Add useEffect to filter stale group memberships
- [ ] **🟨 MEDIUM**: Add empty state message if no groups exist

### Step 3: Create UI Components (1-2 hours)
- [ ] Add "Event Visibility" section to modal
- [ ] Create radio button group (Full Team / Specific Groups)
- [ ] Create group chips display area
- [ ] **⚠️ MICRO-ADJUSTMENT**: Empty state should ONLY appear in selector modal, not chip area
- [ ] **🟩 RECOMMENDED**: Create `GroupSelectorModal.jsx` component
- [ ] Or create inline group selector dropdown/modal
- [ ] **🟧 IMPORTANT**: Add debounced search functionality
- [ ] **🟨 MEDIUM**: Add empty state message component (in selector only)
- [ ] **🟧 PERFORMANCE**: Use FlashList for group list (if many groups)
- [ ] **⚠️ MICRO-ADJUSTMENT**: Add `removeClippedSubviews={true}` to FlashList for Android
- [ ] Style to match existing design

### Step 4: Implement Group Selection Logic (30 min)
- [ ] Handle radio button changes
- [ ] Handle group selection (add to array)
- [ ] **⚠️ MICRO-ADJUSTMENT**: Set `userModifiedGroups = true` when user selects/removes groups
- [ ] Handle group removal (remove from array)
- [ ] **🟧 IMPORTANT**: Filter groups by debounced search query
- [ ] Prevent duplicate selections
- [ ] **🟥 CRITICAL**: Handle deleted groups gracefully (filter from selectedGroups)

### Step 5: Integrate with Form Submission (20 min)
- [ ] Update `handleCreateEvent` to include group data
- [ ] Add validation for group selection
- [ ] Test form submission with groups
- [ ] Test form submission without groups (Full Team)

### Step 6: Edit Mode Support (30 min)
- [ ] Detect if editing existing event
- [ ] **🟦 FIX**: Wait for both `editingEvent` AND `availableGroups` to load
- [ ] **⚠️ MICRO-ADJUSTMENT**: Add `userModifiedGroups` flag to prevent overwriting user changes
- [ ] Pre-fill `eventVisibility` based on event data
- [ ] Pre-fill `selectedGroups` from `assigned_attendance_groups`
- [ ] **🟥 CRITICAL**: Filter out deleted groups when pre-filling
- [ ] **⚠️ MICRO-ADJUSTMENT**: Don't pre-fill if `userModifiedGroups === true`
- [ ] Load group names for display (not just IDs)
- [ ] Test edit flow with user modifications

### Step 7: Edge Cases & Polish (30 min)
- [ ] **🟨 MEDIUM**: Handle empty groups list with clear message
- [ ] **🟨 MEDIUM**: Show helpful message: "No attendance groups created yet. Create groups in Team Settings → Attendance Groups."
- [ ] **🟥 CRITICAL**: Handle group deletion (auto-remove from selectedGroups)
- [ ] **🟥 CRITICAL**: Handle stale group references (filter on availableGroups change)
- [ ] Add loading states
- [ ] Add error handling
- [ ] Test all scenarios

## 🎨 UI Component Details

### Radio Button Group
```jsx
<View style={styles.visibilitySection}>
  <Text style={styles.sectionLabel}>Event Visibility</Text>
  
  <TouchableOpacity 
    style={styles.radioOption}
    onPress={() => {
      setEventVisibility('fullTeam');
      setSelectedGroups([]); // Clear selections
    }}
  >
    <View style={styles.radioButton}>
      {eventVisibility === 'fullTeam' && <View style={styles.radioSelected} />}
    </View>
    <Text style={styles.radioLabel}>Full Team (all members)</Text>
  </TouchableOpacity>
  
  <TouchableOpacity 
    style={styles.radioOption}
    onPress={() => setEventVisibility('specificGroups')}
  >
    <View style={styles.radioButton}>
      {eventVisibility === 'specificGroups' && <View style={styles.radioSelected} />}
    </View>
    <Text style={styles.radioLabel}>Specific Groups</Text>
  </TouchableOpacity>
</View>
```

### Selected Groups Chips
```jsx
{eventVisibility === 'specificGroups' && (
  <View style={styles.selectedGroupsContainer}>
    <Text style={styles.selectedGroupsLabel}>Selected Groups:</Text>
    <View style={styles.chipsContainer}>
      {/* ⚠️ MICRO-ADJUSTMENT: Empty state should NOT appear here - only in selector modal */}
      {selectedGroups.length === 0 ? (
        <TouchableOpacity
          style={styles.addGroupButton}
          onPress={() => setShowGroupSelector(true)}
        >
          <Ionicons name="add" size={18} color={COLORS.PRIMARY} />
          <Text style={styles.addGroupText}>Add Group</Text>
        </TouchableOpacity>
      ) : (
        <>
          {selectedGroups.map(groupId => {
            const group = availableGroups.find(g => g.id === groupId);
            if (!group) return null; // Stale group filtered out
            return (
              <View key={groupId} style={styles.groupChip}>
                <Text style={styles.chipText}>{group.name}</Text>
                <TouchableOpacity
                  onPress={() => {
                    removeGroup(groupId);
                    setUserModifiedGroups(true); // ⚠️ Track user modification
                  }}
                  style={styles.chipRemove}
                >
                  <Ionicons name="close" size={16} color={COLORS.WHITE} />
                </TouchableOpacity>
              </View>
            );
          })}
          <TouchableOpacity
            style={styles.addGroupButton}
            onPress={() => setShowGroupSelector(true)}
          >
            <Ionicons name="add" size={18} color={COLORS.PRIMARY} />
            <Text style={styles.addGroupText}>Add Group</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  </View>
)}
```

### Group Selector Dropdown
```jsx
{showGroupSelector && (
  <View style={styles.groupSelector}>
    {/* Search */}
    <View style={styles.searchContainer}>
      <Ionicons name="search" size={20} color={COLORS.TEXT_TERTIARY} />
      <TextInput
        style={styles.searchInput}
        value={groupSearchQuery}
        onChangeText={setGroupSearchQuery} // Will be debounced
        placeholder="Search groups..."
        placeholderTextColor={COLORS.TEXT_TERTIARY}
      />
    </View>
    
    {/* 🟨 Empty State Message */}
    {availableGroups.length === 0 ? (
      <View style={styles.emptyGroupsMessage}>
        <Ionicons name="information-circle-outline" size={24} color={COLORS.TEXT_TERTIARY} />
        <Text style={styles.emptyGroupsText}>
          No attendance groups created yet.{'\n'}
          Create groups in Team Settings → Attendance Groups.
        </Text>
      </View>
    ) : filteredGroups.length === 0 ? (
      <View style={styles.emptySearchMessage}>
        <Text style={styles.emptySearchText}>No groups found matching "{debouncedSearchQuery}"</Text>
      </View>
    ) : (
      /* 🟧 PERFORMANCE: Use FlashList for large lists */
      <FlashList
        data={filteredGroups}
        estimatedItemSize={50}
        removeClippedSubviews={true} // ⚠️ MICRO-ADJUSTMENT: Fix Android modal glitches
        renderItem={({ item: group }) => {
          const isSelected = selectedGroups.includes(group.id);
          return (
            <TouchableOpacity
              style={styles.groupOption}
              onPress={() => toggleGroup(group.id)}
            >
              <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                {isSelected && <Ionicons name="checkmark" size={16} color={COLORS.WHITE} />}
              </View>
              <Text style={styles.groupOptionText}>{group.name}</Text>
            </TouchableOpacity>
          );
        }}
        keyExtractor={(item) => item.id}
        style={styles.groupList}
        maxHeight={200}
      />
    )}
    
    {/* Actions */}
    <View style={styles.selectorActions}>
      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => {
          setShowGroupSelector(false);
          setGroupSearchQuery('');
        }}
      >
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.doneButton}
        onPress={() => {
          setShowGroupSelector(false);
          setGroupSearchQuery('');
        }}
      >
        <Text style={styles.doneButtonText}>Done</Text>
      </TouchableOpacity>
    </View>
  </View>
)}
```

**🟧 IMPORTANT: Filter with Debounced Query**
```javascript
const filteredGroups = useMemo(() => {
  if (!debouncedSearchQuery) return availableGroups;
  const query = debouncedSearchQuery.toLowerCase();
  return availableGroups.filter(group =>
    group.name.toLowerCase().includes(query)
  );
}, [availableGroups, debouncedSearchQuery]);
```

## 🔄 Data Flow

### Creating Event with Groups
```
User selects groups
  ↓
selectedGroups state updated
  ↓
User clicks "Create"
  ↓
handleCreateEvent() called
  ↓
formData includes:
  - isFullTeamEvent: false
  - assignedAttendanceGroups: [groupId1, groupId2, ...]
  ↓
formatEventData() converts to:
  - is_full_team_event: false
  - assigned_attendance_groups: ["uuid1", "uuid2", ...]
  ↓
createEvent() saves to database
  ↓
Event created with group assignments
```

### Creating Full Team Event
```
User selects "Full Team"
  ↓
eventVisibility = 'fullTeam'
selectedGroups = []
  ↓
User clicks "Create"
  ↓
formData includes:
  - isFullTeamEvent: true
  - assignedAttendanceGroups: []
  ↓
formatEventData() converts to:
  - is_full_team_event: true
  - assigned_attendance_groups: []
  ↓
createEvent() saves to database
  ↓
Event visible to all team members
```

## ✅ Testing Checklist

### Functional Tests
- [ ] Can create event with "Full Team" selected
- [ ] Can create event with specific groups selected
- [ ] Can select multiple groups
- [ ] Can remove selected groups
- [ ] Can search/filter groups
- [ ] Validation prevents saving without groups (when "Specific Groups" selected)
- [ ] Edit mode pre-fills groups correctly
- [ ] Edit mode allows changing groups
- [ ] Switching to "Full Team" clears selected groups
- [ ] Switching to "Specific Groups" keeps existing selections

### Edge Cases
- [ ] **🟨 MEDIUM**: No groups exist → Show clear message with instructions
- [ ] **🟥 CRITICAL**: All groups deleted → Auto-remove from selection, handle gracefully
- [ ] **🟥 CRITICAL**: Group deleted while selected → Auto-remove from selection
- [ ] **🟥 CRITICAL**: Stale group IDs in selectedGroups → Filter out when availableGroups loads
- [ ] Network error loading groups → Show error message
- [ ] **🟧 IMPORTANT**: Empty search query → Show all groups (use debounced query)
- [ ] **🟧 PERFORMANCE**: Many groups → Use FlashList, scrolls smoothly
- [ ] Many selected groups → Chips wrap correctly
- [ ] **🟦 FIX**: Edit mode timing → Wait for both event and groups before pre-filling

### UI/UX Tests
- [ ] Matches existing modal design
- [ ] Responsive on different screen sizes
- [ ] Loading states show correctly
- [ ] Error messages are clear
- [ ] Animations are smooth
- [ ] Touch targets are adequate size
- [ ] Text is readable

## 🐛 Potential Issues & Solutions

### Issue 1: Groups not loading
**Solution**: Check teamId is available, add error handling, show loading state

### Issue 2: Selected groups disappear on modal close
**Solution**: State is managed correctly, groups persist until form submission

### Issue 3: Edit mode doesn't show group names
**Solution**: Load full group objects, not just IDs, for display. **🟦 FIX**: Wait for both event and groups to load.

### Issue 4: Validation fails silently
**Solution**: Add clear error messages, disable submit button when invalid

### Issue 5: Performance with many groups
**Solution**: **🟧 IMPORTANT**: Debounce search (150ms), **🟧 PERFORMANCE**: Use FlashList for virtualization

### Issue 6: 🟥 CRITICAL - Stale group references
**Solution**: Filter selectedGroups when availableGroups changes. Remove deleted groups automatically.

### Issue 7: 🟨 MEDIUM - Empty state confusion
**Solution**: Show clear message: "No attendance groups created yet. Create groups in Team Settings → Attendance Groups."

## 📊 Success Metrics

- ✅ Coaches can assign events to specific groups
- ✅ "Full Team" option works as default
- ✅ Group selection is intuitive and fast
- ✅ Edit mode correctly pre-fills groups
- ✅ No performance issues with many groups
- ✅ UI matches existing design system

## ⏱️ Time Estimate

- **Step 1**: 15 minutes
- **Step 2**: 25 minutes (+5 for stale group filtering)
- **Step 3**: 1.5-2.5 hours (UI components + debounce + FlashList)
- **Step 4**: 35 minutes (+5 for stale group handling)
- **Step 5**: 20 minutes
- **Step 6**: 35 minutes (+5 for timing fix)
- **Step 7**: 35 minutes (+5 for empty state message)

**Total: 3.5-4.5 hours** (increased due to critical fixes)

## 🔧 Required Utilities

### Debounce Hook
```javascript
// src/hooks/useDebounce.js
import { useState, useEffect } from 'react';

export function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

### FlashList (Optional but Recommended)
```bash
npm install @shopify/flash-list
```

## 🚀 Next Steps After Phase 4

1. **Phase 5**: Event filtering (only show events user is in)
2. **Phase 6**: UI updates for check-in restrictions
3. **Testing**: End-to-end testing with real data
4. **Documentation**: Update user guides

---

## 📝 Critical Fixes Summary

- ✅ **🟥 CRITICAL**: Filter stale group memberships when availableGroups changes
- ✅ **🟧 IMPORTANT**: Debounce search query (150ms) for performance
- ✅ **🟨 MEDIUM**: Clear empty state message with instructions
- ✅ **🟦 FIX**: Wait for both event and groups before pre-filling in edit mode
- ✅ **🟩 RECOMMENDED**: Separate GroupSelectorModal component
- ✅ **🟧 PERFORMANCE**: Use FlashList for large group lists
- ✅ **⚠️ MICRO-ADJUSTMENT**: Track `userModifiedGroups` to prevent overwriting user changes
- ✅ **⚠️ MICRO-ADJUSTMENT**: Empty state only in selector modal, not chip area
- ✅ **⚠️ MICRO-ADJUSTMENT**: Add `removeClippedSubviews={true}` to FlashList for Android

**Status**: 📋 Planning Complete - Ready for Implementation (with all fixes + micro-adjustments)
**Priority**: High (completes core functionality)

