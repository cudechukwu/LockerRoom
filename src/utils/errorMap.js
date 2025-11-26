/**
 * Error Mapping Utilities
 * Centralized error handling and user-friendly messages
 * 
 * Benefits:
 * - UI becomes unaware of error shape
 * - Hooks become unaware of alert strings
 * - Ready for localization (i18n)
 * - Errors become testable
 * - Cleaner controller/hook code
 */

/**
 * Map attendance-related errors to user-friendly messages
 * @param {Error|Object} error - Error object from API
 * @returns {string} User-friendly error message
 */
export function mapAttendanceError(error) {
  if (!error) return 'An unknown error occurred';
  
  // Handle specific error codes
  if (error.code === 'NOT_IN_GROUP') {
    return error.message || 'This event is only for specific groups. You are not a member of any assigned group.';
  }
  
  if (error.code === 'EVENT_ENDED') {
    return error.message || 'This event has ended and check-ins are no longer allowed.';
  }
  
  if (error.code === 'ALREADY_CHECKED_IN') {
    return 'You are already checked in to this event.';
  }
  
  if (error.code === 'RLS_POLICY_VIOLATION') {
    return 'You do not have permission to perform this action.';
  }
  
  if (error.code === 'PGRST202') {
    return 'Database function not found. Please contact support.';
  }
  
  if (error.code === '42804') {
    return 'Data type mismatch. Please contact support.';
  }
  
  // Generic error messages
  return error.message || 'Unable to load attendance. Please try again.';
}

/**
 * Map check-in related errors to user-friendly messages
 * @param {Error|Object} error - Error object from API
 * @returns {string} User-friendly error message
 */
export function mapCheckInError(error) {
  if (!error) return 'Unable to check in. Please try again.';
  
  if (error.code === 'NOT_IN_GROUP') {
    return error.message || 'This event is only for specific groups. You are not a member of any assigned group. Please contact your coach if you believe this is an error.';
  }
  
  if (error.code === 'EVENT_ENDED') {
    return error.message || 'This event has ended and check-ins are no longer allowed.';
  }
  
  if (error.code === 'QR_INVALID' || error.code === 'QR_MISMATCH') {
    return error.message || 'Invalid QR code. Please scan the correct QR code for this event.';
  }
  
  if (error.code === 'QR_EXPIRED') {
    return 'This QR code has expired. Please request a new one from your coach.';
  }
  
  if (error.code === 'OUT_OF_RANGE') {
    return error.message || 'You are too far from the event location. Please move closer and try again.';
  }
  
  if (error.code === 'LOCATION_REQUIRED' || error.code === 'EVENT_LOCATION_NOT_SET') {
    return 'Location check-in is not available for this event.';
  }
  
  if (error.code === 'ALREADY_CHECKED_IN') {
    return 'You are already checked in to this event.';
  }
  
  if (error.code === 'PERMISSION_DENIED') {
    return 'You do not have permission to check in to this event.';
  }
  
  if (error.code === 'NETWORK_ERROR' || error.message?.includes('network')) {
    return 'Network error. Please check your connection and try again.';
  }
  
  return error.message || 'Unable to check in. Please try again.';
}

/**
 * Map role/permission errors
 * @param {Error|Object} error - Error object from API
 * @returns {string} User-friendly error message
 */
export function mapRoleError(error) {
  if (!error) return 'Unable to verify permissions. Please try again.';
  
  if (error.code === 'UNAUTHORIZED') {
    return 'You do not have permission to view this event.';
  }
  
  if (error.code === 'FORBIDDEN') {
    return 'Access denied. You do not have the required permissions.';
  }
  
  if (error.code === 'NOT_FOUND') {
    return 'Event not found or you do not have access to it.';
  }
  
  return error.message || 'Unable to load event details. Please try again.';
}

/**
 * Map creator fetch errors
 * @param {Error|Object} error - Error object from API
 * @returns {string} User-friendly error message
 */
export function mapCreatorError(error) {
  if (!error) return 'Unable to load event creator information.';
  
  if (error.code === 'NOT_FOUND') {
    return 'Event creator information not available.';
  }
  
  return error.message || 'Unable to load event creator information.';
}

/**
 * Map generic event errors
 * @param {Error|Object} error - Error object from API
 * @returns {string} User-friendly error message
 */
export function mapEventError(error) {
  if (!error) return 'An error occurred. Please try again.';
  
  if (error.code === 'NOT_FOUND') {
    return 'Event not found.';
  }
  
  if (error.code === 'UNAUTHORIZED') {
    return 'You do not have permission to access this event.';
  }
  
  if (error.code === 'NETWORK_ERROR') {
    return 'Network error. Please check your connection and try again.';
  }
  
  return error.message || 'An error occurred. Please try again.';
}


