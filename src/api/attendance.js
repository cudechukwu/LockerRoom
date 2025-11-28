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
import { base64Encode, base64Decode } from '../utils/base64';

// Note: JWT signing should be done server-side via Supabase Edge Function
// For now, we'll use a simple token format that can be verified server-side
// In production, implement a Supabase Edge Function for QR token generation

/**
 * Generate a QR token payload (will be signed server-side)
 * @param {string} eventId - Event ID (original event ID, not instanceId)
 * @param {string} teamId - Team ID
 * @param {Date} expiresAt - Expiration date
 * @param {string|null} instanceDate - Instance date (YYYY-MM-DD) for recurring events
 * @returns {Object} Token payload
 */
export function generateQRTokenPayload(eventId, teamId, expiresAt, instanceDate = null) {
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

  const payload = {
    event_id: eventId,
    team_id: teamId,
    expires_at: expiresAt.toISOString(),
    issued_at: new Date().toISOString(),
    nonce
  };
  
  // Include instance_date for recurring events to make QR codes unique per instance
  if (instanceDate) {
    payload.instance_date = instanceDate;
  }
  
  return payload;
}

/**
 * Generate a signed QR token via Supabase Edge Function
 * @param {string} eventId - Event ID (original event ID, not instanceId)
 * @param {string} teamId - Team ID
 * @param {Date} expiresAt - Expiration date
 * @param {string|null} instanceDate - Instance date (YYYY-MM-DD) for recurring events
 * @returns {Promise<string>} Signed JWT token
 */
