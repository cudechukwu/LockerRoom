/**
 * Attendance API
 * Handles check-in, check-out, and attendance management
 * 
 * IMPORTANT: All functions now require the supabase client to be passed in.
 * Use useSupabase() hook from '../providers/SupabaseProvider' in React components
 * and pass the client to these functions.
 */

import { isUserInAnyGroup } from './attendanceGroups';
import { getUserTeamRole } from './roles';
import { getDeviceFingerprint as getDeviceFingerprintUtil } from '../utils/deviceFingerprint';

// Note: JWT signing should be done server-side via Supabase Edge Function
// For now, we'll use a simple token format that can be verified server-side
// In production, implement a Supabase Edge Function for QR token generation

/**
 * Generate a QR token payload (will be signed server-side)
 * @param {string} eventId - Event ID
 * @param {string} teamId - Team ID
 * @param {Date} expiresAt - Expiration date
 * @returns {Object} Token payload
 */
export function generateQRTokenPayload(eventId, teamId, expiresAt) {
  // Use crypto for better entropy (if available in React Native environment)
  let nonce;
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    nonce = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  } else {
    // Fallback for environments without crypto
    nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  return {
    event_id: eventId,
    team_id: teamId,
    expires_at: expiresAt.toISOString(),
    issued_at: new Date().toISOString(),
    nonce
  };
}

/**
 * Generate a signed QR token via Supabase Edge Function
 * @param {string} eventId - Event ID
 * @param {string} teamId - Team ID
 * @param {Date} expiresAt - Expiration date
 * @returns {Promise<string>} Signed JWT token
 */
export async function generateQRToken(eventId, teamId, expiresAt) {
  try {
    // TODO: Call Supabase Edge Function to generate signed token
    // For now, return the payload as a base64-encoded string
    // In production, this should call: supabase.functions.invoke('generate-qr-token', { body: payload })
    const payload = generateQRTokenPayload(eventId, teamId, expiresAt);
    return btoa(JSON.stringify(payload));
  } catch (error) {
    console.error('Error generating QR token:', error);
    throw error;
  }
}

/**
 * Verify a QR token (basic validation, full verification should be server-side)
 * @param {string} token - Token to verify
 * @returns {Object|null} Decoded token or null if invalid
 */
export function verifyQRToken(token) {
  try {
    if (!token || typeof token !== 'string') {
      return { valid: false, reason: 'invalid_token_format' };
    }
    
    // Decode base64 token
    let decoded;
    try {
      decoded = JSON.parse(atob(token));
    } catch (parseError) {
      return { valid: false, reason: 'invalid_base64' };
    }
    
    // Check expiration
    if (!decoded.expires_at) {
      return { valid: false, reason: 'missing_expiration' };
    }
    
    if (new Date(decoded.expires_at) < new Date()) {
      return { valid: false, reason: 'expired' };
    }
    
    return { valid: true, data: decoded };
  } catch (error) {
    console.error('QR token verification failed:', error);
    return { valid: false, reason: 'verification_error' };
  }
}

/**
 * Get device fingerprint for anti-cheat
 * @returns {Promise<string>} Device fingerprint hash
 */
export async function getDeviceFingerprint() {
  return getDeviceFingerprintUtil();
}

/**
 * Check in to an event
 * @param {Object} supabaseClient - Supabase client instance (from useSupabase() hook)
 * @param {string} eventId - Event ID
 * @param {Object} options - Check-in options
 * @param {string} options.method - Check-in method ('qr_code', 'location', 'manual')
 * @param {string} [options.userId] - User ID to mark (for manual check-ins by coaches, defaults to current user)
 * @param {string} [options.status] - Status for manual check-ins ('present', 'absent', 'excused', etc.)
 * @param {string} [options.qrToken] - QR token if method is 'qr_code'
 * @param {number} [options.latitude] - Latitude if method is 'location'
 * @param {number} [options.longitude] - Longitude if method is 'location'
 * @param {string} [options.deviceFingerprint] - Device fingerprint
 * @returns {Promise<Object>} Check-in result
 */
