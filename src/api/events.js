// Supabase client is now passed as a parameter to all functions
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

// =============================================
// EVENT ENDPOINTS
// =============================================

/**
 * Get upcoming events for a team
 * @param {string} teamId - Team ID
 * @param {number} limit - Maximum number of events to return
 * @returns {Promise<Object>} Events and error info
 */
export async function getUpcomingEvents(supabaseClient, teamId, limit = 10) {
  if (!supabaseClient) {
    throw new Error('Supabase client is required. Use useSupabase() hook and pass the client to this function.');
  }
  const supabase = supabaseClient;
  
  try {
    const { data, error } = await supabase
      .rpc('get_upcoming_events', {
        p_team_id: teamId,
        p_limit: limit
      });

    if (error) throw error;

    return { data: data || [], error: null };
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    return { data: null, error };
  }
}

/**
 * Get events for a specific date range
 * @param {Object} supabaseClient - Supabase client instance (from useSupabase() hook)
 * @param {string} teamId - Team ID
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Object>} Events and error info
 */
export async function getEventsInRange(supabaseClient, teamId, startDate, endDate) {
  if (!supabaseClient) {
    throw new Error('Supabase client is required. Use useSupabase() hook and pass the client to this function.');
  }
  const supabase = supabaseClient;
  
  try {
    const { data, error } = await supabase
      .rpc('get_events_in_range', {
        p_team_id: teamId,
        p_start_date: startDate.toISOString(),
        p_end_date: endDate.toISOString()
      });

    if (error) throw error;

    return { data: data || [], error: null };
  } catch (error) {
    console.error('Error fetching events in range:', error);
    return { data: null, error };
  }
}

/**
 * Get events for a specific month
 * @param {string} teamId - Team ID
 * @param {Date} month - Month to get events for
 * @returns {Promise<Object>} Events and error info
 */
export async function getEventsForMonth(supabaseClient, teamId, month) {
  const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59);
  
  return getEventsInRange(supabaseClient, teamId, startOfMonth, endOfMonth);
}

/**
 * Get events for a specific week
 * @param {string} teamId - Team ID
 * @param {Date} weekStart - Start of the week
 * @returns {Promise<Object>} Events and error info
 */
export async function getEventsForWeek(supabaseClient, teamId, weekStart) {
  const endOfWeek = new Date(weekStart);
  endOfWeek.setDate(weekStart.getDate() + 6);
  endOfWeek.setHours(23, 59, 59);
  
  return getEventsInRange(supabaseClient, teamId, weekStart, endOfWeek);
}

/**
 * Get events for a specific day
 * @param {string} teamId - Team ID
 * @param {Date} date - Date to get events for
 * @returns {Promise<Object>} Events and error info
 */
export async function getEventsForDay(supabaseClient, teamId, date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  return getEventsInRange(supabaseClient, teamId, startOfDay, endOfDay);
}

/**
 * Create a new event
 * @param {Object} supabaseClient - Supabase client instance (from useSupabase() hook)
 * @param {Object} eventData - Event data
 * @returns {Promise<Object>} Created event and error info
 */
