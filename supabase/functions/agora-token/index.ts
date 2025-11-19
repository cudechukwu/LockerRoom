// Supabase Edge Function: Agora Token Generator
// Secure token generation with team membership validation

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

// Agora Token Generation using Deno's Web Crypto API
// Implements HMAC-SHA256 signing for Agora RTC tokens

enum RtcRole {
  PUBLISHER = 1,
  SUBSCRIBER = 2,
}

interface AccessToken {
  appID: string;
  appCertificate: string;
  channelName: string;
  uid: number;
  role: RtcRole;
  privilegeExpiredTs: number;
}

class AgoraTokenBuilder {
  private appID: string;
  private appCertificate: string;
  private channelName: string;
  private uid: number;
  private role: RtcRole;
  private privilegeExpiredTs: number;

  constructor(appID: string, appCertificate: string, channelName: string, uid: number) {
    this.appID = appID;
    this.appCertificate = appCertificate;
    this.channelName = channelName;
    this.uid = uid;
    this.role = RtcRole.PUBLISHER;
    this.privilegeExpiredTs = 0;
  }

  setRole(role: RtcRole): AgoraTokenBuilder {
    this.role = role;
    return this;
  }

  setPrivilegeExpiredTs(expiredTs: number): AgoraTokenBuilder {
    this.privilegeExpiredTs = expiredTs;
    return this;
  }

  async build(): Promise<string> {
    // Agora token format: Packed binary structure
    // Version (1 byte) + Service Type (1 byte) + App ID (32 bytes) + Channel Name (variable) + UID (4 bytes) + TS (4 bytes) + Salt (4 bytes) + Signature (32 bytes) + Privilege Expiration (4 bytes)
    
    const version = 0x01; // Version 1
    const serviceType = 0x01; // RTC service
    const ts = Math.floor(Date.now() / 1000);
    const salt = Math.floor(Math.random() * 0xFFFFFFFF);
    
    // Build message to sign (without signature)
    const messageBuf = this.packMessage(version, serviceType, ts, salt);
    
    // Sign with HMAC-SHA256
    const signature = await this.sign(messageBuf, this.appCertificate);
    
    // Build final token with signature
    const tokenBuf = this.packToken(version, serviceType, ts, salt, signature);
    
    // Encode to base64
    return btoa(String.fromCharCode(...new Uint8Array(tokenBuf)));
  }

  private packMessage(version: number, serviceType: number, ts: number, salt: number): Uint8Array {
    const encoder = new TextEncoder();
    const appIdBytes = encoder.encode(this.appID);
    const channelBytes = encoder.encode(this.channelName);
    
    // Calculate total size: version(1) + serviceType(1) + appId(32) + channelLen(2) + channel + uid(4) + ts(4) + salt(4) + privilegeExpiredTs(4)
    const channelLen = channelBytes.length;
    const totalSize = 1 + 1 + 32 + 2 + channelLen + 4 + 4 + 4 + 4;
    const buf = new Uint8Array(totalSize);
    let offset = 0;
    
    // Version
    buf[offset++] = version;
    // Service Type
    buf[offset++] = serviceType;
    // App ID (32 bytes, pad with zeros if needed)
    buf.set(appIdBytes.slice(0, 32), offset);
    offset += 32;
    // Channel name length (2 bytes, big-endian)
    buf[offset++] = (channelLen >> 8) & 0xFF;
    buf[offset++] = channelLen & 0xFF;
    // Channel name
    buf.set(channelBytes, offset);
    offset += channelLen;
    // UID (4 bytes, big-endian)
    const uid = this.uid >>> 0; // Ensure unsigned
    buf[offset++] = (uid >> 24) & 0xFF;
    buf[offset++] = (uid >> 16) & 0xFF;
    buf[offset++] = (uid >> 8) & 0xFF;
    buf[offset++] = uid & 0xFF;
    // Timestamp (4 bytes, big-endian)
    buf[offset++] = (ts >> 24) & 0xFF;
    buf[offset++] = (ts >> 16) & 0xFF;
    buf[offset++] = (ts >> 8) & 0xFF;
    buf[offset++] = ts & 0xFF;
    // Salt (4 bytes, big-endian)
    buf[offset++] = (salt >> 24) & 0xFF;
    buf[offset++] = (salt >> 16) & 0xFF;
    buf[offset++] = (salt >> 8) & 0xFF;
    buf[offset++] = salt & 0xFF;
    // Privilege expiration (4 bytes, big-endian)
    const privExp = this.privilegeExpiredTs >>> 0;
    buf[offset++] = (privExp >> 24) & 0xFF;
    buf[offset++] = (privExp >> 16) & 0xFF;
    buf[offset++] = (privExp >> 8) & 0xFF;
    buf[offset++] = privExp & 0xFF;
    
    return buf;
  }

  private packToken(version: number, serviceType: number, ts: number, salt: number, signature: Uint8Array): Uint8Array {
    const messageBuf = this.packMessage(version, serviceType, ts, salt);
    // Token = message + signature (32 bytes)
    const tokenBuf = new Uint8Array(messageBuf.length + 32);
    tokenBuf.set(messageBuf, 0);
    tokenBuf.set(signature, messageBuf.length);
    return tokenBuf;
  }

  private async sign(messageBuf: Uint8Array, key: string): Promise<Uint8Array> {
    // Convert key to ArrayBuffer
    const keyData = new TextEncoder().encode(key);
    
    // Import key for HMAC
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    // Sign message
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageBuf);
    
    // Return as Uint8Array
    return new Uint8Array(signature);
  }

}

// Static method to build token (matches agora-access-token API)
class RtcTokenBuilder {
  static async buildTokenWithUid(
    appID: string,
    appCertificate: string,
    channelName: string,
    uid: number,
    role: RtcRole,
    privilegeExpiredTs: number
  ): Promise<string> {
    const builder = new AgoraTokenBuilder(appID, appCertificate, channelName, uid);
    builder.setRole(role);
    builder.setPrivilegeExpiredTs(privilegeExpiredTs);
    return await builder.build();
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
      const errorMsg = 'Agora is not configured. Please check your environment variables.';
      console.error(JSON.stringify({
        level: 'error',
        event: 'agora_config_missing',
        message: errorMsg,
        hasAppId: !!AGORA_APP_ID,
        hasCertificate: !!AGORA_APP_CERTIFICATE,
        hint: 'After setting secrets, you must redeploy: supabase functions deploy agora-token',
      }));
      throw new Error(errorMsg);
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

    const token = await RtcTokenBuilder.buildTokenWithUid(
      AGORA_APP_ID,
      AGORA_APP_CERTIFICATE,
      callSession.agora_channel_name,
      agoraUid,
      RtcRole.PUBLISHER,
      expirationTimeInSeconds
    );

    // Log token generation (for audit trail) with enhanced metadata
    try {
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
      });
    } catch (err) {
      // Silently fail logging - don't break token generation
      console.error(JSON.stringify({
        level: 'error',
        event: 'token_generation_log_failed',
        message: err?.message || 'Unknown error',
        callSessionId,
        userId: user.id,
      }));
    }

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
