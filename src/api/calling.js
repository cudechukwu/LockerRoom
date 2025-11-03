// Calling API Endpoints
// Supabase-based calling system with Agora.io integration

import { supabase } from '../lib/supabase.js';

// =============================================
// HELPER FUNCTIONS
// =============================================

/**
 * Get current user (cached for performance)
 * @returns {Promise<{user: any, error: any}>}
 */
async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return { user, error: null };
  } catch (error) {
    return { user: null, error };
  }
}

/**
 * Log call event to audit trail
 * @param {string} callSessionId - Call session ID
 * @param {string} event - Event name
 * @param {string} userId - User ID
 * @param {Object} metadata - Additional metadata
 */
async function logCallEvent(callSessionId, event, userId, metadata = {}) {
  try {
    await supabase.from('call_logs').insert({
      call_session_id: callSessionId,
      event,
      user_id: userId,
      metadata,
    });
  } catch (error) {
    // Silently fail logging - don't break the main flow
    console.error('Failed to log call event:', error);
  }
}

/**
 * Log error to call_logs table
 * @param {string} functionName - Function name
 * @param {Error} error - Error object
 * @param {string} callSessionId - Optional call session ID
 * @param {string} userId - Optional user ID
 */
async function logError(functionName, error, callSessionId = null, userId = null) {
  try {
    if (callSessionId && userId) {
      await logCallEvent(callSessionId, 'error', userId, {
        function: functionName,
        message: error.message,
        stack: error.stack,
      });
    }
    // Still log to console in development
    if (__DEV__) {
      console.error(`Error in ${functionName}:`, error);
    }
  } catch (logError) {
    console.error('Failed to log error:', logError);
  }
}

// =============================================
// CALL SESSION MANAGEMENT
// =============================================

/**
 * Create a new call session
 * @param {string} teamId - Team ID
 * @param {Array<string>} recipientIds - Array of user IDs to call (1 for 1-on-1, multiple for group)
 * @param {string} callType - 'audio' or 'video'
 * @param {string|null} channelId - Optional channel ID (for group channel calls)
 * @param {Object|null} currentUser - Optional current user (to avoid refetch)
 * @returns {Promise<{data: any, error: any}>}
 */
export async function createCallSession(teamId, recipientIds, callType = 'audio', channelId = null, currentUser = null) {
  let user = currentUser;
  if (!user) {
    const { user: fetchedUser, error: userError } = await getCurrentUser();
    if (userError || !fetchedUser) {
      const error = userError || new Error('User not authenticated');
      return { data: null, error };
    }
    user = fetchedUser;
  }

  try {
    if (!teamId || !recipientIds || recipientIds.length === 0) {
      throw new Error('Missing required parameters: teamId and recipientIds');
    }

    // Validate call type
    const validCallTypes = ['audio', 'video'];
    if (!validCallTypes.includes(callType)) {
      throw new Error(`Invalid call type. Must be 'audio' or 'video'`);
    }

    // Determine if this is a group call
    const isGroup = recipientIds.length > 1;
    const dbCallType = isGroup ? `group_${callType}` : callType;

    // Generate unique Agora channel name
    const agoraChannelName = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create call session
    const { data: callSession, error: sessionError } = await supabase
      .from('call_sessions')
      .insert({
        team_id: teamId,
        channel_id: channelId,
        call_type: dbCallType,
        initiator_id: user.id,
        agora_channel_name: agoraChannelName,
        status: 'ringing',
        token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hour from now
      })
      .select()
      .single();

    if (sessionError) {
      await logError('createCallSession', sessionError, null, user.id);
      throw sessionError;
    }

    // Log call creation
    await logCallEvent(callSession.id, 'call_created', user.id, {
      call_type: dbCallType,
      recipient_count: recipientIds.length,
    });

    // Add all participants (initiator + recipients)
    const participants = [
      { call_session_id: callSession.id, user_id: user.id, joined_at: new Date().toISOString() },
      ...recipientIds.map(id => ({ call_session_id: callSession.id, user_id: id }))
    ];

    const { error: participantsError } = await supabase
      .from('call_participants')
      .insert(participants);

    if (participantsError) {
      // Cleanup: delete the call session if participants insert fails
      await supabase.from('call_sessions').delete().eq('id', callSession.id);
      await logError('createCallSession', participantsError, callSession.id, user.id);
      throw participantsError;
    }

    // Log participants added
    await logCallEvent(callSession.id, 'participants_added', user.id, {
      participant_count: participants.length,
    });

    return { data: callSession, error: null };
  } catch (error) {
    await logError('createCallSession', error, null, user?.id);
    return { data: null, error };
  }
}

