-- Enhanced Playbook Schema with Sharing & Scope Management
-- Extends existing playbook_schema.sql with additional columns

-- Add scope and visibility columns to playbooks table
ALTER TABLE playbooks ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'team' CHECK (scope IN ('team', 'personal'));
ALTER TABLE playbooks ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'team', 'public'));
ALTER TABLE playbooks ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false;
ALTER TABLE playbooks ADD COLUMN IF NOT EXISTS shared_by UUID REFERENCES auth.users(id);
ALTER TABLE playbooks ADD COLUMN IF NOT EXISTS original_team_id UUID REFERENCES teams(id);
ALTER TABLE playbooks ADD COLUMN IF NOT EXISTS share_token VARCHAR(255) UNIQUE;
ALTER TABLE playbooks ADD COLUMN IF NOT EXISTS share_expires_at TIMESTAMP WITH TIME ZONE;

-- Create playbook shares table for granular sharing control
CREATE TABLE IF NOT EXISTS playbook_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id UUID NOT NULL REFERENCES playbooks(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES auth.users(id),
  shared_with UUID REFERENCES auth.users(id), -- NULL for public shares
  share_token VARCHAR(255) UNIQUE,
  share_scope TEXT DEFAULT 'view' CHECK (share_scope IN ('view', 'import', 'edit')),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create play shares table for individual play sharing
CREATE TABLE IF NOT EXISTS play_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  play_id UUID NOT NULL REFERENCES plays(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES auth.users(id),
  shared_with UUID REFERENCES auth.users(id), -- NULL for public shares
  share_token VARCHAR(255) UNIQUE,
  share_scope TEXT DEFAULT 'view' CHECK (share_scope IN ('view', 'import', 'edit')),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_playbooks_scope ON playbooks(scope);
CREATE INDEX IF NOT EXISTS idx_playbooks_visibility ON playbooks(visibility);
CREATE INDEX IF NOT EXISTS idx_playbooks_shared_by ON playbooks(shared_by);
CREATE INDEX IF NOT EXISTS idx_playbooks_share_token ON playbooks(share_token);
CREATE INDEX IF NOT EXISTS idx_playbooks_team_scope ON playbooks(team_id, scope);

CREATE INDEX IF NOT EXISTS idx_playbook_shares_playbook_id ON playbook_shares(playbook_id);
CREATE INDEX IF NOT EXISTS idx_playbook_shares_share_token ON playbook_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_playbook_shares_shared_by ON playbook_shares(shared_by);

CREATE INDEX IF NOT EXISTS idx_play_shares_play_id ON play_shares(play_id);
CREATE INDEX IF NOT EXISTS idx_play_shares_share_token ON play_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_play_shares_shared_by ON play_shares(shared_by);

-- Row Level Security (RLS) Policies for new tables
ALTER TABLE playbook_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE play_shares ENABLE ROW LEVEL SECURITY;

-- Playbook shares policies
CREATE POLICY "Users can view their own shares" ON playbook_shares
  FOR SELECT USING (shared_by = auth.uid());

CREATE POLICY "Public can view public playbook shares" ON playbook_shares
  FOR SELECT USING (share_scope = 'view' AND shared_with IS NULL);

CREATE POLICY "Users can create shares for playbooks they own" ON playbook_shares
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM playbooks p 
      WHERE p.id = playbook_shares.playbook_id 
      AND p.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update their own shares" ON playbook_shares
  FOR UPDATE USING (shared_by = auth.uid());

CREATE POLICY "Users can delete their own shares" ON playbook_shares
  FOR DELETE USING (shared_by = auth.uid());

-- Play shares policies
CREATE POLICY "Users can view their own play shares" ON play_shares
  FOR SELECT USING (shared_by = auth.uid());

CREATE POLICY "Public can view public play shares" ON play_shares
  FOR SELECT USING (share_scope = 'view' AND shared_with IS NULL);

CREATE POLICY "Users can create shares for plays they own" ON play_shares
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM plays p 
      WHERE p.id = play_shares.play_id 
      AND p.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update their own play shares" ON play_shares
  FOR UPDATE USING (shared_by = auth.uid());

CREATE POLICY "Users can delete their own play shares" ON play_shares
  FOR DELETE USING (shared_by = auth.uid());

-- Update existing playbooks policies to handle scope and visibility
DROP POLICY IF EXISTS "Users can view team playbooks" ON playbooks;
DROP POLICY IF EXISTS "Users can create playbooks for their team" ON playbooks;

-- Enhanced playbooks policies
CREATE POLICY "Users can view accessible playbooks" ON playbooks
  FOR SELECT USING (
    -- Team playbooks (team scope)
    (scope = 'team' AND EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.team_id = playbooks.team_id 
      AND tm.user_id = auth.uid()
    ))
    OR
    -- Personal playbooks (personal scope)
    (scope = 'personal' AND created_by = auth.uid())
    OR
    -- Shared playbooks (public visibility)
    (visibility = 'public')
    OR
    -- Team-visible playbooks (team visibility)
    (visibility = 'team' AND EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.team_id = playbooks.team_id 
      AND tm.user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can create playbooks" ON playbooks
  FOR INSERT WITH CHECK (
    -- Team playbooks (coaches/team members)
    (scope = 'team' AND EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.team_id = playbooks.team_id 
      AND tm.user_id = auth.uid()
    ))
    OR
    -- Personal playbooks (anyone)
    (scope = 'personal' AND created_by = auth.uid())
  );

-- Create default team playbooks for new teams
CREATE OR REPLACE FUNCTION create_default_team_playbooks(p_team_id UUID)
RETURNS TABLE(created_playbook_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  creator_id UUID;
BEGIN
  -- Get the first team member as creator
  SELECT user_id INTO creator_id FROM team_members WHERE team_id = p_team_id LIMIT 1;
  
  -- Only create if team doesn't have default playbooks yet
  IF NOT EXISTS (SELECT 1 FROM playbooks WHERE team_id = p_team_id AND scope = 'team') THEN
    -- Create team playbooks
    INSERT INTO playbooks (team_id, name, description, category, subcategory, icon, color, scope, visibility, created_by)
    VALUES 
      (p_team_id, 'Offense', 'Team offensive plays and strategies', 'offense', 'general', 'arrow-forward', '#FF3B30', 'team', 'team', creator_id),
      (p_team_id, 'Defense', 'Team defensive plays and strategies', 'defense', 'general', 'shield', '#007AFF', 'team', 'team', creator_id),
      (p_team_id, 'Special', 'Special teams plays and strategies', 'special', 'general', 'star', '#FF9500', 'team', 'team', creator_id),
      (p_team_id, 'Personal', 'Personal practice and development plays', 'personal', 'general', 'person', '#34C759', 'personal', 'private', creator_id);
    
    -- Return created playbook names for debugging
    RETURN QUERY SELECT 'Offense'::TEXT;
    RETURN QUERY SELECT 'Defense'::TEXT;
    RETURN QUERY SELECT 'Special'::TEXT;
    RETURN QUERY SELECT 'Personal'::TEXT;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION create_default_team_playbooks(UUID) TO authenticated;