export async function checkInToEvent(supabaseClient, eventId, options = {}) {
  if (!supabaseClient) {
    throw new Error('Supabase client is required. Use useSupabase() hook and pass the client to this function.');
  }
  
  const supabase = supabaseClient;
  try {
    // Ensure we have a fresh session before making the request
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error('User not authenticated - no active session');
    }
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // Verify the user ID matches the session
    if (user.id !== session.user.id) {
      console.warn('⚠️ User ID mismatch between getUser() and getSession()');
    }

    const { method, userId, status, qrToken, latitude, longitude, deviceFingerprint } = options;
    
    // For manual check-ins, allow coaches to mark other users
    // Otherwise, use current user
    const targetUserId = (method === 'manual' && userId) ? userId : user.id;

    // Validate manual check-in doesn't include location data
    if (method === 'manual' && (latitude || longitude)) {
      throw { code: 'INVALID_MANUAL_CHECKIN', message: 'Manual check-ins cannot include location data' };
    }

    // Get event details (fetch all fields needed for group check and later use)
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      throw { code: 'EVENT_NOT_FOUND', message: 'Event not found' };
    }

    // Check if user is authorized to check in
    // Coaches can always mark attendance for others (override permissions)
    // Players can only check in if they're in the assigned groups
    // Derive full-team status from assigned_attendance_groups array length
    const assignedGroups = event.assigned_attendance_groups || [];
    const isFullTeam = !Array.isArray(assignedGroups) || assignedGroups.length === 0;
    
    // For manual check-ins by coaches marking others: skip group check (coaches have override)
    // For self check-ins (QR code, location) or manual self check-ins: verify group membership
    if (method === 'manual' && targetUserId !== user.id) {
      // Coach marking someone else - no group check needed (coaches have override permissions)
      // This is handled by the RPC function or RLS policy
    } else {
      // Player checking themselves in - verify group membership
      if (!isFullTeam && Array.isArray(assignedGroups) && assignedGroups.length > 0) {
        // Check if user is in at least one assigned group
        const { data: userInGroup, error: groupCheckError } = await isUserInAnyGroup(supabase, targetUserId, assignedGroups);
        
        if (groupCheckError || !userInGroup) {
          // Get group names for helpful error message
          const { data: groups, error: groupsError } = await supabase
            .from('attendance_groups')
            .select('name')
            .in('id', assignedGroups);
          
          const groupNames = groups?.map(g => g.name).join(', ') || 'assigned groups';
          throw { 
            code: 'NOT_IN_GROUP', 
            message: `This event is only for ${groupNames}. You are not a member of any assigned group. Please contact your coach if you believe this is an error.` 
          };
        }
      }
    }

    // Get current time (used throughout the function)
    const now = new Date();

    // Check if event has ended (with grace period)
    // Manual check-ins by coaches are always allowed (even after event ends) for retroactive marking
    // QR code and location check-ins are only allowed during the event + grace period
    if (method !== 'manual') {
      const eventEnd = new Date(event.end_time);
      const gracePeriodMinutes = 15; // 15 minute grace period after event ends
      const gracePeriodEnd = new Date(eventEnd.getTime() + gracePeriodMinutes * 60 * 1000);
      
      if (now > gracePeriodEnd) {
        throw { code: 'EVENT_ENDED', message: 'This event has ended and check-ins are no longer allowed' };
      }
    }

    // Verify QR token if method is qr_code
    if (method === 'qr_code' && qrToken) {
      const verification = verifyQRToken(qrToken);
      if (!verification.valid) {
        throw { code: 'QR_INVALID', message: `Invalid QR token: ${verification.reason}` };
      }
      
      const decoded = verification.data;
      if (decoded.event_id !== eventId || decoded.team_id !== event.team_id) {
        throw { code: 'QR_MISMATCH', message: 'QR token does not match this event' };
      }
    }

    // Verify location if method is location
    if (method === 'location') {
      if (!latitude || !longitude) {
        throw { code: 'LOCATION_REQUIRED', message: 'Location data is required for location-based check-in' };
      }
      
      if (!event.latitude || !event.longitude) {
        throw { code: 'EVENT_LOCATION_NOT_SET', message: 'Event location is not set' };
      }

      const distance = calculateDistance(
        latitude,
        longitude,
        event.latitude,
        event.longitude
      );

      // Guard against NaN
      if (isNaN(distance)) {
        throw { code: 'INVALID_LOCATION', message: 'Invalid location coordinates' };
      }

      const radius = event.check_in_radius || 100; // Default 100m
      
      if (distance > radius) {
        throw { code: 'OUT_OF_RANGE', message: `You must be within ${radius}m of the event location (currently ${Math.round(distance)}m away)` };
      }
    }

    // Check if already checked in (excluding soft-deleted records)
    const { data: existingAttendance } = await supabase
      .from('event_attendance')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', targetUserId)
      .eq('is_deleted', false)
      .single();

    if (existingAttendance) {
      // For manual check-ins, update existing record instead of throwing error
      if (method === 'manual' && status) {
        // Update existing attendance with new status
        const { data: updated, error: updateError } = await supabase
          .from('event_attendance')
          .update({
            status,
            is_late: status.includes('late'),
            late_category: status.includes('late') ? status : null,
            updated_at: now.toISOString(),
          })
          .eq('id', existingAttendance.id)
          .select()
          .single();

        if (updateError) throw updateError;
        return { data: updated, error: null };
      }
      throw { code: 'ALREADY_CHECKED_IN', message: 'Already checked in to this event' };
    }

    // For manual check-ins with explicit status, use that status
    // Otherwise, calculate late status based on time
    let finalStatus = status || 'present';
    let lateCategory = 'on_time';
    let isLate = false;
    let lateMinutes = 0;

    if (method === 'manual' && status) {
      // Use provided status for manual check-ins
      isLate = status.includes('late');
      lateCategory = status.includes('late') ? status : 'on_time';
    } else {
      // Calculate late status (normalize to UTC for consistent comparison)
      const eventStart = new Date(event.start_time);
      const eventStartUTC = new Date(eventStart.toISOString());
      const nowUTC = new Date(now.toISOString());
      lateMinutes = Math.floor((nowUTC.getTime() - eventStartUTC.getTime()) / (1000 * 60));
      
      if (lateMinutes > 0) {
        isLate = true;
        if (lateMinutes <= 10) {
          finalStatus = 'late_10';
          lateCategory = 'late_10';
        } else if (lateMinutes <= 30) {
          finalStatus = 'late_30';
          lateCategory = 'late_30';
        } else {
          finalStatus = 'very_late';
          lateCategory = 'very_late';
        }
      }
    }

    // Check for device fingerprint conflicts (anti-cheat)
    // Only check if method is not manual (manual check-ins don't have fingerprints)
    let isFlagged = false;
    let flagReason = null;
    
    if (method !== 'manual' && deviceFingerprint) {
      const { data: conflictingAttendance } = await supabase
        .from('event_attendance')
        .select('user_id')
        .eq('event_id', eventId)
        .eq('device_fingerprint', deviceFingerprint)
        .eq('is_deleted', false) // Only check non-deleted records
        .neq('user_id', user.id)
        .single();

      if (conflictingAttendance) {
        isFlagged = true;
        flagReason = 'Device fingerprint conflict';
      }
    }

    // Dual verification: If QR scanned but GPS is outside radius, flag it
    if (method === 'qr_code' && latitude && longitude && event.latitude && event.longitude) {
      const distance = calculateDistance(
        latitude,
        longitude,
        event.latitude,
        event.longitude
      );
      
      // Guard against NaN
      if (!isNaN(distance)) {
        const radius = event.check_in_radius || 100;
        if (distance > radius * 1.5) { // Allow 50% buffer
          isFlagged = true;
          flagReason = flagReason 
            ? `${flagReason}; GPS mismatch with QR (${Math.round(distance)}m from event)`
            : `GPS mismatch with QR (${Math.round(distance)}m from event)`;
        }
      }
    }

    // Create attendance record
    // IMPORTANT: For manual check-ins, device_fingerprint MUST be NULL (per CHECK constraint)
    const attendanceData = {
      event_id: eventId,
      user_id: targetUserId,
      team_id: event.team_id,
      check_in_method: method,
      checked_in_at: now.toISOString(),
      status: finalStatus,
      is_late: isLate,
      late_minutes: lateMinutes > 0 ? lateMinutes : null,
      late_category: lateCategory,
      check_in_latitude: latitude || null,
      check_in_longitude: longitude || null,
      distance_from_event: (latitude && longitude && event.latitude && event.longitude)
        ? (() => {
            const dist = calculateDistance(latitude, longitude, event.latitude, event.longitude);
            return isNaN(dist) ? null : dist;
          })()
        : null,
      // Schema constraint: manual check-ins must have NULL device_fingerprint
      device_fingerprint: method === 'manual' ? null : (deviceFingerprint || null),
      is_flagged: isFlagged,
      flag_reason: flagReason,
      // Soft delete fields (default to false/null)
      is_deleted: false,
      deleted_at: null,
      deleted_by: null
    };

    // Debug logging for manual check-ins
    if (method === 'manual') {
      // CAUSE 2 CHECK: Verify no NULL values in critical fields
      const hasNullValues = !attendanceData.team_id || !attendanceData.user_id || !attendanceData.event_id;
      
      console.log('🔍 Manual check-in attempt:', {
        currentUserId: user.id,
        sessionUserId: session?.user?.id,
        hasSession: !!session,
        hasAccessToken: !!session?.access_token,
        targetUserId: targetUserId,
        teamId: event.team_id,
        status: finalStatus,
        // CAUSE 2: Check for NULL values in INSERT payload
        payloadCheck: {
          team_id: attendanceData.team_id,
          user_id: attendanceData.user_id,
          event_id: attendanceData.event_id,
          hasNullValues: hasNullValues,
          team_idType: typeof attendanceData.team_id,
          user_idType: typeof attendanceData.user_id,
          event_idType: typeof attendanceData.event_id,
        },
        attendanceData: {
          ...attendanceData,
          // Don't log sensitive data
          device_fingerprint: attendanceData.device_fingerprint ? '[REDACTED]' : null
        }
      });
      
      if (hasNullValues) {
        console.error('❌ CAUSE 2 DETECTED: NULL values in critical fields!', {
          team_id: attendanceData.team_id,
          user_id: attendanceData.user_id,
          event_id: attendanceData.event_id
        });
      }
    }

    // CRITICAL FIX: Ensure session is restored and token is available before INSERT
    // The Supabase client must have the session token in the Authorization header
    // Otherwise auth.uid() will be NULL in RLS policies
    
    // Force refresh the session to ensure it's current
    const { data: { session: currentSession }, error: sessionRefreshError } = await supabase.auth.getSession();
    
    if (sessionRefreshError) {
      console.error('❌ CAUSE 1: Error refreshing session:', sessionRefreshError);
      throw new Error('Failed to refresh session - cannot authenticate request');
    }
    
    if (!currentSession?.access_token) {
      console.error('❌ CAUSE 1: No access token in session - RLS will fail with auth.uid() = NULL');
      throw new Error('No access token available - cannot authenticate request');
    }
    
    // Verify the session user matches
    if (currentSession.user.id !== user.id) {
      console.error('❌ CAUSE 1: Session user mismatch', {
        sessionUserId: currentSession.user.id,
        expectedUserId: user.id
      });
      throw new Error('Session user mismatch - cannot authenticate request');
    }
    
    // 🔥 CRITICAL: Set the session explicitly on the client to ensure Authorization header is sent
    // This ensures auth.uid() is available in RLS policies
    await supabase.auth.setSession({
      access_token: currentSession.access_token,
      refresh_token: currentSession.refresh_token,
    });
    
    console.log('✅ Session explicitly set on client for RLS context');

    // 🔥 CRITICAL: For manual check-ins, verify coach role BEFORE attempting insert
    // This helps debug RLS issues and provides better error messages
    if (method === 'manual' && targetUserId !== user.id) {
      const { data: coachRole, error: roleCheckError } = await getUserTeamRole(supabase, event.team_id, user.id);
      
      if (roleCheckError || !coachRole) {
        console.error('❌ Coach role check failed:', roleCheckError);
        throw { 
          code: 'PERMISSION_DENIED', 
          message: 'You do not have permission to mark attendance for other users' 
        };
      }
      
      const allowedRoles = ['head_coach', 'assistant_coach', 'team_admin'];
      const isCoachOrAdmin = coachRole.role && allowedRoles.includes(coachRole.role);
      
      // Also check team_members table as fallback
      if (!isCoachOrAdmin) {
        const { data: memberData } = await supabase
          .from('team_members')
          .select('role, is_admin')
          .eq('team_id', event.team_id)
          .eq('user_id', user.id)
          .single();
        
        const isCoachFallback = memberData?.is_admin === true || memberData?.role === 'coach';
        
        if (!isCoachFallback) {
          throw { 
            code: 'PERMISSION_DENIED', 
            message: 'Only coaches and admins can manually mark attendance for other users' 
          };
        }
      }
      
      console.log('✅ Coach role verified:', {
        role: coachRole.role,
        isCoachOrAdmin: isCoachOrAdmin
      });
    }

    // For manual check-ins, use RPC function to bypass RLS issues
    // The RPC function uses SECURITY DEFINER and explicitly checks permissions
    if (method === 'manual' && targetUserId !== user.id) {
      // Use RPC function for manual check-ins by coaches
      const { data: rpcData, error: rpcError } = await supabase.rpc('insert_event_attendance_manual', {
        p_event_id: eventId,
        p_user_id: targetUserId,
        p_team_id: event.team_id,
        p_status: finalStatus,
        p_check_in_method: 'manual',
        p_checked_in_at: now.toISOString(),
        p_is_late: isLate,
        p_late_minutes: lateMinutes > 0 ? lateMinutes : null,
        p_late_category: lateCategory
      });

      if (rpcError) {
        console.error('🚨 RPC Error for manual attendance:', rpcError);
        throw rpcError;
      }

      console.log('✅ RPC Success - Manual attendance marked:', {
        rpcData,
        hasData: !!rpcData,
        dataType: typeof rpcData
      });

      // Return the result in the same format as direct insert
      if (!rpcData) {
        console.warn('⚠️ RPC returned no data, but no error. This might indicate a silent failure.');
        throw { code: 'NO_DATA', message: 'Attendance was not marked. Please try again.' };
      }

      return { data: rpcData, error: null };
    }

    // For self check-ins (QR code, location) or if RPC is not available, use direct insert
    // With AsyncStorage explicitly passed to the Supabase client,
    // the session should now be properly included in the Authorization header
    // This ensures auth.uid() is available in RLS policies
    const { data, error } = await supabase
      .from('event_attendance')
      .insert(attendanceData)
      .select()
      .single();

    if (error) {
      // Enhanced error logging for RLS policy violations
      if (error.code === '42501') {
        console.error('🚨 RLS Policy Violation:', {
          code: error.code,
          message: error.message,
          currentUserId: user.id,
          targetUserId: targetUserId,
          teamId: event.team_id,
          method: method,
          hint: 'This usually means: 1) You are not a coach/admin, or 2) The target user is not in the team'
        });
      }
      
      // Handle unique constraint violation (concurrent check-ins)
      if (error.code === '23505') { // PostgreSQL unique violation
        throw { code: 'ALREADY_CHECKED_IN', message: 'Already checked in to this event (concurrent check-in detected)' };
      }
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error checking in to event:', error);
    return { data: null, error };
  }
}

