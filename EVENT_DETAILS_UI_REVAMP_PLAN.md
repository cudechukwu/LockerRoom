# Event Details Modal - Comprehensive UI/UX Revamp Plan

## 🎯 Goal
Transform the EventDetailsModal from a "component dump" into a **narrative, story-driven event detail page** that matches the quality and hierarchy of TeamSnap, Apple Calendar, and Google Calendar.

---

## 🔥 Core Problems Identified

### 1. **Wrong Information Hierarchy**
**Current:** Generic "Event Details" header → scattered metadata → mixed actions
**Should be:** Event title as hero → unified details → clear action hierarchy

### 2. **Fragmented Component Structure**
**Current:** 7+ separate UI blocks that feel disconnected
**Should be:** Thematically grouped sections that tell a story

### 3. **Useless Header Wastes Space**
**Current:** `[X] Event Details [edit] [delete]` - tells user nothing
**Should be:** Event title + metadata as the hero section

### 4. **Mixed Player/Coach Actions**
**Current:** Player check-in and coach tools scattered throughout
**Should be:** Clear separation: Event info → User actions → Admin tools

### 5. **Weak Typography Hierarchy**
**Current:** Random font sizes, no visual weight differentiation
**Should be:** Clear hierarchy: Hero title (36px) → Section titles (20px) → Body (16px) → Metadata (14px)

### 6. **Modal Pattern Conflicts**
**Current:** Bottom sheet trying to be a detail page
**Should be:** Full-screen modal with proper page structure

---

## 📐 New Structure (Narrative Flow)

### **Section 1: Event Hero** (Top of screen)
```
Practice

Team Event • Created by Kenechukwu

📍 Andrus Field
🗓️ Wed, Nov 26 • 3:00 PM – 5:00 PM
```

**Components:**
- Large event title (36px, bold)
- Metadata row (Team Event • Created by...)
- Location with icon
- Date/time in compact format

**Actions:**
- Edit/Delete buttons (top right, subtle)
- Close button (top left)

---

### **Section 2: Event Details Card** (Unified)
```
┌─────────────────────────────────┐
│ Event Details                   │
├─────────────────────────────────┤
│ 📅 Date & Time                  │
│    Wednesday, November 26, 2025 │
│    3:00 PM – 5:00 PM            │
│                                 │
│ 📍 Location                     │
│    Andrus Field                 │
│                                 │
│ 📎 Attachments (2)              │
│    📄 IMG_7949.PNG      330 KB  │
│    📄 LockerRoom.pdf    56 KB   │
│                                 │
│ 📝 Notes                        │
│    Bring water bottles...       │
└─────────────────────────────────┘
```

**Components:**
- Single card container
- Date/time section
- Location section
- Attachments section (if any)
- Notes section (if any)

---

### **Section 3: User Actions** (Context-aware, ALWAYS before Attendance)

#### **For Players:**
```
┌─────────────────────────────────┐
│ Check In                        │
├─────────────────────────────────┤
│ [QR Code Check In]              │
│ [Location Check In]             │
│                                 │
│ Status: ✓ Checked In            │
│ Checked in at 2:45 PM           │
└─────────────────────────────────┘
```

#### **For Coaches:**
```
┌─────────────────────────────────┐
│ Actions                         │
├─────────────────────────────────┤
│ [Generate QR Code]              │
│ [Edit Event]                    │
└─────────────────────────────────┘
```

**Components:**
- Action card with clear CTAs
- Status display for players
- Context-appropriate buttons

**Important:** QR generation appears HERE for coaches, NOT in Attendance section.

---

### **Section 4: Attendance** (Coaches only, ALWAYS after User Actions)
```
┌─────────────────────────────────┐
│ Attendance                      │
├─────────────────────────────────┤
│ 0 Present    0 Late    1 Absent │
│                                 │
│ Kenechukwu         Absent       │
│ John Doe           Present      │
│ ...                             │
└─────────────────────────────────┘
```

**Components:**
- Attendance summary (stats)
- Attendance list
- **NO Generate QR button** (already in Actions section)

**Important:** 
- Attendance section ALWAYS comes after User Actions
- QR generation is ONLY in Actions section, never duplicated here

---

## 🏗️ Component Architecture

### **New Components to Create:**

1. **`EventHero.jsx`**
   - Large title
   - Metadata row
   - Location/date/time preview
   - Edit/Delete actions (subtle, top right)

2. **`EventDetailsCard.jsx`**
   - Unified card for all event metadata
   - Date/time section
   - Location section
   - Attachments section
   - Notes section

3. **`PlayerActionsCard.jsx`**
   - Check-in options (QR, Location)
   - Status display
   - Check-out option
   - **No coach logic**

4. **`CoachActionsCard.jsx`**
   - Generate QR Code button
   - Edit Event button
   - **No player logic**

4. **`AttendanceSection.jsx`**
   - Summary stats
   - Generate QR (if needed)
   - Attendance list
   - Combined into one cohesive section

### **Components to Remove/Refactor:**

