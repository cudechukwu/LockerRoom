-- Chat System Database Schema
-- Supabase PostgreSQL with Row-Level Security

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =============================================
-- CORE TABLES
-- =============================================

-- Teams table
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    sport VARCHAR(100),
    season VARCHAR(50), -- e.g., "2024-2025"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team members with roles
CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- References auth.users
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'coach', 'trainer', 'captain', 'player', 'alumni')),
    position VARCHAR(100), -- e.g., "QB", "WR", "Defense"
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

-- Channels (team chat, coach chat, position groups, DMs, etc.)
CREATE TABLE channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('team', 'coach', 'trainer', 'position', 'dm', 'group_dm', 'casual')),
    is_private BOOLEAN DEFAULT FALSE,
    is_announcements BOOLEAN DEFAULT FALSE, -- Special channel for priority alerts
    created_by UUID NOT NULL, -- References auth.users
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Channel members (who can access which channels)
CREATE TABLE channel_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- References auth.users
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
    added_by UUID, -- References auth.users
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(channel_id, user_id)
);

-- Messages with ULID-like ordering
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL, -- References auth.users
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'announcement', 'priority_alert')),
    is_edited BOOLEAN DEFAULT FALSE,
    is_pinned BOOLEAN DEFAULT FALSE,
    thread_root_id UUID REFERENCES messages(id), -- For threaded replies
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Message attachments (files, images, etc.)
CREATE TABLE message_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size BIGINT NOT NULL,
    s3_key VARCHAR(500) NOT NULL,
    s3_url TEXT, -- Signed URL (temporary)
    thumbnail_url TEXT, -- For images/videos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- FEATURE TABLES
-- =============================================

-- Message edit history
CREATE TABLE message_edits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    old_content TEXT NOT NULL,
    edited_by UUID NOT NULL, -- References auth.users
    edited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Soft delete tracking (tombstones)
CREATE TABLE message_tombstones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    deleted_by UUID NOT NULL, -- References auth.users
    delete_reason VARCHAR(50) NOT NULL CHECK (delete_reason IN ('sender', 'moderator', 'admin')),
    tombstone_text TEXT NOT NULL, -- What to show instead of message
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Read receipts for DMs and "Seen by N" for announcements
CREATE TABLE message_reads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- References auth.users
    read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(message_id, user_id)
);

-- Message reactions (emojis)
CREATE TABLE reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- References auth.users
    emoji VARCHAR(10) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(message_id, user_id, emoji)
);

-- Channel mutes
CREATE TABLE mutes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- References auth.users
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    until_ts TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, channel_id)
);

-- Priority alerts (emergency notifications)
CREATE TABLE priority_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL, -- References auth.users
    scope VARCHAR(50) NOT NULL, -- 'team', 'position', 'custom'
    target_users UUID[], -- Array of user IDs for custom scope
    body TEXT NOT NULL,
    reason TEXT NOT NULL, -- Required reason for sending
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Thread tracking (optional but helpful)
CREATE TABLE threads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    root_message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    reply_count INTEGER DEFAULT 0,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(root_message_id)
);

-- Device tokens for push notifications
CREATE TABLE device_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- References auth.users
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, token)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Team members indexes
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_team_members_role ON team_members(role);

-- Channels indexes
CREATE INDEX idx_channels_team_id ON channels(team_id);
CREATE INDEX idx_channels_type ON channels(type);
CREATE INDEX idx_channels_created_by ON channels(created_by);

-- Channel members indexes
CREATE INDEX idx_channel_members_channel_id ON channel_members(channel_id);
CREATE INDEX idx_channel_members_user_id ON channel_members(user_id);
CREATE UNIQUE INDEX idx_channel_members_unique ON channel_members(channel_id, user_id);

-- Messages indexes (critical for performance)
CREATE INDEX idx_messages_channel_created ON messages(channel_id, created_at DESC);
CREATE INDEX idx_messages_team_created ON messages(team_id, created_at DESC);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_thread_root ON messages(thread_root_id);
CREATE INDEX idx_messages_type ON messages(message_type);
CREATE INDEX idx_messages_pinned ON messages(channel_id, is_pinned) WHERE is_pinned = TRUE;

-- Attachments indexes
CREATE INDEX idx_attachments_message_id ON message_attachments(message_id);
CREATE INDEX idx_attachments_team_created ON message_attachments(team_id, created_at DESC);

-- Message reads indexes
CREATE INDEX idx_message_reads_user_id ON message_reads(user_id, read_at DESC);
CREATE INDEX idx_message_reads_message_id ON message_reads(message_id);

-- Reactions indexes
CREATE INDEX idx_reactions_message_id ON reactions(message_id);
CREATE INDEX idx_reactions_user_id ON reactions(user_id);

-- Mutes indexes
CREATE INDEX idx_mutes_user_id ON mutes(user_id);
CREATE INDEX idx_mutes_channel_id ON mutes(channel_id);
CREATE INDEX idx_mutes_until_ts ON mutes(until_ts);