/**
 * Get call session by ID
 * @param {string} callSessionId - Call session ID
 * @param {Object|null} currentUser - Optional current user (to avoid refetch)
 * @returns {Promise<{data: any, error: any}>}
 */
export async function getCallSession(callSessionId, currentUser = null) {
  let user = currentUser;
  if (!user) {
    const { user: fetchedUser, error: userError } = await getCurrentUser();
    if (userError || !fetchedUser) {
      const error = userError || new Error('User not authenticated');
      return { data: null, error };
    }
    user = fetchedUser;
  }

  try {
    const { data, error } = await supabase
      .from('call_sessions')
      .select(`
        *,
        initiator:user_profiles!call_sessions_initiator_id_fkey(
          user_id,
          display_name,
          avatar_url
        ),
        call_participants(
          *,
          user:user_profiles!call_participants_user_id_fkey(
            user_id,
            display_name,
            avatar_url
          )
        )
      `)
      .eq('id', callSessionId)
      .single();

    if (error) {
      await logError('getCallSession', error, callSessionId, user.id);
      throw error;
    }
    return { data, error: null };
  } catch (error) {
    await logError('getCallSession', error, callSessionId, user?.id);
    return { data: null, error };
  }
}

/**
 * Update call session status (atomic, prevents race conditions)
 * @param {string} callSessionId - Call session ID
 * @param {string} status - New status ('ringing', 'connecting', 'connected', 'ended', 'missed', 'rejected', 'failed', 'cancelled')
 * @param {string|null} expectedCurrentStatus - Optional: only update if current status matches (prevents race conditions)
 * @param {Object|null} currentUser - Optional current user (to avoid refetch)
 * @returns {Promise<{data: any, error: any}>}
 */
export async function updateCallStatus(callSessionId, status, expectedCurrentStatus = null, currentUser = null) {
  let user = currentUser;
  if (!user) {
    const { user: fetchedUser, error: userError } = await getCurrentUser();
    if (userError || !fetchedUser) {
      const error = userError || new Error('User not authenticated');
      return { data: null, error };
    }
    user = fetchedUser;
  }

  try {
    let query = supabase
      .from('call_sessions')
      .update({ status });

    // If expectedCurrentStatus is provided, only update if status matches (atomic operation)
    if (expectedCurrentStatus) {
      query = query.eq('status', expectedCurrentStatus);
    }

    // If ending the call, set ended_at
    if (status === 'ended') {
      query = query.update({ ended_at: new Date().toISOString() });
    }

    const { data, error } = await query
      .eq('id', callSessionId)
      .select()
      .single();

    if (error) {
      await logError('updateCallStatus', error, callSessionId, user.id);
      throw error;
    }

    // Log status change
    await logCallEvent(callSessionId, 'status_changed', user.id, {
      old_status: expectedCurrentStatus,
      new_status: status,
    });

    return { data, error: null };
  } catch (error) {
    await logError('updateCallStatus', error, callSessionId, user?.id);
    return { data: null, error };
  }
}

// =============================================
// CALL PARTICIPATION
// =============================================

/**
 * Join a call (mark participant as joined) - Atomic operation to prevent race conditions
 * @param {string} callSessionId - Call session ID
 * @param {Object|null} currentUser - Optional current user (to avoid refetch)
 * @returns {Promise<{data: any, error: any}>}
 */
export async function joinCall(callSessionId, currentUser = null) {
  let user = currentUser;
  if (!user) {
    const { user: fetchedUser, error: userError } = await getCurrentUser();
    if (userError || !fetchedUser) {
      const error = userError || new Error('User not authenticated');
      return { data: null, error };
    }
    user = fetchedUser;
  }

  try {
    // Optimized: Only fetch status, not entire session
    const { data: statusData, error: statusError } = await supabase
      .from('call_sessions')
      .select('status')
      .eq('id', callSessionId)
      .single();

    if (statusError) {
      await logError('joinCall', statusError, callSessionId, user.id);
      throw statusError;
    }

    // Update participant's joined_at timestamp
    const { error: participantError } = await supabase
      .from('call_participants')
      .update({ joined_at: new Date().toISOString() })
      .eq('call_session_id', callSessionId)
      .eq('user_id', user.id)
      .is('joined_at', null); // Only update if not already set

    if (participantError) {
      await logError('joinCall', participantError, callSessionId, user.id);
      throw participantError;
    }

    // Atomically update call status if it's still 'ringing' (prevents race conditions)
    if (statusData?.status === 'ringing') {
      await updateCallStatus(callSessionId, 'connecting', 'ringing', user);
    }

    // Log join event
    await logCallEvent(callSessionId, 'join', user.id, {});

    return { data: { success: true }, error: null };
  } catch (error) {
    await logError('joinCall', error, callSessionId, user?.id);
    return { data: null, error };
  }
}

