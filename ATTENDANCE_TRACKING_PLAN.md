# Attendance Tracking System - Production-Ready Implementation Plan

## 🎯 Overview

Implement a **production-grade, anti-cheat attendance tracking system** for events that supports:
- **QR Code Check-in**: Scan signed QR codes to check in to events (anti-forgery)
- **Location-Based Check-in**: GPS verification with dual verification (anti-cheat)
- **Clock In/Out**: Track arrival and departure times
- **Attendance Management**: View and manage attendance records
- **Anti-Cheat Measures**: Device binding, signed tokens, GPS verification, flagged check-ins
- **Coach Controls**: Bulk editing, position filters, lock check-ins, dynamic radius
- **Analytics**: Attendance trends, player stats, compliance reporting
- **Offline Support**: Queue check-ins when offline, sync when online
- **Push Notifications**: Proximity alerts, reminders, attendance updates
- **Compliance**: Audit trails for NCAA/organization requirements

---

## 📋 Core Requirements

### 1. **Check-in Methods**

#### A. QR Code Check-in
- **For Players**: Scan QR code displayed at event location
- **For Coaches**: Generate QR code for events
- QR code contains: `event_id`, `team_id`, `timestamp`
- Valid for event duration only
- One-time use per user per event

#### B. Location-Based Check-in
- Use device GPS to verify user is at event location
- Check if user is within radius (e.g., 100 meters) of event location
- Automatic check-in when location matches
- Fallback to manual if GPS unavailable

#### C. Manual Check-in (Admin/Coach)
- Coaches can manually mark players as present/absent
- Useful for edge cases or technical issues

---

## 🗄️ Database Schema

### New Table: `event_attendance`

```sql
CREATE TABLE event_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- References auth.users
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    
    -- Check-in details
    check_in_method VARCHAR(20) NOT NULL CHECK (check_in_method IN ('qr_code', 'location', 'manual')),
    checked_in_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    checked_out_at TIMESTAMP WITH TIME ZONE,
    
    -- Location data (for location-based check-in)
    check_in_latitude DECIMAL(10, 8),
    check_in_longitude DECIMAL(11, 8),
    distance_from_event DECIMAL(10, 2), -- meters
    
    -- Anti-cheat: Device binding
    device_fingerprint VARCHAR(255), -- Hash of device model + OS + UUID
    is_flagged BOOLEAN DEFAULT FALSE, -- Flagged for suspicious activity
    flag_reason TEXT, -- Why it was flagged (e.g., "GPS mismatch with QR")
    
    -- Status with granular late categories
    status VARCHAR(20) DEFAULT 'present' CHECK (status IN ('present', 'late_10', 'late_30', 'very_late', 'absent', 'excused', 'flagged')),
    is_late BOOLEAN DEFAULT FALSE,
    late_minutes INTEGER, -- Minutes late if applicable
    late_category VARCHAR(20), -- 'on_time', 'late_10', 'late_30', 'very_late'
    
    -- Notes
    notes TEXT, -- Optional notes from coach or player
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(event_id, user_id) -- One attendance record per user per event
);

-- Indexes for performance
CREATE INDEX idx_event_attendance_event_id ON event_attendance(event_id);
CREATE INDEX idx_event_attendance_user_id ON event_attendance(user_id);
CREATE INDEX idx_event_attendance_team_id ON event_attendance(team_id);
CREATE INDEX idx_event_attendance_status ON event_attendance(status);
```

### New Table: `attendance_audit_log`

For compliance and audit trails (NCAA requirements):
```sql
CREATE TABLE attendance_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attendance_id UUID NOT NULL REFERENCES event_attendance(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- User whose attendance changed
    changed_by UUID NOT NULL, -- Who made the change (coach/admin)
    
    -- Change details
    action VARCHAR(20) NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'status_changed')),
    field_name VARCHAR(50), -- Which field changed (status, checked_in_at, etc.)
    old_value TEXT,
    new_value TEXT,
    
    -- Metadata
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET, -- Optional: for compliance
    user_agent TEXT -- Optional: for compliance
);

CREATE INDEX idx_attendance_audit_event_id ON attendance_audit_log(event_id);
CREATE INDEX idx_attendance_audit_user_id ON attendance_audit_log(user_id);
CREATE INDEX idx_attendance_audit_timestamp ON attendance_audit_log(timestamp);
```