/**
 * Check out of an event
 * @param {Object} supabaseClient - Supabase client instance (from useSupabase() hook)
 * @param {string} eventId - Event ID
 * @returns {Promise<Object>} Check-out result
 */
export async function checkOutOfEvent(supabaseClient, eventId) {
  if (!supabaseClient) {
    throw new Error('Supabase client is required. Use useSupabase() hook and pass the client to this function.');
  }
  
  const supabase = supabaseClient;
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Check if already checked out
    const { data: existingAttendance } = await supabase
      .from('event_attendance')
      .select('checked_out_at, is_deleted')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (!existingAttendance) {
      throw { code: 'ATTENDANCE_NOT_FOUND', message: 'No attendance record found' };
    }

    if (existingAttendance.is_deleted) {
      throw { code: 'ATTENDANCE_DELETED', message: 'Cannot check out of a deleted attendance record' };
    }

    if (existingAttendance.checked_out_at) {
      throw { code: 'ALREADY_CHECKED_OUT', message: 'Already checked out of this event' };
    }

    const { data, error } = await supabase
      .from('event_attendance')
      .update({ checked_out_at: new Date().toISOString() })
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .eq('is_deleted', false) // Only update non-deleted records
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error checking out of event:', error);
    return { data: null, error };
  }
}