export async function createEvent(supabaseClient, eventData) {
  if (!supabaseClient) {
    throw new Error('Supabase client is required. Use useSupabase() hook and pass the client to this function.');
  }
  const supabase = supabaseClient;
  
  try {
    const { data, error } = await supabase
      .from('events')
      .insert([eventData])
      .select()
      .single();

    if (error) throw error;

    // Populate expected attendees (trigger will also do this, but calling explicitly ensures it happens)
    // Convert JSONB array to UUID array for the function
    const assignedGroupIds = eventData.assigned_attendance_groups && Array.isArray(eventData.assigned_attendance_groups) && eventData.assigned_attendance_groups.length > 0
      ? eventData.assigned_attendance_groups.map(id => typeof id === 'string' ? id : id.toString())
      : null;

    // Derive is_full_team_event from assigned_attendance_groups (empty = full team)
    const isFullTeamEvent = !assignedGroupIds || assignedGroupIds.length === 0;
    
    const { error: attendeesError } = await supabase.rpc('populate_event_expected_attendees', {
      p_event_id: data.id,
      p_team_id: eventData.team_id,
      p_is_full_team_event: isFullTeamEvent,
      p_assigned_group_ids: assignedGroupIds
    });

    if (attendeesError) {
      console.warn('Warning: Could not populate expected attendees (trigger may handle it):', attendeesError);
      // Don't fail event creation, just log the warning
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error creating event:', error);
    return { data: null, error };
  }
}

/**
 * Update an existing event
 * @param {Object} supabaseClient - Supabase client instance (from useSupabase() hook)
 * @param {string} eventId - Event ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated event and error info
 */
export async function updateEvent(supabaseClient, eventId, updates) {
  if (!supabaseClient) {
    throw new Error('Supabase client is required. Use useSupabase() hook and pass the client to this function.');
  }
  const supabase = supabaseClient;
  
  try {
    const { data, error } = await supabase
      .from('events')
      .update(updates)
      .eq('id', eventId)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error updating event:', error);
    return { data: null, error };
  }
}

/**
 * Delete an event
 * @param {Object} supabaseClient - Supabase client instance (from useSupabase() hook)
 * @param {string} eventId - Event ID
 * @returns {Promise<Object>} Success status and error info
 */
export async function deleteEvent(supabaseClient, eventId) {
  if (!supabaseClient) {
    throw new Error('Supabase client is required. Use useSupabase() hook and pass the client to this function.');
  }
  const supabase = supabaseClient;
  
  try {
    // Delete the event - CASCADE will handle related records
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId);

    if (error) {
      console.error('Error deleting event:', error);
      throw error;
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Error deleting event:', error);
    return { success: false, error };
  }
}

/**
 * Get event details with attendees
 * @param {string} eventId - Event ID
 * @returns {Promise<Object>} Event details and error info
 */
export async function getEventDetails(eventId) {
  try {
    // Get event details
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError) throw eventError;

    // Get attendees
    const { data: attendeesData, error: attendeesError } = await supabase
      .from('event_attendees')
      .select(`
        *,
        user_profiles (
          id,
          full_name,
          avatar_url,
          position
        )
      `)
      .eq('event_id', eventId);

    if (attendeesError) throw attendeesError;

    const eventWithAttendees = {
      ...eventData,
      attendees: attendeesData || []
    };

    return { data: eventWithAttendees, error: null };
  } catch (error) {
    console.error('Error fetching event details:', error);
    return { data: null, error };
  }
}

/**
 * RSVP to an event
 * @param {string} eventId - Event ID
 * @param {string} status - RSVP status ('attending', 'not_attending', 'maybe', 'pending')
 * @param {string} notes - Optional notes
 * @returns {Promise<Object>} RSVP result and error info
 */
export async function rsvpToEvent(eventId, status, notes = null) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('event_attendees')
      .upsert({
        event_id: eventId,
        user_id: user.id,
        status,
        notes,
        responded_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error RSVPing to event:', error);
    return { data: null, error };
  }
}

/**
 * Get user's RSVP status for an event
 * @param {string} eventId - Event ID
 * @returns {Promise<Object>} RSVP status and error info
 */
export async function getUserEventRSVP(eventId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('event_attendees')
      .select('*')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }

    return { data: data || null, error: null };
  } catch (error) {
    console.error('Error fetching user RSVP:', error);
    return { data: null, error };
  }
}

/**
 * Get events created by the current user
 * @param {string} teamId - Team ID
 * @returns {Promise<Object>} User's events and error info
 */
export async function getUserCreatedEvents(teamId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('team_id', teamId)
      .eq('created_by', user.id)
      .order('start_time', { ascending: true });

    if (error) throw error;

    return { data: data || [], error: null };
  } catch (error) {
    console.error('Error fetching user created events:', error);
    return { data: null, error };
  }
}

/**
 * Search events by title or description
 * @param {string} teamId - Team ID
 * @param {string} searchTerm - Search term
 * @returns {Promise<Object>} Matching events and error info
 */