### New Table: `attendance_settings`

Per-team or per-event attendance configuration:
```sql
CREATE TABLE attendance_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE, -- NULL = team default
    
    -- Late thresholds (in minutes)
    on_time_threshold INTEGER DEFAULT 0,
    late_threshold INTEGER DEFAULT 10,
    very_late_threshold INTEGER DEFAULT 30,
    
    -- Check-in window
    check_in_window_start INTEGER DEFAULT -30, -- Minutes before event start
    check_in_window_end INTEGER DEFAULT 60, -- Minutes after event start
    
    -- Location settings
    default_radius INTEGER DEFAULT 100, -- meters
    require_location BOOLEAN DEFAULT TRUE,
    require_qr_code BOOLEAN DEFAULT FALSE,
    
    -- Coach controls
    lock_check_in_after_start BOOLEAN DEFAULT FALSE,
    auto_checkout_after_event BOOLEAN DEFAULT TRUE,
    auto_mark_absent BOOLEAN DEFAULT TRUE,
    
    -- Compliance
    enable_audit_log BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(team_id, event_id) -- One setting per team/event combo
);
```

### New Table: `team_position_groups`

Links players to position groups for filtering:
```sql
CREATE TABLE team_position_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- References auth.users (player)
    
    -- Position details
    position VARCHAR(50), -- e.g., 'QB', 'RB', 'WR', 'DL', 'LB', 'DB', 'K', 'P'
    position_group VARCHAR(50) NOT NULL, -- e.g., 'QB', 'OL', 'DL', 'DB', 'Offense', 'Defense', 'Special Teams'
    position_category VARCHAR(20) NOT NULL CHECK (position_category IN ('Offense', 'Defense', 'Special Teams')),
    
    -- Coach assignment (optional - for position coaches)
    assigned_coach_id UUID, -- References auth.users (position coach)
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(team_id, user_id, position_group) -- One position group per player per team
);

CREATE INDEX idx_team_position_groups_team_id ON team_position_groups(team_id);
CREATE INDEX idx_team_position_groups_user_id ON team_position_groups(user_id);
CREATE INDEX idx_team_position_groups_position_group ON team_position_groups(position_group);
CREATE INDEX idx_team_position_groups_coach ON team_position_groups(assigned_coach_id);
```

### New Table: `team_member_roles`

Defines coach roles and permissions:
```sql
CREATE TABLE team_member_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- References auth.users
    
    -- Role type
    role VARCHAR(50) NOT NULL CHECK (role IN (
        'head_coach',
        'assistant_coach',
        'position_coach',
        'team_admin',
        'student_manager',
        'athletic_trainer',
        'player'
    )),
    
    -- Position group assignment (for position coaches)
    position_group VARCHAR(50), -- NULL for head/assistant coaches
    
    -- Permissions (stored as JSONB for flexibility)
    permissions JSONB DEFAULT '{
        "can_view_attendance": false,
        "can_edit_attendance": false,
        "can_lock_checkins": false,
        "can_view_analytics": false,
        "can_view_flagged": false,
        "can_bulk_edit": false,
        "can_export_reports": false,
        "can_manage_settings": false
    }'::jsonb,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(team_id, user_id) -- One role per user per team
);

CREATE INDEX idx_team_member_roles_team_id ON team_member_roles(team_id);
CREATE INDEX idx_team_member_roles_user_id ON team_member_roles(user_id);
CREATE INDEX idx_team_member_roles_role ON team_member_roles(role);
```

### New Table: `attendance_notification_preferences`

User preferences for push notifications:
```sql
CREATE TABLE attendance_notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- References auth.users
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    
    -- Notification types (all default to true, user can opt-out)
    notify_proximity BOOLEAN DEFAULT TRUE, -- "You're near the event"
    notify_event_starting BOOLEAN DEFAULT TRUE, -- "Event starts in 10 minutes"
    notify_late_warning BOOLEAN DEFAULT TRUE, -- "You haven't checked in"
    notify_attendance_marked BOOLEAN DEFAULT TRUE, -- "Coach marked you absent"
    notify_attendance_submitted BOOLEAN DEFAULT TRUE, -- "Your attendance recorded"
    notify_flagged_review BOOLEAN DEFAULT TRUE, -- "Flagged check-in needs review" (coaches)
    
    -- Frequency settings
    proximity_radius INTEGER DEFAULT 200, -- meters (when to trigger proximity)
    reminder_minutes_before INTEGER DEFAULT 10, -- minutes before event
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, team_id)
);
```

