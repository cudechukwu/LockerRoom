/**
 * useEventGroups Hook
 * Manages attendance group fetching, filtering, and selection state
 */

import { useState, useEffect, useMemo } from 'react';
import { getTeamAttendanceGroups } from '../../../api/attendanceGroups';
import { useDebounce } from '../../../hooks/useDebounce';

/**
 * Hook for managing event groups
 * @param {object} options - Hook options
 * @param {object} options.supabase - Supabase client instance
 * @param {string} options.teamId - Team ID
 * @param {object} options.editingEvent - Event being edited (optional)
 * @param {boolean} options.visible - Whether modal is visible
 * @param {Array} options.selectedGroups - Currently selected group IDs
 * @param {Function} options.onSelectedGroupsChange - Callback when selected groups change
 * @param {Function} options.onVisibilityChange - Callback when visibility changes
 * @param {boolean} options.userModifiedGroups - Whether user has manually modified groups
 * @returns {object} Group state and utilities
 */
export function useEventGroups(options = {}) {
  const {
    supabase,
    teamId,
    editingEvent = null,
    visible = false,
    selectedGroups = [],
    onSelectedGroupsChange,
    onVisibilityChange,
    userModifiedGroups = false,
  } = options;

  const [availableGroups, setAvailableGroups] = useState([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [groupSearchQuery, setGroupSearchQuery] = useState('');

  // Debounced search query for performance
  const debouncedSearchQuery = useDebounce(groupSearchQuery, 150);

  /**
   * Load available groups from API
   */
  const loadAvailableGroups = async () => {
    if (!teamId || !supabase) return;

    try {
      setIsLoadingGroups(true);
      const { data, error } = await getTeamAttendanceGroups(supabase, teamId);
      if (error) {
        console.error('Error loading groups:', error);
        return;
      }
      setAvailableGroups(data || []);
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setIsLoadingGroups(false);
    }
  };

  // Load groups when modal opens
  useEffect(() => {
    if (visible && teamId && supabase) {
      loadAvailableGroups();
    } else if (!visible) {
      // Clear groups when modal closes
      setAvailableGroups([]);
      setGroupSearchQuery('');
    }
  }, [visible, teamId, supabase]);

  // Filter stale group memberships when availableGroups changes
  useEffect(() => {
    if (availableGroups.length > 0 && onSelectedGroupsChange) {
      const validGroups = selectedGroups.filter(id =>
        availableGroups.some(g => g.id === id)
      );
      if (validGroups.length !== selectedGroups.length) {
        onSelectedGroupsChange(validGroups);
      }
    }
  }, [availableGroups]);

  // Pre-fill for Edit Mode (Fixed Timing Issue + User Modification Protection)
  useEffect(() => {
    // Don't pre-fill if user has already modified groups manually
    if (!editingEvent || !availableGroups.length || userModifiedGroups) return;

    // Check if event has assigned groups
    // Derive full-team status from assigned_attendance_groups array length
    const assignedGroups = editingEvent.assigned_attendance_groups || [];
    const isFullTeam = !Array.isArray(assignedGroups) || assignedGroups.length === 0;

    // Filter out any groups that no longer exist
    const validGroupIds = assignedGroups.filter(id =>
      availableGroups.some(g => g.id === id)
    );

    if (isFullTeam || validGroupIds.length === 0) {
      if (onVisibilityChange) onVisibilityChange('fullTeam');
      if (onSelectedGroupsChange) onSelectedGroupsChange([]);
    } else {
      if (onVisibilityChange) onVisibilityChange('specificGroups');
      if (onSelectedGroupsChange) onSelectedGroupsChange(validGroupIds);
    }
  }, [editingEvent, availableGroups, userModifiedGroups, onVisibilityChange, onSelectedGroupsChange]);

  // Filter groups by search query
  const filteredGroups = useMemo(() => {
    if (!debouncedSearchQuery) return availableGroups;
    const query = debouncedSearchQuery.toLowerCase();
    return availableGroups.filter(group =>
      group.name.toLowerCase().includes(query)
    );
  }, [availableGroups, debouncedSearchQuery]);

  /**
   * Clear search query
   */
  const clearSearch = () => {
    setGroupSearchQuery('');
  };

  return {
    availableGroups,
    filteredGroups,
    isLoadingGroups,
    groupSearchQuery,
    setGroupSearchQuery,
    clearSearch,
    reloadGroups: loadAvailableGroups,
  };
}