/**
 * Get attendance for an event
 * @param {Object} supabaseClient - Supabase client instance (from useSupabase() hook)
 * @param {string} eventId - Event ID
 * @param {Object} filters - Filter options
 * @param {string} [filters.positionGroup] - Filter by position group
 * @param {string} [filters.positionCategory] - Filter by position category
 * @param {string} [filters.status] - Filter by status
 * @returns {Promise<Object>} Attendance list
 */
export async function getEventAttendance(supabaseClient, eventId, filters = {}) {
  if (!supabaseClient) {
    throw new Error('Supabase client is required. Use useSupabase() hook and pass the client to this function.');
  }
  
  const supabase = supabaseClient;
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    console.log('🔍 getEventAttendance called:', {
      eventId,
      userId: user.id,
      filters,
    });

    // Note: user_id is not a foreign key, so we can't join directly
    // We'll return user_id and fetch profiles separately if needed
    let query = supabase
      .from('event_attendance')
      .select('*')
      .eq('event_id', eventId)
      .eq('is_deleted', false); // Exclude soft-deleted records

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    // If filtering by position group, we need to filter after fetching
    // because Supabase PostgREST doesn't support complex joins across tables
    // without explicit foreign keys
    let positionGroupFilter = null;
    if (filters.positionGroup || filters.positionCategory) {
      // Get the event to get team_id
      const { data: event } = await supabase
        .from('events')
        .select('team_id')
        .eq('id', eventId)
        .single();

      if (!event) {
        throw { code: 'EVENT_NOT_FOUND', message: 'Event not found' };
      }

      // Fetch position groups for filtering
      const { data: positionGroups } = await supabase
        .from('team_position_groups')
        .select('user_id, position_group, position_category')
        .eq('team_id', event.team_id);

      if (filters.positionGroup) {
        positionGroupFilter = positionGroups
          ?.filter(pg => pg.position_group === filters.positionGroup)
          .map(pg => pg.user_id) || [];
      }
      
      if (filters.positionCategory) {
        const categoryUserIds = positionGroups
          ?.filter(pg => pg.position_category === filters.positionCategory)
          .map(pg => pg.user_id) || [];
        
        if (positionGroupFilter) {
          // Intersection: users in both positionGroup AND category
          positionGroupFilter = positionGroupFilter.filter(id => categoryUserIds.includes(id));
        } else {
          positionGroupFilter = categoryUserIds;
        }
      }
    }

    const { data, error } = await query.order('checked_in_at', { ascending: true });

    console.log('🔍 Attendance query result:', {
      eventId,
      hasError: !!error,
      error: error ? { code: error.code, message: error.message, details: error.details, hint: error.hint } : null,
      dataCount: data?.length || 0,
      data: data?.map(a => ({
        id: a.id,
        user_id: a.user_id,
        status: a.status,
        is_deleted: a.is_deleted,
        checked_in_at: a.checked_in_at,
      })) || [],
    });

    if (error) {
      console.error('❌ Attendance query error:', error);
      throw error;
    }

    // Apply position group filter if needed
    let filteredData = data;
    if (positionGroupFilter && positionGroupFilter.length > 0) {
      filteredData = data?.filter(attendance => 
        positionGroupFilter.includes(attendance.user_id)
      ) || [];
    }

    console.log('✅ Returning attendance data:', {
      originalCount: data?.length || 0,
      filteredCount: filteredData?.length || 0,
    });

    return { data: filteredData, error: null };
  } catch (error) {
    console.error('Error getting event attendance:', error);
    return { data: null, error };
  }
}