### Update Existing: `events` table

Add location coordinates and attendance settings:
```sql
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS check_in_radius INTEGER, -- NULL = use team default
ADD COLUMN IF NOT EXISTS check_in_locked BOOLEAN DEFAULT FALSE, -- Coach can lock check-ins
ADD COLUMN IF NOT EXISTS check_in_locked_at TIMESTAMP WITH TIME ZONE; -- When check-in was locked
```

---

## 🎨 UI/UX Design

### 1. **Event Details Modal - Check-in Section**

```
┌─────────────────────────────────────┐
│  Event Details                      │
│  ─────────────────────────────────  │
│                                     │
│  [Event Info]                       │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  📍 Check In                  │ │
│  │                               │ │
│  │  [QR Code Scanner Button]     │ │
│  │  [Location Check-in Button]   │ │
│  │                               │ │
│  │  Status: Not Checked In       │ │
│  └───────────────────────────────┘ │
│                                     │
│  [Attendance List]                  │
└─────────────────────────────────────┘
```

### 2. **Check-in Flow**

#### QR Code Flow:
1. User taps "Scan QR Code"
2. Camera opens with QR scanner overlay
3. Scan event QR code
4. Verify QR code is valid (event_id, team_id, timestamp)
5. Check if user is already checked in
6. Create attendance record
7. Show success confirmation
8. Update UI to show "Checked In" status

#### Location Flow:
1. User taps "Check In with Location"
2. Request location permissions
3. Get current GPS coordinates
4. Calculate distance from event location
5. If within radius (e.g., 100m):
   - Auto check-in
   - Show success
6. If outside radius:
   - Show error: "You must be at the event location"
   - Option to retry or use manual check-in

### 3. **Attendance List View**

For coaches/admins on event details:
```
┌─────────────────────────────────────┐
│  Attendance (12/15)                 │
│  ─────────────────────────────────  │
│                                     │
│  ✅ John Doe       3:00 PM          │
│  ✅ Jane Smith     3:02 PM (Late)   │
│  ❌ Mike Johnson   Absent           │
│  ✅ Sarah Wilson   3:01 PM          │
│                                     │
│  [View All] [Export]                │
└─────────────────────────────────────┘
```

### 4. **QR Code Generation (Coach View)**

For coaches creating/viewing events:
```
┌─────────────────────────────────────┐
│  Event QR Code                      │
│  ─────────────────────────────────  │
│                                     │
│      [QR Code Display]              │
│                                     │
│  Valid until: 5:00 PM               │
│  [Share] [Download]                 │
└─────────────────────────────────────┘
```

---

## 🔧 Technical Implementation

### 1. **QR Code Generation**

**Library**: `expo-barcode-scanner` or `react-native-qrcode-scanner`

**QR Code Payload (Signed JWT Token)**:
```json
{
  "event_id": "uuid",
  "team_id": "uuid",
  "expires_at": "2024-11-20T17:00:00Z",
  "issued_at": "2024-11-20T14:00:00Z",
  "nonce": "random-string" // Prevent replay attacks
}
```

**Generate QR Code**:
- When event is created/viewed by coach
- Sign payload with server secret key (JWT)
- Include expiration time (event end time)
- One-time use tokens (marked as used after check-in)
- Encode signed token, then generate QR image
- Cannot be forged without server key

### 2. **Location Services**

**Library**: `expo-location`

**Implementation**:
```javascript
import * as Location from 'expo-location';

// Request permissions
const { status } = await Location.requestForegroundPermissionsAsync();

// Get current location
const location = await Location.getCurrentPositionAsync({
  accuracy: Location.Accuracy.Balanced,
});

// Calculate distance
const distance = calculateDistance(
  location.coords.latitude,
  location.coords.longitude,
  event.latitude,
  event.longitude
);
```

