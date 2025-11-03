-- Calling System Database Schema
-- Production-ready with enums, analytics, and RLS policies

-- Enums (avoid magic strings)
CREATE TYPE call_status AS ENUM ('ringing', 'connecting', 'connected', 'ended', 'missed', 'rejected', 'failed', 'cancelled');
CREATE TYPE call_type AS ENUM ('audio', 'video', 'group_audio', 'group_video');
CREATE TYPE notification_type AS ENUM ('missed', 'rejected');

-- Call sessions table
CREATE TABLE call_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES channels(id) ON DELETE SET NULL, -- NULL for DMs
  call_type call_type NOT NULL,
  status call_status NOT NULL DEFAULT 'ringing',
  initiator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  agora_channel_name TEXT NOT NULL UNIQUE, -- Agora channel identifier
  token_expires_at TIMESTAMPTZ, -- Token expiration tied to session
  
  -- Analytics fields (populated after call ends)
  duration_seconds INTEGER,
  join_latency_ms INTEGER,
  avg_bitrate_kbps INTEGER,
  packet_loss_percent DECIMAL(5,2)
);

-- Call participants
CREATE TABLE call_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_session_id UUID NOT NULL REFERENCES call_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  is_muted BOOLEAN DEFAULT FALSE,
  video_enabled BOOLEAN DEFAULT TRUE,
  UNIQUE(call_session_id, user_id) -- Prevents double-joins
);

-- Partial index for active participants (optimization)
CREATE INDEX idx_call_participants_active 
  ON call_participants(call_session_id) 
  WHERE left_at IS NULL;

-- Call notifications (for missed/rejected calls)
CREATE TABLE call_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_session_id UUID NOT NULL REFERENCES call_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Call quality metrics (for reliability dashboards)
CREATE TABLE call_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_session_id UUID NOT NULL REFERENCES call_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  join_latency_ms INTEGER,
  duration_seconds INTEGER,
  packet_loss_percent REAL, -- More efficient than DECIMAL for large volumes
  avg_bitrate_kbps INTEGER,
  video_enabled BOOLEAN,
  audio_enabled BOOLEAN,
  network_type TEXT CHECK (network_type IN ('wifi', 'cellular', 'ethernet')),
  device_type TEXT CHECK (device_type IN ('ios', 'android', 'web')),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log for call events (debugging and reliability)