export async function searchEvents(teamId, searchTerm) {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('team_id', teamId)
      .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      .order('start_time', { ascending: true });

    if (error) throw error;

    return { data: data || [], error: null };
  } catch (error) {
    console.error('Error searching events:', error);
    return { data: null, error };
  }
}

// =============================================
// UTILITY FUNCTIONS
// =============================================

/**
 * Convert event data from form to database format
 * @param {Object} formData - Form data
 * @param {string} teamId - Team ID
 * @param {string} userId - User ID
 * @returns {Object} Database-ready event data
 */
/**
 * Map frontend event type to database event type
 * The database uses 'review' instead of 'film'
 */
function mapEventTypeToDatabase(eventType) {
  if (eventType === 'film') {
    return 'review';
  }
  return eventType;
}

export function formatEventData(formData, teamId, userId) {
  // Parse date in MM/DD/YYYY format
  const dateParts = formData.date.split('/');
  const month = parseInt(dateParts[0]) - 1; // JS months are 0-indexed
  const day = parseInt(dateParts[1]);
  const year = parseInt(dateParts[2]);
  
  // Parse start time (use startTime or time field)
  const startTimeStr = formData.startTime || formData.time;
  const startTimeParts = startTimeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  let startHour = parseInt(startTimeParts[1]);
  const startMinute = parseInt(startTimeParts[2]);
  const startPeriod = startTimeParts[3].toUpperCase();
  
  if (startPeriod === 'PM' && startHour !== 12) {
    startHour += 12;
  } else if (startPeriod === 'AM' && startHour === 12) {
    startHour = 0;
  }
  
  const startDateTime = new Date(year, month, day, startHour, startMinute);
  
  // Parse end time (use endTime or startTime/time field)
  const endTimeStr = formData.endTime || formData.startTime || formData.time;
  const endTimeParts = endTimeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  let endHour = parseInt(endTimeParts[1]);
  const endMinute = parseInt(endTimeParts[2]);
  const endPeriod = endTimeParts[3].toUpperCase();
  
  if (endPeriod === 'PM' && endHour !== 12) {
    endHour += 12;
  } else if (endPeriod === 'AM' && endHour === 12) {
    endHour = 0;
  }
  
  const endDateTime = new Date(year, month, day, endHour, endMinute);
  
  // If endTime is not provided, default to 1 hour duration
  if (!formData.endTime) {
    endDateTime.setHours(startDateTime.getHours() + 1);
  }

  // Determine if event is recurring and what the pattern is
  const isRecurring = formData.recurring && formData.recurring !== 'None';
  
  // Normalize recurring pattern to lowercase to match database constraints
  const recurringPatternMap = {
    'Daily': 'daily',
    'Weekly': 'weekly',
    'Biweekly': 'biweekly',
    'Monthly': 'monthly'
  };
  const recurringPattern = isRecurring ? (recurringPatternMap[formData.recurring] || formData.recurring.toLowerCase()) : null;

  // Normalize visibility to match database constraints
  const visibilityMap = {
    'Team': 'team',
    'Personal': 'personal',
    'Coaches Only': 'coaches_only',
    'Players Only': 'players_only'
  };
  const visibility = visibilityMap[formData.postTo] || 'team';

  // Handle attendance groups assignment
  // ⚠️ Note: is_full_team_event is redundant - derive from assigned_attendance_groups array length
  // Empty array = full team event, non-empty = group-specific event
  const assignedGroups = formData.assignedAttendanceGroups || [];
  
  // Convert group IDs to JSONB array (ensure it's an array of strings/UUIDs)
  const assignedGroupsJsonb = Array.isArray(assignedGroups) && assignedGroups.length > 0
    ? assignedGroups
    : [];

  // Handle attendance settings
  const attendanceRequirement = formData.attendanceRequirement || 'required';
  const checkInMethods = Array.isArray(formData.checkInMethods) && formData.checkInMethods.length > 0
    ? formData.checkInMethods
    : ['qr_code', 'location', 'manual']; // Default to all methods

  return {
    team_id: teamId,
    title: formData.title,
    description: formData.notes || null,
    event_type: mapEventTypeToDatabase(formData.eventType || 'other'),
    start_time: startDateTime.toISOString(),
    end_time: endDateTime.toISOString(),
    location: formData.location || null,
    is_recurring: isRecurring,
    recurring_pattern: recurringPattern,
    recurring_until: formData.recurringUntil ? new Date(formData.recurringUntil).toISOString() : null,
    color: formData.color || '#FF4444',
    is_all_day: formData.isAllDay || false,
    visibility: visibility,
    created_by: userId,
    // Attendance groups fields
    assigned_attendance_groups: assignedGroupsJsonb,
    // Attendance settings
    attendance_requirement: attendanceRequirement,
    check_in_methods: checkInMethods,
  };
}

