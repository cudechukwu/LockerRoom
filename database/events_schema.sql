-- Events System Database Schema
-- Calendar and Event Management for Teams

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- EVENTS TABLES
-- =============================================

-- Events table for team calendar
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('practice', 'game', 'meeting', 'review', 'training', 'conditioning', 'personal', 'other')),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    location VARCHAR(255),
    is_recurring BOOLEAN DEFAULT FALSE,
    recurring_pattern VARCHAR(20) CHECK (recurring_pattern IN ('daily', 'weekly', 'biweekly', 'monthly')),
    recurring_until TIMESTAMP WITH TIME ZONE,
    color VARCHAR(7) DEFAULT '#FF4444', -- Hex color code
    is_all_day BOOLEAN DEFAULT FALSE,
    visibility VARCHAR(20) DEFAULT 'team' CHECK (visibility IN ('personal', 'team', 'coaches_only', 'players_only')),
    created_by UUID NOT NULL, -- References auth.users
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event attendees (RSVP system)
CREATE TABLE IF NOT EXISTS event_attendees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- References auth.users
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('attending', 'not_attending', 'maybe', 'pending')),
    responded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT, -- Optional notes from attendee
    UNIQUE(event_id, user_id)
);

-- Event reminders
CREATE TABLE IF NOT EXISTS event_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    reminder_time TIMESTAMP WITH TIME ZONE NOT NULL,
    reminder_type VARCHAR(20) DEFAULT 'notification' CHECK (reminder_type IN ('notification', 'email', 'sms')),
    sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_events_team_id ON events(team_id);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);
CREATE INDEX IF NOT EXISTS idx_events_team_start_time ON events(team_id, start_time);

CREATE INDEX IF NOT EXISTS idx_event_attendees_event_id ON event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_user_id ON event_attendees(user_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_status ON event_attendees(status);

CREATE INDEX IF NOT EXISTS idx_event_reminders_event_id ON event_reminders(event_id);
CREATE INDEX IF NOT EXISTS idx_event_reminders_reminder_time ON event_reminders(reminder_time);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on events tables
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_reminders ENABLE ROW LEVEL SECURITY;

-- Events policies
CREATE POLICY "Team members can view team events" ON events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM team_members 
            WHERE team_members.team_id = events.team_id 
            AND team_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Team members can create events" ON events
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM team_members 
            WHERE team_members.team_id = events.team_id 
            AND team_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Event creators and team admins can update events" ON events
    FOR UPDATE USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM team_members 
            WHERE team_members.team_id = events.team_id 
            AND team_members.user_id = auth.uid()
            AND team_members.is_admin = true
        )
    );

CREATE POLICY "Event creators and team admins can delete events" ON events
    FOR DELETE USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM team_members 
            WHERE team_members.team_id = events.team_id 
            AND team_members.user_id = auth.uid()
            AND team_members.is_admin = true
        )
    );

-- Event attendees policies
CREATE POLICY "Team members can view event attendees" ON event_attendees
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM events e
            JOIN team_members tm ON tm.team_id = e.team_id
            WHERE e.id = event_attendees.event_id
            AND tm.user_id = auth.uid()
        )
    );

CREATE POLICY "Team members can manage their own attendance" ON event_attendees
    FOR ALL USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM events e
            JOIN team_members tm ON tm.team_id = e.team_id
            WHERE e.id = event_attendees.event_id
            AND tm.user_id = auth.uid()
            AND tm.is_admin = true
        )
    );

-- Event reminders policies
CREATE POLICY "Team members can view event reminders" ON event_reminders
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM events e
            JOIN team_members tm ON tm.team_id = e.team_id
            WHERE e.id = event_reminders.event_id
            AND tm.user_id = auth.uid()
        )
    );

CREATE POLICY "Event creators can manage reminders" ON event_reminders
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = event_reminders.event_id
            AND e.created_by = auth.uid()
        )
    );

-- =============================================
-- TRIGGERS
-- =============================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_events_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for events table
DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at 
    BEFORE UPDATE ON events 
    FOR EACH ROW 
    EXECUTE FUNCTION update_events_updated_at_column();

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to get upcoming events for a team
CREATE OR REPLACE FUNCTION get_upcoming_events(
    p_team_id UUID,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    title VARCHAR(255),
    description TEXT,
    event_type VARCHAR(50),
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    location VARCHAR(255),
    color VARCHAR(7),
    is_all_day BOOLEAN,
    visibility VARCHAR(20),
    created_by UUID,
    attending_count BIGINT,
    total_invited BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.title,
        e.description,
        e.event_type,
        e.start_time,
        e.end_time,
        e.location,
        e.color,
        e.is_all_day,
        e.visibility,
        e.created_by,
        COALESCE(attending.attending_count, 0) as attending_count,
        COALESCE(total.total_invited, 0) as total_invited
    FROM events e
    LEFT JOIN (
        SELECT event_id, COUNT(*) as attending_count
        FROM event_attendees
        WHERE status = 'attending'
        GROUP BY event_id
    ) attending ON attending.event_id = e.id
    LEFT JOIN (
        SELECT event_id, COUNT(*) as total_invited
        FROM event_attendees
        GROUP BY event_id
    ) total ON total.event_id = e.id
    WHERE e.team_id = p_team_id
    AND e.start_time >= NOW()
    ORDER BY e.start_time ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get events for a date range
CREATE OR REPLACE FUNCTION get_events_in_range(
    p_team_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
    id UUID,
    title VARCHAR(255),
    description TEXT,
    event_type VARCHAR(50),
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    location VARCHAR(255),
    color VARCHAR(7),
    is_all_day BOOLEAN,
    visibility VARCHAR(20),
    created_by UUID,
    attending_count BIGINT,
    total_invited BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.title,
        e.description,
        e.event_type,
        e.start_time,
        e.end_time,
        e.location,
        e.color,
        e.is_all_day,
        e.visibility,
        e.created_by,
        COALESCE(attending.attending_count, 0) as attending_count,
        COALESCE(total.total_invited, 0) as total_invited
    FROM events e
    LEFT JOIN (
        SELECT event_id, COUNT(*) as attending_count
        FROM event_attendees
        WHERE status = 'attending'
        GROUP BY event_id
    ) attending ON attending.event_id = e.id
    LEFT JOIN (
        SELECT event_id, COUNT(*) as total_invited
        FROM event_attendees
        GROUP BY event_id
    ) total ON total.event_id = e.id
    WHERE e.team_id = p_team_id
    AND e.start_time >= p_start_date
    AND e.start_time <= p_end_date
    ORDER BY e.start_time ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

