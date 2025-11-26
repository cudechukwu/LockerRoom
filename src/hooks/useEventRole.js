/**
 * useEventRole Hook
 * Fetches user role and calculates permissions for event
 * 
 * Handles:
 * - Team role fetching
 * - Event creator check
 * - Permission calculations
 * - Coach role detection
 */

import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '../providers/SupabaseProvider';
import { getUserTeamRole } from '../api/roles';
import { queryKeys } from './queryKeys';
import { useMemo, useState, useEffect } from 'react';
import { calculateEventPermissions } from '../services/permissionService';

/**
 * Hook to fetch user role and calculate event permissions
 * @param {string|null} teamId - Team ID
 * @param {Object|null} event - Event object with createdBy field
 * @param {boolean} enabled - Whether to enable the query
 * @returns {Object} React Query result with role, isCoach, isEventCreator, permissions, isLoading, error
 */
export const useEventRole = (teamId, event, enabled = true) => {
  const supabase = useSupabase();
  const shouldFetch = enabled && !!teamId;
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoadingUser, setIsLoadingUser] = useState(false);

  // Get current user ID (simple approach, not cached)
  useEffect(() => {
    if (!shouldFetch || !supabase) return;
    
    setIsLoadingUser(true);
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user);
      setIsLoadingUser(false);
    }).catch((error) => {
      console.error('Error getting current user:', error);
      setIsLoadingUser(false);
    });
  }, [shouldFetch, supabase]);

  // Fetch team role
  const roleQuery = useQuery({
    queryKey: queryKeys.eventRole(teamId, currentUser?.id),
    queryFn: async () => {
      const { data: role } = await getUserTeamRole(supabase, teamId);
      return role;
    },
    enabled: shouldFetch && !!currentUser?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
    onError: (error) => {
      console.error('Error fetching user role:', error);
    },
  });

  // Calculate permissions using service
  const permissions = useMemo(() => {
    return calculateEventPermissions(currentUser, roleQuery.data, event);
  }, [roleQuery.data, currentUser, event]);

  // roleChecked is true when we've successfully determined the role (or determined there's no role)
  const roleChecked = !isLoadingUser && (!!currentUser || !shouldFetch) && !roleQuery.isLoading;

  return {
    role: roleQuery.data,
    ...permissions,
    roleChecked,
    isLoading: roleQuery.isLoading || isLoadingUser,
    error: roleQuery.error,
  };
};