// Re-export isEventVisibleToUser from eventService for backward compatibility
// ⚠️ DEPRECATED: Use the function from eventService.js directly
// This function now requires userRole parameter for proper visibility filtering
export { isEventVisibleToUser } from '../services/eventService';

/**
 * Filter events by user's visibility (groups, role, visibility type)
 * @param {Array} events - Array of events
 * @param {Object|string} user - User object with id, or user ID string
 * @param {string[]} userGroupIds - Array of group IDs the user belongs to
 * @param {Object} userRole - User's role object { role: string }
 * @returns {Array} Filtered events
 */
export function filterEventsByUserVisibility(events, user, userGroupIds = [], userRole = null) {
  if (!events || !Array.isArray(events)) {
    return [];
  }

  const { isEventVisibleToUser } = require('../services/eventService');
  return events.filter(event => isEventVisibleToUser(event, user, userGroupIds, userRole));
}

/**
 * Filter events by user's attendance groups
 * @deprecated Use filterEventsByUserVisibility instead (includes role and visibility type filtering)
 * @param {Array} events - Array of events
 * @param {string} userId - User ID
 * @param {string[]} userGroupIds - Array of group IDs the user belongs to
 * @returns {Array} Filtered events
 */
export function filterEventsByUserGroups(events, userId, userGroupIds = []) {
  if (!events || !Array.isArray(events)) {
    return [];
  }

  const { isEventVisibleToUser } = require('../services/eventService');
  // Legacy: pass userId as string, no role (will only filter by groups)
  return events.filter(event => isEventVisibleToUser(event, userId, userGroupIds, null));
}

/**
 * Get team colors for event styling
 * @param {string} teamId - Team ID
 * @returns {Promise<Object>} Team colors
 */
export async function getTeamColors(supabaseClient, teamId) {
  try {
    const { data, error } = await supabaseClient
      .from('teams')
      .select('primary_color, secondary_color')
      .eq('id', teamId)
      .single();

    if (error) throw error;

    return {
      primary: data.primary_color || '#FF4444',
      secondary: data.secondary_color || '#000000'
    };
  } catch (error) {
    console.error('Error fetching team colors:', error);
    return {
      primary: '#FF4444',
      secondary: '#000000'
    };
  }
}

// Re-export from constants for backward compatibility
export { getEventColor } from '../constants/eventTypes';

// =============================================
// EVENT ATTACHMENTS
// =============================================

/**
 * Upload an attachment to an event
 * @param {Object} supabaseClient - Supabase client instance
 * @param {string} eventId - Event ID
 * @param {string} teamId - Team ID
 * @param {Object} file - File object with uri, name, type
 * @returns {Promise<Object>} Attachment record and error info
 */
