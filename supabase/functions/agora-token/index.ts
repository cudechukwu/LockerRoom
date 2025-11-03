// Supabase Edge Function: Agora Token Generator
// Secure token generation with team membership validation

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { RtcTokenBuilder, RtcRole } from 'https://esm.sh/agora-access-token@2.0.4';

const AGORA_APP_ID = Deno.env.get('AGORA_APP_ID') || '';
const AGORA_APP_CERTIFICATE = Deno.env.get('AGORA_APP_CERTIFICATE') || '';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Custom error classes for better error handling
class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

class ExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExpiredError';
  }
}

class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    // Validate Agora credentials are configured
    if (!AGORA_APP_ID || !AGORA_APP_CERTIFICATE) {
      throw new Error('Agora credentials not configured. Please set AGORA_APP_ID and AGORA_APP_CERTIFICATE environment variables.');
    }

    // Get request body (with defensive parsing)
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      throw new Error('Invalid JSON payload');
    }
    
    const { callSessionId } = body || {};
    
    if (!callSessionId) {
      throw new Error('Missing required parameter: callSessionId');
    }

    // Get authenticated user from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new UnauthorizedError('Missing Authorization header');
    }

    // Create Supabase client with service role key (bypasses RLS for validation)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new UnauthorizedError('Invalid or missing authentication');
    }

    // Validate call session exists and user is a participant
    const { data: callSession, error: sessionError } = await supabase
      .from('call_sessions')
      .select(`
        id,
        team_id,
        agora_channel_name,
        ended_at,
        token_expires_at,
        call_participants!inner(
          user_id
        )
      `)
      .eq('id', callSessionId)
      .eq('call_participants.user_id', user.id)
      .single();

    if (sessionError) {
      console.error(JSON.stringify({
        level: 'error',
        event: 'call_session_fetch_failed',
        message: sessionError.message,
        callSessionId,
        userId: user.id,
      }));
      throw new NotFoundError('Invalid call session or user not authorized');
    }

    if (!callSession) {
      throw new NotFoundError('Call session not found');
    }

    // Check if call has ended
    if (callSession.ended_at) {
      throw new ExpiredError('Call session has already ended');
    }

    // Rate limiting: Check if token was recently generated (prevent abuse)
    const { data: lastLog } = await supabase
      .from('call_logs')
      .select('timestamp')
      .eq('call_session_id', callSessionId)
      .eq('user_id', user.id)
      .eq('event', 'token_generated')
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastLog) {
      const timeSinceLastToken = Date.now() - new Date(lastLog.timestamp).getTime();
      const RATE_LIMIT_MS = 30_000; // 30 seconds
      
      if (timeSinceLastToken < RATE_LIMIT_MS) {
        const waitSeconds = Math.ceil((RATE_LIMIT_MS - timeSinceLastToken) / 1000);
        throw new RateLimitError(`Token recently generated. Please wait ${waitSeconds} seconds before requesting another.`);
      }
    }

    // Check if token has expired (if token_expires_at is set)
    if (callSession.token_expires_at) {
      const expiresAt = new Date(callSession.token_expires_at).getTime();
      if (Date.now() > expiresAt) {
        throw new ExpiredError('Call session token has expired');
      }
    }

    // Validate user is a team member (additional security check)
    const { data: teamMember, error: teamError } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', callSession.team_id)
      .eq('user_id', user.id)
      .single();

    if (teamError || !teamMember) {
      throw new UnauthorizedError('User is not a member of the team');
    }

    // Generate Agora token
    // Token expiration: sync with DB timestamp or default to 1 hour
    const now = Math.floor(Date.now() / 1000);
    const defaultExpiry = now + 3600; // 1 hour from now
    
    let expirationTimeInSeconds = defaultExpiry;
    if (callSession.token_expires_at) {
      const dbExpiry = Math.floor(new Date(callSession.token_expires_at).getTime() / 1000);
      // Use the earlier of: DB expiry or default 1 hour
      expirationTimeInSeconds = Math.min(defaultExpiry, dbExpiry);
    }
    
    // Convert UUID to numeric UID for Agora
    // Agora requires numeric UIDs (32-bit unsigned integer: 0 to 2^32 - 1)
    // We'll use a hash of the user ID to generate a consistent numeric UID
    // This ensures the same user gets the same UID across token refreshes
    const userIdHash = user.id.replace(/-/g, '');
    // Take first 8 hex chars and convert to number, ensuring it's within Agora's UID range
    // Agora UIDs are 32-bit unsigned integers (0 to 0xFFFFFFFF)
    // Use >>> 0 to ensure unsigned 32-bit integer, and provide random fallback if parse fails
    const parsedUid = parseInt(userIdHash.substring(0, 8), 16);
    // Guarantees every user gets a valid UID > 0 (Agora treats 0 as auto-assign)
    const agoraUid = ((parsedUid || Math.floor(Math.random() * 0xFFFFFFFF)) >>> 0) || 1;

    const token = RtcTokenBuilder.buildTokenWithUid(
      AGORA_APP_ID,
      AGORA_APP_CERTIFICATE,
      callSession.agora_channel_name,
      agoraUid,
      RtcRole.PUBLISHER,
      expirationTimeInSeconds
    );

    // Log token generation (for audit trail) with enhanced metadata
    await supabase.from('call_logs').insert({
      call_session_id: callSessionId,
      event: 'token_generated',
      user_id: user.id,
      metadata: {
        agora_channel_name: callSession.agora_channel_name,
        expiration_time: expirationTimeInSeconds,
        agora_uid: agoraUid,
        origin: req.headers.get('Origin') || 'unknown',
        user_agent: req.headers.get('User-Agent') || 'unknown',
      },
    }).catch(err => {
      // Silently fail logging - don't break token generation
      console.error(JSON.stringify({
        level: 'error',
        event: 'token_generation_log_failed',
        message: err.message,
        callSessionId,
        userId: user.id,
      }));
    });

    return new Response(
      JSON.stringify({
        token,
        channelName: callSession.agora_channel_name,
        uid: agoraUid,
        expiresAt: expirationTimeInSeconds,
      }),
      {
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    // Structured logging for better observability
    console.error(JSON.stringify({
      level: 'error',
      event: 'token_generation_failed',
      message: error.message,
      stack: error.stack,
      errorType: error.name || 'Error',
    }));
    
    // Determine HTTP status code based on error type
    let status = 400;
    if (error instanceof UnauthorizedError) {
      status = 401;
    } else if (error instanceof NotFoundError) {
      status = 404;
    } else if (error instanceof ExpiredError) {
      status = 410; // Gone (resource expired)
    } else if (error instanceof RateLimitError) {
      status = 429; // Too Many Requests
    }
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        type: error.name || 'Error',
      }),
      {
        status,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