**Distance Calculation** (Haversine formula):
```javascript
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}
```

### 3. **API Endpoints**

#### Check-in Endpoints:
```javascript
// Check in to event
POST /api/events/:eventId/checkin
Body: {
  method: 'qr_code' | 'location' | 'manual',
  qr_data?: {...}, // If QR code method
  latitude?: number, // If location method
  longitude?: number
}

// Check out of event
POST /api/events/:eventId/checkout

// Get attendance for event
GET /api/events/:eventId/attendance

// Get user's attendance history
GET /api/attendance/history?userId=xxx
```

### 4. **Components to Create**

1. **`QRCodeScanner.jsx`**
   - Camera view with QR scanner overlay
   - Handles QR code scanning
   - Validates signed QR tokens
   - Shows error states (expired, invalid, already used)
   - Offline queue support

2. **`LocationCheckIn.jsx`**
   - Location permission request
   - GPS coordinate fetching
   - Distance calculation and validation
   - Proximity alerts
   - Dual verification (QR + GPS)
   - Offline queue support

3. **`AttendanceList.jsx`**
   - Display list of attendees
   - Show check-in times and late categories
   - Filter by status (present, late_10, late_30, very_late, absent)
   - Position group filters
   - Bulk selection for coaches
   - Visual indicators (green/yellow/red dots)

4. **`QRCodeGenerator.jsx`**
   - Generate signed QR codes for events
   - Display QR code with expiration
   - Share/download options
   - Refresh QR code (new token)
   - Show usage count

5. **`CheckInButton.jsx`**
   - Main check-in button component
   - Shows current status (checked in, late, absent)
   - Handles check-in flow
   - Shows countdown to event start
   - Disabled state when check-in locked
   - Visual status indicators

6. **`AttendanceStats.jsx`**
   - Player attendance percentage
   - Late arrival count
   - Streak counter
   - Calendar heatmap
   - Trending indicators

7. **`AttendanceAnalytics.jsx`** (Coach View)
   - Team attendance dashboard
   - Charts and graphs
   - Player rankings
   - Event attendance trends
   - Export reports

8. **`FlaggedCheckIns.jsx`** (Coach View)
   - List of flagged check-ins
   - Review and approve/reject
   - See flag reasons
   - GPS mismatch details

9. **`BulkAttendanceEditor.jsx`** (Coach View)
   - Multi-select interface
   - Bulk status changes
   - Position group selection
   - Quick actions toolbar

10. **`OfflineCheckInQueue.jsx`**
    - Show pending check-ins
    - Sync status indicator
    - Manual retry option
    - Clear queue option

11. **`PlayerAttendanceHistory.jsx`**
    - Calendar view with color coding
    - Stats card (attendance %, late count, streak)
    - Filter by event type
    - Export personal report

---

## 📱 User Flows

### Player Check-in Flow:
1. Open event details
2. See "Check In" section
3. Choose method:
   - **QR Code**: Tap → Camera opens → Scan → Success
   - **Location**: Tap → Permission → GPS → Auto check-in
4. See confirmation: "Checked in at 3:00 PM"
5. Option to check out when leaving

### Coach Flow:
1. Create/view event
2. See "Generate QR Code" option
3. Display QR code for players to scan
4. View attendance list in real-time
5. Manually mark absent players if needed
6. Export attendance report

---

## 🔐 Permissions & Security

### Permissions:
- **Camera**: For QR code scanning
- **Location**: For GPS-based check-in
- **Storage**: For saving QR codes (optional)

### Security:
- QR codes expire after event end time
- Verify user is team member before check-in
- Validate event_id and team_id in QR code
- Rate limiting on check-in attempts
- Prevent duplicate check-ins

---

## 📊 Features

### Core Features:
- ✅ QR code check-in
- ✅ Location-based check-in
- ✅ Manual check-in (coaches)
- ✅ Check-out functionality
- ✅ Late arrival detection
- ✅ Attendance list view
- ✅ Attendance history

### Advanced Features (Future):
- 📊 Attendance analytics
- 📈 Attendance trends
- 📧 Automated absence notifications
- 🔔 Check-in reminders
- 📱 Push notifications for check-in
- 📄 Export attendance reports (CSV/PDF)

---

