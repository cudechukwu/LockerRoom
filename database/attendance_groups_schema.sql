-- Custom Attendance Groups Schema
-- Allows coaches to create flexible, arbitrary groups for event assignment
-- Examples: "D-Line", "Traveling Squad", "Film Crew", "Captains", etc.

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- ATTENDANCE GROUPS TABLES
-- =============================================

-- Custom attendance groups (flexible, arbitrary groupings)
CREATE TABLE IF NOT EXISTS attendance_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    
    -- Group details
    name VARCHAR(100) NOT NULL, -- e.g., "D-Line", "Traveling Squad", "Film Crew"
    description TEXT, -- Optional description
    color VARCHAR(7), -- Optional color for UI (hex code, e.g., "#FF4444")
    
    -- Metadata
    created_by UUID NOT NULL, -- References auth.users (coach who created it)
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    UNIQUE(team_id, name) -- One group per name per team
);

CREATE INDEX idx_attendance_groups_team_id ON attendance_groups(team_id);
CREATE INDEX idx_attendance_groups_created_by ON attendance_groups(created_by);
-- Composite index for team + name queries (more efficient)
CREATE INDEX idx_attendance_groups_team_name ON attendance_groups(team_id, name);

-- Group members (many-to-many relationship)
CREATE TABLE IF NOT EXISTS attendance_group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES attendance_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- References auth.users (player) - no FK to allow soft deletes
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE, -- Denormalized for RLS
    
    -- Metadata
    added_by UUID NOT NULL, -- References auth.users (who added this member)
    added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    UNIQUE(group_id, user_id) -- One membership per user per group
);

CREATE INDEX idx_attendance_group_members_group_id ON attendance_group_members(group_id);
CREATE INDEX idx_attendance_group_members_user_id ON attendance_group_members(user_id);
CREATE INDEX idx_attendance_group_members_team_id ON attendance_group_members(team_id);

-- =============================================
-- UPDATE EVENTS TABLE
-- =============================================

-- Add field to store assigned attendance groups (array of group IDs)
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS assigned_attendance_groups JSONB DEFAULT '[]'::jsonb;

-- Add flag for "Full Team" events (default true for backward compatibility)
ALTER TABLE events
ADD COLUMN IF NOT EXISTS is_full_team_event BOOLEAN DEFAULT TRUE;

-- Index for filtering events by groups
CREATE INDEX IF NOT EXISTS idx_events_attendance_groups 
ON events USING GIN (assigned_attendance_groups);

-- Index for full team events
CREATE INDEX IF NOT EXISTS idx_events_is_full_team_event 
ON events(is_full_team_event) WHERE is_full_team_event = TRUE;

-- =============================================
-- TRIGGERS
-- =============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_attendance_groups_updated_at 
    BEFORE UPDATE ON attendance_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE attendance_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_group_members ENABLE ROW LEVEL SECURITY;

-- Attendance Groups Policies

-- Team members can view all groups for their team
CREATE POLICY "Team members can view attendance groups" ON attendance_groups
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = attendance_groups.team_id
            AND tm.user_id = auth.uid()
        )
    );

-- Coaches can insert groups
CREATE POLICY "Coaches can insert attendance groups" ON attendance_groups
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM team_member_roles tmr
            WHERE tmr.team_id = attendance_groups.team_id
            AND tmr.user_id = auth.uid()
            AND tmr.role IN ('head_coach', 'assistant_coach', 'team_admin')
        )
    );

-- Coaches can update groups
CREATE POLICY "Coaches can update attendance groups" ON attendance_groups
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM team_member_roles tmr
            WHERE tmr.team_id = attendance_groups.team_id
            AND tmr.user_id = auth.uid()
            AND tmr.role IN ('head_coach', 'assistant_coach', 'team_admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM team_member_roles tmr
            WHERE tmr.team_id = attendance_groups.team_id
            AND tmr.user_id = auth.uid()
            AND tmr.role IN ('head_coach', 'assistant_coach', 'team_admin')
        )
    );

-- Coaches can delete groups
CREATE POLICY "Coaches can delete attendance groups" ON attendance_groups
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM team_member_roles tmr
            WHERE tmr.team_id = attendance_groups.team_id
            AND tmr.user_id = auth.uid()
            AND tmr.role IN ('head_coach', 'assistant_coach', 'team_admin')
        )
    );

-- Attendance Group Members Policies

-- Team members can view group memberships
CREATE POLICY "Team members can view group members" ON attendance_group_members
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = attendance_group_members.team_id
            AND tm.user_id = auth.uid()
        )
    );

-- Coaches can insert group members
CREATE POLICY "Coaches can insert group members" ON attendance_group_members
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM team_member_roles tmr
            WHERE tmr.team_id = attendance_group_members.team_id
            AND tmr.user_id = auth.uid()
            AND tmr.role IN ('head_coach', 'assistant_coach', 'team_admin')
        )
    );

-- Coaches can delete group members (for removing members)
CREATE POLICY "Coaches can delete group members" ON attendance_group_members
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM team_member_roles tmr
            WHERE tmr.team_id = attendance_group_members.team_id
            AND tmr.user_id = auth.uid()
            AND tmr.role IN ('head_coach', 'assistant_coach', 'team_admin')
        )
    );

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to check if user is in a specific group
CREATE OR REPLACE FUNCTION is_user_in_group(p_user_id UUID, p_group_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    SET search_path = public;
    RETURN EXISTS (
        SELECT 1 FROM attendance_group_members
        WHERE group_id = p_group_id
        AND user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all group IDs a user belongs to
CREATE OR REPLACE FUNCTION get_user_attendance_groups(p_team_id UUID, p_user_id UUID)
RETURNS UUID[] AS $$
DECLARE
    v_group_ids UUID[];
BEGIN
    SET search_path = public;
    SELECT ARRAY_AGG(DISTINCT group_id) INTO v_group_ids
    FROM attendance_group_members
    WHERE team_id = p_team_id
    AND user_id = p_user_id;
    
    RETURN COALESCE(v_group_ids, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_user_in_group(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_attendance_groups(UUID, UUID) TO authenticated;

