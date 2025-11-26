# Event Creation Modal Redesign - Dev Spec

## 1. Scope of this Revamp

Implement the new dark Create Event screen to match the mockups:

- Audience selection at the top (Who sees this)
- Event type tabs
- Simple stacked form for title, description, location, date, time
- Attachments and extras
- Assigned groups grid (when needed)
- Attendance settings section

**No new crazy logic yet. Just surfacing what already exists plus the new attendance fields.**

---

## 2. Final UX Breakdown (Exactly What the Screen Should Have)

### Header

- **Left:** Cancel
- **Center:** Create Event
- **Right:** Save

---

### Section A: Who Sees This

**Segmented buttons:**
- Team
- Specific group(s)
- Personal

**Under the buttons:**
- If **Team:** show nothing else here
- If **Personal:** show text "Only you will see this event"
- If **Specific group(s):** show selected groups as small chips. Tapping opens the groups grid section or scrolls user to that section.

**State mapping:**
- `Team` → `visibility = 'team'`
- `Personal` → `visibility = 'personal'`
- `Specific group(s)` → `visibility = 'team'` and `assigned_attendance_groups` not empty

**Note:** Coaches only and players only for now can be handled under Attendance Requirement instead of extra buttons here. Keeps this section clean.

---

### Section B: Event Type

**Horizontal scrollable tabs:**
- Practice
- Workout
- Meeting
- Film
- Therapy
- Travel
- Game
- Other

**State:** `event_type` string

**Optional nice to have:** When user taps a type and title is empty, prefill title with that type, for example "Practice".

---

### Section C: Core Details

**Stacked card:**

1. **Title** (required)
2. **Description** (multiline)
3. **Location**
   - Text input
   - Small "Use current location" button under it

**Date and time:**
- Row 1: Date picker on left, Start time on right
- Row 2: End time full width or aligned under Start time

**State mapping:**
- `title`, `description`, `location`
- `start_time`, `end_time`

---

### Section D: Attachments and Extras

**Simple list:**
- Add files / attach PDFs `>`
- Add notes for coaches `>`

**Note:** `coachNotes` should not be visible to players on the details screen.

---

### Section E: Repeat Event

**Single row:**
- **Left:** "Repeat event"
- **Right:** current value ("None", "Daily", "Weekly", "Custom") with chevron

Opens picker or bottom sheet.

---

### Section F: Assigned Groups

**Shown only if "Specific group(s)" is selected.**

**Content:**
- Row header: "Assigned groups" + small text "N selected"
- Grid with 2 or 3 columns:
  - DL, OL, WRs, RBs, QBs, DBs, Linebackers, Specialists, custom groups

**Each item:** pill or card with a checkbox and group name.

**State:**
- `assigned_attendance_groups` as an array of IDs or slugs.

---

### Section G: Attendance Settings

**Two small subsections inside one card.**

#### 1. Attendance Requirement (radio, single choice)
- Required
- Coaches only
- Players only

**State:** `attendance_requirement` string

#### 2. Attendance Method (checkbox, multi choice)
- QR check in
- Location check in
- Manual (coaches only)

**State:** `check_in_methods` string array

**Defaults:**
- `attendance_requirement = 'required'`
- `check_in_methods = ['qr_code', 'location', 'manual']` or whatever you decide

---

## 3. Backend Data Model Changes (Minimal)

On `events` table:

```sql
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS attendance_requirement VARCHAR(20) DEFAULT 'required'
    CHECK (attendance_requirement IN ('required', 'coaches_only', 'players_only'));

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS check_in_methods TEXT[] DEFAULT ARRAY['qr_code', 'location', 'manual'];
```

**Everything else** (visibility, assigned_attendance_groups, location, start_time, end_time) you already have.

---

## 4. Engineering Tasks as Tickets

### Phase 1 – Layout and State

- [ ] Refactor EventCreationModal header to `Cancel | Create Event | Save`
- [ ] Implement Who sees this segmented control and wire to `visibility`
- [ ] Implement Event type tabs and wire to `event_type`
- [ ] Restructure core form: title, description, location, date, start time, end time, use current location
- [ ] Wire all form fields to local state and existing create event API

### Phase 2 – Groups and Visibility

- [ ] Add Assigned groups section with grid layout
- [ ] Show section only when "Specific group(s)" is selected
- [ ] Sync selected groups with `assigned_attendance_groups`
- [ ] Ensure create and edit flows load and show selected groups correctly

### Phase 3 – Attendance

- [ ] Add attendance requirement radio group in UI
- [ ] Add attendance method checkbox group in UI
- [ ] Add new fields to events table and event API
- [ ] Make sure create and edit send these fields and they appear on Event details

### Phase 4 – Polish

- [ ] Validation: title, date, time required. If "Specific group(s)" then at least one group. If location check in picked and you want to enforce location, validate.
- [ ] Better errors and disabled Save while invalid
- [ ] Scroll behavior for smaller devices
- [ ] Small animations (pressed states, segmented transitions)

---

## 5. How to Tell if This Revamp is Done

✅ A coach can create a team wide event, a position group event, or a personal event without opening extra modals.

✅ Attendance requirement and method are visible and editable on the modal.

✅ The event created matches exactly what you see in the new dark mockup: sections and order, no hidden controls.

✅ Editing an existing event pre-populates everything correctly.

---

## 6. Component Structure Recommendations

To avoid bloating the main modal file, consider breaking into:

- `EventCreationHeader.jsx` - Header with Cancel/Save
- `WhoSeesThisSection.jsx` - Audience selection segmented buttons
- `EventTypeTabs.jsx` - Horizontal scrollable tabs
- `CoreDetailsSection.jsx` - Title, description, location, date/time
- `AttachmentsSection.jsx` - Files and coach notes
- `AssignedGroupsGrid.jsx` - Group selection grid
- `AttendanceSettingsSection.jsx` - Requirements and methods
- `RepeatEventRow.jsx` - Repeat event picker

Main `EventCreationModal.jsx` orchestrates these components and manages state.

---

## 7. Design Notes

- **Theme:** Dark theme consistent with rest of app
- **Colors:** Use `teamColors.primary` for selected states
- **Spacing:** Consistent padding and margins throughout
- **Typography:** Follow existing typography constants
- **Icons:** Use Ionicons consistently
- **Animations:** Subtle transitions for state changes

---

## 8. Testing Checklist

- [ ] Create team event
- [ ] Create personal event
- [ ] Create group-specific event
- [ ] Edit existing event (all fields pre-populate)
- [ ] Validation errors show correctly
- [ ] Save button disabled when invalid
- [ ] All attendance settings save and load correctly
- [ ] Groups grid shows/hides correctly
- [ ] Location picker works
- [ ] Date/time pickers work
- [ ] Works on different screen sizes
- [ ] Scroll behavior on smaller devices


