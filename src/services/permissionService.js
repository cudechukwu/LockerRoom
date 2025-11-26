/**
 * Permission Service
 * Pure functions for calculating event permissions
 * 
 * All functions are pure (no side effects, testable)
 * This is the single source of truth for permission logic
 */

const COACH_ROLES = ['head_coach', 'assistant_coach', 'position_coach', 'team_admin'];

/**
 * Check if user is a coach based on role
 * @param {Object|null} role - User's role object
 * @returns {boolean} Whether user is a coach
 */
export function isCoach(role) {
  if (!role || !role.role) {
    return false;
  }
  return COACH_ROLES.includes(role.role);
}

/**
 * Check if user is the event creator
 * @param {Object} user - Current user object
 * @param {Object} event - Event object with createdBy field
 * @returns {boolean} Whether user created the event
 */
export function isEventCreator(user, event) {
  if (!user || !event || !event.createdBy) {
    return false;
  }

  // Handle both UUID and string formats
  const createdBy = typeof event.createdBy === 'string' 
    ? event.createdBy 
    : event.createdBy?.id || event.createdBy;
  
  return createdBy === user.id;
}

/**
 * Calculate all event permissions for a user
 * @param {Object} user - Current user object
 * @param {Object|null} role - User's role object
 * @param {Object} event - Event object
 * @returns {Object} Permission object with all permissions
 */
export function calculateEventPermissions(user, role, event) {
  if (!user || !event) {
    return {
      isCoach: false,
      isEventCreator: false,
      canEdit: false,
      canDelete: false,
      canCheckIn: false,
      canViewAttendance: false,
      roleChecked: false,
    };
  }

  const userIsCoach = isCoach(role);
  const userIsCreator = isEventCreator(user, event);

  return {
    isCoach: userIsCoach,
    isEventCreator: userIsCreator,
    canEdit: userIsCoach || userIsCreator,
    canDelete: userIsCoach || userIsCreator,
    canCheckIn: !userIsCoach, // Players can check in, coaches cannot
    canViewAttendance: userIsCoach || userIsCreator,
    roleChecked: true,
  };
}

/**
 * Check if user can edit an event
 * @param {Object} user - Current user object
 * @param {Object|null} role - User's role object
 * @param {Object} event - Event object
 * @returns {boolean} Whether user can edit
 */
export function canEditEvent(user, role, event) {
  const permissions = calculateEventPermissions(user, role, event);
  return permissions.canEdit;
}

/**
 * Check if user can delete an event
 * @param {Object} user - Current user object
 * @param {Object|null} role - User's role object
 * @param {Object} event - Event object
 * @returns {boolean} Whether user can delete
 */
export function canDeleteEvent(user, role, event) {
  const permissions = calculateEventPermissions(user, role, event);
  return permissions.canDelete;
}

/**
 * Check if user can check in to an event
 * @param {Object} user - Current user object
 * @param {Object|null} role - User's role object
 * @param {Object} event - Event object
 * @param {Object|null} userAttendance - User's current attendance record
 * @returns {boolean} Whether user can check in
 */
export function canCheckIn(user, role, event, userAttendance) {
  const permissions = calculateEventPermissions(user, role, event);
  if (!permissions.canCheckIn) {
    return false;
  }
  
  // Additional check: user must not already be checked in
  if (userAttendance && !userAttendance.checked_out_at) {
    return false;
  }
  
  return true;
}

/**
 * Check if user can view attendance for an event
 * @param {Object} user - Current user object
 * @param {Object|null} role - User's role object
 * @param {Object} event - Event object
 * @returns {boolean} Whether user can view attendance
 */
export function canViewAttendance(user, role, event) {
  const permissions = calculateEventPermissions(user, role, event);
  return permissions.canViewAttendance;
}

