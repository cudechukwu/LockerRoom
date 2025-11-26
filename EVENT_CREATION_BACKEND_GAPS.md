# Event Creation Backend Integration Status

## ✅ **What's Working (Fully Integrated)**

### Core Event Fields
- ✅ **title** - Sent to backend, stored in `events.title`
- ✅ **description** (notes) - Sent to backend, stored in `events.description`
- ✅ **event_type** - Sent to backend, stored in `events.event_type`
- ✅ **start_time / end_time** - Parsed and sent to backend, stored in `events.start_time` and `events.end_time`
- ✅ **location** - Sent to backend, stored in `events.location`
- ✅ **recurring** - Sent to backend as `is_recurring` and `recurring_pattern`
- ✅ **visibility** - Sent to backend, stored in `events.visibility` (team/personal/coaches_only/players_only)
- ✅ **color** - Sent to backend, stored in `events.color`

### Attendance & Groups
- ✅ **assignedAttendanceGroups** - Sent to backend, stored in `events.assigned_attendance_groups` (JSONB array)
- ✅ **attendanceRequirement** - Sent to backend, stored in `events.attendance_requirement`
- ✅ **checkInMethods** - Sent to backend, stored in `events.check_in_methods` (TEXT[] array)

---

## ❌ **What's Missing (Not Functional)**

### 1. **Attachments** ⚠️
**Status:** UI exists, but not connected to backend

**Current State:**
- ✅ State variable exists: `attachments`
- ✅ UI button exists: "Add files / attach PDFs"
- ❌ **No database table** - No `event_attachments` table exists
- ❌ **Not sent to backend** - `formatEventData()` doesn't include it
- ❌ **Button doesn't work** - Just logs to console
- ❌ **No storage bucket** - No Supabase storage bucket for event attachments

**What's Needed:**
1. Create `event_attachments` table (similar to `message_attachments`)
2. Create Supabase storage bucket for event attachments
3. Implement file picker/upload logic
4. Update `formatEventData()` or create separate attachment upload function
5. Wire up the UI button to actually open file picker
6. Display attachments on event details screen

---

## 📋 **Implementation Checklist**

### Phase 1: Attachments
- [ ] Create SQL migration: `database/create_event_attachments_table.sql`
  ```sql
  CREATE TABLE IF NOT EXISTS event_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size BIGINT NOT NULL,
    s3_key VARCHAR(500) NOT NULL,
    s3_url TEXT,
    thumbnail_url TEXT,
    uploaded_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  
  CREATE INDEX idx_event_attachments_event_id ON event_attachments(event_id);
  CREATE INDEX idx_event_attachments_team_id ON event_attachments(team_id);
  ```
- [ ] Create storage bucket with secure policies: `database/setup_event_attachments_bucket.sql`
  - **CRITICAL:** Use team-scoped paths: `/event_attachments/{team_id}/{event_id}/{filename}`
  - **CRITICAL:** Deny global read - files must be signed URL only
  - Add RLS policies that check team membership
- [ ] Add RLS policies for event_attachments table
- [ ] Create API functions: `uploadEventAttachment()`, `getEventAttachments()`, `deleteEventAttachment()`
- [ ] Implement file picker using `expo-document-picker` or similar
- [ ] Wire up upload logic in EventCreationModal
- [ ] Display attachments in EventDetailsModal
- [ ] **Edge Case:** Handle orphaned files cleanup (background job or transactional pattern)
- [ ] **Edge Case:** Handle upload failures mid-event creation (rollback strategy)

---

## ⚠️ **Critical Security & Edge Cases**

### 3. Storage Bucket Policies (CRITICAL)
**Problem:** Attachments must be secure and team-scoped

**Solution:**
- ✅ Use team-scoped paths: `/event_attachments/{team_id}/{event_id}/{filename}`
- ✅ Deny global read - files must be signed URL only
- ✅ Storage policies must check team membership via RLS
- ✅ Files should NOT be publicly accessible

