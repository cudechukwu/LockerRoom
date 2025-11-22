/**
 * Event Types Constants
 * Single source of truth for event type definitions, icons, colors, and labels
 */

// Event type IDs (must match database schema)
export const EVENT_TYPES = {
  PRACTICE: 'practice',
  GAME: 'game',
  MEETING: 'meeting',
  FILM: 'film',
  REVIEW: 'review', // Alias for film in some contexts
  TRAINING: 'training',
  CONDITIONING: 'conditioning',
  PERSONAL: 'personal',
  OTHER: 'other',
};

// Event type display labels
export const EVENT_TYPE_LABELS = {
  [EVENT_TYPES.PRACTICE]: 'Practice',
  [EVENT_TYPES.GAME]: 'Game',
  [EVENT_TYPES.MEETING]: 'Meeting',
  [EVENT_TYPES.FILM]: 'Film',
  [EVENT_TYPES.REVIEW]: 'Film Review',
  [EVENT_TYPES.TRAINING]: 'Training',
  [EVENT_TYPES.CONDITIONING]: 'Conditioning',
  [EVENT_TYPES.PERSONAL]: 'Personal',
  [EVENT_TYPES.OTHER]: 'Other',
};

// Event type icons (single character badges)
export const EVENT_TYPE_ICONS = {
  [EVENT_TYPES.PRACTICE]: 'P',
  [EVENT_TYPES.GAME]: 'G',
  [EVENT_TYPES.MEETING]: 'M',
  [EVENT_TYPES.FILM]: 'F',
  [EVENT_TYPES.REVIEW]: 'F',
  [EVENT_TYPES.TRAINING]: 'T',
  [EVENT_TYPES.CONDITIONING]: 'T',
  [EVENT_TYPES.PERSONAL]: 'P',
  [EVENT_TYPES.OTHER]: 'O',
};

// Default colors for event types (can be overridden by team colors)
export const EVENT_TYPE_DEFAULT_COLORS = {
  [EVENT_TYPES.PRACTICE]: '#FF4444', // Will use team primary
  [EVENT_TYPES.GAME]: '#1F2937', // Dark gray/black
  [EVENT_TYPES.MEETING]: '#10B981', // Green
  [EVENT_TYPES.FILM]: '#8B5CF6', // Purple
  [EVENT_TYPES.REVIEW]: '#8B5CF6', // Purple
  [EVENT_TYPES.TRAINING]: '#F59E0B', // Orange
  [EVENT_TYPES.CONDITIONING]: '#F59E0B', // Orange
  [EVENT_TYPES.PERSONAL]: '#6B7280', // Gray
  [EVENT_TYPES.OTHER]: '#6B7280', // Gray
};

/**
 * Get event color based on type and team colors
 * @param {string} eventType - Event type ID
 * @param {Object} teamColors - Team colors { primary, secondary }
 * @returns {string} Hex color code
 */
export function getEventColor(eventType, teamColors = {}) {
  // Special handling for practice (uses team primary) and game (uses team secondary)
  if (eventType === EVENT_TYPES.PRACTICE && teamColors.primary) {
    return teamColors.primary;
  }
  if (eventType === EVENT_TYPES.GAME && teamColors.secondary) {
    return teamColors.secondary;
  }
  
  return EVENT_TYPE_DEFAULT_COLORS[eventType] || EVENT_TYPE_DEFAULT_COLORS[EVENT_TYPES.OTHER];
}

/**
 * Get event type info (label, icon, color)
 * @param {string} eventType - Event type ID
 * @param {Object} teamColors - Team colors { primary, secondary }
 * @returns {Object} { label, icon, color }
 */
export function getEventTypeInfo(eventType, teamColors = {}) {
  return {
    label: EVENT_TYPE_LABELS[eventType] || EVENT_TYPE_LABELS[EVENT_TYPES.OTHER],
    icon: EVENT_TYPE_ICONS[eventType] || EVENT_TYPE_ICONS[EVENT_TYPES.OTHER],
    color: getEventColor(eventType, teamColors),
  };
}

/**
 * Get all event types as array for dropdowns/selectors
 * @param {Object} teamColors - Team colors { primary, secondary }
 * @returns {Array} Array of { id, title, color, icon }
 */
export function getEventTypesArray(teamColors = {}) {
  return [
    {
      id: EVENT_TYPES.PRACTICE,
      title: EVENT_TYPE_LABELS[EVENT_TYPES.PRACTICE],
      color: getEventColor(EVENT_TYPES.PRACTICE, teamColors),
      icon: EVENT_TYPE_ICONS[EVENT_TYPES.PRACTICE],
    },
    {
      id: EVENT_TYPES.GAME,
      title: EVENT_TYPE_LABELS[EVENT_TYPES.GAME],
      color: getEventColor(EVENT_TYPES.GAME, teamColors),
      icon: EVENT_TYPE_ICONS[EVENT_TYPES.GAME],
    },
    {
      id: EVENT_TYPES.MEETING,
      title: EVENT_TYPE_LABELS[EVENT_TYPES.MEETING],
      color: getEventColor(EVENT_TYPES.MEETING, teamColors),
      icon: EVENT_TYPE_ICONS[EVENT_TYPES.MEETING],
    },
    {
      id: EVENT_TYPES.FILM,
      title: EVENT_TYPE_LABELS[EVENT_TYPES.FILM],
      color: getEventColor(EVENT_TYPES.FILM, teamColors),
      icon: EVENT_TYPE_ICONS[EVENT_TYPES.FILM],
    },
    {
      id: EVENT_TYPES.TRAINING,
      title: EVENT_TYPE_LABELS[EVENT_TYPES.TRAINING],
      color: getEventColor(EVENT_TYPES.TRAINING, teamColors),
      icon: EVENT_TYPE_ICONS[EVENT_TYPES.TRAINING],
    },
    {
      id: EVENT_TYPES.OTHER,
      title: EVENT_TYPE_LABELS[EVENT_TYPES.OTHER],
      color: getEventColor(EVENT_TYPES.OTHER, teamColors),
      icon: EVENT_TYPE_ICONS[EVENT_TYPES.OTHER],
    },
  ];
}

/**
 * Check if event type is valid
 * @param {string} eventType - Event type to validate
 * @returns {boolean}
 */
export function isValidEventType(eventType) {
  return Object.values(EVENT_TYPES).includes(eventType);
}

