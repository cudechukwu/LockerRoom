/**
 * useEventRecurring Hook
 * Manages recurring event options and state
 */

/**
 * Recurring event options
 */
export const RECURRING_OPTIONS = [
  'None',
  'Daily',
  'Weekly',
  'Every Tue/Thu',
  'Every Mon/Wed/Fri',
  'Monthly',
];

/**
 * Hook for managing recurring event state
 * @param {string} initialValue - Initial recurring value (default: 'None')
 * @returns {object} Recurring state and utilities
 */
export function useEventRecurring(initialValue = 'None') {
  // This is a simple hook that just provides the options
  // The actual state management will be handled by the form reducer
  // This hook provides the options and any recurring-specific logic
  
  /**
   * Check if event is recurring
   * @param {string} value - Recurring value
   * @returns {boolean}
   */
  const isRecurring = (value) => {
    return value && value !== 'None';
  };

  /**
   * Get recurring pattern for API (normalize to lowercase)
   * @param {string} value - Recurring value
   * @returns {string|null} Normalized recurring pattern or null
   */
  const getRecurringPattern = (value) => {
    if (!isRecurring(value)) return null;
    
    const patternMap = {
      'Daily': 'daily',
      'Weekly': 'weekly',
      'Every Tue/Thu': 'biweekly',
      'Every Mon/Wed/Fri': 'biweekly',
      'Monthly': 'monthly',
    };
    
    return patternMap[value] || value.toLowerCase();
  };

  return {
    options: RECURRING_OPTIONS,
    isRecurring,
    getRecurringPattern,
    defaultValue: initialValue,
  };
}