## 🎯 Implementation Phases

### Phase 1: Database & API (Week 1)
- [ ] Create `event_attendance` table
- [ ] Add location fields to `events` table
- [ ] Create check-in API endpoints
- [ ] Add RLS policies for attendance

### Phase 2: QR Code Check-in (Week 2)
- [ ] Install QR code libraries
- [ ] Create QR code generator component
- [ ] Create QR code scanner component
- [ ] Implement QR code validation
- [ ] Add check-in API integration

### Phase 3: Location Check-in (Week 2-3)
- [ ] Install location libraries
- [ ] Request location permissions
- [ ] Implement GPS check-in
- [ ] Add distance calculation
- [ ] Handle edge cases (no GPS, outside radius)

### Phase 4: UI Integration (Week 3)
- [ ] Add check-in section to EventDetailsModal
- [ ] Create attendance list component
- [ ] Add check-in status indicators
- [ ] Implement check-out functionality

### Phase 5: Coach Features (Week 4)
- [ ] QR code generation for events
- [ ] Manual attendance marking
- [ ] Attendance list view
- [ ] Export functionality

### Phase 6: Testing & Polish (Week 4-5)
- [ ] Test all check-in methods
- [ ] Test edge cases
- [ ] Performance optimization
- [ ] UI/UX refinements

---

## 🤔 Open Questions

1. **Check-in Window**: 
   - Allow check-in before event starts? (e.g., 30 min early)
   - Allow check-in after event starts? (mark as late)

2. **Check-out**:
   - Required or optional?
   - Auto check-out after event ends?

3. **Late Arrival**:
   - What defines "late"? (e.g., 15 min after start)
   - Show late indicator in attendance list?

4. **Absences**:
   - How to handle players who don't check in?
   - Auto-mark as absent after event ends?

5. **Permissions**:
   - Who can see attendance? (all team members or just coaches?)
   - Who can manually mark attendance?

6. **Location Accuracy**:
   - What radius is acceptable? (50m, 100m, 200m?)
   - Handle indoor events differently?

---

## 📝 Next Steps

1. **Review & Approve Plan**: Confirm approach and answer open questions
2. **Database Migration**: Create tables and indexes
3. **API Development**: Build check-in endpoints
4. **Component Development**: Start with QR code scanner
5. **Integration**: Add to EventDetailsModal
6. **Testing**: Test with real events and locations

---

## 🎨 Design Considerations

- **Visual Feedback**: Clear success/error states
- **Accessibility**: Support for users with disabilities
- **Offline Support**: Cache QR codes, sync when online
- **Performance**: Fast QR scanning, smooth location updates
- **Privacy**: Location data only used for check-in, not stored long-term

---

## 📱 Additional Components to Create

### 1. **`QRCodeScanner.jsx`**
   - Camera view with QR scanner overlay
   - Handles QR code scanning
   - Validates signed QR tokens
   - Shows error states (expired, invalid, already used)

### 2. **`LocationCheckIn.jsx`**
   - Location permission request
   - GPS coordinate fetching
   - Distance calculation and validation
   - Proximity alerts
   - Offline queue support

### 3. **`AttendanceList.jsx`**
   - Display list of attendees
   - Show check-in times and late categories
   - Filter by status (present, late, absent)
   - Position group filters
   - Bulk selection for coaches

### 4. **`QRCodeGenerator.jsx`**
   - Generate signed QR codes for events
   - Display QR code with expiration
   - Share/download options
   - Refresh QR code (new token)

### 5. **`CheckInButton.jsx`**
   - Main check-in button component
   - Shows current status (checked in, late, absent)
   - Handles check-in flow
   - Shows countdown to event start
   - Disabled state when check-in locked

### 6. **`AttendanceStats.jsx`**
   - Player attendance percentage
   - Late arrival count
   - Streak counter
   - Calendar heatmap
   - Trending indicators

### 7. **`AttendanceAnalytics.jsx`** (Coach View)
   - Team attendance dashboard
   - Charts and graphs
   - Player rankings
   - Event attendance trends
   - Export reports

### 8. **`FlaggedCheckIns.jsx`** (Coach View)
   - List of flagged check-ins
   - Review and approve/reject
   - See flag reasons
   - GPS mismatch details