/**
 * End a call
 * @param {string} callSessionId - Call session ID
 * @param {Object|null} currentUser - Optional current user (to avoid refetch)
 * @returns {Promise<{data: any, error: any}>}
 */
export async function endCall(callSessionId, currentUser = null) {
  let user = currentUser;
  if (!user) {
    const { user: fetchedUser, error: userError } = await getCurrentUser();
    if (userError || !fetchedUser) {
      const error = userError || new Error('User not authenticated');
      return { data: null, error };
    }
    user = fetchedUser;
  }

  try {
    // Update participant's left_at timestamp
    const { error: participantError } = await supabase
      .from('call_participants')
      .update({ left_at: new Date().toISOString() })
      .eq('call_session_id', callSessionId)
      .eq('user_id', user.id)
      .is('left_at', null); // Only update if not already set

    if (participantError) {
      // Log but continue - we still want to end the call
      await logError('endCall', participantError, callSessionId, user.id);
    }

    // Update call status to 'ended'
    const result = await updateCallStatus(callSessionId, 'ended', null, user);

    // Log leave event
    await logCallEvent(callSessionId, 'leave', user.id, {});

    return result;
  } catch (error) {
    await logError('endCall', error, callSessionId, user?.id);
    return { data: null, error };
  }
}

/**
 * Reject an incoming call
 * @param {string} callSessionId - Call session ID
 * @param {Object|null} currentUser - Optional current user (to avoid refetch)
 * @returns {Promise<{data: any, error: any}>}
 */
export async function rejectCall(callSessionId, currentUser = null) {
  let user = currentUser;
  if (!user) {
    const { user: fetchedUser, error: userError } = await getCurrentUser();
    if (userError || !fetchedUser) {
      const error = userError || new Error('User not authenticated');
      return { data: null, error };
    }
    user = fetchedUser;
  }

  try {
    // Create rejection notification
    const { error: notificationError } = await supabase
      .from('call_notifications')
      .insert({
        call_session_id: callSessionId,
        user_id: user.id,
        type: 'rejected',
      });

    if (notificationError) {
      await logError('rejectCall', notificationError, callSessionId, user.id);
      // Continue anyway
    }

    // Update call status to 'rejected'
    const result = await updateCallStatus(callSessionId, 'rejected', null, user);

    // Log rejection
    await logCallEvent(callSessionId, 'reject', user.id, {});

    return result;
  } catch (error) {
    await logError('rejectCall', error, callSessionId, user?.id);
    return { data: null, error };
  }
}

/**
 * Update participant state (mute/video)
 * @param {string} callSessionId - Call session ID
 * @param {Object} updates - { is_muted?: boolean, video_enabled?: boolean }
 * @param {Object|null} currentUser - Optional current user (to avoid refetch)
 * @returns {Promise<{data: any, error: any}>}
 */
export async function updateParticipantState(callSessionId, updates, currentUser = null) {
  let user = currentUser;
  if (!user) {
    const { user: fetchedUser, error: userError } = await getCurrentUser();
    if (userError || !fetchedUser) {
      const error = userError || new Error('User not authenticated');
      return { data: null, error };
    }
    user = fetchedUser;
  }

  try {
    const { data, error } = await supabase
      .from('call_participants')
      .update(updates)
      .eq('call_session_id', callSessionId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      await logError('updateParticipantState', error, callSessionId, user.id);
      throw error;
    }

    // Log state change
    const eventName = updates.is_muted !== undefined ? 'mute_toggled' : 'video_toggled';
    await logCallEvent(callSessionId, eventName, user.id, updates);

    return { data, error: null };
  } catch (error) {
    await logError('updateParticipantState', error, callSessionId, user?.id);
    return { data: null, error };
  }
}

// =============================================
// AGORA TOKEN MANAGEMENT
// =============================================

// Token cache (in-memory, cleared on app restart)
const tokenCache = new Map();

