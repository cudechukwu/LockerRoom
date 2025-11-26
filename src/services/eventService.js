/**
 * Event Service
 * Pure functions for event data formatting and utilities
 * 
 * All functions are pure (no side effects, testable)
 */

/**
 * Format event date for display
 * @param {Date|string} date - Event date
 * @returns {string} Formatted date string
 */
export function formatEventDate(date) {
  if (!date) return '';
  
  try {
    // Handle Date objects directly
    let eventDate;
    if (date instanceof Date) {
      eventDate = date;
    } else if (typeof date === 'string') {
      // Try parsing the string - handle various formats
      eventDate = new Date(date);
      // If parsing fails (e.g., MM/DD/YYYY format), try manual parsing
      if (isNaN(eventDate.getTime()) && date.includes('/')) {
        const parts = date.split('/');
        if (parts.length === 3) {
          const month = parseInt(parts[0]) - 1; // JS months are 0-indexed
          const day = parseInt(parts[1]);
          const year = parseInt(parts[2]);
          eventDate = new Date(year, month, day);
        }
      }
    } else {
      eventDate = new Date(date);
    }
    
    if (isNaN(eventDate.getTime())) return '';
    
    return eventDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  } catch (error) {
    console.error('Error formatting date:', error, date);
    return '';
  }
}

/**
 * Normalize date/time value to Date object
 * @param {Date|string} value - Date object or ISO string
 * @returns {Date|null} Normalized Date object or null if invalid
 */