### 9. **`BulkAttendanceEditor.jsx`** (Coach View)
   - Multi-select interface
   - Bulk status changes
   - Position group selection
   - Quick actions toolbar

### 10. **`OfflineCheckInQueue.jsx`**
   - Show pending check-ins
   - Sync status indicator
   - Manual retry option
   - Clear queue option

---

## 🔒 Security Implementation Details

### Signed QR Token Structure:
```javascript
// JWT payload
{
  event_id: "uuid",
  team_id: "uuid",
  expires_at: "2024-11-20T17:00:00Z",
  issued_at: "2024-11-20T14:00:00Z",
  nonce: "random-string" // Prevent replay attacks
}

// Signed with server secret key
// Signature verified on check-in
```

### Device Fingerprinting:
```javascript
import * as Device from 'expo-device';
import * as Application from 'expo-application';

const getDeviceFingerprint = async () => {
  const deviceInfo = {
    model: Device.modelName,
    os: Device.osName,
    osVersion: Device.osVersion,
    deviceId: await Application.getInstallationIdAsync()
  };
  
  // Hash the device info (don't store PII)
  return hashDeviceInfo(deviceInfo);
};
```

### GPS Spoofing Detection:
```javascript
// Check for suspicious patterns
- Location accuracy too high (suspicious)
- Location changes too quickly (impossible travel)
- Location doesn't match network location (if available)
- Multiple check-ins from same location but different devices
```

---

## 📊 Analytics Schema (Future)

### Table: `attendance_analytics_cache`
```sql
CREATE TABLE attendance_analytics_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id),
    user_id UUID REFERENCES auth.users, -- NULL = team aggregate
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Metrics
    total_events INTEGER,
    events_attended INTEGER,
    attendance_percentage DECIMAL(5, 2),
    late_count INTEGER,
    absent_count INTEGER,
    excused_count INTEGER,
    current_streak INTEGER,
    longest_streak INTEGER,
    
    -- Breakdown by event type
    practice_attendance DECIMAL(5, 2),
    game_attendance DECIMAL(5, 2),
    meeting_attendance DECIMAL(5, 2),
    
    -- Timestamps
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(team_id, user_id, period_start, period_end)
);
```

---

## 🎯 Position Group Filtering & Dynamic Views

### Position Group Structure

**Football Position Groups**:
- **Offense**:
  - QB (Quarterback)
  - RB (Running Back)
  - WR (Wide Receiver)
  - OL (Offensive Line)
  - TE (Tight End)
- **Defense**:
  - DL (Defensive Line)
  - LB (Linebacker)
  - DB (Defensive Back)
- **Special Teams**:
  - K (Kicker)
  - P (Punter)
  - LS (Long Snapper)
  - ST (Special Teams)

**Other Sports** (configurable):
- **Lacrosse**: Attack, Midfield, Defense, Goalie
- **Hockey**: Forward, Defense, Goalie
- **Rugby**: Forwards, Backs

### Filter Implementation

**API Endpoint**:
```javascript
GET /api/events/:eventId/attendance?position_group=DL&position_category=Defense&status=present&coach_id=uuid
```

**Database Query**:
```sql
-- Get attendance filtered by position group
SELECT ea.*, tpg.position_group, tpg.position_category
FROM event_attendance ea
JOIN team_position_groups tpg ON ea.user_id = tpg.user_id
WHERE ea.event_id = :event_id
  AND ea.team_id = :team_id
  AND (:position_group IS NULL OR tpg.position_group = :position_group)
  AND (:position_category IS NULL OR tpg.position_category = :position_category)
  AND (:status IS NULL OR ea.status = :status)
  AND (
    -- Position coach sees only their group
    :coach_id IS NULL 
    OR tpg.assigned_coach_id = :coach_id
    -- Head/Assistant coaches see all
    OR EXISTS (
      SELECT 1 FROM team_member_roles tmr
      WHERE tmr.user_id = :coach_id
      AND tmr.role IN ('head_coach', 'assistant_coach', 'team_admin')
    )
  );
```

**Component**: `AttendancePositionFilter.jsx`
- Dropdown/multi-select for position groups
- Shows count per group
- Persists filter selection
- Updates attendance list in real-time

