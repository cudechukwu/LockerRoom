/**
 * useEventFormState Hook
 * Manages core form state using the form reducer
 */

import { useReducer, useCallback } from 'react';
import { getInitialFormState, formReducer, FORM_ACTIONS } from '../formSchema';

/**
 * Hook for managing core event form state
 * @param {object} initialData - Initial form data (optional)
 * @returns {object} Form state and handlers
 */
export function useEventFormState(initialData = {}) {
  // Merge initial data with default state
  const initialState = {
    ...getInitialFormState(),
    ...initialData,
  };

  const [formState, dispatch] = useReducer(formReducer, initialState);

  // Convenience setters
  const setField = useCallback((field, value) => {
    dispatch({ type: FORM_ACTIONS.SET_FIELD, field, value });
  }, []);

  const setMultipleFields = useCallback((fields) => {
    dispatch({ type: FORM_ACTIONS.SET_MULTIPLE_FIELDS, fields });
  }, []);

  const resetForm = useCallback((prefilledData = null) => {
    dispatch({ 
      type: FORM_ACTIONS.RESET_FORM, 
      prefilledData: prefilledData || undefined 
    });
  }, []);

  const toggleSection = useCallback((section) => {
    dispatch({ type: FORM_ACTIONS.TOGGLE_SECTION, section });
  }, []);

  const setDropdown = useCallback((dropdown) => {
    dispatch({ type: FORM_ACTIONS.SET_DROPDOWN, dropdown });
  }, []);

  const closeDropdown = useCallback(() => {
    dispatch({ type: FORM_ACTIONS.CLOSE_DROPDOWN });
  }, []);

  const addAttachment = useCallback((files) => {
    dispatch({ type: FORM_ACTIONS.ADD_ATTACHMENT, files });
  }, []);

  const removeAttachment = useCallback((index) => {
    dispatch({ type: FORM_ACTIONS.REMOVE_ATTACHMENT, index });
  }, []);

  const setGroups = useCallback((groups) => {
    dispatch({ type: FORM_ACTIONS.SET_GROUPS, groups });
  }, []);

  const toggleGroup = useCallback((groupId) => {
    dispatch({ type: FORM_ACTIONS.TOGGLE_GROUP, groupId });
  }, []);

  return {
    // State
    formState,
    
    // Core field setters
    setTitle: (value) => setField('title', value),
    setEventType: (value) => setField('eventType', value),
    setDate: (value) => setField('date', value),
    setStartTime: (value) => setField('startTime', value),
    setEndTime: (value) => setField('endTime', value),
    setLocation: (value) => setField('location', value),
    setNotes: (value) => setField('notes', value),
    setRecurring: (value) => setField('recurring', value),
    
    // Visibility and groups
    setWhoSeesThis: (value) => setField('whoSeesThis', value),
    setEventVisibility: (value) => setField('eventVisibility', value),
    setSelectedGroups: setGroups,
    toggleGroup,
    
    // Attendance settings
    setAttendanceRequirement: (value) => setField('attendanceRequirement', value),
    setCheckInMethods: (value) => setField('checkInMethods', value),
    
    // Attachments
    addAttachment,
    removeAttachment,
    setAttachments: (files) => setField('attachments', files),
    
    // UI state
    toggleSection,
    setDropdown,
    closeDropdown,
    
    // Utilities
    setMultipleFields,
    resetForm,
    
    // Direct access to state (for convenience)
    ...formState,
  };
}