/**
 * Get Agora token from Edge Function (with caching)
 * @param {string} callSessionId - Call session ID
 * @param {Object|null} currentUser - Optional current user (to avoid refetch)
 * @returns {Promise<{data: {token: string, channelName: string}, error: any}>}
 */
export async function getAgoraToken(callSessionId, currentUser = null) {
  let user = currentUser;
  if (!user) {
    const { user: fetchedUser, error: userError } = await getCurrentUser();
    if (userError || !fetchedUser) {
      const error = userError || new Error('User not authenticated');
      return { data: null, error };
    }
    user = fetchedUser;
  }

  try {
    // Check cache first
    const cacheKey = `${callSessionId}_${user.id}`;
    const cached = tokenCache.get(cacheKey);
    if (cached) {
      const now = Date.now();
      // Use cached token if not expired (with 5 minute buffer)
      if (cached.expiresAt > now + 5 * 60 * 1000) {
        return { data: cached.data, error: null };
      }
      // Remove expired token
      tokenCache.delete(cacheKey);
    }

    // Call Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('agora-token', {
      body: { callSessionId },
    });

    if (error) {
      await logError('getAgoraToken', error, callSessionId, user.id);
      throw error;
    }

    // Cache the token
    if (data?.token) {
      // Cache for 55 minutes (tokens typically expire in 1 hour)
      tokenCache.set(cacheKey, {
        data,
        expiresAt: Date.now() + 55 * 60 * 1000,
      });
    }

    return { data, error: null };
  } catch (error) {
    await logError('getAgoraToken', error, callSessionId, user?.id);
    return { data: null, error };
  }
}

/**
 * Clear token cache for a call session
 * @param {string} callSessionId - Call session ID
 */