**Group Attendance Stats**:
- Show attendance % per position group
- Compare groups (e.g., "DL: 95%, OL: 88%")
- Highlight groups with low attendance
- Export group-specific reports

---

## 🔐 Role-Based Permissions Details

### Permission Matrix

| Permission | Head Coach | Assistant Coach | Position Coach | Team Admin | Student Manager | Athletic Trainer | Player |
|------------|------------|-----------------|----------------|------------|-----------------|------------------|--------|
| View own attendance | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View team attendance | ✅ | ✅ | ✅ (group only) | ✅ | ✅ | ✅ | ❌ |
| Edit own attendance | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| Edit team attendance | ✅ | ✅ | ✅ (group only) | ✅ | ⚠️ (with approval) | ⚠️ (excused only) | ❌ |
| Lock check-ins | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| View analytics | ✅ | ✅ | ✅ (group only) | ✅ | ❌ | ❌ | ❌ (own only) |
| View flagged check-ins | ✅ | ✅ | ✅ (group only) | ✅ | ❌ | ❌ | ❌ |
| Bulk edit | ✅ | ✅ | ✅ (group only) | ✅ | ❌ | ❌ | ❌ |
| Export reports | ✅ | ✅ | ✅ (group only) | ✅ | ✅ | ❌ | ❌ (own only) |
| Manage settings | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Assign roles | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |

### RLS Policy Implementation

```sql
-- Players can only see their own attendance
CREATE POLICY "Players view own attendance" ON event_attendance
    FOR SELECT
    USING (auth.uid() = user_id);

-- Coaches can see team attendance based on role
CREATE POLICY "Coaches view team attendance" ON event_attendance
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM team_member_roles tmr
            WHERE tmr.team_id = event_attendance.team_id
            AND tmr.user_id = auth.uid()
            AND (
                tmr.role IN ('head_coach', 'assistant_coach', 'team_admin')
                OR (
                    tmr.role = 'position_coach'
                    AND EXISTS (
                        SELECT 1 FROM team_position_groups tpg
                        WHERE tpg.user_id = event_attendance.user_id
                        AND tpg.assigned_coach_id = auth.uid()
                    )
                )
            )
        )
    );
```

---

## 📱 Push Notification Logic

### Notification Triggers & Timing

**For Players:**

1. **Proximity Alert** (Location-based)
   - **Trigger**: User enters within configured radius (default: 200m) of event location
   - **Message**: "You're near [Event Name] — check in now?"
   - **Frequency**: Once per event (not repeated if already checked in)
   - **Opt-out**: User can disable in settings
   - **Timing**: Only fires if event hasn't started yet or just started (< 15 min)

2. **Event Starting Reminder**
   - **Trigger**: X minutes before event start (default: 10 minutes)
   - **Message**: "[Event Name] starts in 10 minutes — don't forget to check in"
   - **Frequency**: Once per event
   - **Opt-out**: User can disable in settings
   - **Condition**: Only if user hasn't checked in yet

3. **Event Started Alert**
   - **Trigger**: Event start time reached
   - **Message**: "[Event Name] has started — check in now"
   - **Frequency**: Once per event
   - **Opt-out**: User can disable in settings
   - **Condition**: Only if user hasn't checked in yet

4. **Late Warning**
   - **Trigger**: X minutes after event start (default: 5 minutes) without check-in
   - **Message**: "You haven't checked in to [Event Name] — event started 5 minutes ago"
   - **Frequency**: Once per event
   - **Opt-out**: User can disable in settings

5. **Attendance Marked by Coach**
   - **Trigger**: Coach manually marks player as absent/late
   - **Message**: "Coach marked you as [status] for [Event Name] — review"
   - **Frequency**: Once per event
   - **Opt-out**: User can disable in settings

6. **Attendance Submitted**
   - **Trigger**: Successful check-in
   - **Message**: "✅ Checked in to [Event Name] at [time]"
   - **Frequency**: Once per check-in
   - **Opt-out**: User can disable in settings

**For Coaches:**

7. **Flagged Check-in Alert**
   - **Trigger**: System flags a check-in (GPS mismatch, suspicious activity)
   - **Message**: "🚩 Flagged check-in for [Player Name] at [Event Name] — review needed"
   - **Frequency**: Once per flagged check-in
   - **Recipients**: Head Coach, Assistant Coaches, Team Admin
   - **Opt-out**: Coaches can disable in settings

