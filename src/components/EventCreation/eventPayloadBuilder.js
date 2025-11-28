/**
 * Event Payload Builder
 * Builds event data payload for API submission
 */

import { formatTimeString } from '../../utils/timeUtils';

/**
 * Build event payload from form data
 * @param {object} formData - Form data object
 * @param {object} options - Additional options
 * @param {object} options.eventTypes - Event type configurations
 * @param {object} options.teamColors - Team color configuration
 * @returns {object} Event payload for API
 */
export function buildEventPayload(formData, options = {}) {
  const { eventTypes = [], teamColors = { primary: '#FF4444' } } = options;

  // Map whoSeesThis to visibility and postTo
  // Note: postTo values use capitalized format ('Team'/'Personal') for API compatibility
  // The formatEventData function will normalize these to lowercase ('team'/'personal')
  let visibility = 'team';
  let postTo = 'Team';
  
  if (formData.whoSeesThis === 'personal') {
    visibility = 'personal';
    postTo = 'Personal';
  } else if (formData.whoSeesThis === 'specificGroups') {
    visibility = 'team'; // Specific groups still use 'team' visibility
    postTo = 'Team';
  } else {
    visibility = 'team';
    postTo = 'Team';
  }

  // Get event type color
  const eventTypeConfig = eventTypes.find(type => type.id === formData.eventType);
  const color = eventTypeConfig?.color || teamColors.primary;

  // Format times
  const startTimeStr = formatTimeString(formData.startTime);
  const endTimeStr = formatTimeString(formData.endTime);

  // Build payload (camelCase format - formatEventData will convert to snake_case)
  // Note: This payload structure matches what formatEventData expects
  const payload = {
    postTo, // 'Team' or 'Personal' - formatEventData normalizes to lowercase
    eventType: formData.eventType,
    title: formData.title,
    date: formData.date,
    startTime: startTimeStr,
    endTime: endTimeStr,
    location: formData.location ?? '',
    recurring: formData.recurring, // Array of day names or [] for non-recurring, e.g. ['Sunday', 'Friday']
    recurringDays: formData.recurring, // Alias for clarity - array of selected days (empty array = not recurring)
    notes: formData.notes ?? '',
    color,
    // Visibility field (important for filtering)
    visibility, // 'team' or 'personal'
    // Attendance groups data
    // Note: isFullTeamEvent is derived from assignedAttendanceGroups array length (empty = full team)
    assignedAttendanceGroups: formData.whoSeesThis === 'specificGroups' 
      ? (formData.selectedGroups || [])
      : [],
    // Attendance settings
    attendanceRequirement: formData.attendanceRequirement || 'required',
    checkInMethods: formData.checkInMethods || ['qr_code', 'location', 'manual'],
  };

  return payload;
}

