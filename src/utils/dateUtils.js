/**
 * Date Utility Functions
 * 
 * Core utilities for virtualized infinite scroll calendar.
 * Uses offset-based date model instead of pre-generated arrays.
 * 
 * Offset Model:
 * - offset = 0  → today
 * - offset = -1 → yesterday
 * - offset = 1  → tomorrow
 * - offset = n  → today + n days
 */

import { MONTHS_SHORT, DAYS_SHORT } from '../constants/dateConstants';

/**
 * ⚡ Session anchor for "today"
 * 
 * Anchors "today" at module load time to prevent drift during a session.
 * This ensures consistent date comparisons even if the app runs past midnight.
 * Similar to how Apple Calendar handles date anchoring.
 */
const TODAY_ANCHOR = (() => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
})();

/**
 * ⚡ Date label cache for performance
 * 
 * Caches formatted date labels to avoid repeated string formatting
 * during scrolling. Significantly improves scroll performance.
 */
const labelCache = new Map();

/**
 * Normalize a date to midnight (00:00:00.000) in local timezone
 * This ensures consistent date comparisons regardless of time component
 * 
 * @param {Date|string|number} date - Date to normalize
 * @returns {Date} Normalized date at midnight
 */
export function normalizeDate(date) {
  if (!date) return null;
  const d = new Date(date);
  // setHours(0, 0, 0, 0) already clears minutes, seconds, and milliseconds
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the session anchor for "today"
 * This is the "today" date that was set when the module loaded.
 * Use this instead of creating new Date() objects to avoid drift.
 * 
 * @returns {Date} Today's date (normalized to midnight, anchored at session start)
 */
export function getTodayAnchor() {
  return TODAY_ANCHOR;
}

/**
 * Add or subtract days from a date
 * 
 * @param {Date} date - Base date
 * @param {number} offset - Number of days to add (positive) or subtract (negative)
 * @returns {Date} New date with offset applied
 */
export function addDays(date, offset) {
  if (!date) return null;
  const result = new Date(date);
  result.setDate(result.getDate() + offset);
  return result;
}

/**
 * Get a date from an offset relative to a base date (default: today anchor)
 * 
 * @param {number} offset - Days offset from base date (0 = base date, -1 = yesterday, 1 = tomorrow)
 * @param {Date} baseDate - Base date to calculate from (defaults to today anchor)
 * @returns {Date} Date at the specified offset
 */
export function getDateFromOffset(offset, baseDate = null) {
  const base = baseDate ? normalizeDate(baseDate) : TODAY_ANCHOR;
  return addDays(base, offset);
}

/**
 * Get the offset (in days) of a date relative to a base date (default: today anchor)
 * 
 * @param {Date|string|number} date - Date to calculate offset for
 * @param {Date} baseDate - Base date to calculate from (defaults to today anchor)
 * @returns {number} Offset in days (0 = same day, -1 = one day before, 1 = one day after)
 */
export function getOffsetFromDate(date, baseDate = null) {
  if (!date) return null;
  
  const normalizedDate = normalizeDate(date);
  const base = baseDate ? normalizeDate(baseDate) : TODAY_ANCHOR;
  
  // Calculate difference in milliseconds
  const diffMs = normalizedDate.getTime() - base.getTime();
  
  // Convert to days (round to handle timezone edge cases)
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * Format a date label for display
 * Shows "TODAY" if the date is today, otherwise shows "DAY DD MON" format
 * 
 * ⚡ PERFORMANCE: Uses caching to avoid repeated string formatting during scrolling
 * 
 * @param {Date|string|number} date - Date to format
 * @param {boolean} showToday - Whether to show "TODAY" for today's date (default: true)
 * @returns {string} Formatted date string
 */
export function formatDateLabel(date, showToday = true) {
  if (!date) return '';
  
  const normalizedDate = normalizeDate(date);
  const dateKey = normalizedDate.getTime();
  
  // Check cache first
  const cacheKey = `${dateKey}-${showToday}`;
  if (labelCache.has(cacheKey)) {
    return labelCache.get(cacheKey);
  }
  
  // Check if date is today (using session anchor)
  if (showToday && normalizedDate.getTime() === TODAY_ANCHOR.getTime()) {
    const result = 'TODAY';
    labelCache.set(cacheKey, result);
    return result;
  }
  
  // Format as "DAY DD MON" (e.g., "THU 21 NOV")
  const dayOfWeek = DAYS_SHORT[normalizedDate.getDay()];
  const day = normalizedDate.getDate();
  const month = MONTHS_SHORT[normalizedDate.getMonth()];
  
  const result = `${dayOfWeek} ${day} ${month}`.toUpperCase();
  
  // Cache the result
  labelCache.set(cacheKey, result);
  
  return result;
}

/**
 * Clear the date label cache
 * Useful for testing or if you need to reset the cache
 */
export function clearLabelCache() {
  labelCache.clear();
}

/**
 * Check if a date is today (using session anchor)
 * 
 * @param {Date|string|number} date - Date to check
 * @returns {boolean} True if the date is today
 */
export function isToday(date) {
  if (!date) return false;
  const normalizedDate = normalizeDate(date);
  return normalizedDate.getTime() === TODAY_ANCHOR.getTime();
}

/**
 * Check if two dates are the same day
 * 
 * @param {Date|string|number} date1 - First date
 * @param {Date|string|number} date2 - Second date
 * @returns {boolean} True if both dates are the same day
 */
export function isSameDay(date1, date2) {
  if (!date1 || !date2) return false;
  const normalized1 = normalizeDate(date1);
  const normalized2 = normalizeDate(date2);
  return normalized1.getTime() === normalized2.getTime();
}

/**
 * Get the difference in days between two dates
 * 
 * @param {Date|string|number} date1 - First date
 * @param {Date|string|number} date2 - Second date
 * @returns {number} Difference in days (positive if date1 is after date2)
 */
export function getDaysDifference(date1, date2) {
  if (!date1 || !date2) return null;
  const normalized1 = normalizeDate(date1);
  const normalized2 = normalizeDate(date2);
  const diffMs = normalized1.getTime() - normalized2.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Get start of day (midnight) for a date
 * 
 * @param {Date|string|number} date - Date to get start of day for
 * @returns {Date} Date at start of day (00:00:00.000)
 */
export function getStartOfDay(date) {
  return normalizeDate(date);
}

/**
 * Get end of day (23:59:59.999) for a date
 * 
 * @param {Date|string|number} date - Date to get end of day for
 * @returns {Date} Date at end of day
 */
export function getEndOfDay(date) {
  if (!date) return null;
  const d = normalizeDate(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Format date as MM/DD/YYYY string
 * Used for form inputs and API calls
 * 
 * @param {Date|string|number} date - Date to format
 * @returns {string} Formatted date string (MM/DD/YYYY)
 */
export function formatDateForInput(date) {
  if (!date) return '';
  const d = normalizeDate(date);
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${month}/${day}/${year}`;
}

/**
 * Parse MM/DD/YYYY string to Date
 * 
 * @param {string} dateString - Date string in MM/DD/YYYY format
 * @returns {Date|null} Parsed date or null if invalid
 */
export function parseDateFromInput(dateString) {
  if (!dateString) return null;
  
  const parts = dateString.split('/');
  if (parts.length !== 3) return null;
  
  const month = parseInt(parts[0], 10) - 1; // JS months are 0-indexed
  const day = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
  
  if (isNaN(month) || isNaN(day) || isNaN(year)) return null;
  
  const date = new Date(year, month, day);
  
  // Validate the date (handles invalid dates like Feb 30)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }
  
  return normalizeDate(date);
}
