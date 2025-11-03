-- LockerRoom Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE sport_type AS ENUM ('football');
CREATE TYPE member_role AS ENUM ('coach', 'trainer', 'assistant', 'player');
CREATE TYPE join_code_approval AS ENUM ('admin_only', 'admin_coach');

-- Teams table
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  sport sport_type NOT NULL DEFAULT 'football',
  school VARCHAR(255),
  primary_color VARCHAR(7) NOT NULL DEFAULT '#1C1C1C',
  secondary_color VARCHAR(7) NOT NULL DEFAULT '#F5F5F5',
  logo_url TEXT,
  restrict_domain BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team members table
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role member_role NOT NULL DEFAULT 'coach',
  is_admin BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- Team invites table
CREATE TABLE team_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role member_role NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  UNIQUE(team_id, email)
);

-- Team join codes table
CREATE TABLE team_join_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  code VARCHAR(10) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  approval_level join_code_approval NOT NULL DEFAULT 'admin_only',
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Create indexes for better performance
CREATE INDEX idx_teams_created_by ON teams(created_by);
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_team_invites_team_id ON team_invites(team_id);
CREATE INDEX idx_team_invites_email ON team_invites(email);
CREATE INDEX idx_team_join_codes_team_id ON team_join_codes(team_id);
CREATE INDEX idx_team_join_codes_code ON team_join_codes(code);

-- Enable Row Level Security (RLS)
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_join_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for teams table
CREATE POLICY "Users can view teams they are members of" ON teams
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.team_id = teams.id 
      AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create teams" ON teams
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Team admins can update their teams" ON teams
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.team_id = teams.id 
      AND team_members.user_id = auth.uid()
      AND team_members.is_admin = true
    )
  );

-- RLS Policies for team_members table
CREATE POLICY "Users can view team members of teams they belong to" ON team_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_members.team_id 
      AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Team admins can add/remove team members" ON team_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_members.team_id 
      AND tm.user_id = auth.uid()
      AND tm.is_admin = true
    )
  );

-- RLS Policies for team_invites table
CREATE POLICY "Users can view invites for teams they admin" ON team_invites
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_invites.team_id 
      AND tm.user_id = auth.uid()
      AND tm.is_admin = true
    )
  );

CREATE POLICY "Team admins can create invites" ON team_invites
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_invites.team_id 
      AND tm.user_id = auth.uid()
      AND tm.is_admin = true
    )
  );

-- RLS Policies for team_join_codes table
CREATE POLICY "Users can view join codes for teams they belong to" ON team_join_codes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_join_codes.team_id 
      AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Team admins can create join codes" ON team_join_codes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_join_codes.team_id 
      AND tm.user_id = auth.uid()
      AND tm.is_admin = true
    )
  );

-- Create storage bucket for team logos
INSERT INTO storage.buckets (id, name, public) VALUES ('team-logos', 'team-logos', true);

-- Storage policies for team logos
CREATE POLICY "Team members can view team logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'team-logos');

CREATE POLICY "Team admins can upload team logos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'team-logos');

CREATE POLICY "Team admins can update team logos" ON storage.objects
  FOR UPDATE USING (bucket_id = 'team-logos');

CREATE POLICY "Team admins can delete team logos" ON storage.objects
  FOR DELETE USING (bucket_id = 'team-logos');

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for teams table
CREATE TRIGGER update_teams_updated_at 
  BEFORE UPDATE ON teams 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Function to check if user can join team via code
CREATE OR REPLACE FUNCTION can_join_team_via_code(
  p_team_id UUID,
  p_code VARCHAR(10),
  p_user_email VARCHAR(255)
)
RETURNS BOOLEAN AS $$
DECLARE
  v_team teams%ROWTYPE;
  v_join_code team_join_codes%ROWTYPE;
BEGIN
  -- Get team and join code
  SELECT * INTO v_team FROM teams WHERE id = p_team_id;
  SELECT * INTO v_join_code FROM team_join_codes WHERE code = p_code AND team_id = p_team_id;
  
  -- Check if code exists and is active
  IF v_join_code IS NULL OR NOT v_join_code.is_active THEN
    RETURN FALSE;
  END IF;
  
  -- Check if code is expired
  IF v_join_code.expires_at < NOW() THEN
    RETURN FALSE;
  END IF;
  
  -- Check domain restriction
  IF v_team.restrict_domain AND NOT p_user_email LIKE '%@wesleyan.edu' THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
