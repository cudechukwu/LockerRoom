/**
 * eventInstanceUtils
 * Utility functions for handling recurring event instances
 */

/**
 * Get instance date from event object
 * 
 * Prefers explicit instanceDate (YYYY-MM-DD format) if available.
 * Falls back to extracting date from startTime if necessary.
 * 
 * @param {Object} event - Event object
 * @returns {string|null} Instance date in YYYY-MM-DD format, or null
 */
export function getInstanceDate(event) {
  // Prefer explicit instanceDate (YYYY-MM-DD format)
  if (event.instanceDate) {
    return event.instanceDate;
  }
  
  // Fallback: extract date from startTime
  if (event.startTime) {
    const date = new Date(event.startTime);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  return null;
}