function normalizeDate(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Format a single time value
 * @param {Date} date - Date object
 * @returns {string} Formatted time string (e.g., "5:30 PM")
 */
function formatSingleTime(date) {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return '';
  
  let hours = date.getHours();
  let minutes = date.getMinutes();
  
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  minutes = minutes.toString().padStart(2, '0');
  
  return `${hours}:${minutes} ${ampm}`;
}

/**
 * Format event time range for display
 * @param {Date|string} startTime - Event start time (Date object or ISO string)
 * @param {Date|string} endTime - Event end time (Date object or ISO string, optional)
 * @returns {string} Formatted time string (e.g., "5:30 PM - 6:00 PM")
 */
export function formatEventTime(startTime, endTime) {
  if (!startTime) return '';
  
  try {
    const startDate = normalizeDate(startTime);
    if (!startDate) return '';
    
    const startFormatted = formatSingleTime(startDate);
    if (!startFormatted) return '';
    
    if (!endTime) {
      return startFormatted;
    }
    
    const endDate = normalizeDate(endTime);
    if (!endDate) return startFormatted;
    
    const endFormatted = formatSingleTime(endDate);
    if (!endFormatted) return startFormatted;
    
    return `${startFormatted} - ${endFormatted}`;
  } catch (error) {
    console.error('Error formatting time:', error, startTime, endTime);
    return '';
  }
}

/**
 * Get event type display label
 * @param {string} eventType - Event type code
 * @returns {string} Display label for event type
 */
export function getEventTypeLabel(eventType) {
  const typeMap = {
    'practice': 'Practice',
    'game': 'Game',
    'meeting': 'Meeting',
    'lift': 'Lift',
    'film': 'Film Review',
    'review': 'Film Review',
    'other': 'Other',
  };
  
  return typeMap[eventType] || eventType || 'Event';
}

/**
 * Check if event has location data
 * @param {Object} event - Event object
 * @returns {boolean} Whether event has location
 */
export function hasEventLocation(event) {
  if (!event) return false;
  return !!(event.latitude && event.longitude);
}

/**
 * Format event location for display
 * @param {Object} event - Event object
 * @returns {string} Formatted location string
 */
export function formatEventLocation(event) {
  if (!event) return '';
  
  if (event.location) {
    return String(event.location);
  }
  
  if (hasEventLocation(event)) {
    return `${event.latitude.toFixed(6)}, ${event.longitude.toFixed(6)}`;
  }
  
  return '';
}

/**
 * Check if event is in the past
 * @param {Object} event - Event object
 * @returns {boolean} Whether event has ended
 */
export function isEventPast(event) {
  if (!event || !event.endTime) return false;
  
  try {
    const endTime = new Date(event.endTime);
    if (isNaN(endTime.getTime())) return false;
    
    return endTime < new Date();
  } catch (error) {
    return false;
  }
}

/**
 * Check if event is currently happening
 * @param {Object} event - Event object
 * @returns {boolean} Whether event is currently active
 */
export function isEventActive(event) {
  if (!event) return false;
  
  try {
    const now = new Date();
    const startTime = event.startTime ? new Date(event.startTime) : null;
    const endTime = event.endTime ? new Date(event.endTime) : null;
    
    if (!startTime || isNaN(startTime.getTime())) return false;
    if (!endTime || isNaN(endTime.getTime())) return false;
    
    return now >= startTime && now <= endTime;
  } catch (error) {
    return false;
  }
}

/**
 * Get event duration in minutes
 * @param {Object} event - Event object
 * @returns {number|null} Duration in minutes or null if invalid
 */
export function getEventDuration(event) {
  if (!event || !event.startTime || !event.endTime) return null;
  
  try {
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
    
    return Math.round((end - start) / (1000 * 60));
  } catch (error) {
    return null;
  }
}

/**
 * Check if an event is visible to a user
 * Pure function - all fallback rules contained here
 * 
 * ⚠️ DO NOT use attendance data - visibility ≠ attendance
 * Visibility is determined ONLY by: visibility type, groups, role, ownership
 * 
 * @param {Object} event - Event object with visibility, groups, etc.
 * @param {Object|string} user - User object with id, or user ID string
 * @param {string[]} userGroupIds - Array of group IDs user belongs to (empty array if none)
 * @param {Object} userRole - User's role object { role: string } (used to determine isCoach)
 * @returns {boolean} True if event is visible to user
 */
export function isEventVisibleToUser(event, user, userGroupIds = [], userRole = null) {
  if (!event || !user) return false;
  
  // Extract user ID (handle both object and string)
  const userId = typeof user === 'string' ? user : user.id;
  if (!userId) {
    if (__DEV__) console.warn('isEventVisibleToUser: No user ID provided', { user, event: event?.id });
    return false;
  }
  
  // Extract created_by (handle both UUID and object formats)
  const createdBy = typeof event.created_by === 'string' 
    ? event.created_by 
    : event.created_by?.id || event.createdBy || event.created_by;
  
  // Normalize both IDs to strings for comparison
  const userIdStr = String(userId);
  const createdByStr = createdBy ? String(createdBy) : null;
  
  const isCreator = createdByStr === userIdStr;
  const visibility = event.visibility || 'team';
  
  // Rule 1: Creator always sees (highest priority)
  if (isCreator) return true;
  
  // Rule 2: Personal events - only creator sees (CRITICAL: must return false if not creator)
  if (visibility === 'personal') {
    if (__DEV__) {
      console.warn('isEventVisibleToUser: Personal event filtered out', {
        eventId: event.id,
        eventTitle: event.title,
        userId: userIdStr,
        createdBy: createdByStr,
        isCreator,
      });
    }
    return false;
  }
  
  // Handle assigned_attendance_groups (can be JSONB array or regular array)
  let assignedGroups = event.assigned_attendance_groups || [];
  if (typeof assignedGroups === 'string') {
    try {
      assignedGroups = JSON.parse(assignedGroups);
    } catch {
      assignedGroups = [];
    }
  }
  if (!Array.isArray(assignedGroups)) {
    assignedGroups = [];
  }
  
  const hasAssignedGroups = assignedGroups.length > 0;
  
  // Rule 3: Determine if full team event (empty groups = full team)
  // ⚠️ Note: is_full_team_event flag is redundant and should be removed
  const isFullTeamEvent = !hasAssignedGroups;
  
  // Rule 4: Visibility type filtering
  if (visibility === 'coaches_only') {
    // Check if user is a coach (using permissionService logic)
    const isCoach = userRole && userRole.role && 
      ['head_coach', 'assistant_coach', 'position_coach', 'team_admin'].includes(userRole.role);
    
    if (!isCoach) return false;
    
    // If groups assigned, coach must be in group
    if (hasAssignedGroups) {
      const userInGroup = checkUserInGroups(userGroupIds, assignedGroups);
      if (!userInGroup) return false;
    }
    return true;
  }
  
  if (visibility === 'players_only') {
    // Check if user is a coach (coaches don't see players_only)
    const isCoach = userRole && userRole.role && 
      ['head_coach', 'assistant_coach', 'position_coach', 'team_admin'].includes(userRole.role);
    
    if (isCoach) return false;
    
    // If groups assigned, player must be in group
    if (hasAssignedGroups) {
      const userInGroup = checkUserInGroups(userGroupIds, assignedGroups);
      if (!userInGroup) return false;
    }
    return true;
  }
  
  // Rule 5: Team visibility
  if (visibility === 'team') {
    // Check if user is a coach
    const isCoach = userRole && userRole.role && 
      ['head_coach', 'assistant_coach', 'position_coach', 'team_admin'].includes(userRole.role);
    
    // Coaches always see team events (even if group-specific)
    if (isCoach) return true;
    
    // Players: see if full team OR in assigned group
    if (isFullTeamEvent) return true;
    if (hasAssignedGroups) {
      const userInGroup = checkUserInGroups(userGroupIds, assignedGroups);
      return userInGroup;
    }
  }
  
  return false;
}

/**
 * Helper function for group matching
 * @param {string[]} userGroupIds - User's group IDs
 * @param {string[]|any[]} assignedGroups - Event's assigned group IDs
 * @returns {boolean} Whether user is in at least one assigned group
 */
function checkUserInGroups(userGroupIds, assignedGroups) {
  if (!userGroupIds || !Array.isArray(userGroupIds) || userGroupIds.length === 0) {
    return false;
  }
  if (!assignedGroups || !Array.isArray(assignedGroups) || assignedGroups.length === 0) {
    return false;
  }
  
  // Convert both arrays to strings for comparison (handles UUID strings)
  const userGroupIdStrings = userGroupIds.map(id => String(id));
  const assignedGroupIdStrings = assignedGroups.map(id => String(id));
  
  return assignedGroupIdStrings.some(gid => userGroupIdStrings.includes(gid));
}

