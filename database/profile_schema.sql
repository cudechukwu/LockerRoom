-- Profile System Database Schema
-- Supabase PostgreSQL with Row-Level Security

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- PROFILE TABLES
-- =============================================

-- Global user profiles (shared across teams)
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Team-specific member profiles (varies by role and team)
CREATE TABLE team_member_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Player fields
    jersey_number INTEGER,
    position VARCHAR(50),
    class_year VARCHAR(20), -- e.g., "Freshman", "Sophomore", "Junior", "Senior"
    height_cm INTEGER,
    weight_kg INTEGER,
    hometown VARCHAR(255),
    high_school VARCHAR(255),
    major VARCHAR(255),
    
    -- Staff fields
    staff_title VARCHAR(255), -- e.g., "Head Coach", "Defensive Coordinator", "Athletic Trainer"
    department VARCHAR(100),
    years_experience INTEGER,
    certifications TEXT[], -- Array of certification strings
    specialties TEXT[], -- Array of specialty strings
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    
    -- Profile completion
    is_complete BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(team_id, user_id)
);

-- Player statistics (season-specific)
CREATE TABLE player_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    season VARCHAR(20) NOT NULL, -- e.g., "2024-2025"
    
    -- Stats stored as JSONB for flexibility
    metrics JSONB NOT NULL DEFAULT '{}',
    
    -- Common stats (for easy querying)
    games_played INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(team_id, user_id, season)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- User profiles indexes
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_display_name ON user_profiles(display_name);

-- Team member profiles indexes
CREATE INDEX idx_team_member_profiles_team_id ON team_member_profiles(team_id);
CREATE INDEX idx_team_member_profiles_user_id ON team_member_profiles(user_id);
CREATE INDEX idx_team_member_profiles_jersey_number ON team_member_profiles(jersey_number);
CREATE INDEX idx_team_member_profiles_position ON team_member_profiles(position);
CREATE INDEX idx_team_member_profiles_is_complete ON team_member_profiles(is_complete);

-- Player stats indexes
CREATE INDEX idx_player_stats_team_id ON player_stats(team_id);
CREATE INDEX idx_player_stats_user_id ON player_stats(user_id);
CREATE INDEX idx_player_stats_season ON player_stats(season);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_member_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;

-- User profiles policies
CREATE POLICY "Users can view all user profiles" ON user_profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can edit their own profile" ON user_profiles
    FOR ALL USING (auth.uid() = user_id);

-- Team member profiles policies
CREATE POLICY "Team members can view profiles in their teams" ON team_member_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = team_member_profiles.team_id
            AND tm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can edit their own team profile" ON team_member_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins and coaches can edit all team profiles" ON team_member_profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = team_member_profiles.team_id
            AND tm.user_id = auth.uid()
            AND (tm.is_admin = true OR tm.role IN ('coach', 'trainer'))
        )
    );

-- Player stats policies
CREATE POLICY "Team members can view stats in their teams" ON player_stats
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = player_stats.team_id
            AND tm.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins and coaches can edit all player stats" ON player_stats
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = player_stats.team_id
            AND tm.user_id = auth.uid()
            AND (tm.is_admin = true OR tm.role IN ('coach', 'trainer'))
        )
    );

-- =============================================
-- STORAGE BUCKET FOR AVATARS
-- =============================================

-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars
CREATE POLICY "Anyone can view avatars" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatars" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'avatars' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update their own avatars" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'avatars' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own avatars" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'avatars' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

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

-- Create triggers
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_member_profiles_updated_at 
    BEFORE UPDATE ON team_member_profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_player_stats_updated_at 
    BEFORE UPDATE ON player_stats 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to check if user can view field based on role
CREATE OR REPLACE FUNCTION can_view_profile_field(
    p_team_id UUID,
    p_viewer_user_id UUID,
    p_field_name TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_viewer_role VARCHAR(20);
    v_target_role VARCHAR(20);
BEGIN
    -- Get viewer's role
    SELECT role INTO v_viewer_role 
    FROM team_members 
    WHERE team_id = p_team_id AND user_id = p_viewer_user_id;
    
    -- Get target's role
    SELECT role INTO v_target_role 
    FROM team_members 
    WHERE team_id = p_team_id AND user_id = (
        SELECT user_id FROM team_member_profiles 
        WHERE team_id = p_team_id AND id = p_field_name::UUID
    );
    
    -- Staff can see all fields
    IF v_viewer_role IN ('admin', 'coach', 'trainer') THEN
        RETURN TRUE;
    END IF;
    
    -- Players can see basic fields
    IF v_viewer_role = 'player' AND v_target_role = 'player' THEN
        RETURN p_field_name IN ('display_name', 'jersey_number', 'position', 'class_year', 'hometown', 'major');
    END IF;
    
    -- Players viewing staff see limited fields
    IF v_viewer_role = 'player' AND v_target_role != 'player' THEN
        RETURN p_field_name IN ('display_name', 'staff_title', 'department');
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
