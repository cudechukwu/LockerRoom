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

    return { data: data ?? [], error: null };
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    return { data: [], error };
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
    
    // Check for RLS denial (data is null but no error)
    if (!data && !error) {
      throw new Error('RLS denied the request');
    }

    // NOTE: Expected attendees are populated by database trigger automatically
    // No need to call RPC explicitly - this prevents double-write hazards
    // If trigger fails, it will be logged by the database

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
 * Delete a single instance of a recurring event
 * Creates an exception record in the database to mark the instance as deleted
 * 
 * @param {Object} supabaseClient - Supabase client instance (from useSupabase() hook)
 * @param {string} originalEventId - Original event UUID
 * @param {Date} instanceDate - Date of the instance to delete (local time)
 * @returns {Promise<Object>} Success status and error info
 */
export async function deleteRecurringInstance(supabaseClient, originalEventId, instanceDate) {
  if (!supabaseClient) {
    throw new Error('Supabase client is required. Use useSupabase() hook and pass the client to this function.');
  }
  const supabase = supabaseClient;

  try {
    // Format date as YYYY-MM-DD (local time, not UTC)
    const year = instanceDate.getFullYear();
    const month = String(instanceDate.getMonth() + 1).padStart(2, '0');
    const day = String(instanceDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    // Call RPC to create exception
    console.log('🔧 Calling delete_recurring_instance RPC:', {
      p_event_id: originalEventId,
      p_exception_date: dateStr
    });
    
    const { data, error } = await supabase.rpc('delete_recurring_instance', {
      p_event_id: originalEventId,
      p_exception_date: dateStr
    });

    console.log('🔧 RPC response:', { data, error });

    if (error) {
      console.error('❌ Error deleting recurring instance:', error);
      // Check if RPC function doesn't exist (migration not run)
      if (error.message && error.message.includes('function') && error.message.includes('does not exist')) {
        throw new Error('Database migration not run. Please run the create_delete_recurring_instance_rpc.sql migration first.');
      }
      throw error;
    }

    return { success: true, data, error: null };
  } catch (error) {
    console.error('Error deleting recurring instance:', error);
    return { success: false, data: null, error };
  }
}

/**
 * Get exceptions (deleted instances) for a recurring event
 * Used to filter out deleted instances during frontend expansion
 * 
 * @param {Object} supabaseClient - Supabase client instance
 * @param {string} eventId - Original event UUID
 * @returns {Promise<Object>} Object with data (array of Date objects) and error
 */
export async function getEventExceptions(supabaseClient, eventId) {
  if (!supabaseClient) {
    throw new Error('Supabase client is required. Use useSupabase() hook and pass the client to this function.');
  }
  const supabase = supabaseClient;

  try {
    const { data, error } = await supabase.rpc('get_event_exceptions', {
      p_event_id: eventId
    });

    if (error) {
      console.error('Error fetching event exceptions:', error);
      throw error;
    }

    // Convert date strings to Date objects (local time)
    const deletedDates = (data || [])
      .filter(exception => exception.exception_type === 'deleted')
      .map(exception => {
        const [year, month, day] = exception.exception_date.split('-').map(Number);
        return new Date(year, month - 1, day); // Local time
      });

    return { data: deletedDates, error: null };
  } catch (error) {
    console.error('Error fetching event exceptions:', error);
    return { data: [], error };
  }
}

/**
 * Delete an event (or entire recurring series)
 * For recurring instances, use deleteRecurringInstance() instead
 * 
 * @param {Object} supabaseClient - Supabase client instance (from useSupabase() hook)
 * @param {string} eventId - Event ID (original event UUID for recurring events)
 * @returns {Promise<Object>} Success status and error info
 */
export async function deleteEvent(supabaseClient, eventId) {
  if (!supabaseClient) {
    throw new Error('Supabase client is required. Use useSupabase() hook and pass the client to this function.');
  }
  const supabase = supabaseClient;
  
  // Validate eventId format - reject instanceId format (contains colon)
  if (eventId && eventId.includes(':')) {
    throw new Error('Cannot delete by instanceId. Use deleteRecurringInstance() for single instances, or pass originalEventId to deleteEvent()');
  }
  
  try {
    // Delete the event - CASCADE will handle related records (including exceptions)
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
 * @param {Object} supabaseClient - Supabase client instance (from useSupabase() hook)
 * @param {string} eventId - Event ID
 * @returns {Promise<Object>} Event details and error info
 */
export async function getEventDetails(supabaseClient, eventId) {
  if (!supabaseClient) {
    throw new Error('Supabase client is required. Use useSupabase() hook and pass the client to this function.');
  }
  const supabase = supabaseClient;
  
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
 * @param {Object} supabaseClient - Supabase client instance (from useSupabase() hook)
 * @param {string} eventId - Event ID
 * @param {string} status - RSVP status ('attending', 'not_attending', 'maybe', 'pending')
 * @param {string} notes - Optional notes
 * @returns {Promise<Object>} RSVP result and error info
 */
export async function rsvpToEvent(supabaseClient, eventId, status, notes = null) {
  if (!supabaseClient) {
    throw new Error('Supabase client is required. Use useSupabase() hook and pass the client to this function.');
  }
  const supabase = supabaseClient;
  
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
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
    
    // Check for RLS denial (data is null but no error)
    if (!data && !error) {
      throw new Error('RLS denied the request');
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error RSVPing to event:', error);
    return { data: null, error };
  }
}

/**
 * Get user's RSVP status for an event
 * @param {Object} supabaseClient - Supabase client instance (from useSupabase() hook)
 * @param {string} eventId - Event ID
 * @returns {Promise<Object>} RSVP status and error info
 */
export async function getUserEventRSVP(supabaseClient, eventId) {
  if (!supabaseClient) {
    throw new Error('Supabase client is required. Use useSupabase() hook and pass the client to this function.');
  }
  const supabase = supabaseClient;
  
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
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
 * @param {Object} supabaseClient - Supabase client instance (from useSupabase() hook)
 * @param {string} teamId - Team ID
 * @returns {Promise<Object>} User's events and error info
 */
export async function getUserCreatedEvents(supabaseClient, teamId) {
  if (!supabaseClient) {
    throw new Error('Supabase client is required. Use useSupabase() hook and pass the client to this function.');
  }
  const supabase = supabaseClient;
  
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
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
    return { data: [], error };
  }
}

/**
 * Escape special characters in search term to prevent injection
 * @param {string} term - Search term to escape
 * @returns {string} Escaped search term
 */
function escapeSearchTerm(term) {
  // Replace special characters that could break PostgREST queries
  return String(term)
    .replace(/[%_\\]/g, '\\$&') // Escape %, _, and backslash
    .trim();
}

/**
 * Search events by title or description
 * @param {Object} supabaseClient - Supabase client instance (from useSupabase() hook)
 * @param {string} teamId - Team ID
 * @param {string} searchTerm - Search term
 * @returns {Promise<Object>} Matching events and error info
 */
export async function searchEvents(supabaseClient, teamId, searchTerm) {
  if (!supabaseClient) {
    throw new Error('Supabase client is required. Use useSupabase() hook and pass the client to this function.');
  }
  const supabase = supabaseClient;
  
  try {
    // Escape search term to prevent injection
    const escapedTerm = escapeSearchTerm(searchTerm);
    
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('team_id', teamId)
      .or(`title.ilike.%${escapedTerm}%,description.ilike.%${escapedTerm}%`)
      .order('start_time', { ascending: true });

    if (error) throw error;

    return { data: data || [], error: null };
  } catch (error) {
    console.error('Error searching events:', error);
    return { data: [], error };
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

/**
 * Parse event date and time from form data
 * Uses robust parsing to handle various formats and edge cases
 * @param {string} dateStr - Date string (expected MM/DD/YYYY format)
 * @param {string} timeStr - Time string (expected H:MM AM/PM format)
 * @returns {Date} Parsed date object
 */
function parseEventDateTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) {
    throw new Error('Date and time are required');
  }

  // Parse date - handle MM/DD/YYYY format
  const dateMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!dateMatch) {
    throw new Error(`Invalid date format: ${dateStr}. Expected MM/DD/YYYY`);
  }

  const month = parseInt(dateMatch[1], 10) - 1; // JS months are 0-indexed
  const day = parseInt(dateMatch[2], 10);
  const year = parseInt(dateMatch[3], 10);

  // Validate date components
  if (isNaN(month) || isNaN(day) || isNaN(year) || month < 0 || month > 11 || day < 1 || day > 31) {
    throw new Error(`Invalid date values: ${dateStr}`);
  }

  // Parse time - handle H:MM AM/PM format
  const timeMatch = timeStr.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
  if (!timeMatch) {
    throw new Error(`Invalid time format: ${timeStr}. Expected H:MM AM/PM`);
  }

  let hour = parseInt(timeMatch[1], 10);
  const minute = parseInt(timeMatch[2], 10);
  const period = timeMatch[3].toUpperCase();

  // Validate time components
  if (isNaN(hour) || isNaN(minute) || hour < 1 || hour > 12 || minute < 0 || minute > 59) {
    throw new Error(`Invalid time values: ${timeStr}`);
  }

  // Convert to 24-hour format
  if (period === 'PM' && hour !== 12) {
    hour += 12;
  } else if (period === 'AM' && hour === 12) {
    hour = 0;
  }

  // Create date object - will handle invalid dates (e.g., Feb 30) by wrapping
  const dateTime = new Date(year, month, day, hour, minute);
  
  // Validate the resulting date (handles DST transitions and invalid dates)
  if (isNaN(dateTime.getTime())) {
    throw new Error(`Invalid date/time combination: ${dateStr} ${timeStr}`);
  }

  // Check if date was adjusted due to invalid day (e.g., Feb 30 -> Mar 2)
  if (dateTime.getDate() !== day || dateTime.getMonth() !== month || dateTime.getFullYear() !== year) {
    throw new Error(`Invalid date: ${dateStr} (day doesn't exist in that month)`);
  }

  return dateTime;
}

export function formatEventData(formData, teamId, userId) {
  // Parse start date and time using robust parser
  const startTimeStr = formData.startTime || formData.time;
  if (!startTimeStr) {
    throw new Error('Start time is required');
  }
  
  const startDateTime = parseEventDateTime(formData.date, startTimeStr);
  
  // Parse end time (use endTime or default to 1 hour after start)
  let endDateTime;
  if (formData.endTime) {
    endDateTime = parseEventDateTime(formData.date, formData.endTime);
  } else {
    // Default to 1 hour duration
    endDateTime = new Date(startDateTime);
    endDateTime.setHours(startDateTime.getHours() + 1);
  }
  
  // Ensure end time is after start time
  if (endDateTime <= startDateTime) {
    throw new Error('End time must be after start time');
  }

  // Determine if event is recurring and what the pattern is
  // New format: recurring is an array of day names, e.g. ['Sunday', 'Friday']
  // Empty array [] means not recurring
  // Legacy format: recurring is a string like 'Daily', 'Weekly', etc.
  const recurringDays = formData.recurringDays || formData.recurring;
  const isRecurring = recurringDays && (
    (Array.isArray(recurringDays) && recurringDays.length > 0) ||
    (typeof recurringDays === 'string' && recurringDays !== 'None')
  );
  
  // For new format (array of days), we'll need backend support for recurring_days array
  // For now, convert to a pattern string for backward compatibility
  // TODO: Backend should support recurring_days array field
  let recurringPattern = null;
  if (isRecurring) {
    if (Array.isArray(recurringDays)) {
      // New format: array of days
      // Determine pattern based on number of days selected
      if (recurringDays.length === 7) {
        recurringPattern = 'daily';
      } else if (recurringDays.length === 1) {
        // Single day selected - check if it matches the start date's day of week
        const selectedDay = recurringDays[0];
        const startDayOfWeek = startDateTime.toLocaleDateString('en-US', { weekday: 'long' });
        
        if (selectedDay === startDayOfWeek) {
          // Selected day matches start date - use weekly pattern
          recurringPattern = 'weekly';
        } else {
          // Selected day doesn't match start date - use custom_weekly
          // This requires recurring_days which backend doesn't have yet, but we'll handle it
          recurringPattern = 'custom_weekly';
        }
      } else {
        recurringPattern = 'custom_weekly'; // Multiple days = custom weekly (requires recurring_days)
      }
    } else {
      // Legacy format: string pattern
      const recurringPatternMap = {
        'Daily': 'daily',
        'Weekly': 'weekly',
        'Biweekly': 'biweekly',
        'Monthly': 'monthly'
      };
      recurringPattern = recurringPatternMap[recurringDays] || recurringDays.toLowerCase();
    }
  }
  
  // ⚠️ WORKAROUND: Store selected days in description as JSON for custom_weekly events
  // This is a temporary solution until backend adds recurring_days column
  // Format: "RECURRING_DAYS_JSON:['Sunday','Friday']"
  let description = formData.notes || null;
  if (isRecurring && Array.isArray(recurringDays) && recurringPattern === 'custom_weekly') {
    const daysJson = JSON.stringify(recurringDays);
    const daysMarker = `RECURRING_DAYS_JSON:${daysJson}`;
    description = description 
      ? `${description}\n\n${daysMarker}` 
      : daysMarker;
  }

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
    description: description,
    event_type: mapEventTypeToDatabase(formData.eventType || 'other'),
    start_time: startDateTime.toISOString(),
    end_time: endDateTime.toISOString(),
    location: formData.location || null,
    is_recurring: isRecurring,
    recurring_pattern: recurringPattern,
    // TODO: Backend needs to add recurring_days JSONB array column to support specific days
    // For now, we only send recurring_pattern which the backend supports
    // recurring_days: Array.isArray(recurringDays) ? recurringDays : null,
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
    
    // Check for RLS denial (data is null but no error)
    if (!attachmentRecord && !attachmentError) {
      // Clean up uploaded file if RLS denied
      await supabase.storage
        .from('event-attachments')
        .remove([filePath]);
      throw new Error('RLS denied the request');
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
 * @param {string} eventId - Event ID (can be instanceId for recurring events)
 * @returns {Promise<Object>} Attachments array and error info
 */
export async function getEventAttachments(supabaseClient, eventId) {
  if (!supabaseClient) {
    throw new Error('Supabase client is required. Use useSupabase() hook and pass the client to this function.');
  }
  const supabase = supabaseClient;

  try {
    // Extract original event ID if eventId is an instanceId
    // Attachments are stored against the original event ID, not instance IDs
    let originalEventId = eventId;
    if (eventId && eventId.includes(':')) {
      // Instance ID format: "eventId:YYYY-MM-DD"
      originalEventId = eventId.split(':')[0];
    }
    
    const { data, error } = await supabase
      .from('event_attachments')
      .select('*')
      .eq('event_id', originalEventId) // Use original event ID, not instanceId
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

    // Delete database record FIRST (transactional order: DB then storage)
    const { error: deleteError } = await supabase
      .from('event_attachments')
      .delete()
      .eq('id', attachmentId);

    if (deleteError) throw deleteError;

    // Then attempt to delete from storage (non-critical - log if fails)
    if (attachment?.s3_key) {
      const { error: storageError } = await supabase.storage
        .from('event-attachments')
        .remove([attachment.s3_key]);

      if (storageError) {
        console.warn('Warning: Failed to delete file from storage (DB record already deleted):', storageError);
        // Continue - DB record is already deleted, storage cleanup can happen later
      }
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Error deleting event attachment:', error);
    return { success: false, error };
  }
}
