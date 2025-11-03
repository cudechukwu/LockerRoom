-- Playbook System Database Schema
-- Interactive animation data storage for LockerRoom

-- 1. Playbooks Table (Collections of plays)
CREATE TABLE IF NOT EXISTS playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL, -- 'offense', 'defense', 'special'
  subcategory VARCHAR(100), -- 'running', 'passing', 'kicking'
  icon VARCHAR(50) DEFAULT 'football',
  color VARCHAR(7) DEFAULT '#666666',
  is_public BOOLEAN DEFAULT false,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Plays Table (Individual interactive animations)
CREATE TABLE IF NOT EXISTS plays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id UUID NOT NULL REFERENCES playbooks(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Animation data (stored as JSONB for flexibility)
  animation_data JSONB NOT NULL,
  
  -- Metadata
  thumbnail_url TEXT,
  duration DECIMAL(5,2), -- seconds
  difficulty VARCHAR(20) DEFAULT 'beginner', -- 'beginner', 'intermediate', 'advanced'
  tags TEXT[] DEFAULT '{}',
  
  -- Permissions
  is_public BOOLEAN DEFAULT false,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Play Shares Table (For sharing interactive animations)
CREATE TABLE IF NOT EXISTS play_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  play_id UUID NOT NULL REFERENCES plays(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES auth.users(id),
  shared_with UUID REFERENCES auth.users(id), -- NULL for public shares
  share_token VARCHAR(255) UNIQUE, -- For public sharing
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_playbooks_team_id ON playbooks(team_id);
CREATE INDEX IF NOT EXISTS idx_playbooks_category ON playbooks(category);
CREATE INDEX IF NOT EXISTS idx_playbooks_created_by ON playbooks(created_by);

CREATE INDEX IF NOT EXISTS idx_plays_playbook_id ON plays(playbook_id);
CREATE INDEX IF NOT EXISTS idx_plays_team_id ON plays(team_id);
CREATE INDEX IF NOT EXISTS idx_plays_created_by ON plays(created_by);
CREATE INDEX IF NOT EXISTS idx_plays_animation_data ON plays USING GIN(animation_data);

CREATE INDEX IF NOT EXISTS idx_play_shares_play_id ON play_shares(play_id);
CREATE INDEX IF NOT EXISTS idx_play_shares_share_token ON play_shares(share_token);

-- Row Level Security (RLS) Policies
ALTER TABLE playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE plays ENABLE ROW LEVEL SECURITY;
ALTER TABLE play_shares ENABLE ROW LEVEL SECURITY;

-- Playbooks policies
CREATE POLICY "Users can view team playbooks" ON playbooks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.team_id = playbooks.team_id 
      AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create playbooks for their team" ON playbooks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.team_id = playbooks.team_id 
      AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update playbooks they created" ON playbooks
  FOR UPDATE USING (created_by = auth.uid());

-- Plays policies
CREATE POLICY "Users can view team plays" ON plays
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.team_id = plays.team_id 
      AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create plays for their team" ON plays
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.team_id = plays.team_id 
      AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update plays they created" ON plays
  FOR UPDATE USING (created_by = auth.uid());

-- Play shares policies
CREATE POLICY "Users can view their own shares" ON play_shares
  FOR SELECT USING (shared_by = auth.uid());

CREATE POLICY "Users can create shares for plays they created" ON play_shares
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM plays p 
      WHERE p.id = play_shares.play_id 
      AND p.created_by = auth.uid()
    )
  );