-- Priority alerts indexes
CREATE INDEX idx_priority_alerts_team_created ON priority_alerts(team_id, created_at DESC);
CREATE INDEX idx_priority_alerts_channel_id ON priority_alerts(channel_id);

-- Device tokens indexes
CREATE INDEX idx_device_tokens_user_id ON device_tokens(user_id);
CREATE INDEX idx_device_tokens_team_id ON device_tokens(team_id);
CREATE INDEX idx_device_tokens_active ON device_tokens(is_active) WHERE is_active = TRUE;

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to relevant tables
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_channels_updated_at BEFORE UPDATE ON channels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_device_tokens_updated_at BEFORE UPDATE ON device_tokens FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to check if user is member of team
CREATE OR REPLACE FUNCTION is_team_member(user_uuid UUID, team_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM team_members 
        WHERE user_id = user_uuid AND team_id = team_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is member of channel
CREATE OR REPLACE FUNCTION is_channel_member(user_uuid UUID, channel_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM channel_members 
        WHERE user_id = user_uuid AND channel_id = channel_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user role in team
CREATE OR REPLACE FUNCTION get_user_team_role(user_uuid UUID, team_uuid UUID)
RETURNS VARCHAR AS $$
BEGIN
    RETURN (
        SELECT role FROM team_members 
        WHERE user_id = user_uuid AND team_id = team_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- ROW-LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_edits ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_tombstones ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE priority_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TEAMS POLICIES
-- =============================================

-- Users can only see teams they're members of
CREATE POLICY "Users can view teams they belong to" ON teams
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM team_members 
            WHERE team_id = teams.id 
            AND user_id = auth.uid()
        )
    );

-- Only admins can create teams (or we can allow any authenticated user)
CREATE POLICY "Authenticated users can create teams" ON teams
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Only team admins can update team info
CREATE POLICY "Team admins can update teams" ON teams
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM team_members 
            WHERE team_id = teams.id 
            AND user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- =============================================
-- TEAM_MEMBERS POLICIES
-- =============================================

-- Users can see team members of teams they belong to
CREATE POLICY "Users can view team members of their teams" ON team_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM team_members tm2
            WHERE tm2.team_id = team_members.team_id 
            AND tm2.user_id = auth.uid()
        )
    );

-- Team admins can add/remove members
CREATE POLICY "Team admins can manage team members" ON team_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM team_members tm2
            WHERE tm2.team_id = team_members.team_id 
            AND tm2.user_id = auth.uid() 
            AND tm2.role = 'admin'
        )
    );

-- Users can join teams (insert themselves)
CREATE POLICY "Users can join teams" ON team_members
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- =============================================
-- CHANNELS POLICIES
-- =============================================

-- Users can see channels of teams they belong to
CREATE POLICY "Users can view channels of their teams" ON channels
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM team_members 
            WHERE team_id = channels.team_id 
            AND user_id = auth.uid()
        )
    );

-- Team admins and coaches can create channels
CREATE POLICY "Admins and coaches can create channels" ON channels
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM team_members 
            WHERE team_id = channels.team_id 
            AND user_id = auth.uid() 
            AND role IN ('admin', 'coach')
        )
    );

-- Channel creators and team admins can update channels
CREATE POLICY "Channel creators and admins can update channels" ON channels
    FOR UPDATE USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM team_members 
            WHERE team_id = channels.team_id 
            AND user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- =============================================
-- CHANNEL_MEMBERS POLICIES
-- =============================================

-- Users can see channel members of channels they have access to
CREATE POLICY "Users can view channel members they have access to" ON channel_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM channel_members cm2
            WHERE cm2.channel_id = channel_members.channel_id 
            AND cm2.user_id = auth.uid()
        )
    );

-- Team admins, coaches, and channel moderators can manage channel members
CREATE POLICY "Admins and moderators can manage channel members" ON channel_members
    FOR ALL USING (
        -- Team admin
        EXISTS (
            SELECT 1 FROM channels c
            JOIN team_members tm ON tm.team_id = c.team_id
            WHERE c.id = channel_members.channel_id 
            AND tm.user_id = auth.uid() 
            AND tm.role = 'admin'
        ) OR
        -- Channel moderator
        EXISTS (
            SELECT 1 FROM channel_members cm2
            WHERE cm2.channel_id = channel_members.channel_id 
            AND cm2.user_id = auth.uid() 
            AND cm2.role IN ('admin', 'moderator')
        )
    );

-- =============================================
-- MESSAGES POLICIES
-- =============================================

-- Users can see messages in channels they have access to
CREATE POLICY "Users can view messages in accessible channels" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM channel_members 
            WHERE channel_id = messages.channel_id 
            AND user_id = auth.uid()
        )
    );