8. **Low Attendance Warning**
   - **Trigger**: X minutes after event start, < Y% of team checked in (configurable)
   - **Message**: "Low attendance for [Event Name]: [X]/[Y] players checked in"
   - **Frequency**: Once per event
   - **Recipients**: Head Coach, Assistant Coaches
   - **Opt-out**: Coaches can disable in settings

9. **Attendance Summary**
   - **Trigger**: After event ends (optional, configurable)
   - **Message**: "Attendance summary for [Event Name]: [X] present, [Y] late, [Z] absent"
   - **Frequency**: Once per event
   - **Recipients**: Head Coach, Assistant Coaches
   - **Opt-out**: Coaches can disable in settings

### Notification Payload Structure

```javascript
{
  type: 'proximity' | 'reminder' | 'event_started' | 'late_warning' | 
        'attendance_marked' | 'attendance_submitted' | 'flagged_checkin' | 
        'low_attendance' | 'attendance_summary',
  event_id: "uuid",
  event_name: "Practice",
  team_id: "uuid",
  user_id: "uuid", // Recipient
  data: {
    // Additional context
  },
  action_url: "lockerroom://event/{event_id}" // Deep link to event
}
```

---

## 📅 Calendar Indicators & Visual Feedback

### Event List Indicators

**For Players:**
- 🟢 **Green dot/badge**: Checked in (on time)
- 🟡 **Yellow dot/badge**: Late check-in (late_10 or late_30)
- 🟠 **Orange dot/badge**: Very late check-in (very_late)
- 🔴 **Red dot/badge**: Absent or not checked in
- ⚪ **Grey dot/badge**: Event hasn't started yet / no check-in required
- ✅ **Checkmark icon**: Checked in and checked out
- ⏰ **Clock icon**: Checked in but not checked out

**For Coaches:**
- All player indicators, plus:
- 🚩 **Flag icon**: Flagged check-in (requires review)
- 📊 **Chart icon**: Low attendance warning (< 80% checked in)
- 🔒 **Lock icon**: Check-ins locked for this event

### Calendar View Badges

**Event Card Badges** (on Schedule/Calendar screen):
```
┌─────────────────────────────────────┐
│  Practice - 3:00 PM                 │
│  🟢 12/15 checked in                │
│  🟡 2 late                          │
│  🔴 1 absent                        │
└─────────────────────────────────────┘
```

**Quick-Scan Indicators**:
- **Badge on event card**: Shows attendance summary at a glance
- **Color-coded event cards**: 
  - Green border: > 90% attendance
  - Yellow border: 70-90% attendance
  - Red border: < 70% attendance
- **Dot indicators**: Small colored dots on event cards
  - Green: You're checked in
  - Yellow: You're late
  - Red: You're absent
  - Grey: Not checked in yet

**Calendar Grid View** (if month/week view exists):
- **Small badge** on date cell showing:
  - Number of events that day
  - Your attendance status (if you have events)
  - Color-coded based on your status

**Event Details Quick View**:
- **Status badge** next to event title
- **Attendance count** in header
- **Your status** prominently displayed

### Component: `EventAttendanceBadge.jsx`

```javascript
// Props
{
  event: Event,
  userAttendance: Attendance | null,
  teamAttendance: { present: number, late: number, absent: number },
  userRole: 'player' | 'coach' | 'admin',
  showDetails: boolean
}

// Renders:
// - Colored dot/badge
// - Attendance count (for coaches)
// - Your status (for players)
// - Flagged indicator (for coaches)
```

**Styling**:
- Badges use same color scheme as event cards
- Consistent sizing across calendar views
- Smooth animations when status changes
- Accessible (high contrast, clear labels)

**Performance**:
- Cache attendance status for calendar view
- Lazy load detailed attendance data
- Update badges in real-time when check-in occurs

---

**Status**: 📋 Planning Phase - Enhanced
**Priority**: High
**Estimated Timeline**: 5-6 weeks (with all features)
**Dependencies**: Event system, team membership system, notification system
**Security Level**: Production-grade with anti-cheat measures