/**
 * Get current user's attendance status for a specific event
 * @param {Object} supabaseClient - Supabase client instance (from useSupabase() hook)
 * @param {string} eventId - Event ID
 * @returns {Promise<Object>} Attendance status { status: string | null, checkedInAt: string | null }
 */
export async function getUserAttendanceStatus(supabaseClient, eventId) {
  if (!supabaseClient) {
    throw new Error('Supabase client is required. Use useSupabase() hook and pass the client to this function.');
  }
  
  const supabase = supabaseClient;
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { status: null, checkedInAt: null };
    }

    const { data, error } = await supabase
      .from('event_attendance')
      .select('status, checked_in_at')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      console.error('Error getting user attendance status:', error);
      return { status: null, checkedInAt: null };
    }

    return {
      status: data?.status || null,
      checkedInAt: data?.checked_in_at || null,
    };
  } catch (error) {
    console.error('Error getting user attendance status:', error);
    return { status: null, checkedInAt: null };
  }
}

/**
 * Get user's attendance history
 * @param {string} userId - User ID (optional, defaults to current user)
 * @param {Date} [startDate] - Start date
 * @param {Date} [endDate] - End date
 * @returns {Promise<Object>} Attendance history
 */
export async function getAttendanceHistory(userId = null, startDate = null, endDate = null) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const targetUserId = userId || user.id;

    let query = supabase
      .from('event_attendance')
      .select(`
        *,
        event:events (
          id,
          title,
          event_type,
          start_time,
          end_time,
          location
        )
      `)
      .eq('user_id', targetUserId)
      .eq('is_deleted', false) // Exclude soft-deleted records
      .order('checked_in_at', { ascending: false });

    if (startDate) {
      query = query.gte('checked_in_at', startDate.toISOString());
    }

    if (endDate) {
      query = query.lte('checked_in_at', endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error getting attendance history:', error);
    return { data: null, error };
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude 1
 * @param {number} lon1 - Longitude 1
 * @param {number} lat2 - Latitude 2
 * @param {number} lon2 - Longitude 2
 * @returns {number} Distance in meters
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  // Guard against NaN/undefined inputs
  if (typeof lat1 !== 'number' || typeof lon1 !== 'number' || 
      typeof lat2 !== 'number' || typeof lon2 !== 'number' ||
      isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
    return NaN;
  }

  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Generate QR code for an event (coach only)
 * @param {string} eventId - Event ID
 * @returns {Promise<Object>} QR token and image data
 */
export async function generateEventQRCode(supabaseClient, eventId) {
  if (!supabaseClient) {
    throw new Error('Supabase client is required. Use useSupabase() hook and pass the client to this function.');
  }
  const supabase = supabaseClient;
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw { code: 'UNAUTHORIZED', message: 'User not authenticated' };
    }

    // Get event details (include created_by to check if user is event creator)
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*, team_id, created_by')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      throw { code: 'EVENT_NOT_FOUND', message: 'Event not found' };
    }

    // Allow event creator to generate QR codes (for captains, etc.)
    const isEventCreator = event.created_by === user.id;

    // Check if user is a coach or admin
    const { data: role, error: roleError } = await getUserTeamRole(supabase, event.team_id);
    
    const allowedRoles = ['head_coach', 'assistant_coach', 'team_admin'];
    const isCoachOrAdmin = role && !roleError && allowedRoles.includes(role.role);

    // Allow if user is event creator OR coach/admin
    if (!isEventCreator && !isCoachOrAdmin) {
      throw { code: 'PERMISSION_DENIED', message: 'Only event creators, coaches, and admins can generate QR codes' };
    }

    const expiresAt = new Date(event.end_time);
    // CRITICAL FIX: await the async function
    const qrToken = await generateQRToken(eventId, event.team_id, expiresAt);

    // TODO: Generate QR code image using a library like qrcode
    // For now, return the token
    return {
      data: {
        qr_token: qrToken,
        expires_at: expiresAt.toISOString(),
        qr_image: null // Will be generated client-side
      },
      error: null
    };
  } catch (error) {
    console.error('Error generating QR code:', error);
    return { data: null, error };
  }
}

