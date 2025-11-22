import { supabase } from '../lib/supabase';

// =============================================
// EVENT ENDPOINTS
// =============================================

/**
 * Get upcoming events for a team
 * @param {string} teamId - Team ID
 * @param {number} limit - Maximum number of events to return
 * @returns {Promise<Object>} Events and error info
 */
export async function getUpcomingEvents(teamId, limit = 10) {
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
 * @param {string} teamId - Team ID
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Object>} Events and error info
 */
export async function getEventsInRange(teamId, startDate, endDate) {
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
export async function getEventsForMonth(teamId, month) {
  const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59);
  
  return getEventsInRange(teamId, startOfMonth, endOfMonth);
}

/**
 * Get events for a specific week
 * @param {string} teamId - Team ID
 * @param {Date} weekStart - Start of the week
 * @returns {Promise<Object>} Events and error info
 */
export async function getEventsForWeek(teamId, weekStart) {
  const endOfWeek = new Date(weekStart);
  endOfWeek.setDate(weekStart.getDate() + 6);
  endOfWeek.setHours(23, 59, 59);
  
  return getEventsInRange(teamId, weekStart, endOfWeek);
}

/**
 * Get events for a specific day
 * @param {string} teamId - Team ID
 * @param {Date} date - Date to get events for
 * @returns {Promise<Object>} Events and error info
 */
export async function getEventsForDay(teamId, date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  return getEventsInRange(teamId, startOfDay, endOfDay);
}

/**
 * Create a new event
 * @param {Object} eventData - Event data
 * @returns {Promise<Object>} Created event and error info
 */
export async function createEvent(eventData) {
  try {
    const { data, error } = await supabase
      .from('events')
      .insert([eventData])
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error creating event:', error);
    return { data: null, error };
  }
}

/**
 * Update an existing event
 * @param {string} eventId - Event ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated event and error info
 */
export async function updateEvent(eventId, updates) {
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
 * @param {string} eventId - Event ID
 * @returns {Promise<Object>} Success status and error info
 */
export async function deleteEvent(eventId) {
  try {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId);

    if (error) throw error;

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
    created_by: userId
  };
}

/**
 * Get team colors for event styling
 * @param {string} teamId - Team ID
 * @returns {Promise<Object>} Team colors
 */
export async function getTeamColors(teamId) {
  try {
    const { data, error } = await supabase
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

