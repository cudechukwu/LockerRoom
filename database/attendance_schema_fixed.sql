-- Attendance Tracking System Database Schema - FIXED VERSION
-- Supabase PostgreSQL with Row-Level Security
-- 
-- FIXES APPLIED:
-- 1. Fixed player UPDATE policy (only allow check-out, not status changes)
-- 2. Fixed audit log RLS circular recursion (denormalized team_id)
-- 3. Made audit log immutable (read-only)
-- 4. Fixed trigger to use auth.uid() instead of current_setting
-- 5. Fixed updated_at to set on INSERT
-- 6. Added NOT NULL constraints where appropriate
-- 7. Added explicit unique index
-- 8. Changed DECIMAL to DOUBLE PRECISION for distance
-- 9. Added CHECK constraints for location-based check-in
-- 10. Added partial indexes for performance

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- ENUM TYPES
-- =============================================

CREATE TYPE attendance_status AS ENUM (
  'present', 'late_10', 'late_30', 'very_late', 'absent', 'excused', 'flagged'
);

CREATE TYPE check_in_method_type AS ENUM ('qr_code', 'location', 'manual');

-- =============================================
-- ATTENDANCE TABLES
-- =============================================

-- Event attendance records
CREATE TABLE IF NOT EXISTS event_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- References auth.users
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    
    -- Check-in details
    check_in_method check_in_method_type NOT NULL,
    checked_in_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    checked_out_at TIMESTAMP WITH TIME ZONE,
    
    -- Location data (for location-based check-in)
    check_in_latitude DOUBLE PRECISION,
    check_in_longitude DOUBLE PRECISION,
    distance_from_event DOUBLE PRECISION, -- meters
    
    -- Status with granular late categories
    status attendance_status NOT NULL DEFAULT 'present',
    is_late BOOLEAN NOT NULL DEFAULT FALSE,
    late_minutes INTEGER, -- Minutes late if applicable
    late_category VARCHAR(20), -- 'on_time', 'late_10', 'late_30', 'very_late'
    
    -- Anti-cheat: Device binding
    device_fingerprint VARCHAR(255), -- Hash of device model + OS + UUID
    is_flagged BOOLEAN NOT NULL DEFAULT FALSE, -- Flagged for suspicious activity
    flag_reason TEXT, -- Why it was flagged (e.g., "GPS mismatch with QR")
    
    -- Soft delete (for compliance)
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID, -- References auth.users
    
    -- Notes
    notes TEXT, -- Optional notes from coach or player
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT check_location_data CHECK (
        (check_in_method != 'location')
        OR (check_in_latitude IS NOT NULL AND check_in_longitude IS NOT NULL)
    ),
    CONSTRAINT check_device_fingerprint CHECK (
        (check_in_method = 'manual' AND device_fingerprint IS NULL)
        OR (check_in_method != 'manual' AND device_fingerprint IS NOT NULL)
    ),
    CONSTRAINT check_checkout_time CHECK (
        (checked_out_at IS NULL)
        OR (checked_out_at >= checked_in_at)
    )
);

-- Explicit unique index (good practice)
CREATE UNIQUE INDEX idx_event_attendance_unique ON event_attendance(event_id, user_id) 
    WHERE is_deleted = FALSE;

-- Indexes for performance
CREATE INDEX idx_event_attendance_event_id ON event_attendance(event_id);
CREATE INDEX idx_event_attendance_user_id ON event_attendance(user_id);
CREATE INDEX idx_event_attendance_team_id ON event_attendance(team_id);
CREATE INDEX idx_event_attendance_status ON event_attendance(status);
CREATE INDEX idx_event_attendance_flagged ON event_attendance(is_flagged) WHERE is_flagged = TRUE;
CREATE INDEX idx_event_attendance_checked_in_at ON event_attendance(checked_in_at);

-- Partial indexes for faster filtering
CREATE INDEX idx_attendance_present ON event_attendance(status) WHERE status = 'present';
CREATE INDEX idx_attendance_late ON event_attendance(is_late) WHERE is_late = TRUE;
CREATE INDEX idx_attendance_not_deleted ON event_attendance(id) WHERE is_deleted = FALSE;