1. **`EventHeader.jsx`** → Remove generic header, move actions to EventHero
2. **`EventMeta.jsx`** → Split into EventHero + EventDetailsCard
3. **`CheckInSection.jsx`** → Replace with PlayerActionsCard
4. **`CoachActions.jsx`** → Replace with CoachActionsCard
5. **`AttendanceSummary.jsx`** → Merge into AttendanceSection

---

## 📏 Typography Hierarchy

### **Hero Section:**
- **Title:** 36px, Bold, Primary color
- **Metadata:** 14px, Regular, Secondary color
- **Location/Time:** 16px, Medium, Primary color

### **Section Titles:**
- **Card Titles:** 20px, Semibold, Primary color
- **Section Labels:** 16px, Medium, Secondary color

### **Body Text:**
- **Primary:** 16px, Regular, Primary color
- **Secondary:** 14px, Regular, Secondary color
- **Tertiary:** 12px, Regular, Tertiary color

### **Actions:**
- **Button Text:** 16px, Semibold, Primary color
- **Link Text:** 16px, Medium, Accent color

---

## 🎨 Visual Design Principles

### **Spacing:**
- **Section spacing:** 24px between major sections
- **Card padding:** 20px internal padding
- **Card margin:** 0px (cards touch edges, content has padding)
- **Item spacing:** 16px between items in a section

### **Cards:**
- **Border radius:** 20px
- **Background:** `COLORS.BACKGROUND_CARD`
- **Border:** `rgba(255, 255, 255, 0.05)` (subtle)
- **Shadow:** None (flat design)

### **Hierarchy:**
- **Hero:** No card, direct on background
- **Details:** Single unified card
- **Actions:** Card with clear CTAs
- **Attendance:** Card with stats + list

---

## 🔄 Information Flow

### **Priority Order:**
1. **What is it?** → Event title (hero)
2. **Who/What?** → Metadata (Team Event, Creator)
3. **Where/When?** → Location, Date, Time
4. **Resources?** → Attachments
5. **What do I do?** → User actions (check-in OR manage)
6. **Admin tools?** → Attendance (coaches only)

### **Conditional Rendering:**
- **Players:** Hero → Details → Check-in Actions
- **Coaches:** Hero → Details → Actions → Attendance
- **Event Creator:** Same as coach + edit/delete in hero

---

## 📱 Layout Structure

```
┌─────────────────────────────────┐
│ [X]                    [✏️] [🗑️] │ ← Subtle actions
│                                 │
│ Practice                        │ ← Hero Title (36px)
│                                 │
│ Team Event • Created by Kene... │ ← Metadata (14px)
│                                 │
│ 📍 Andrus Field                 │ ← Location (16px)
│ 🗓️ Wed, Nov 26 • 3–5 PM        │ ← Date/Time (16px)
│                                 │
├─────────────────────────────────┤
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Event Details               │ │ ← Card Title
│ ├─────────────────────────────┤ │
│ │ 📅 Date & Time              │ │
│ │    Wednesday, Nov 26, 2025  │ │
│ │    3:00 PM – 5:00 PM        │ │
│ │                             │ │
│ │ 📍 Location                 │ │
│ │    Andrus Field             │ │
│ │                             │ │
│ │ 📎 Attachments (2)          │ │
│ │    📄 IMG_7949.PNG  330 KB  │ │
│ │    📄 LockerRoom.pdf 56 KB  │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Check In                    │ │ ← Player Actions
│ ├─────────────────────────────┤ │
│ │ [QR Code Check In]          │ │
│ │ [Location Check In]         │ │
│ │                             │ │
│ │ ✓ Checked In                │ │
│ │ Checked in at 2:45 PM       │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Attendance                  │ │ ← Coach Section (AFTER Actions)
│ ├─────────────────────────────┤ │
│ │ 0 Present  0 Late  1 Absent │ │
│ │                             │ │
│ │ Kenechukwu      Absent      │ │
│ │ John Doe        Present     │ │
│ └─────────────────────────────┘ │
│                                 │
└─────────────────────────────────┘
```

**Note:** QR generation is ONLY in CoachActionsCard, NOT in Attendance section.

---

## 🛠️ Implementation Plan

### **Phase 1: Create New Components**
1. Create `EventHero.jsx`
   - Large title
   - Metadata row
   - Location/date preview
   - Edit/Delete actions

2. Create `EventDetailsCard.jsx`
   - Unified card structure
   - Date/time section
   - Location section
   - Attachments section
   - Notes section

3. Create `PlayerActionsCard.jsx`
   - Check-in options (QR, Location)
   - Status display
   - Check-out option
   - **No coach logic**

4. Create `CoachActionsCard.jsx`
   - Generate QR Code button
   - Edit Event button
   - **No player logic**

5. Create `AttendanceSection.jsx`
   - Summary stats
   - Attendance list
   - **NO Generate QR button** (already in CoachActionsCard)