export async function generateQRToken(eventId, teamId, expiresAt, instanceDate = null) {
  try {
    // TODO: Call Supabase Edge Function to generate signed token
    // For now, return the payload as a base64-encoded string
    // In production, this should call: supabase.functions.invoke('generate-qr-token', { body: payload })
    const payload = generateQRTokenPayload(eventId, teamId, expiresAt, instanceDate);
    return base64Encode(JSON.stringify(payload));
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
    
    // Decode base64 token (React Native compatible)
    let decoded;
    try {
      decoded = JSON.parse(base64Decode(token));
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

    const { method, userId, status, qrToken, latitude, longitude, deviceFingerprint, instanceDate } = options;
    
    // For manual check-ins, allow coaches to mark other users
    // Otherwise, use current user
    const targetUserId = (method === 'manual' && userId) ? userId : user.id;

    // Validate manual check-in doesn't include location data
    if (method === 'manual' && (latitude || longitude)) {
      throw { code: 'INVALID_MANUAL_CHECKIN', message: 'Manual check-ins cannot include location data' };
    }

    // For recurring instances, we need to get the original event
    // If eventId is an instanceId (contains ':'), extract the original event ID
    let originalEventId = eventId;
    if (eventId && eventId.includes(':')) {
      // Instance ID format: "eventId:YYYY-MM-DD"
      originalEventId = eventId.split(':')[0];
    }
    
    // Get event details (fetch all fields needed for group check and later use)
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', originalEventId)
      .single();

    if (eventError || !event) {
      throw { code: 'EVENT_NOT_FOUND', message: 'Event not found' };
    }
    
    // Determine instance_date for recurring events
    // If instanceDate is provided, use it; otherwise, if eventId is an instanceId, extract it
    let finalInstanceDate = instanceDate;
    if (!finalInstanceDate && eventId && eventId.includes(':')) {
      // Extract date from instanceId format: "eventId:YYYY-MM-DD"
      const datePart = eventId.split(':')[1];
      if (datePart) {
        finalInstanceDate = datePart;
      }
    }
    
    // For non-recurring events, instance_date should be NULL
    // For recurring events, instance_date is required
    if (event.is_recurring && !finalInstanceDate) {
      // If it's a recurring event but no instance_date provided, use the event's start_time date
      const eventStart = new Date(event.start_time);
      finalInstanceDate = eventStart.toISOString().split('T')[0];
    } else if (!event.is_recurring) {
      finalInstanceDate = null;
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
        // 🔥 FIX: Properly handle async RPC return shape
        const groupCheckResult = await isUserInAnyGroup(supabase, targetUserId, assignedGroups);
        
        // Handle both { data, error } and direct boolean return shapes
        const userInGroup = groupCheckResult?.data ?? groupCheckResult ?? false;
        const groupCheckError = groupCheckResult?.error ?? null;
        
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
      // 🔥 FIX: For recurring events, use instance-specific end_time
      // For non-recurring events, use the original event's end_time
      let eventEnd;
      if (event.is_recurring && finalInstanceDate) {
        // Calculate instance-specific end_time based on instanceDate and event duration
        const originalStart = new Date(event.start_time);
        const originalEnd = new Date(event.end_time);
        const duration = originalEnd.getTime() - originalStart.getTime(); // Duration in milliseconds
        
        // Parse instanceDate (YYYY-MM-DD) and set the time from original event
        const [year, month, day] = finalInstanceDate.split('-').map(Number);
        const instanceStart = new Date(year, month - 1, day, originalStart.getHours(), originalStart.getMinutes(), originalStart.getSeconds(), originalStart.getMilliseconds());
        const instanceEnd = new Date(instanceStart.getTime() + duration);
        
        eventEnd = instanceEnd;
        
        console.log('✅ Using instance-specific end_time for check-in validation:', {
          originalEnd: event.end_time,
          instanceDate: finalInstanceDate,
          instanceStart: instanceStart.toISOString(),
          instanceEnd: instanceEnd.toISOString(),
          now: now.toISOString(),
        });
      } else {
        // Non-recurring event: use original end_time
        eventEnd = new Date(event.end_time);
      }
      
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
      // 🔥 FIX: Compare with originalEventId, not instanceId
      if (decoded.event_id !== originalEventId || decoded.team_id !== event.team_id) {
        throw { code: 'QR_MISMATCH', message: 'QR token does not match this event' };
      }
      
      // 🔥 FIX: Validate instance_date for recurring events
      // QR code must be for the specific instance being checked into
      if (event.is_recurring) {
        // Convert both to strings for comparison (handle null/undefined)
        const decodedInstanceDate = decoded.instance_date || null;
        const expectedInstanceDate = finalInstanceDate || null;
        
        if (decodedInstanceDate !== expectedInstanceDate) {
          console.error('❌ QR Instance Mismatch:', {
            decodedInstanceDate,
            expectedInstanceDate,
            eventId,
            originalEventId,
            finalInstanceDate,
            decoded: decoded,
          });
          throw { 
            code: 'QR_INSTANCE_MISMATCH', 
            message: `QR token is for a different occurrence of this recurring event. Expected: ${expectedInstanceDate}, Got: ${decodedInstanceDate}` 
          };
        }
      } else {
        // For non-recurring events, instance_date should be null/undefined
        if (decoded.instance_date) {
          throw { 
            code: 'QR_INSTANCE_MISMATCH', 
            message: 'QR token is for a recurring event instance, but this is not a recurring event' 
          };
        }
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
    // 🔥 FIX: Use originalEventId and filter by instance_date for recurring events
    let existingQuery = supabase
      .from('event_attendance')
      .select('id')
      .eq('event_id', originalEventId) // Use originalEventId, not instanceId
      .eq('user_id', targetUserId)
      .eq('is_deleted', false);
    
    if (finalInstanceDate) {
      existingQuery = existingQuery.eq('instance_date', finalInstanceDate);
    } else {
      existingQuery = existingQuery.is('instance_date', null);
    }
    
    const { data: existingAttendance } = await existingQuery.single();

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
      // 🔥 FIX: For recurring events, use instance-specific start_time
      // For non-recurring events, use the original event's start_time
      let eventStart;
      if (event.is_recurring && finalInstanceDate) {
        // Calculate instance-specific start_time based on instanceDate and original event time
        const originalStart = new Date(event.start_time);
        // Parse instanceDate (YYYY-MM-DD) and set the time from original event
        const [year, month, day] = finalInstanceDate.split('-').map(Number);
        eventStart = new Date(year, month - 1, day, originalStart.getHours(), originalStart.getMinutes(), originalStart.getSeconds(), originalStart.getMilliseconds());
        
        console.log('✅ Using instance-specific start_time for late calculation:', {
          originalStart: event.start_time,
          instanceDate: finalInstanceDate,
          instanceStart: eventStart.toISOString(),
          now: now.toISOString(),
        });
      } else {
        // Non-recurring event: use original start_time
        eventStart = new Date(event.start_time);
      }
      
      // Use local time for both event and now - no UTC conversion
      lateMinutes = Math.floor((now.getTime() - eventStart.getTime()) / (1000 * 60));
      
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
      // 🔥 FIX: Use originalEventId and filter by instance_date
      let conflictQuery = supabase
        .from('event_attendance')
        .select('user_id')
        .eq('event_id', originalEventId) // Use originalEventId, not instanceId
        .eq('device_fingerprint', deviceFingerprint)
        .eq('is_deleted', false) // Only check non-deleted records
        .neq('user_id', user.id);
      
      if (finalInstanceDate) {
        conflictQuery = conflictQuery.eq('instance_date', finalInstanceDate);
      } else {
        conflictQuery = conflictQuery.is('instance_date', null);
      }
      
      const { data: conflictingAttendance } = await conflictQuery.single();

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
        // 🔥 FIX: Use reasonable buffer (20% instead of arbitrary 50%)
        // This prevents false-flagging players at the edge of the field
        const bufferMultiplier = 1.2; // 20% buffer for GPS accuracy variance
        if (distance > radius * bufferMultiplier) {
          isFlagged = true;
          flagReason = flagReason 
            ? `${flagReason}; GPS mismatch with QR (${Math.round(distance)}m from event, radius: ${radius}m)`
            : `GPS mismatch with QR (${Math.round(distance)}m from event, radius: ${radius}m)`;
        }
      }
    }

    // Create attendance record
    // IMPORTANT: For manual check-ins, device_fingerprint MUST be NULL (per CHECK constraint)
    // 🔥 FIX: Use originalEventId for database operations (event_id column expects UUID, not instanceId)
    const attendanceData = {
      event_id: originalEventId, // Use original event ID, not instanceId
      user_id: targetUserId,
      team_id: event.team_id,
      // 🔥 FIX: Include instance_date for recurring events
      instance_date: finalInstanceDate || null, // For recurring events, this is required; for non-recurring, it's NULL
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
    // 🔥 FIX: Only get session once - no double refresh or setSession calls
    // The Supabase client already has the session from getSession() call at the top
    // Multiple session operations can cause race conditions and token churn
    // If session is needed, it's already available from the initial getSession() call

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
      // 🔥 FIX: Use originalEventId for RPC call (RPC expects UUID, not instanceId)
      // RPC function now supports p_instance_date parameter for recurring events
      const { data: rpcData, error: rpcError } = await supabase.rpc('insert_event_attendance_manual', {
        p_event_id: originalEventId, // Use original event ID, not instanceId
        p_user_id: targetUserId,
        p_team_id: event.team_id,
        p_status: finalStatus,
        p_check_in_method: 'manual',
        p_checked_in_at: now.toISOString(),
        p_is_late: isLate,
        p_late_minutes: lateMinutes > 0 ? lateMinutes : null,
        p_late_category: lateCategory,
        p_instance_date: finalInstanceDate || null  // 🔥 NEW: Pass instance_date for recurring events
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
    
    // 🔥 DEBUG: Log the attendance data being inserted
    console.log('🔍 Inserting attendance data:', {
      event_id: attendanceData.event_id,
      user_id: attendanceData.user_id,
      instance_date: attendanceData.instance_date,
      is_recurring: event.is_recurring,
      method: method
    });
    
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
        // 🔥 DEBUG: Check for existing attendance record to see what's conflicting
        console.error('🚨 Unique constraint violation - checking for existing attendance:', {
          event_id: attendanceData.event_id,
          user_id: attendanceData.user_id,
          instance_date: attendanceData.instance_date,
          error_message: error.message,
          error_detail: error.details
        });
        
        // Query to see what existing record might be conflicting
        let conflictQuery = supabase
          .from('event_attendance')
          .select('id, event_id, user_id, instance_date, checked_in_at, status, is_deleted')
          .eq('event_id', attendanceData.event_id)
          .eq('user_id', attendanceData.user_id)
          .eq('is_deleted', false);
        
        if (attendanceData.instance_date) {
          // For recurring events, check both with and without instance_date
          // (in case old constraint is still active)
          conflictQuery = conflictQuery.or(`instance_date.eq.${attendanceData.instance_date},instance_date.is.null`);
        } else {
          conflictQuery = conflictQuery.is('instance_date', null);
        }
        
        const { data: existingRecords, error: queryError } = await conflictQuery;
        
        if (!queryError && existingRecords && existingRecords.length > 0) {
          console.error('🚨 Found existing attendance records:', existingRecords);
          // If there's a record with the same instance_date, that's the issue
          const sameInstance = existingRecords.find(r => r.instance_date === attendanceData.instance_date);
          if (sameInstance) {
            throw { 
              code: 'ALREADY_CHECKED_IN', 
              message: `Already checked in to this event instance (checked in at ${new Date(sameInstance.checked_in_at).toLocaleString()})` 
            };
          } else {
            // Found a record with a different instance_date (or null)
            // This means there's an old record from before instance-specific attendance was implemented
            const oldRecord = existingRecords.find(r => r.instance_date === null || r.instance_date !== attendanceData.instance_date);
            if (oldRecord && oldRecord.instance_date === null && event.is_recurring) {
              // Old record with null instance_date for a recurring event
              // We need to delete it or update it, but we don't know which instance it was for
              // For now, delete the old record and allow the new check-in
              console.warn('⚠️ Found old attendance record with null instance_date for recurring event. Deleting it to allow instance-specific check-in.');
              const { error: deleteError } = await supabase
                .from('event_attendance')
                .delete()
                .eq('id', oldRecord.id);
              
              if (deleteError) {
                console.error('❌ Error deleting old attendance record:', deleteError);
                throw { 
                  code: 'ALREADY_CHECKED_IN', 
                  message: `You have an old check-in record for this recurring event. Please contact support to resolve this issue.` 
                };
              }
              
              // Retry the insert after deleting the old record
              console.log('🔄 Retrying check-in after deleting old record...');
              const { data: retryData, error: retryError } = await supabase
                .from('event_attendance')
                .insert(attendanceData)
                .select()
                .single();
              
              if (retryError) {
                console.error('❌ Error on retry after deleting old record:', retryError);
                throw retryError;
              }
              
              return { data: retryData, error: null };
            } else {
              // Different instance_date - this is a different instance, should be allowed
              // But the constraint is blocking it, which means the migration wasn't run correctly
              throw { 
                code: 'ALREADY_CHECKED_IN', 
                message: 'Database constraint error: Unable to check in to this instance. The database migration may need to be re-run.' 
              };
            }
          }
        }
        
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

    // Extract original event ID and instance_date if eventId is an instanceId
    let originalEventId = eventId;
    let finalInstanceDate = instanceDate;
    
    if (eventId && eventId.includes(':')) {
      // Instance ID format: "eventId:YYYY-MM-DD"
      const parts = eventId.split(':');
      originalEventId = parts[0];
      if (!finalInstanceDate && parts[1]) {
        finalInstanceDate = parts[1];
      }
    }

    // Check if already checked out
    // 🔥 FIX: Use originalEventId and filter by instance_date
    let existingQuery = supabase
      .from('event_attendance')
      .select('checked_out_at, is_deleted')
      .eq('event_id', originalEventId) // Use originalEventId, not instanceId
      .eq('user_id', user.id)
      .eq('is_deleted', false);
    
    if (finalInstanceDate) {
      existingQuery = existingQuery.eq('instance_date', finalInstanceDate);
    } else {
      existingQuery = existingQuery.is('instance_date', null);
    }
    
    const { data: existingAttendance } = await existingQuery.single();

    if (!existingAttendance) {
      throw { code: 'ATTENDANCE_NOT_FOUND', message: 'No attendance record found' };
    }

    if (existingAttendance.is_deleted) {
      throw { code: 'ATTENDANCE_DELETED', message: 'Cannot check out of a deleted attendance record' };
    }

    if (existingAttendance.checked_out_at) {
      throw { code: 'ALREADY_CHECKED_OUT', message: 'Already checked out of this event' };
    }

    // 🔥 FIX: Use originalEventId and filter by instance_date
    let updateQuery = supabase
      .from('event_attendance')
      .update({ checked_out_at: new Date().toISOString() })
      .eq('event_id', originalEventId) // Use originalEventId, not instanceId
      .eq('user_id', user.id)
      .eq('is_deleted', false); // Only update non-deleted records
    
    if (finalInstanceDate) {
      updateQuery = updateQuery.eq('instance_date', finalInstanceDate);
    } else {
      updateQuery = updateQuery.is('instance_date', null);
    }
    
    const { data, error } = await updateQuery.select().single();

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

    // Extract original event ID and instance_date if eventId is an instanceId
    let originalEventId = eventId;
    let instanceDate = filters.instanceDate || null;
    
    if (eventId && eventId.includes(':')) {
      // Instance ID format: "eventId:YYYY-MM-DD"
      const parts = eventId.split(':');
      originalEventId = parts[0];
      if (!instanceDate && parts[1]) {
        instanceDate = parts[1];
      }
    }
    
    console.log('🔍 getEventAttendance called:', {
      eventId,
      originalEventId,
      instanceDate,
      userId: user.id,
      filters,
    });

    // Note: user_id is not a foreign key, so we can't join directly
    // We'll return user_id and fetch profiles separately if needed
    let query = supabase
      .from('event_attendance')
      .select('*')
      .eq('event_id', originalEventId) // 🔥 FIX: Use originalEventId, not instanceId
      .eq('is_deleted', false); // Exclude soft-deleted records
    
    // Filter by instance_date for recurring events
    if (instanceDate) {
      query = query.eq('instance_date', instanceDate);
    } else if (filters.instanceDate === null) {
      // Explicitly filter for non-recurring events only
      query = query.is('instance_date', null);
    }
    // Otherwise, get all (both recurring and non-recurring) - useful for viewing all instances

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
      // 🔥 FIX: Use originalEventId, not instanceId
      const { data: event } = await supabase
        .from('events')
        .select('team_id')
        .eq('id', originalEventId)
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
      originalEventId,
      instanceDate,
      hasError: !!error,
      error: error ? { code: error.code, message: error.message, details: error.details, hint: error.hint } : null,
      dataCount: data?.length || 0,
      data: data?.map(a => ({
        id: a.id,
        user_id: a.user_id,
        status: a.status,
        is_deleted: a.is_deleted,
        checked_in_at: a.checked_in_at,
        instance_date: a.instance_date,
      })) || [],
    });

    if (error) {
      console.error('❌ Attendance query error:', error);
      throw error;
    }
    
    // 🔥 FIX: Check for RLS failures (empty data with no error = RLS denial)
    if (!data && !error) {
      console.warn('⚠️ getEventAttendance: RLS may have denied the request (empty data, no error)');
      // Return empty array instead of null for consistency
      return { data: [], error: null };
    }

    // Apply position group filter if needed
    let filteredData = data ?? [];
    if (positionGroupFilter && positionGroupFilter.length > 0) {
      filteredData = filteredData.filter(attendance => 
        positionGroupFilter.includes(attendance.user_id)
      );
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
 * @param {string} eventId - Event ID (can be instanceId for recurring events)
 * @param {string|null} instanceDate - Instance date (YYYY-MM-DD) for recurring events
 * @returns {Promise<Object>} Attendance status { status: string | null, checkedInAt: string | null }
 */
export async function getUserAttendanceStatus(supabaseClient, eventId, instanceDate = null) {
  if (!supabaseClient) {
    throw new Error('Supabase client is required. Use useSupabase() hook and pass the client to this function.');
  }
  
  const supabase = supabaseClient;
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { status: null, checkedInAt: null };
    }

    // Extract original event ID and instance_date if eventId is an instanceId
    let originalEventId = eventId;
    let finalInstanceDate = instanceDate;
    
    if (eventId && eventId.includes(':')) {
      // Instance ID format: "eventId:YYYY-MM-DD"
      const parts = eventId.split(':');
      originalEventId = parts[0];
      if (!finalInstanceDate && parts[1]) {
        finalInstanceDate = parts[1];
      }
    }
    
    // 🔥 FIX: Use originalEventId and filter by instance_date
    let query = supabase
      .from('event_attendance')
      .select('status, checked_in_at')
      .eq('event_id', originalEventId) // Use originalEventId, not instanceId
      .eq('user_id', user.id)
      .eq('is_deleted', false);
    
    if (finalInstanceDate) {
      query = query.eq('instance_date', finalInstanceDate);
    } else {
      query = query.is('instance_date', null);
    }
    
    const { data, error } = await query.single();

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
export async function getAttendanceHistory(supabaseClient, userId = null, startDate = null, endDate = null) {
  if (!supabaseClient) {
    throw new Error('Supabase client is required. Use useSupabase() hook and pass the client to this function.');
  }
  
  const supabase = supabaseClient;
  
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
    
    // 🔥 FIX: Check for RLS failures (empty data with no error = RLS denial)
    if (!data && !error) {
      console.warn('⚠️ getEventAttendance: RLS may have denied the request (empty data, no error)');
      // Return empty array instead of null for consistency
      return { data: [], error: null };
    }

    return { data: data ?? [], error: null };
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
 * @param {string} eventId - Event ID (can be instanceId for recurring events)
 * @param {string|null} instanceDate - Instance date (YYYY-MM-DD) for recurring events
 * @param {Date|null} instanceEndTime - Instance-specific end time (optional, will be calculated if not provided)
 * @returns {Promise<Object>} QR token and image data
 */
export async function generateEventQRCode(supabaseClient, eventId, instanceDate = null, instanceEndTime = null) {
  if (!supabaseClient) {
    throw new Error('Supabase client is required. Use useSupabase() hook and pass the client to this function.');
  }
  const supabase = supabaseClient;
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw { code: 'UNAUTHORIZED', message: 'User not authenticated' };
    }

    // Extract original event ID and instance_date if eventId is an instanceId
    let originalEventId = eventId;
    let finalInstanceDate = instanceDate;
    
    if (eventId && eventId.includes(':')) {
      // Instance ID format: "eventId:YYYY-MM-DD"
      const parts = eventId.split(':');
      originalEventId = parts[0];
      if (!finalInstanceDate && parts[1]) {
        finalInstanceDate = parts[1];
      }
    }
    
    // Get event details (include created_by to check if user is event creator)
    // 🔥 FIX: Use originalEventId, not instanceId
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*, team_id, created_by, is_recurring')
      .eq('id', originalEventId)
      .single();

    if (eventError || !event) {
      throw { code: 'EVENT_NOT_FOUND', message: 'Event not found' };
    }

    // Validate instance_date for recurring events
    if (event.is_recurring && !finalInstanceDate) {
      console.error('❌ Missing instance_date for recurring event:', {
        eventId,
        originalEventId,
        instanceDate,
        finalInstanceDate,
        eventIsRecurring: event.is_recurring,
      });
      throw { 
        code: 'INSTANCE_DATE_REQUIRED', 
        message: 'Instance date is required for recurring events' 
      };
    }
    
    if (!event.is_recurring && finalInstanceDate) {
      throw { 
        code: 'INVALID_INSTANCE_DATE', 
        message: 'Instance date cannot be provided for non-recurring events' 
      };
    }
    
    console.log('✅ Generating QR code:', {
      eventId,
      originalEventId,
      instanceDate,
      finalInstanceDate,
      eventIsRecurring: event.is_recurring,
    });

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

    // 🔥 FIX: For recurring events, use instance-specific end_time
    // For non-recurring events, use the event's end_time directly
    let expiresAt;
    if (event.is_recurring && finalInstanceDate) {
      // If instanceEndTime is provided, use it directly (more accurate)
      if (instanceEndTime) {
        expiresAt = new Date(instanceEndTime);
        console.log('✅ Using provided instance end_time for QR code:', {
          instanceEndTime: expiresAt.toISOString(),
          instanceDate: finalInstanceDate,
        });
      } else {
        // Calculate instance-specific end_time based on instanceDate and event duration
        const originalStart = new Date(event.start_time);
        const originalEnd = new Date(event.end_time);
        const duration = originalEnd.getTime() - originalStart.getTime(); // Duration in milliseconds
        
        // Parse instanceDate (YYYY-MM-DD) and set the time from original event
        const [year, month, day] = finalInstanceDate.split('-').map(Number);
        const instanceStart = new Date(year, month - 1, day, originalStart.getHours(), originalStart.getMinutes(), originalStart.getSeconds(), originalStart.getMilliseconds());
        const instanceEnd = new Date(instanceStart.getTime() + duration);
        
        expiresAt = instanceEnd;
        
        console.log('✅ Calculated instance-specific end_time for QR code:', {
          originalEnd: event.end_time,
          instanceDate: finalInstanceDate,
          instanceStart: instanceStart.toISOString(),
          instanceEnd: instanceEnd.toISOString(),
          duration: duration / (1000 * 60), // Duration in minutes
        });
      }
    } else {
      // Non-recurring event: use original end_time
      expiresAt = new Date(event.end_time);
    }
    
    // 🔥 FIX: Include instanceDate in QR token generation for recurring events
    const qrToken = await generateQRToken(originalEventId, event.team_id, expiresAt, finalInstanceDate);

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

