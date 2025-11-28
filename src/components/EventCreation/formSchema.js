/**
 * Event Creation Form Schema
 * Centralized form state structure and initial values
 */

import { getTodayAnchor } from '../../utils/dateUtils';
import { getDefaultStartTime, getDefaultEndTime } from '../../utils/timeUtils';

/**
 * Get initial form state
 * @returns {object} Initial form state object
 */
export function getInitialFormState() {
  const today = getTodayAnchor();
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  const year = today.getFullYear();
  
  return {
    // Core event details
    title: '',
    eventType: 'practice',
    date: `${month}/${day}/${year}`,
    startTime: getDefaultStartTime(),
    endTime: getDefaultEndTime(),
    location: '',
    notes: '',
    recurring: [], // Array of day names, e.g. ['Sunday', 'Friday'] or [] for non-recurring
    
    // Visibility and groups
    whoSeesThis: 'team', // 'team' | 'specificGroups' | 'personal'
    eventVisibility: 'fullTeam', // 'fullTeam' | 'specificGroups'
    selectedGroups: [], // Array of group IDs
    
    // Attendance settings
    attendanceRequirement: 'required', // 'required' | 'coaches_only' | 'players_only'
    checkInMethods: ['qr_code', 'location', 'manual'],
    
    // Attachments
    attachments: [], // Array of file objects
    
    // UI state
    expandedSections: {
      repeat: false,
      attachments: false,
      attendance: false,
    },
    openDropdown: null, // null | 'recurring' | 'timeStart' | 'timeEnd' | 'groups'
    
    // Group selection UI state
    showGroupSelector: false,
    groupSearchQuery: '',
    userModifiedGroups: false,
    
    // Loading states
    isUploadingAttachments: false,
    isLoadingGroups: false,
  };
}

/**
 * Form state reducer actions
 */
export const FORM_ACTIONS = Object.freeze({
  SET_FIELD: 'SET_FIELD',
  SET_MULTIPLE_FIELDS: 'SET_MULTIPLE_FIELDS',
  RESET_FORM: 'RESET_FORM',
  TOGGLE_SECTION: 'TOGGLE_SECTION',
  SET_DROPDOWN: 'SET_DROPDOWN',
  CLOSE_DROPDOWN: 'CLOSE_DROPDOWN',
  ADD_ATTACHMENT: 'ADD_ATTACHMENT',
  REMOVE_ATTACHMENT: 'REMOVE_ATTACHMENT',
  SET_GROUPS: 'SET_GROUPS',
  TOGGLE_GROUP: 'TOGGLE_GROUP',
});

/**
 * Form state reducer
 * @param {object} state - Current form state
 * @param {object} action - Action object with type and payload
 * @returns {object} New form state
 */
export function formReducer(state, action) {
  switch (action.type) {
    case FORM_ACTIONS.SET_FIELD:
      return {
        ...state,
        [action.field]: action.value,
      };
    
    case FORM_ACTIONS.SET_MULTIPLE_FIELDS:
      // Whitelist known fields to prevent overwriting internal state
      const allowedFields = [
        'title', 'eventType', 'date', 'startTime', 'endTime', 'location', 'notes', 'recurring',
        'whoSeesThis', 'eventVisibility', 'selectedGroups', 'userModifiedGroups',
        'attendanceRequirement', 'checkInMethods', 'attachments',
        'groupSearchQuery', 'showGroupSelector',
      ];
      const safeFields = Object.keys(action.fields).reduce((acc, key) => {
        if (allowedFields.includes(key)) {
          acc[key] = action.fields[key];
        }
        return acc;
      }, {});
      return {
        ...state,
        ...safeFields,
      };
    
    case FORM_ACTIONS.RESET_FORM:
      // Allow passing prefilledData to reset with specific values
      if (action.prefilledData) {
        return {
          ...getInitialFormState(),
          ...action.prefilledData,
        };
      }
      return getInitialFormState();
    
    case FORM_ACTIONS.TOGGLE_SECTION:
      return {
        ...state,
        expandedSections: {
          ...state.expandedSections,
          [action.section]: !state.expandedSections[action.section],
        },
      };
    
    case FORM_ACTIONS.SET_DROPDOWN:
      return {
        ...state,
        openDropdown: action.dropdown,
      };
    
    case FORM_ACTIONS.CLOSE_DROPDOWN:
      return {
        ...state,
        openDropdown: null,
      };
    
    case FORM_ACTIONS.ADD_ATTACHMENT:
      return {
        ...state,
        attachments: [...state.attachments, ...action.files],
      };
    
    case FORM_ACTIONS.REMOVE_ATTACHMENT:
      return {
        ...state,
        attachments: state.attachments.filter((_, index) => index !== action.index),
      };
    
    case FORM_ACTIONS.SET_GROUPS:
      // Filter groups to only include valid IDs (if availableGroups is provided)
      // This prevents stale group IDs from persisting
      let validGroups = action.groups;
      if (action.availableGroups && Array.isArray(action.availableGroups)) {
        const validGroupIds = new Set(action.availableGroups.map(g => g.id));
        validGroups = action.groups.filter(id => validGroupIds.has(id));
      }
      return {
        ...state,
        selectedGroups: validGroups,
        userModifiedGroups: true,
      };
    
    case FORM_ACTIONS.TOGGLE_GROUP:
      const groupId = action.groupId;
      const isSelected = state.selectedGroups.includes(groupId);
      
      // Validate group ID if availableGroups is provided
      let newSelectedGroups;
      if (isSelected) {
        newSelectedGroups = state.selectedGroups.filter(id => id !== groupId);
      } else {
        // Only add if group is valid (if availableGroups provided)
        if (action.availableGroups && Array.isArray(action.availableGroups)) {
          const validGroupIds = new Set(action.availableGroups.map(g => g.id));
          if (!validGroupIds.has(groupId)) {
            // Invalid group ID, don't add it
            return state;
          }
        }
        newSelectedGroups = [...state.selectedGroups, groupId];
      }
      
      return {
        ...state,
        selectedGroups: newSelectedGroups,
        userModifiedGroups: true,
      };
    
    default:
      return state;
  }
}