-- Users can send messages to channels they're members of
CREATE POLICY "Channel members can send messages" ON messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM channel_members 
            WHERE channel_id = messages.channel_id 
            AND user_id = auth.uid()
        )
    );

-- Users can edit their own messages within 15 minutes
CREATE POLICY "Users can edit their own recent messages" ON messages
    FOR UPDATE USING (
        sender_id = auth.uid() AND
        created_at > NOW() - INTERVAL '15 minutes'
    );

-- =============================================
-- MESSAGE_ATTACHMENTS POLICIES
-- =============================================

-- Users can see attachments for messages they can see
CREATE POLICY "Users can view attachments for accessible messages" ON message_attachments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM messages m
            JOIN channel_members cm ON cm.channel_id = m.channel_id
            WHERE m.id = message_attachments.message_id 
            AND cm.user_id = auth.uid()
        )
    );

-- Users can add attachments to their own messages
CREATE POLICY "Users can add attachments to their messages" ON message_attachments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM messages m
            WHERE m.id = message_attachments.message_id 
            AND m.sender_id = auth.uid()
        )
    );

-- =============================================
-- MESSAGE_EDITS POLICIES
-- =============================================

-- Users can see edit history for messages they can see
CREATE POLICY "Users can view edit history for accessible messages" ON message_edits
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM messages m
            JOIN channel_members cm ON cm.channel_id = m.channel_id
            WHERE m.id = message_edits.message_id 
            AND cm.user_id = auth.uid()
        )
    );

-- Users can create edit records for their own messages
CREATE POLICY "Users can create edit records for their messages" ON message_edits
    FOR INSERT WITH CHECK (
        edited_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM messages m
            WHERE m.id = message_edits.message_id 
            AND m.sender_id = auth.uid()
        )
    );

-- =============================================
-- MESSAGE_TOMBSTONES POLICIES
-- =============================================

-- Users can see tombstones for messages they can see
CREATE POLICY "Users can view tombstones for accessible messages" ON message_tombstones
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM messages m
            JOIN channel_members cm ON cm.channel_id = m.channel_id
            WHERE m.id = message_tombstones.message_id 
            AND cm.user_id = auth.uid()
        )
    );

-- =============================================
-- MESSAGE_READS POLICIES
-- =============================================

-- Users can see read receipts for messages they can see
CREATE POLICY "Users can view read receipts for accessible messages" ON message_reads
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM messages m
            JOIN channel_members cm ON cm.channel_id = m.channel_id
            WHERE m.id = message_reads.message_id 
            AND cm.user_id = auth.uid()
        )
    );

-- Users can mark messages as read
CREATE POLICY "Users can mark messages as read" ON message_reads
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM messages m
            JOIN channel_members cm ON cm.channel_id = m.channel_id
            WHERE m.id = message_reads.message_id 
            AND cm.user_id = auth.uid()
        )
    );

-- =============================================
-- REACTIONS POLICIES
-- =============================================

-- Users can see reactions for messages they can see
CREATE POLICY "Users can view reactions for accessible messages" ON reactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM messages m
            JOIN channel_members cm ON cm.channel_id = m.channel_id
            WHERE m.id = reactions.message_id 
            AND cm.user_id = auth.uid()
        )
    );

-- Users can add/remove their own reactions
CREATE POLICY "Users can manage their own reactions" ON reactions
    FOR ALL USING (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM messages m
            JOIN channel_members cm ON cm.channel_id = m.channel_id
            WHERE m.id = reactions.message_id 
            AND cm.user_id = auth.uid()
        )
    );

-- =============================================
-- MUTES POLICIES
-- =============================================

-- Users can manage their own mutes
CREATE POLICY "Users can manage their own mutes" ON mutes
    FOR ALL USING (user_id = auth.uid());

-- =============================================
-- PRIORITY_ALERTS POLICIES
-- =============================================

-- Users can see priority alerts for their teams
CREATE POLICY "Users can view priority alerts for their teams" ON priority_alerts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM team_members 
            WHERE team_id = priority_alerts.team_id 
            AND user_id = auth.uid()
        )
    );

-- Only team admins and coaches can send priority alerts
CREATE POLICY "Admins and coaches can send priority alerts" ON priority_alerts
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM team_members 
            WHERE team_id = priority_alerts.team_id 
            AND user_id = auth.uid() 
            AND role IN ('admin', 'coach')
        )
    );

-- =============================================
-- THREADS POLICIES
-- =============================================

-- Users can see threads for channels they have access to
CREATE POLICY "Users can view threads for accessible channels" ON threads
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM channel_members 
            WHERE channel_id = threads.channel_id 
            AND user_id = auth.uid()
        )
    );

-- =============================================
-- DEVICE_TOKENS POLICIES
-- =============================================

-- Users can manage their own device tokens
CREATE POLICY "Users can manage their own device tokens" ON device_tokens
    FOR ALL USING (user_id = auth.uid());
