/**
 * useEventVisibility Hook
 * Manages event visibility state and group selection coordination
 */

import { useState, useEffect } from 'react';

/**
 * Hook for managing event visibility and group selection
 * @param {object} options - Hook options
 * @param {string} options.initialWhoSeesThis - Initial whoSeesThis value (default: 'team')
 * @param {string} options.initialVisibility - Initial visibility value (default: 'fullTeam')
 * @param {Array} options.initialSelectedGroups - Initial selected groups (default: [])
 * @returns {object} Visibility state and handlers
 */
export function useEventVisibility(options = {}) {
  const {
    initialWhoSeesThis = 'team',
    initialVisibility = 'fullTeam',
    initialSelectedGroups = [],
  } = options;

  const [whoSeesThis, setWhoSeesThis] = useState(initialWhoSeesThis);
  const [eventVisibility, setEventVisibility] = useState(initialVisibility);
  const [selectedGroups, setSelectedGroups] = useState(initialSelectedGroups);
  const [userModifiedGroups, setUserModifiedGroups] = useState(false);

  // Sync visibility when whoSeesThis changes
  useEffect(() => {
    if (whoSeesThis === 'team') {
      setEventVisibility('fullTeam');
    } else if (whoSeesThis === 'personal') {
      setEventVisibility('fullTeam'); // Personal events still use fullTeam visibility
    } else if (whoSeesThis === 'specificGroups') {
      setEventVisibility('specificGroups');
    }
  }, [whoSeesThis]);

  /**
   * Handle whoSeesThis change
   * @param {string} value - New whoSeesThis value
   */
  const handleWhoSeesThisChange = (value) => {
    setWhoSeesThis(value);
    
    if (value === 'team' || value === 'personal') {
      setSelectedGroups([]);
      setUserModifiedGroups(false);
    }
  };

  /**
   * Toggle group selection
   * @param {string} groupId - Group ID to toggle
   */
  const toggleGroup = (groupId) => {
    setUserModifiedGroups(true);
    setSelectedGroups(prev => {
      if (prev.includes(groupId)) {
        return prev.filter(id => id !== groupId);
      } else {
        return [...prev, groupId];
      }
    });
  };

  /**
   * Remove a group from selection
   * @param {string} groupId - Group ID to remove
   */
  const removeGroup = (groupId) => {
    setUserModifiedGroups(true);
    setSelectedGroups(prev => prev.filter(id => id !== groupId));
  };

  /**
   * Set selected groups
   * @param {Array} groups - Array of group IDs
   */
  const setGroups = (groups) => {
    setUserModifiedGroups(true);
    setSelectedGroups(Array.isArray(groups) ? groups : []);
  };

  /**
   * Clear all selected groups
   */
  const clearGroups = () => {
    setSelectedGroups([]);
    setUserModifiedGroups(false);
  };

  /**
   * Handle visibility change (for edit mode coordination)
   * @param {string} visibility - New visibility value
   */
  const handleVisibilityChange = (visibility) => {
    setEventVisibility(visibility);
    if (visibility === 'fullTeam') {
      setSelectedGroups([]);
      setUserModifiedGroups(false);
    }
  };

  /**
   * Reset visibility state
   */
  const reset = () => {
    setWhoSeesThis(initialWhoSeesThis);
    setEventVisibility(initialVisibility);
    setSelectedGroups([]);
    setUserModifiedGroups(false);
  };

  return {
    whoSeesThis,
    setWhoSeesThis: handleWhoSeesThisChange,
    eventVisibility,
    setEventVisibility: handleVisibilityChange,
    selectedGroups,
    setSelectedGroups: setGroups,
    toggleGroup,
    removeGroup,
    clearGroups,
    userModifiedGroups,
    setUserModifiedGroups,
    reset,
  };
}