**Implementation:**
```sql
-- Storage bucket path pattern
/event_attachments/{team_id}/{event_id}/{filename}

-- Policy: Only team members can access files
-- Policy: Only event creators/coaches can upload
-- Policy: Signed URLs expire after reasonable time
```

---

### 4. Edge Case Handling

#### Attachments Edge Cases:
- ⚠️ **Upload fails mid-event creation** → Need rollback strategy
  - Option A: Upload files AFTER event creation succeeds
  - Option B: Transactional pattern with cleanup on failure
- ⚠️ **Event creation fails** → Orphaned files remain in storage
  - Solution: Background cron job to clean up orphaned files
  - Or: Upload files only after event creation succeeds
- ⚠️ **Deleting event** → CASCADE deletes attachments (✅ already handled)
- ⚠️ **File upload fails** → Event should still be created (graceful degradation)

---

### 5. Event Creation Transaction Pattern

**Current Problem:** Event creation + attachment upload is NOT atomic

**Cracked Solution:**
1. **Create event first** (get event_id)
2. **Upload attachments one by one** with event_id
3. **Handle failures gracefully:**
   - If event creation fails → no attachments uploaded
   - If attachment upload fails → event still created, show warning
   - If all attachments fail → event created, user can retry uploads

**Alternative (More Complex):**
- Use Postgres transaction with function
- Upload files to temp location first
- Move to final location after event creation
- Cleanup temp files on failure

**Recommended Pattern:**
```javascript
// 1. Create event
const event = await createEvent(eventData);

// 2. Upload attachments (non-blocking)
if (attachments.length > 0) {
  await Promise.allSettled(
    attachments.map(file => uploadEventAttachment(event.id, file))
  );
}
```

---

### 6. Missing API-Level Validation

**Backend should enforce (currently missing):**

- ⚠️ **Time validation:** `start_time < end_time`
- ⚠️ **Group validation:** 
  - Assigned groups must exist
  - Assigned groups must belong to the same team
- ⚠️ **Visibility + Groups consistency:**
  - If `visibility = 'team'` → `assigned_attendance_groups` should be empty
  - If `visibility = 'personal'` → `assigned_attendance_groups` should be empty
  - If `assigned_attendance_groups` is not empty → `visibility` should be 'team'
- ⚠️ **Check-in methods validation:**
  - QR or location check-in allowed ONLY if event supports attendance
  - Some event types might not need attendance tracking
- ⚠️ **Required fields:** title, start_time, end_time, event_type
- ⚠️ **Date validation:** start_time and end_time must be valid dates

**Implementation:**
- Add validation function in `formatEventData()` or `createEvent()`
- Or use Postgres CHECK constraints
- Or use Supabase Edge Functions for validation

---

### 7. Missing Caching Strategy

**React Query Caching Considerations:**

- ⚠️ **Event attachments caching:**
  - Should attachments be cached using react-query?
  - Signed URLs expire - need refresh strategy
  - Cache key: `['event-attachments', eventId]`
  
- ⚠️ **Event details prefetching:**
  - Should we prefetch event details when hovering/clicking?
  - Prefetch attachments when opening event details?
  
- ⚠️ **Cache invalidation:**
  - **CRITICAL:** Editing an event should invalidate calendar month cache
  - Invalidate by date range: `['events', teamId, startDate, endDate]`
  - Creating event → invalidate calendar queries for that date range
  - Deleting event → invalidate calendar queries for that date range
  - Updating event → invalidate both old and new date ranges

**Recommended Cache Keys:**
```javascript
// Calendar queries
['events', teamId, 'month', year, month]
['events', teamId, 'range', startDate, endDate]

// Event details
['event', eventId]
['event-attachments', eventId]

// Invalidation on create/update/delete
queryClient.invalidateQueries(['events', teamId])
```

---

## 🔍 **Quick Verification**

To verify what's currently being sent, check the console logs when creating an event. The `eventData` object should include all working fields but will be missing `coachNotes` and `attachments`.

