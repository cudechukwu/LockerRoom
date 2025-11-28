/**
 * Time Utilities
 * Functions for parsing and formatting time strings
 */

/**
 * Normalize baseDate to a proper Date object
 * Handles Date objects, date strings (MM/DD/YYYY), and ISO strings
 * @param {Date|string} baseDate - Base date
 * @returns {Date} Normalized Date object
 */
function normalizeBaseDate(baseDate) {
  if (!baseDate) return new Date();
  
  // If it's already a Date object, return a copy
  if (baseDate instanceof Date) {
    return new Date(baseDate);
  }
  
  // If it's a string, try to parse it
  if (typeof baseDate === 'string') {
    // Handle MM/DD/YYYY format
    const slashMatch = baseDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashMatch) {
      const month = parseInt(slashMatch[1], 10) - 1; // JS months are 0-indexed
      const day = parseInt(slashMatch[2], 10);
      const year = parseInt(slashMatch[3], 10);
      // Use ISO format for consistent parsing across platforms
      return new Date(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00`);
    }
    
    // Try standard Date parsing (handles ISO strings)
    const parsed = new Date(baseDate);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  
  // Fallback to current date
  return new Date();
}

/**
 * Parse a time string (e.g., "3:00 PM") to a Date object
 * @param {string} timeStr - Time string in format "H:MM AM/PM"
 * @param {Date|string} baseDate - Base date to anchor the time to (defaults to today)
 * @returns {Date} Date object with time set, anchored to baseDate
 */
export function parseTimeString(timeStr, baseDate = new Date()) {
  // Normalize baseDate to handle strings and ensure proper Date object
  const normalizedBase = normalizeBaseDate(baseDate);
  
  if (!timeStr) {
    return new Date(new Date(normalizedBase).setHours(15, 0, 0, 0));
  }
  
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) {
    // If parsing fails, return default time on base date
    if (__DEV__) {
      console.warn(`Failed to parse time string: "${timeStr}". Using default 3:00 PM.`);
    }
    return new Date(new Date(normalizedBase).setHours(15, 0, 0, 0));
  }
  
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const period = match[3].toUpperCase();
  
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  
  // Create new date from normalized baseDate to avoid mutation
  return new Date(new Date(normalizedBase).setHours(hours, minutes, 0, 0));
}

/**
 * Format a Date object to a time string (e.g., "3:00 PM")
 * @param {Date} date - Date object
 * @returns {string} Time string in format "H:MM AM/PM"
 */
export function formatTimeString(date) {
  if (!date || !(date instanceof Date)) {
    if (__DEV__) {
      console.warn('formatTimeString received invalid date:', date);
    }
    const defaultDate = new Date();
    defaultDate.setHours(15, 0, 0, 0);
    return defaultDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/**
 * Get default start time (3:00 PM)
 * @param {Date|string} baseDate - Base date to anchor the time to (defaults to today)
 * @returns {Date} Date object set to 3:00 PM, anchored to baseDate
 */
export function getDefaultStartTime(baseDate = new Date()) {
  const normalizedBase = normalizeBaseDate(baseDate);
  return new Date(new Date(normalizedBase).setHours(15, 0, 0, 0));
}

/**
 * Get default end time (5:00 PM)
 * @param {Date|string} baseDate - Base date to anchor the time to (defaults to today)
 * @returns {Date} Date object set to 5:00 PM, anchored to baseDate
 */
export function getDefaultEndTime(baseDate = new Date()) {
  const normalizedBase = normalizeBaseDate(baseDate);
  return new Date(new Date(normalizedBase).setHours(17, 0, 0, 0));
}