export async function uploadEventAttachment(supabaseClient, eventId, teamId, file) {
  if (!supabaseClient) {
    throw new Error('Supabase client is required. Use useSupabase() hook and pass the client to this function.');
  }
  const supabase = supabaseClient;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const fileExtension = file.name?.split('.').pop() || 'bin';
    const fileName = `${timestamp}-${randomStr}.${fileExtension}`;
    
    // Team-scoped path: event-attachments/{team_id}/{event_id}/{filename}
    const filePath = `${teamId}/${eventId}/${fileName}`;

    // Read file as base64 (for React Native compatibility)
    const base64 = await FileSystem.readAsStringAsync(file.uri, {
      encoding: 'base64',
    });
    const arrayBuffer = decode(base64);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('event-attachments')
      .upload(filePath, arrayBuffer, {
        contentType: file.type || 'application/octet-stream',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('❌ Upload failed:', uploadError);
      throw uploadError;
    }

    // Get signed URL (since bucket is private)
    const { data: urlData, error: urlError } = await supabase.storage
      .from('event-attachments')
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (urlError) {
      console.error('❌ Failed to create signed URL:', urlError);
      // Continue anyway - we can generate signed URLs on-demand later
    }

    // Get file size from ArrayBuffer
    const fileSize = arrayBuffer.byteLength;

    // Create attachment record in database
    const { data: attachmentRecord, error: attachmentError } = await supabase
      .from('event_attachments')
      .insert({
        event_id: eventId,
        team_id: teamId,
        filename: file.name || fileName,
        file_type: file.type || 'application/octet-stream',
        file_size: fileSize,
        s3_key: filePath,
        s3_url: urlData?.signedUrl || null,
        uploaded_by: user.id
      })
      .select()
      .single();

    if (attachmentError) {
      console.error('❌ Error creating attachment record:', attachmentError);
      // Try to clean up uploaded file
      await supabase.storage
        .from('event-attachments')
        .remove([filePath]);
      throw attachmentError;
    }

    console.log(`✅ Uploaded attachment ${fileName} successfully`);
    return { data: attachmentRecord, error: null };
  } catch (error) {
    console.error('Error uploading event attachment:', error);
    return { data: null, error };
  }
}

/**
 * Get all attachments for an event
 * @param {Object} supabaseClient - Supabase client instance
 * @param {string} eventId - Event ID
 * @returns {Promise<Object>} Attachments array and error info
 */
export async function getEventAttachments(supabaseClient, eventId) {
  if (!supabaseClient) {
    throw new Error('Supabase client is required. Use useSupabase() hook and pass the client to this function.');
  }
  const supabase = supabaseClient;

  try {
    const { data, error } = await supabase
      .from('event_attachments')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Generate fresh signed URLs for each attachment
    const attachmentsWithUrls = await Promise.all(
      (data || []).map(async (attachment) => {
        try {
          const { data: urlData, error: urlError } = await supabase.storage
            .from('event-attachments')
            .createSignedUrl(attachment.s3_key, 3600); // 1 hour expiry

          if (urlError) {
            console.warn(`Failed to generate signed URL for ${attachment.filename}:`, urlError);
            return { ...attachment, s3_url: null };
          }

          return { ...attachment, s3_url: urlData.signedUrl };
        } catch (err) {
          console.warn(`Error generating signed URL for ${attachment.filename}:`, err);
          return { ...attachment, s3_url: null };
        }
      })
    );

    return { data: attachmentsWithUrls, error: null };
  } catch (error) {
    console.error('Error fetching event attachments:', error);
    return { data: null, error };
  }
}

/**
 * Delete an event attachment
 * @param {Object} supabaseClient - Supabase client instance
 * @param {string} attachmentId - Attachment ID
 * @returns {Promise<Object>} Success status and error info
 */
export async function deleteEventAttachment(supabaseClient, attachmentId) {
  if (!supabaseClient) {
    throw new Error('Supabase client is required. Use useSupabase() hook and pass the client to this function.');
  }
  const supabase = supabaseClient;

  try {
    // Get attachment record first to get the file path
    const { data: attachment, error: fetchError } = await supabase
      .from('event_attachments')
      .select('s3_key')
      .eq('id', attachmentId)
      .single();

    if (fetchError) throw fetchError;

    // Delete from storage
    if (attachment?.s3_key) {
      const { error: storageError } = await supabase.storage
        .from('event-attachments')
        .remove([attachment.s3_key]);

      if (storageError) {
        console.warn('Warning: Failed to delete file from storage:', storageError);
        // Continue to delete DB record anyway
      }
    }

    // Delete database record (CASCADE will handle if needed)
    const { error: deleteError } = await supabase
      .from('event_attachments')
      .delete()
      .eq('id', attachmentId);

    if (deleteError) throw deleteError;

    return { success: true, error: null };
  } catch (error) {
    console.error('Error deleting event attachment:', error);
    return { success: false, error };
  }
}
