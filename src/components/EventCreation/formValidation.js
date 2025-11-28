/**
 * Form Validation Utilities
 * Pure validation logic for event creation form (no UI side effects)
 */

/**
 * Validate event form data (pure function, no side effects)
 * @param {object} formData - Form data object
 * @param {object} options - Validation options
 * @param {boolean} options.allowOvernightEvents - Whether to allow events that span midnight (default: true)
 * @returns {object} Validation result with isValid boolean, errors array, and fieldErrors object
 */
export function validateForm(formData, options = {}) {
  const { allowOvernightEvents = true } = options;
  const errors = [];
  const fieldErrors = {};

  // Title is required
  if (!formData.title || !formData.title.trim()) {
    const errorMsg = 'Please enter an event title';
    errors.push(errorMsg);
    fieldErrors.title = errorMsg;
  }

  // Validate group selection if specificGroups is selected
  if (formData.whoSeesThis === 'specificGroups') {
    if (!formData.selectedGroups || formData.selectedGroups.length === 0) {
      const errorMsg = 'Please select at least one group for this event';
      errors.push(errorMsg);
      fieldErrors.selectedGroups = errorMsg;
    }
  }

  // Validate times (end time should be after start time, or span midnight)
  if (formData.startTime && formData.endTime) {
    const startMinutes = formData.startTime.getHours() * 60 + formData.startTime.getMinutes();
    const endMinutes = formData.endTime.getHours() * 60 + formData.endTime.getMinutes();
    
    // CRITICAL: Same time is always invalid (must check first)
    if (endMinutes === startMinutes) {
      const errorMsg = 'Start time and end time cannot be the same. Please set different times';
      errors.push(errorMsg);
      fieldErrors.endTime = errorMsg;
    } else {
      // Check if event spans midnight
      const spansMidnight = endMinutes < startMinutes; // Note: < not <= (same time already handled)
      
      if (spansMidnight && !allowOvernightEvents) {
        const errorMsg = 'End time must be after start time. Please adjust the times';
        errors.push(errorMsg);
        fieldErrors.endTime = errorMsg;
      }
      // If spansMidnight && allowOvernightEvents, it's valid (overnight event)
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    fieldErrors, // Map of field names to error messages
  };
}

/**
 * Show validation errors as alerts with user-friendly, actionable messages
 * @param {Array<string>} errors - Array of error messages
 */
export function showValidationErrors(errors) {
  if (errors.length === 0) return;
  
  const { Alert } = require('react-native');
  
  // Format errors into a user-friendly message
  let message;
  if (errors.length === 1) {
    // Single error - show it directly
    message = errors[0];
  } else {
    // Multiple errors - format as a numbered list
    message = `Please fix the following:\n\n${errors.map((err, idx) => `${idx + 1}. ${err}`).join('\n')}`;
  }
  
  Alert.alert(
    'Missing Information',
    message,
    [{ text: 'OK' }]
  );
}

