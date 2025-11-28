/**
 * Recurring Events Utilities
 * Functions for expanding recurring events into multiple instances
 * 
 * ⚠️ CRITICAL BACKEND REQUIREMENT:
 * To support multi-day weekly recurrence (e.g., "every Friday and Sunday"),
 * the backend MUST include a `recurring_days` field:
 * 
 *   recurring_days text[]  -- ['Friday', 'Sunday'] or ['friday', 'sunday']
 *   OR
 *   recurring_days integer[]  -- [5, 0] where 0=Sunday, 1=Monday, ..., 6=Saturday
 * 
 * Without this field, the frontend CANNOT correctly expand events for specific days.
 * 
 * ⚠️ TIME ZONE NOTE:
 * All date calculations use LOCAL TIME (not UTC) to match the codebase standard.
 * This ensures consistency with the calendar UI and avoids DST/timezone bugs.
 * 
 * ⚠️ MONTHLY RECURRENCE LIMITATIONS:
 * Currently supports "same day-of-month" only (e.g., 15th of each month).
 * Does NOT support:
 * - "nth weekday of month" (e.g., "first Monday")
 * - "last weekday of month" (e.g., "last Sunday")
 * - "last day of month" patterns
 */

/**
 * Day name to day-of-week number mapping (Sunday = 0)
 */
const DAY_NAME_TO_NUMBER = {
  'sunday': 0,
  'monday': 1,
  'tuesday': 2,
  'wednesday': 3,
  'thursday': 4,
  'friday': 5,
  'saturday': 6,
};

/**
 * Recurrence strategy map
 * Maps pattern names to expansion functions
 */
const RECURRENCE_STRATEGIES = {
  daily: null, // Will be set below
  weekly: null,
  biweekly: null,
  monthly: null,
  custom_weekly: null,
};

/**
 * Generate a stable instance ID for a recurring event occurrence
 * Format: {originalEventId}:{YYYY-MM-DD}
 * This ensures stable IDs across re-renders
 * 
 * @param {string} eventId - Original event ID
 * @param {Date} date - Date of the occurrence
 * @returns {string} Stable instance ID
 */