-- Attendance audit log (for compliance) - IMMUTABLE
CREATE TABLE IF NOT EXISTS attendance_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attendance_id UUID NOT NULL REFERENCES event_attendance(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE, -- DENORMALIZED to avoid RLS recursion
    user_id UUID NOT NULL, -- User whose attendance changed
    changed_by UUID NOT NULL, -- Who made the change (coach/admin)
    
    -- Change details
    action VARCHAR(20) NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'status_changed')),
    field_name VARCHAR(50), -- Which field changed (status, checked_in_at, etc.)
    old_value TEXT,
    new_value TEXT,
    
    -- Metadata
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    ip_address INET, -- Optional: for compliance
    user_agent TEXT -- Optional: for compliance
);

CREATE INDEX idx_attendance_audit_event_id ON attendance_audit_log(event_id);
CREATE INDEX idx_attendance_audit_user_id ON attendance_audit_log(user_id);
CREATE INDEX idx_attendance_audit_team_id ON attendance_audit_log(team_id);
CREATE INDEX idx_attendance_audit_timestamp ON attendance_audit_log(timestamp);
CREATE INDEX idx_attendance_audit_changed_by ON attendance_audit_log(changed_by);

-- Attendance settings (per-team or per-event configuration)
CREATE TABLE IF NOT EXISTS attendance_settings (
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

CREATE INDEX idx_attendance_settings_team_id ON attendance_settings(team_id);
CREATE INDEX idx_attendance_settings_event_id ON attendance_settings(event_id);

-- Attendance analytics cache (for performance)
CREATE TABLE IF NOT EXISTS attendance_analytics_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
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

CREATE INDEX idx_attendance_analytics_team_id ON attendance_analytics_cache(team_id);
CREATE INDEX idx_attendance_analytics_user_id ON attendance_analytics_cache(user_id);
CREATE INDEX idx_attendance_analytics_period ON attendance_analytics_cache(period_start, period_end);

-- Team position groups (for filtering)
CREATE TABLE IF NOT EXISTS team_position_groups (
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

-- Team member roles (for permissions)
CREATE TABLE IF NOT EXISTS team_member_roles (
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

-- Attendance notification preferences
CREATE TABLE IF NOT EXISTS attendance_notification_preferences (
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

CREATE INDEX idx_attendance_notification_preferences_user_id ON attendance_notification_preferences(user_id);
CREATE INDEX idx_attendance_notification_preferences_team_id ON attendance_notification_preferences(team_id);

-- =============================================
-- UPDATE EXISTING TABLES
-- =============================================

-- Add location fields to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS check_in_radius INTEGER, -- NULL = use team default
ADD COLUMN IF NOT EXISTS check_in_locked BOOLEAN DEFAULT FALSE, -- Coach can lock check-ins
ADD COLUMN IF NOT EXISTS check_in_locked_at TIMESTAMP WITH TIME ZONE; -- When check-in was locked

-- =============================================
-- TRIGGERS
-- =============================================

-- Function to update updated_at timestamp (fires on both INSERT and UPDATE)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers (BEFORE INSERT and UPDATE)
CREATE TRIGGER update_event_attendance_updated_at 
    BEFORE INSERT OR UPDATE ON event_attendance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_settings_updated_at 
    BEFORE INSERT OR UPDATE ON attendance_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_position_groups_updated_at 
    BEFORE INSERT OR UPDATE ON team_position_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_member_roles_updated_at 
    BEFORE INSERT OR UPDATE ON team_member_roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_notification_preferences_updated_at 
    BEFORE INSERT OR UPDATE ON attendance_notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to prevent players from modifying fields other than checked_out_at
CREATE OR REPLACE FUNCTION prevent_player_field_modification()
RETURNS TRIGGER AS $$
DECLARE
    v_user_role VARCHAR(50);
BEGIN
    -- Get user's role for this team
    SELECT role INTO v_user_role
    FROM team_member_roles
    WHERE team_id = NEW.team_id
    AND user_id = auth.uid();
    
    -- If user is a player (or has no role), enforce strict update rules
    IF v_user_role IS NULL OR v_user_role = 'player' THEN
        -- Players can only update checked_out_at
        -- All other fields must remain unchanged
        IF (
            OLD.id != NEW.id OR
            OLD.event_id != NEW.event_id OR
            OLD.user_id != NEW.user_id OR
            OLD.team_id != NEW.team_id OR
            OLD.check_in_method != NEW.check_in_method OR
            OLD.checked_in_at != NEW.checked_in_at OR
            OLD.check_in_latitude IS DISTINCT FROM NEW.check_in_latitude OR
            OLD.check_in_longitude IS DISTINCT FROM NEW.check_in_longitude OR
            OLD.distance_from_event IS DISTINCT FROM NEW.distance_from_event OR
            OLD.status != NEW.status OR
            OLD.is_late != NEW.is_late OR
            OLD.late_minutes IS DISTINCT FROM NEW.late_minutes OR
            OLD.late_category IS DISTINCT FROM NEW.late_category OR
            OLD.device_fingerprint IS DISTINCT FROM NEW.device_fingerprint OR
            OLD.is_flagged != NEW.is_flagged OR
            OLD.flag_reason IS DISTINCT FROM NEW.flag_reason OR
            OLD.is_deleted != NEW.is_deleted OR
            OLD.deleted_at IS DISTINCT FROM NEW.deleted_at OR
            OLD.deleted_by IS DISTINCT FROM NEW.deleted_by OR
            OLD.notes IS DISTINCT FROM NEW.notes
        ) THEN
            RAISE EXCEPTION 'Players can only update checked_out_at field';
        END IF;
        
        -- Ensure checked_out_at is being set (not unset)
        IF OLD.checked_out_at IS NOT NULL AND NEW.checked_out_at IS NULL THEN
            RAISE EXCEPTION 'Cannot unset checked_out_at';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Function to log attendance changes to audit log
-- FIXED: Uses auth.uid() directly instead of current_setting
CREATE OR REPLACE FUNCTION log_attendance_change()
RETURNS TRIGGER AS $$
DECLARE
    v_changed_by UUID;
    v_team_id UUID;
BEGIN
    -- Get the user who made the change (coach or player)
    v_changed_by := auth.uid();
    
    -- Get team_id from the attendance record
    IF TG_OP = 'INSERT' THEN
        v_team_id := NEW.team_id;
    ELSIF TG_OP = 'UPDATE' THEN
        v_team_id := NEW.team_id;
    ELSIF TG_OP = 'DELETE' THEN
        v_team_id := OLD.team_id;
    END IF;
    
    IF TG_OP = 'INSERT' THEN
        INSERT INTO attendance_audit_log (
            attendance_id,
            event_id,
            team_id,
            user_id,
            changed_by,
            action,
            field_name,
            new_value
        ) VALUES (
            NEW.id,
            NEW.event_id,
            v_team_id,
            NEW.user_id,
            COALESCE(v_changed_by, NEW.user_id), -- Changed by self on creation
            'created',
            NULL,
            row_to_json(NEW)::text
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Log status changes
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            INSERT INTO attendance_audit_log (
                attendance_id,
                event_id,
                team_id,
                user_id,
                changed_by,
                action,
                field_name,
                old_value,
                new_value
            ) VALUES (
                NEW.id,
                NEW.event_id,
                v_team_id,
                NEW.user_id,
                COALESCE(v_changed_by, NEW.user_id),
                'status_changed',
                'status',
                OLD.status::text,
                NEW.status::text
            );
        END IF;
        
        -- Log checkout changes
        IF OLD.checked_out_at IS DISTINCT FROM NEW.checked_out_at THEN
            INSERT INTO attendance_audit_log (
                attendance_id,
                event_id,
                team_id,
                user_id,
                changed_by,
                action,
                field_name,
                old_value,
                new_value
            ) VALUES (
                NEW.id,
                NEW.event_id,
                v_team_id,
                NEW.user_id,
                COALESCE(v_changed_by, NEW.user_id),
                'updated',
                'checked_out_at',
                COALESCE(OLD.checked_out_at::text, 'NULL'),
                COALESCE(NEW.checked_out_at::text, 'NULL')
            );
        END IF;
        
        -- Log other significant changes
        IF OLD.checked_in_at IS DISTINCT FROM NEW.checked_in_at THEN
            INSERT INTO attendance_audit_log (
                attendance_id,
                event_id,
                team_id,
                user_id,
                changed_by,
                action,
                field_name,
                old_value,
                new_value
            ) VALUES (
                NEW.id,
                NEW.event_id,
                v_team_id,
                NEW.user_id,
                COALESCE(v_changed_by, NEW.user_id),
                'updated',
                'checked_in_at',
                OLD.checked_in_at::text,
                NEW.checked_in_at::text
            );
        END IF;
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO attendance_audit_log (
            attendance_id,
            event_id,
            team_id,
            user_id,
            changed_by,
            action,
            field_name,
            old_value
        ) VALUES (
            OLD.id,
            OLD.event_id,
            v_team_id,
            OLD.user_id,
            COALESCE(v_changed_by, OLD.user_id),
            'deleted',
            NULL,
            row_to_json(OLD)::text
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Apply triggers
-- First, prevent player field modifications (BEFORE UPDATE)
CREATE TRIGGER prevent_player_field_modification_trigger
    BEFORE UPDATE ON event_attendance
    FOR EACH ROW EXECUTE FUNCTION prevent_player_field_modification();

-- Then, log changes to audit log (AFTER)
CREATE TRIGGER attendance_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON event_attendance
    FOR EACH ROW EXECUTE FUNCTION log_attendance_change();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE event_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_analytics_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_position_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_member_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Players can view their own attendance (excluding soft-deleted)
CREATE POLICY "Players view own attendance" ON event_attendance
    FOR SELECT
    USING (auth.uid() = user_id AND is_deleted = FALSE);

-- Players can insert their own check-in
CREATE POLICY "Players insert own attendance" ON event_attendance
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- FIXED: Players can ONLY update their check-out time, nothing else
-- Note: RLS policies can't use OLD/NEW syntax - we validate via WITH CHECK
-- The USING clause checks the existing row, WITH CHECK validates the new row
CREATE POLICY "Players update own checkout" ON event_attendance
    FOR UPDATE
    USING (
        auth.uid() = user_id 
        AND is_deleted = FALSE
        AND checked_out_at IS NULL -- Can only check out once (existing row must have NULL)
    )
    WITH CHECK (
        auth.uid() = user_id
        AND is_deleted = FALSE
        AND checked_out_at IS NOT NULL -- New row must have checkout time
        AND checked_out_at >= checked_in_at -- Checkout must be after check-in
        -- Note: We can't directly compare OLD vs NEW in RLS, but the CHECK constraint
        -- and the fact that USING requires checked_out_at IS NULL ensures only that field changes
    );

-- Coaches can view team attendance based on role (excluding soft-deleted)
CREATE POLICY "Coaches view team attendance" ON event_attendance
    FOR SELECT
    USING (
        is_deleted = FALSE
        AND EXISTS (
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

-- Coaches can edit attendance based on permissions
CREATE POLICY "Coaches edit team attendance" ON event_attendance
    FOR UPDATE
    USING (
        is_deleted = FALSE
        AND EXISTS (
            SELECT 1 FROM team_member_roles tmr
            WHERE tmr.team_id = event_attendance.team_id
            AND tmr.user_id = auth.uid()
            AND (
                (tmr.role IN ('head_coach', 'assistant_coach', 'team_admin'))
                OR (
                    tmr.role = 'position_coach'
                    AND (tmr.permissions->>'can_edit_attendance')::boolean = true
                    AND EXISTS (
                        SELECT 1 FROM team_position_groups tpg
                        WHERE tpg.user_id = event_attendance.user_id
                        AND tpg.assigned_coach_id = auth.uid()
                    )
                )
            )
        )
    );

-- Coaches can insert attendance (manual check-in)
CREATE POLICY "Coaches insert team attendance" ON event_attendance
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM team_member_roles tmr
            WHERE tmr.team_id = team_id
            AND tmr.user_id = auth.uid()
            AND (
                tmr.role IN ('head_coach', 'assistant_coach', 'team_admin')
                OR (
                    tmr.role = 'position_coach'
                    AND (tmr.permissions->>'can_edit_attendance')::boolean = true
                )
            )
        )
    );

-- Explicitly forbid hard DELETE (use soft delete instead)
CREATE POLICY "No one can hard delete attendance" ON event_attendance
    FOR DELETE
    USING (false);

-- Coaches can soft-delete attendance records
-- Note: RLS policies can't use OLD/NEW syntax - we validate via WITH CHECK
CREATE POLICY "Coaches soft delete attendance" ON event_attendance
    FOR UPDATE
    USING (
        is_deleted = FALSE -- Existing row must not be deleted
        AND EXISTS (
            SELECT 1 FROM team_member_roles tmr
            WHERE tmr.team_id = event_attendance.team_id
            AND tmr.user_id = auth.uid()
            AND tmr.role IN ('head_coach', 'assistant_coach', 'team_admin')
        )
    )
    WITH CHECK (
        is_deleted = TRUE -- New row must be marked as deleted
        AND deleted_by = auth.uid() -- Must set deleted_by to current user
        AND deleted_at IS NOT NULL -- Must set deleted_at timestamp
        -- Note: We can't directly compare OLD vs NEW in RLS, but the USING clause
        -- ensures we're only updating non-deleted rows, and WITH CHECK ensures
        -- we're setting the soft-delete fields correctly
    );

-- FIXED: Audit log is IMMUTABLE - read-only only, no UPDATE or DELETE
CREATE POLICY "Users can view audit logs" ON attendance_audit_log
    FOR SELECT
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM team_member_roles tmr
            WHERE tmr.team_id = attendance_audit_log.team_id
            AND tmr.user_id = auth.uid()
            AND tmr.role IN ('head_coach', 'assistant_coach', 'team_admin')
        )
    );

-- REVOKE all write permissions on audit log (immutable)
REVOKE INSERT, UPDATE, DELETE ON attendance_audit_log FROM authenticated, anon, public;

-- Only system/triggers can write to audit log
-- This is handled by the trigger function which runs as SECURITY DEFINER

-- Attendance settings policies
CREATE POLICY "Team members can view attendance settings" ON attendance_settings
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = attendance_settings.team_id
            AND tm.user_id = auth.uid()
        )
    );

CREATE POLICY "Coaches can manage attendance settings" ON attendance_settings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM team_member_roles tmr
            WHERE tmr.team_id = attendance_settings.team_id
            AND tmr.user_id = auth.uid()
            AND (
                tmr.role IN ('head_coach', 'team_admin')
                OR (tmr.permissions->>'can_manage_settings')::boolean = true
            )
        )
    );