export function clearTokenCache(callSessionId) {
  const keysToDelete = [];
  for (const [key] of tokenCache) {
    if (key.startsWith(`${callSessionId}_`)) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach(key => tokenCache.delete(key));
}

// =============================================
// CALL METRICS & ANALYTICS
// =============================================

/**
 * Track call quality metrics (uses upsert to support incremental updates)
 * @param {string} callSessionId - Call session ID
 * @param {Object} metrics - Metrics object
 * @param {number} metrics.join_latency_ms - Join latency in milliseconds
 * @param {number} metrics.duration_seconds - Call duration in seconds
 * @param {number} metrics.packet_loss_percent - Packet loss percentage
 * @param {number} metrics.avg_bitrate_kbps - Average bitrate in kbps
 * @param {boolean} metrics.video_enabled - Whether video was enabled
 * @param {boolean} metrics.audio_enabled - Whether audio was enabled
 * @param {string} metrics.network_type - 'wifi', 'cellular', 'ethernet'
 * @param {string} metrics.device_type - 'ios', 'android', 'web'
 * @param {Object|null} currentUser - Optional current user (to avoid refetch)
 * @returns {Promise<{data: any, error: any}>}
 */
export async function trackCallMetrics(callSessionId, metrics, currentUser = null) {
  let user = currentUser;
  if (!user) {
    const { user: fetchedUser, error: userError } = await getCurrentUser();
    if (userError || !fetchedUser) {
      const error = userError || new Error('User not authenticated');
      return { data: null, error };
    }
    user = fetchedUser;
  }

  try {
    // Use upsert to support incremental updates (live telemetry)
    const { data, error } = await supabase
      .from('call_metrics')
      .upsert({
        call_session_id: callSessionId,
        user_id: user.id,
        ...metrics,
      }, {
        onConflict: 'call_session_id,user_id',
      })
      .select()
      .single();

    if (error) {
      await logError('trackCallMetrics', error, callSessionId, user.id);
      throw error;
    }
    return { data, error: null };
  } catch (error) {
    await logError('trackCallMetrics', error, callSessionId, user?.id);
    return { data: null, error };
  }
}

/**
 * Update call session with aggregated metrics
 * @param {string} callSessionId - Call session ID
 * @param {Object} metrics - Aggregated metrics
 * @returns {Promise<{data: any, error: any}>}
 */
export async function updateCallMetrics(callSessionId, metrics) {
  try {
    const { data, error } = await supabase
      .from('call_sessions')
      .update(metrics)
      .eq('id', callSessionId)
      .select()
      .single();

    if (error) {
      await logError('updateCallMetrics', error, callSessionId, null);
      throw error;
    }
    return { data, error: null };
  } catch (error) {
    await logError('updateCallMetrics', error, callSessionId, null);
    return { data: null, error };
  }
}

// =============================================
// CALL QUERIES
// =============================================

/**
 * Get active calls for current user
 * @param {string} teamId - Team ID
 * @param {Object|null} currentUser - Optional current user (to avoid refetch)
 * @returns {Promise<{data: Array, error: any}>}
 */
export async function getActiveCalls(teamId, currentUser = null) {
  let user = currentUser;
  if (!user) {
    const { user: fetchedUser, error: userError } = await getCurrentUser();
    if (userError || !fetchedUser) {
      const error = userError || new Error('User not authenticated');
      return { data: null, error };
    }
    user = fetchedUser;
  }

  try {
    // Fix: Get all active calls for team, then filter client-side
    const { data, error } = await supabase
      .from('call_sessions')
      .select(`
        *,
        initiator:user_profiles!call_sessions_initiator_id_fkey(
          user_id,
          display_name,
          avatar_url
        ),
        call_participants(
          *,
          user:user_profiles!call_participants_user_id_fkey(
            user_id,
            display_name,
            avatar_url
          )
        )
      `)
      .eq('team_id', teamId)
      .in('status', ['ringing', 'connecting', 'connected'])
      .order('created_at', { ascending: false });

    if (error) {
      await logError('getActiveCalls', error, null, user.id);
      throw error;
    }

    // Filter to only calls where user is a participant
    const filtered = (data || []).filter(call =>
      call.call_participants?.some(p => p.user_id === user.id)
    );

    return { data: filtered, error: null };
  } catch (error) {
    await logError('getActiveCalls', error, null, user?.id);
    return { data: null, error };
  }
}

/**
 * Get call history for current user
 * @param {string} teamId - Team ID
 * @param {number} limit - Number of calls to return (default: 50)
 * @param {Object|null} currentUser - Optional current user (to avoid refetch)
 * @returns {Promise<{data: Array, error: any}>}
 */
export async function getCallHistory(teamId, limit = 50, currentUser = null) {
  let user = currentUser;
  if (!user) {
    const { user: fetchedUser, error: userError } = await getCurrentUser();
    if (userError || !fetchedUser) {
      const error = userError || new Error('User not authenticated');
      return { data: null, error };
    }
    user = fetchedUser;
  }

  try {
    // Fix: Get all ended calls for team, then filter client-side
    const { data, error } = await supabase
      .from('call_sessions')
      .select(`
        *,
        initiator:user_profiles!call_sessions_initiator_id_fkey(
          user_id,
          display_name,
          avatar_url
        ),
        call_participants(
          *,
          user:user_profiles!call_participants_user_id_fkey(
            user_id,
            display_name,
            avatar_url
          )
        )
      `)
      .eq('team_id', teamId)
      .eq('status', 'ended')
      .order('created_at', { ascending: false })
      .limit(limit * 2); // Get more to account for filtering

    if (error) {
      await logError('getCallHistory', error, null, user.id);
      throw error;
    }

    // Filter to only calls where user is a participant
    const filtered = (data || [])
      .filter(call => call.call_participants?.some(p => p.user_id === user.id))
      .slice(0, limit);

    return { data: filtered, error: null };
  } catch (error) {
    await logError('getCallHistory', error, null, user?.id);
    return { data: null, error };
  }
}

/**
 * Get missed call notifications for current user
 * @param {Object|null} currentUser - Optional current user (to avoid refetch)
 * @returns {Promise<{data: Array, error: any}>}
 */
export async function getMissedCalls(currentUser = null) {
  let user = currentUser;
  if (!user) {
    const { user: fetchedUser, error: userError } = await getCurrentUser();
    if (userError || !fetchedUser) {
      const error = userError || new Error('User not authenticated');
      return { data: null, error };
    }
    user = fetchedUser;
  }

  try {
    const { data, error } = await supabase
      .from('call_notifications')
      .select(`
        *,
        call_session:call_sessions(
          *,
          initiator:user_profiles!call_sessions_initiator_id_fkey(
            user_id,
            display_name,
            avatar_url
          )
        )
      `)
      .eq('user_id', user.id)
      .eq('type', 'missed')
      .order('created_at', { ascending: false });

    if (error) {
      await logError('getMissedCalls', error, null, user.id);
      throw error;
    }
    return { data, error: null };
  } catch (error) {
    await logError('getMissedCalls', error, null, user?.id);
    return { data: null, error };
  }
}