function generateInstanceId(eventId, date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${eventId}:${year}-${month}-${day}`;
}

/**
 * Add days to a date immutably (avoids timezone/DST bugs from mutations)
 * Uses LOCAL TIME to match codebase standard
 * 
 * @param {Date} date - Base date
 * @param {number} days - Number of days to add (can be negative)
 * @returns {Date} New date object (immutable)
 */
function addDaysImmutable(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Add months to a date immutably, handling edge cases (Jan 31 -> Feb 28/29)
 * Uses LOCAL TIME to match codebase standard
 * 
 * @param {Date} date - Base date
 * @param {number} months - Number of months to add (can be negative)
 * @returns {Date} New date object (immutable)
 */
function addMonthsImmutable(date, months) {
  const result = new Date(date);
  const day = result.getDate();
  result.setMonth(result.getMonth() + months);
  
  // Handle edge case: Jan 31 -> Feb 31 (invalid) -> Feb 28/29
  if (result.getDate() !== day) {
    result.setDate(0); // Go to last day of previous month
  }
  
  return result;
}

/**
 * Get the day of week (0 = Sunday, 6 = Saturday) for a date
 * Uses LOCAL TIME to match codebase standard
 * 
 * @param {Date} date - Date to get day of week for
 * @returns {number} Day of week (0-6)
 */
function getDayOfWeek(date) {
  return date.getDay();
}

/**
 * Normalize day name to lowercase for comparison
 * 
 * @param {string} dayName - Day name (e.g., "Friday", "friday", "FRIDAY")
 * @returns {string} Lowercase day name
 */
function normalizeDayName(dayName) {
  return String(dayName).toLowerCase();
}

/**
 * Convert day name to day number
 * 
 * @param {string} dayName - Day name (e.g., "Friday", "friday")
 * @returns {number} Day number (0-6) or null if invalid
 */
function dayNameToNumber(dayName) {
  const normalized = normalizeDayName(dayName);
  return DAY_NAME_TO_NUMBER[normalized] ?? null;
}

/**
 * Normalize date to midnight in local time
 * 
 * @param {Date} date - Date to normalize
 * @returns {Date} Date at midnight (local time)
 */
function normalizeToMidnight(date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Pre-compute event template for memory optimization
 * Reused across all instances to avoid cloning full event object in loops
 */
function createEventTemplate(event) {
  return {
    ...event,
    instanceId: null, // Will be set per instance
    isRecurringInstance: true,
    originalEventId: event.id,
  };
}

/**
 * Create an event instance for a specific date
 * Optimized for React Native: reuses Date objects and template
 * 
 * @param {Object} template - Pre-computed event template
 * @param {string} eventId - Original event ID
 * @param {Date} date - Date for the instance (normalized to midnight)
 * @param {number} hours - Hours component from original event
 * @param {number} minutes - Minutes component from original event
 * @param {number} seconds - Seconds component from original event
 * @param {number} ms - Milliseconds component from original event
 * @param {number} duration - Duration in milliseconds
 * @returns {Object} Event instance
 */
function createEventInstance(template, eventId, date, hours, minutes, seconds, ms, duration) {
  // Reuse date object instead of creating new one
  const instanceStart = new Date(date);
  instanceStart.setHours(hours, minutes, seconds, ms);
  const instanceEnd = new Date(instanceStart.getTime() + duration);
  
  // Extract instance date (YYYY-MM-DD) for attendance tracking
  const instanceDate = new Date(date);
  instanceDate.setHours(0, 0, 0, 0);
  const instanceDateStr = instanceDate.toISOString().split('T')[0]; // YYYY-MM-DD format

  return {
    ...template,
    instanceId: generateInstanceId(eventId, date),
    startTime: instanceStart,
    endTime: instanceEnd,
    date: instanceStart,
    instanceDate: instanceDateStr, // For attendance tracking: YYYY-MM-DD
  };
}

/**
 * Expand daily recurring event
 * 
 * @param {Object} event - Event to expand
 * @param {Date} originalStart - Original event start time
 * @param {Date} startDate - Range start
 * @param {Date} endDate - Range end
 * @param {number} duration - Event duration in ms
 * @param {number} hours - Hours component
 * @param {number} minutes - Minutes component
 * @param {number} seconds - Seconds component
 * @param {number} ms - Milliseconds component
 * @param {Date|null} recurringUntil - Recurring until date
 * @returns {Array} Array of event instances
 */
function expandDaily(event, originalStart, startDate, endDate, duration, hours, minutes, seconds, ms, recurringUntil, normalizedExceptions = new Set()) {
  // Normalize recurringUntil to midnight for consistent comparisons
  const normalizedUntil = recurringUntil ? normalizeToMidnight(recurringUntil) : null;
  
  // Fast-path exit: if recurringUntil is before startDate, no instances to generate
  if (normalizedUntil && normalizedUntil < startDate) {
    return [];
  }

  const instances = [];
  const template = createEventTemplate(event); // Pre-compute template
  const normalizedStart = normalizeToMidnight(startDate);
  const normalizedEnd = normalizeToMidnight(endDate);
  normalizedEnd.setHours(23, 59, 59, 999);

  // Keep full originalStart timestamp for comparisons, then normalize to midnight
  let currentDate = originalStart < startDate ? normalizedStart : normalizeToMidnight(originalStart);

  while (currentDate <= normalizedEnd) {
    if (normalizedUntil && currentDate > normalizedUntil) {
      break;
    }

    // Check if this date is in exceptions (deleted)
    const dateKey = normalizeToMidnight(currentDate).getTime();
    if (!normalizedExceptions.has(dateKey)) {
      instances.push(createEventInstance(template, event.id, currentDate, hours, minutes, seconds, ms, duration));
    }
    
    currentDate = addDaysImmutable(currentDate, 1);
  }

  return instances;
}

/**
 * Expand single-day weekly recurring event (same day of week each week)
 * 
 * @param {Object} event - Event to expand
 * @param {Date} originalStart - Original event start time
 * @param {Date} startDate - Range start
 * @param {Date} endDate - Range end
 * @param {number} duration - Event duration in ms
 * @param {number} hours - Hours component
 * @param {number} minutes - Minutes component
 * @param {number} seconds - Seconds component
 * @param {number} ms - Milliseconds component
 * @param {Date|null} recurringUntil - Recurring until date
 * @returns {Array} Array of event instances
 */
function expandSingleDayWeekly(event, originalStart, startDate, endDate, duration, hours, minutes, seconds, ms, recurringUntil, normalizedExceptions = new Set()) {
  // Normalize recurringUntil to midnight for consistent comparisons
  const normalizedUntil = recurringUntil ? normalizeToMidnight(recurringUntil) : null;
  
  // Fast-path exit: if recurringUntil is before startDate, no instances to generate
  if (normalizedUntil && normalizedUntil < startDate) {
    return [];
  }

  const instances = [];
  const template = createEventTemplate(event); // Pre-compute template
  const seenDates = new Set(); // Deduplication: track dates we've already added
  const normalizedStart = normalizeToMidnight(startDate);
  const normalizedEnd = normalizeToMidnight(endDate);
  normalizedEnd.setHours(23, 59, 59, 999);

  // Keep full originalStart timestamp for comparisons, then normalize to midnight
  const originalDate = normalizeToMidnight(originalStart);
  const originalDayOfWeek = getDayOfWeek(originalDate);

  // Find the first occurrence of this day of week >= startDate
  let currentDate = new Date(normalizedStart);
  const currentDayOfWeek = getDayOfWeek(currentDate);
  const daysToAdd = (originalDayOfWeek - currentDayOfWeek + 7) % 7;
  
  if (daysToAdd > 0) {
    currentDate = addDaysImmutable(currentDate, daysToAdd);
  } else {
    // Use the later of: normalizedStart or originalDate (based on timestamp comparison)
    currentDate = originalStart < startDate ? normalizedStart : originalDate;
  }

  while (currentDate <= normalizedEnd) {
    if (normalizedUntil && currentDate > normalizedUntil) {
      break;
    }

    // Check if this date is in exceptions (deleted)
    const dateKey = normalizeToMidnight(currentDate).getTime();
    if (normalizedExceptions.has(dateKey)) {
      currentDate = addDaysImmutable(currentDate, 7);
      continue;
    }

    // Deduplication: only add if we haven't seen this date
    const dateString = currentDate.toDateString();
    if (!seenDates.has(dateString)) {
      seenDates.add(dateString);
      instances.push(createEventInstance(template, event.id, currentDate, hours, minutes, seconds, ms, duration));
    }
    currentDate = addDaysImmutable(currentDate, 7);
  }

  return instances;
}

/**
 * Expand biweekly recurring event (every 2 weeks, same day of week)
 * 
 * @param {Object} event - Event to expand
 * @param {Date} originalStart - Original event start time
 * @param {Date} startDate - Range start
 * @param {Date} endDate - Range end
 * @param {number} duration - Event duration in ms
 * @param {number} hours - Hours component
 * @param {number} minutes - Minutes component
 * @param {number} seconds - Seconds component
 * @param {number} ms - Milliseconds component
 * @param {Date|null} recurringUntil - Recurring until date
 * @returns {Array} Array of event instances
 */
function expandBiweekly(event, originalStart, startDate, endDate, duration, hours, minutes, seconds, ms, recurringUntil, normalizedExceptions = new Set()) {
  // Normalize recurringUntil to midnight for consistent comparisons
  const normalizedUntil = recurringUntil ? normalizeToMidnight(recurringUntil) : null;
  
  // Fast-path exit: if recurringUntil is before startDate, no instances to generate
  if (normalizedUntil && normalizedUntil < startDate) {
    return [];
  }

  const instances = [];
  const template = createEventTemplate(event); // Pre-compute template
  const seenDates = new Set(); // Deduplication: track dates we've already added
  const normalizedStart = normalizeToMidnight(startDate);
  const normalizedEnd = normalizeToMidnight(endDate);
  normalizedEnd.setHours(23, 59, 59, 999);

  // Keep full originalStart timestamp for comparisons, then normalize to midnight
  const originalDate = normalizeToMidnight(originalStart);
  const originalDayOfWeek = getDayOfWeek(originalDate);

  // Find the first occurrence of this day of week >= startDate on the correct biweekly cycle
  // Use day-based difference instead of milliseconds for perfect alignment
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const daysDiff = Math.floor((normalizedStart.getTime() - originalDate.getTime()) / MS_PER_DAY);
  const weeksSince = Math.floor(daysDiff / 7);
  
  let currentDate = new Date(normalizedStart);
  const currentDayOfWeek = getDayOfWeek(currentDate);
  let daysToAdd = (originalDayOfWeek - currentDayOfWeek + 14) % 14;
  
  // Ensure we're on the correct biweekly cycle (every 2 weeks)
  if (weeksSince % 2 !== 0) {
    daysToAdd = (daysToAdd + 7) % 14;
  }
  
  if (daysToAdd > 0) {
    currentDate = addDaysImmutable(currentDate, daysToAdd);
  } else {
    // Use the later of: normalizedStart or originalDate (based on timestamp comparison)
    currentDate = originalStart < startDate ? normalizedStart : originalDate;
  }

  while (currentDate <= normalizedEnd) {
    if (normalizedUntil && currentDate > normalizedUntil) {
      break;
    }

    // Check if this date is in exceptions (deleted)
    const dateKey = normalizeToMidnight(currentDate).getTime();
    if (normalizedExceptions.has(dateKey)) {
      currentDate = addDaysImmutable(currentDate, 14);
      continue;
    }

    // Deduplication: only add if we haven't seen this date
    const dateString = currentDate.toDateString();
    if (!seenDates.has(dateString)) {
      seenDates.add(dateString);
      instances.push(createEventInstance(template, event.id, currentDate, hours, minutes, seconds, ms, duration));
    }
    currentDate = addDaysImmutable(currentDate, 14);
  }

  return instances;
}

/**
 * Expand monthly recurring event (same day of month each month)
 * ⚠️ LIMITATION: Only supports "same day-of-month" (e.g., 15th of each month).
 * Does NOT support "nth weekday" or "last day" patterns.
 * 
 * @param {Object} event - Event to expand
 * @param {Date} originalStart - Original event start time
 * @param {Date} startDate - Range start
 * @param {Date} endDate - Range end
 * @param {number} duration - Event duration in ms
 * @param {number} hours - Hours component
 * @param {number} minutes - Minutes component
 * @param {number} seconds - Seconds component
 * @param {number} ms - Milliseconds component
 * @param {Date|null} recurringUntil - Recurring until date
 * @returns {Array} Array of event instances
 */
function expandMonthly(event, originalStart, startDate, endDate, duration, hours, minutes, seconds, ms, recurringUntil, normalizedExceptions = new Set()) {
  // Normalize recurringUntil to midnight for consistent comparisons
  const normalizedUntil = recurringUntil ? normalizeToMidnight(recurringUntil) : null;
  
  // Fast-path exit: if recurringUntil is before startDate, no instances to generate
  if (normalizedUntil && normalizedUntil < startDate) {
    return [];
  }

  const instances = [];
  const template = createEventTemplate(event); // Pre-compute template
  const seenDates = new Set(); // Deduplication: track dates we've already added
  const normalizedStart = normalizeToMidnight(startDate);
  const normalizedEnd = normalizeToMidnight(endDate);
  normalizedEnd.setHours(23, 59, 59, 999);

  // Keep full originalStart timestamp for comparisons, then normalize to midnight
  const originalDate = normalizeToMidnight(originalStart);
  const originalDay = originalDate.getDate();
  
  // Start from the later of: normalizedStart or originalDate (based on timestamp comparison)
  let currentDate = originalStart < startDate ? new Date(normalizedStart) : new Date(originalDate);
  
  // If we started from normalizedStart, advance to the correct day of month
  if (currentDate < originalDate) {
    currentDate.setDate(originalDay);
    
    // If that day doesn't exist in this month, go to last day of month
    if (currentDate.getDate() !== originalDay) {
      currentDate.setDate(0); // Last day of previous month
      currentDate = addMonthsImmutable(currentDate, 1);
      currentDate.setDate(originalDay);
      // Guard: if still not the right day (shouldn't happen), use last day
      if (currentDate.getDate() !== originalDay) {
        currentDate.setDate(0);
      }
    }
    
    // Only snap back to originalDate if originalStart is inside the range
    if (originalDate >= normalizedStart && originalDate <= normalizedEnd) {
      currentDate = new Date(originalDate);
    }
  }

  while (currentDate <= normalizedEnd) {
    if (normalizedUntil && currentDate > normalizedUntil) {
      break;
    }

    // Check if this date is in exceptions (deleted)
    const dateKey = normalizeToMidnight(currentDate).getTime();
    if (normalizedExceptions.has(dateKey)) {
      const nextDate = addMonthsImmutable(currentDate, 1);
      if (nextDate.getTime() <= currentDate.getTime()) {
        break;
      }
      currentDate = nextDate;
      continue;
    }

    // Deduplication: only add if we haven't seen this date
    const dateString = currentDate.toDateString();
    if (!seenDates.has(dateString)) {
      seenDates.add(dateString);
      instances.push(createEventInstance(template, event.id, currentDate, hours, minutes, seconds, ms, duration));
    }
    
    // Advance to next month
    const nextDate = addMonthsImmutable(currentDate, 1);
    // Guard: prevent infinite loop if month addition doesn't advance
    if (nextDate.getTime() <= currentDate.getTime()) {
      break;
    }
    currentDate = nextDate;
  }

  return instances;
}

/**
 * Expand custom multi-day weekly recurring event (e.g., "every Friday and Sunday")
 * Simplified algorithm: For each selected weekday, find first match then advance by +7 days
 * 
 * @param {Object} event - Event to expand
 * @param {Array<number>} dayNumbers - Array of day numbers (0-6)
 * @param {Date} originalStart - Original event start time (earliest possible instance)
 * @param {Date} startDate - Range start (calendar view start)
 * @param {Date} endDate - Range end (calendar view end)
 * @param {number} duration - Event duration in ms
 * @param {number} hours - Hours component
 * @param {number} minutes - Minutes component
 * @param {number} seconds - Seconds component
 * @param {number} ms - Milliseconds component
 * @param {Date|null} recurringUntil - Recurring until date
 * @returns {Array} Array of event instances
 */
function expandCustomWeekly(event, dayNumbers, originalStart, startDate, endDate, duration, hours, minutes, seconds, ms, recurringUntil, normalizedExceptions = new Set()) {
  // Normalize recurringUntil to midnight for consistent comparisons
  const normalizedUntil = recurringUntil ? normalizeToMidnight(recurringUntil) : null;
  
  // Fast-path exit: if recurringUntil is before startDate, no instances to generate
  if (normalizedUntil && normalizedUntil < startDate) {
    return [];
  }

  const instances = [];
  const template = createEventTemplate(event); // Pre-compute template
  const seenDates = new Set(); // Deduplication: track dates we've already added
  const normalizedStart = normalizeToMidnight(startDate);
  const normalizedEnd = normalizeToMidnight(endDate);
  normalizedEnd.setHours(23, 59, 59, 999);
  
  // 🔥 CRITICAL: Use originalStart as the minimum date - events should NOT appear before creation date
  const originalDate = normalizeToMidnight(originalStart);
  // The effective start is the later of: calendar view start OR event creation date
  const effectiveStart = originalDate > normalizedStart ? originalDate : normalizedStart;

  // For each selected weekday, generate instances
  for (const dayNumber of dayNumbers) {
    // Find first date >= effectiveStart that matches this weekday
    // But ensure it's >= originalDate (event creation date) - no past instances!
    let searchStart = effectiveStart > originalDate ? effectiveStart : originalDate;
    let currentDate = new Date(searchStart);
    const currentDayOfWeek = getDayOfWeek(currentDate);
    const daysToAdd = (dayNumber - currentDayOfWeek + 7) % 7;
    
    if (daysToAdd > 0) {
      currentDate = addDaysImmutable(currentDate, daysToAdd);
    } else if (getDayOfWeek(currentDate) === dayNumber) {
      // Already on the correct day
      currentDate = new Date(searchStart);
    } else {
      // Need to advance to next occurrence
      currentDate = addDaysImmutable(searchStart, 7 - ((currentDayOfWeek - dayNumber + 7) % 7));
    }
    
    // Ensure we never generate instances before the event creation date
    if (currentDate < originalDate) {
      // Advance to next week if we're before the creation date
      currentDate = addDaysImmutable(currentDate, 7);
    }

    // Generate instances for this weekday
    while (currentDate <= normalizedEnd) {
      if (normalizedUntil && currentDate > normalizedUntil) {
        break;
      }
      
      // Double-check: never generate instances before event creation date
      if (currentDate < originalDate) {
        currentDate = addDaysImmutable(currentDate, 7);
        continue;
      }

      // Check if this date is in exceptions (deleted)
      const dateKey = normalizeToMidnight(currentDate).getTime();
      if (!normalizedExceptions.has(dateKey)) {
        // Deduplication: only add if we haven't seen this date
        const dateString = currentDate.toDateString();
        if (!seenDates.has(dateString)) {
          seenDates.add(dateString);
          instances.push(createEventInstance(template, event.id, currentDate, hours, minutes, seconds, ms, duration));
        }
      }
      currentDate = addDaysImmutable(currentDate, 7);
    }
  }

  // Sort instances by date (midnight-normalized, more predictable than startTime)
  instances.sort((a, b) => a.date.getTime() - b.date.getTime());

  return instances;
}

// Set up strategy map
RECURRENCE_STRATEGIES.daily = expandDaily;
RECURRENCE_STRATEGIES.weekly = expandSingleDayWeekly;
RECURRENCE_STRATEGIES.biweekly = expandBiweekly;
RECURRENCE_STRATEGIES.monthly = expandMonthly;
RECURRENCE_STRATEGIES.custom_weekly = expandCustomWeekly;

/**
 * Expand a recurring event into multiple instances for a given date range
 * 
 * ⚡ PERFORMANCE NOTE:
 * This expands events for the ENTIRE date range provided.
 * For better performance, call with only the visible date range.
 * 
 * @param {Object} event - The recurring event object
 * @param {Date} startDate - Start of the date range (inclusive)
 * @param {Date} endDate - End of the date range (inclusive)
 * @returns {Array} Array of expanded event instances
 */
export function expandRecurringEvent(event, startDate, endDate, exceptions = []) {
  if (!event.is_recurring || !event.recurring_pattern) {
    return [event]; // Return original event if not recurring
  }

  const originalStart = new Date(event.startTime);
  const originalEnd = new Date(event.endTime);
  const duration = originalEnd.getTime() - originalStart.getTime(); // Duration in milliseconds

  const pattern = event.recurring_pattern;
  const recurringDays = event.recurring_days; // Array of day names or numbers (if available)
  const recurringUntil = event.recurring_until ? new Date(event.recurring_until) : null;

  // Normalize exceptions to Set of timestamps (midnight-normalized) for fast lookup
  const normalizedExceptions = new Set(
    exceptions.map(date => {
      const normalized = new Date(date);
      normalized.setHours(0, 0, 0, 0);
      return normalized.getTime();
    })
  );

  // Extract time components from original event (preserve hours/minutes)
  const originalHours = originalStart.getHours();
  const originalMinutes = originalStart.getMinutes();
  const originalSeconds = originalStart.getSeconds();
  const originalMs = originalStart.getMilliseconds();

  // Handle custom multi-day weekly recurrence (requires recurring_days field)
  // Backend must explicitly set recurring_pattern='custom_weekly' for multi-day recurrence
  // Do NOT use heuristic check - rely on backend pattern
  if (pattern === 'custom_weekly' && recurringDays && Array.isArray(recurringDays) && recurringDays.length > 0) {
    // Convert day names to numbers
    const dayNumbers = recurringDays
      .map(day => {
        if (typeof day === 'number') return day;
        if (typeof day === 'string') return dayNameToNumber(day);
        return null;
      })
      .filter(day => day !== null);

    if (dayNumbers.length > 0) {
      return expandCustomWeekly(
        event,
        dayNumbers,
        originalStart, // Pass originalStart as minimum date
        startDate,
        endDate,
        duration,
        originalHours,
        originalMinutes,
        originalSeconds,
        originalMs,
        recurringUntil,
        normalizedExceptions
      );
    }
  }

  // Use strategy pattern for pattern-based recurrence
  const strategy = RECURRENCE_STRATEGIES[pattern];
  if (strategy) {
    return strategy(
      event,
      originalStart,
      startDate,
      endDate,
      duration,
      originalHours,
      originalMinutes,
      originalSeconds,
      originalMs,
      recurringUntil,
      normalizedExceptions
    );
  }

  // Unknown pattern, return original event
  return [event];
}

/**
 * Expand all recurring events in an array
 * 
 * ⚡ PERFORMANCE NOTE:
 * This expands ALL recurring events for the ENTIRE date range.
 * For large date ranges (e.g., full year) with many recurring events, this could be slow.
 * 
 * For better performance, only expand for the visible date range:
 * - Month view: currentMonth - 1 to currentMonth + 1
 * - Week view: currentWeek - 1 to currentWeek + 1
 * - Day view: currentDay - 7 to currentDay + 7
 * 
 * @param {Array} events - Array of events (may include recurring events)
 * @param {Date} startDate - Start of the date range
 * @param {Date} endDate - End of the date range
 * @returns {Array} Array of all events with recurring events expanded
 */
export function expandRecurringEvents(events, startDate, endDate, exceptionsMap = new Map()) {
  if (!events || events.length === 0) return [];

  const expanded = [];
  
  for (const event of events) {
    if (event.is_recurring || event.recurring) {
      // Get exceptions for this event (if any)
      const exceptions = exceptionsMap.get(event.id) || [];
      const instances = expandRecurringEvent(event, startDate, endDate, exceptions);
      expanded.push(...instances);
    } else {
      // Non-recurring event, add as-is
      expanded.push(event);
    }
  }

  return expanded;
}