CREATE TABLE call_logs (
  id BIGSERIAL PRIMARY KEY,
  call_session_id UUID REFERENCES call_sessions(id) ON DELETE CASCADE,
  event TEXT NOT NULL, -- 'join', 'leave', 'mute_toggled', 'video_toggled', 'status_changed'
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB, -- Additional event data (e.g., { "old_status": "ringing", "new_status": "connected" })
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_call_sessions_team_id ON call_sessions(team_id);
CREATE INDEX idx_call_sessions_initiator ON call_sessions(initiator_id);
CREATE INDEX idx_call_sessions_status ON call_sessions(status);
CREATE INDEX idx_call_sessions_created_at ON call_sessions(created_at DESC);
CREATE INDEX idx_call_participants_session ON call_participants(call_session_id);
CREATE INDEX idx_call_participants_user ON call_participants(user_id);
CREATE INDEX idx_call_notifications_user ON call_notifications(user_id);
CREATE INDEX idx_call_metrics_session ON call_metrics(call_session_id);
CREATE INDEX idx_call_metrics_user ON call_metrics(user_id);
CREATE INDEX idx_call_metrics_session_user ON call_metrics(call_session_id, user_id);
CREATE INDEX idx_call_logs_session ON call_logs(call_session_id);
CREATE INDEX idx_call_logs_user ON call_logs(user_id);
CREATE INDEX idx_call_logs_timestamp ON call_logs(timestamp DESC);

-- RLS Policies
ALTER TABLE call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

-- Users can only see calls in their team
CREATE POLICY "Users can view team calls"
  ON call_sessions FOR SELECT
  USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

-- Users can create calls in their team
CREATE POLICY "Users can create calls"
  ON call_sessions FOR INSERT
  WITH CHECK (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    AND initiator_id = auth.uid()
  );

-- Users can update calls they're part of
CREATE POLICY "Users can update their calls"
  ON call_sessions FOR UPDATE
  USING (
    initiator_id = auth.uid()
    OR id IN (SELECT call_session_id FROM call_participants WHERE user_id = auth.uid())
  );

-- Participants policies
CREATE POLICY "Users can view call participants"
  ON call_participants FOR SELECT
  USING (
    call_session_id IN (
      SELECT id FROM call_sessions 
      WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can join calls in their team"
  ON call_participants FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND call_session_id IN (
      SELECT id FROM call_sessions 
      WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their own participation"
  ON call_participants FOR UPDATE
  USING (user_id = auth.uid());

-- Notifications policies
CREATE POLICY "Users can view their notifications"
  ON call_notifications FOR SELECT
  USING (user_id = auth.uid());

-- Metrics policies (read-only for users, admins can see all)
CREATE POLICY "Users can view their metrics"
  ON call_metrics FOR SELECT
  USING (
    user_id = auth.uid()
    OR call_session_id IN (
      SELECT id FROM call_sessions 
      WHERE team_id IN (
        SELECT team_id FROM team_members 
        WHERE user_id = auth.uid() AND is_admin = true
      )
    )
  );

-- Service role full access (for Edge Functions/background workers)
CREATE POLICY "Service role full access"
  ON call_metrics FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role full access logs"
  ON call_logs FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Users can view their own call logs
CREATE POLICY "Users can view their call logs"
  ON call_logs FOR SELECT
  USING (
    user_id = auth.uid()
    OR call_session_id IN (
      SELECT id FROM call_sessions 
      WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    )
  );

-- Function to automatically set ended_at when status changes to 'ended'
CREATE OR REPLACE FUNCTION update_call_ended_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'ended' AND OLD.status != 'ended' THEN
    NEW.ended_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_call_ended_at
  BEFORE UPDATE ON call_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_call_ended_at();

-- Function to calculate duration when call ends (idempotent)
CREATE OR REPLACE FUNCTION calculate_call_duration()
RETURNS TRIGGER AS $$
BEGIN
  -- Only calculate if status changed to 'ended' and duration not already set
  IF NEW.status = 'ended' 
     AND OLD.status != 'ended' 
     AND NEW.ended_at IS NOT NULL 
     AND NEW.created_at IS NOT NULL 
     AND NEW.duration_seconds IS NULL THEN
    NEW.duration_seconds = EXTRACT(EPOCH FROM (NEW.ended_at - NEW.created_at))::INTEGER;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_duration
  BEFORE UPDATE ON call_sessions
  FOR EACH ROW
  EXECUTE FUNCTION calculate_call_duration();

-- Status transition validation (prevent invalid state changes)
CREATE OR REPLACE FUNCTION enforce_valid_call_transitions()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow same status (no-op updates)
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Enforce valid transitions
  IF NOT (
    (OLD.status = 'ringing' AND NEW.status IN ('connecting', 'rejected', 'missed', 'cancelled')) OR
    (OLD.status = 'connecting' AND NEW.status IN ('connected', 'missed', 'rejected', 'failed', 'cancelled')) OR
    (OLD.status = 'connected' AND NEW.status IN ('ended', 'failed')) OR
    (OLD.status = 'failed' AND NEW.status IN ('ended')) OR
    (OLD.status = 'cancelled' AND NEW.status IN ('ended'))
  ) THEN
    RAISE EXCEPTION 'Invalid call status transition: % -> %', OLD.status, NEW.status;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_call_transition
  BEFORE UPDATE ON call_sessions
  FOR EACH ROW
  EXECUTE FUNCTION enforce_valid_call_transitions();

-- Auto-sync participants when call ends
CREATE OR REPLACE FUNCTION end_call_participants()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'ended' AND OLD.status != 'ended' THEN
    UPDATE call_participants
    SET left_at = COALESCE(left_at, NOW())
    WHERE call_session_id = NEW.id
      AND left_at IS NULL; -- Only update if not already set
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_participants_on_end
  AFTER UPDATE ON call_sessions
  FOR EACH ROW
  WHEN (NEW.status = 'ended' AND OLD.status != 'ended')
  EXECUTE FUNCTION end_call_participants();