### **Phase 2: Refactor EventDetailsModal**
1. Remove old header
2. Remove fragmented components
3. Remove all PanResponder/drag-to-close logic (full screen = no drag)
4. Remove translateY animations
5. Consider Stack Navigator screen instead of Modal (optional, but better for full-screen)
6. Integrate new components in correct order:
   - Hero → Details → User Actions → Attendance (coaches only)
7. Update conditional rendering logic
8. Apply new typography hierarchy
9. Add pull-to-refresh for coaches (attendance section)

### **Phase 3: Styling & Polish**
1. Apply consistent spacing
2. Update card styling
3. Refine typography
4. Add subtle animations
5. Test on different screen sizes

### **Phase 4: Cleanup**
1. Remove unused components
2. Update imports
3. Remove old styles
4. Test all user flows

---

## ✅ Success Criteria

### **Visual:**
- [ ] Event title is immediately visible (36px, top of screen)
- [ ] All metadata is in one unified card
- [ ] Clear visual hierarchy (hero → details → actions → admin)
- [ ] Consistent typography throughout
- [ ] No fragmented "component dump" feeling

### **Functional:**
- [ ] Players see: Hero → Details → PlayerActionsCard
- [ ] Coaches see: Hero → Details → CoachActionsCard → Attendance
- [ ] QR generation appears ONLY in CoachActionsCard (not duplicated)
- [ ] Attendance section ALWAYS comes after User Actions
- [ ] All actions work correctly
- [ ] Edit/Delete accessible but not prominent
- [ ] Smooth scrolling experience
- [ ] Pull-to-refresh works for coaches
- [ ] No drag-to-close behavior (full screen)

### **UX:**
- [ ] Screen tells a story about the event
- [ ] Information flows logically
- [ ] No cognitive overhead
- [ ] Feels like Apple Calendar / TeamSnap quality
- [ ] Actions are context-appropriate

---

## 📝 Component Props & Interfaces

### **EventHero:**
```typescript
{
  event: Event;
  creatorName: string;
  isLoadingCreator: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  canEdit: boolean;
  canDelete: boolean;
}
```

### **EventDetailsCard:**
```typescript
{
  event: Event;
  attachments: Attachment[];
  isLoadingAttachments: boolean;
  onAttachmentPress: (attachment: Attachment) => void;
}
```

### **PlayerActionsCard:**
```typescript
{
  userAttendance?: Attendance;
  event: Event;
  onCheckInQR: () => void;
  onCheckInLocation: () => void;
  onCheckOut: () => void;
  isCheckingIn: boolean;
  isLoadingAttendance: boolean;
}
```

### **CoachActionsCard:**
```typescript
{
  onGenerateQR: () => void;
  onEdit: () => void;
  isLoading?: boolean;
}
```

### **AttendanceSection:**
```typescript
{
  eventId: string;
  teamId: string;
  event: Event;
  stats: AttendanceStats;
  totalMembers: number;
  // NO onGenerateQR - QR generation is in CoachActionsCard
  onRefresh?: () => void; // For pull-to-refresh
  isRefreshing?: boolean;
}
```

---

## 🎯 Key Design Decisions

1. **No generic header** → Event title IS the header
2. **Unified details card** → All metadata in one place
3. **Separate action cards** → PlayerActionsCard vs CoachActionsCard (no prop bloat)
4. **QR generation in ONE place** → Only in CoachActionsCard, never duplicated
5. **Attendance ALWAYS after Actions** → Consistent order for all users
6. **Full-screen page** → No drag-to-close, no PanResponder, proper page structure
7. **Pull-to-refresh** → For coaches to refresh attendance data
8. **Clear hierarchy** → Hero → Details → Actions → Attendance (coaches)
9. **Narrative flow** → Screen tells a story, not component dumps

---

## ⚠️ Critical Implementation Notes

### **1. No Drag-to-Close for Full Screen**
- Remove ALL PanResponder logic
- Remove ALL translateY animations
- Full-screen pages don't drag to close
- Use close button or swipe back gesture (native)

### **2. QR Generation Location**
- **ONLY** in `CoachActionsCard`
- **NEVER** in `AttendanceSection`
- Check both components to ensure no duplication

### **3. Component Separation**
- `PlayerActionsCard` = Player-only props, zero coach logic
- `CoachActionsCard` = Coach-only props, zero player logic
- No `isPlayer`/`isCoach` branching inside components

### **4. Section Order (CRITICAL)**
```
Hero
  ↓
Details
  ↓
User Actions (PlayerActionsCard OR CoachActionsCard)
  ↓
Attendance (coaches only, ALWAYS after Actions)
```

### **5. Pull-to-Refresh**
- Add `RefreshControl` to ScrollView
- Only refresh attendance data (not entire event)
- Show refresh indicator during fetch
- Use React Query's `refetch` for attendance query

---

## 🚀 Ready to Implement

This plan provides:
- ✅ Clear structure
- ✅ Component breakdown
- ✅ Typography system
- ✅ Visual design principles
- ✅ Implementation phases
- ✅ Success criteria

**Next step:** Begin Phase 1 - Create new components with proper hierarchy and styling.