-- Position groups policies
CREATE POLICY "Team members can view position groups" ON team_position_groups
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = team_position_groups.team_id
            AND tm.user_id = auth.uid()
        )
    );

CREATE POLICY "Coaches can manage position groups" ON team_position_groups
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM team_member_roles tmr
            WHERE tmr.team_id = team_position_groups.team_id
            AND tmr.user_id = auth.uid()
            AND tmr.role IN ('head_coach', 'assistant_coach', 'team_admin')
        )
    );

-- Team member roles policies
CREATE POLICY "Team members can view roles" ON team_member_roles
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = team_member_roles.team_id
            AND tm.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage roles" ON team_member_roles
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM team_member_roles tmr
            WHERE tmr.team_id = team_member_roles.team_id
            AND tmr.user_id = auth.uid()
            AND tmr.role IN ('head_coach', 'team_admin')
        )
    );

-- Notification preferences policies
CREATE POLICY "Users can manage own notification preferences" ON attendance_notification_preferences
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Analytics cache policies
CREATE POLICY "Team members can view analytics" ON attendance_analytics_cache
    FOR SELECT
    USING (
        auth.uid() = user_id
        OR (
            user_id IS NULL
            AND EXISTS (
                SELECT 1 FROM team_members tm
                WHERE tm.team_id = attendance_analytics_cache.team_id
                AND tm.user_id = auth.uid()
            )
        )
    );

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to get user's role for a team
CREATE OR REPLACE FUNCTION get_user_team_role(p_team_id UUID, p_user_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
    v_role VARCHAR(50);
BEGIN
    SELECT role INTO v_role
    FROM team_member_roles
    WHERE team_id = p_team_id
    AND user_id = p_user_id;
    
    RETURN COALESCE(v_role, 'player');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION has_attendance_permission(
    p_team_id UUID,
    p_user_id UUID,
    p_permission VARCHAR(50)
)
RETURNS BOOLEAN AS $$
DECLARE
    v_permissions JSONB;
    v_role VARCHAR(50);
BEGIN
    SELECT role, permissions INTO v_role, v_permissions
    FROM team_member_roles
    WHERE team_id = p_team_id
    AND user_id = p_user_id;
    
    -- Head coach and team admin have all permissions
    IF v_role IN ('head_coach', 'team_admin') THEN
        RETURN TRUE;
    END IF;
    
    -- Check specific permission
    IF v_permissions IS NOT NULL THEN
        RETURN COALESCE((v_permissions->>p_permission)::boolean, FALSE);
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

