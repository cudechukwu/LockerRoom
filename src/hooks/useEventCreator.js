/**
 * useEventCreator Hook
 * Fetches and caches event creator profile
 * 
 * Handles:
 * - UUID vs name detection
 * - Profile fetching with React Query caching
 * - Loading and error states
 */

import { useQuery } from '@tanstack/react-query';
import { getUserProfile } from '../api/profiles';
import { useSupabase } from '../providers/SupabaseProvider';
import { queryKeys } from './queryKeys';

/**
 * Hook to fetch event creator profile
 * @param {string|null} createdBy - Creator ID or name string
 * @param {boolean} enabled - Whether to enable the query
 * @returns {Object} React Query result with creatorName, isLoading, error
 */
export const useEventCreator = (createdBy, enabled = true) => {
  const supabase = useSupabase();
  // Check if createdBy is already a name (string that's not a UUID)
  const isName = typeof createdBy === 'string' && 
    !createdBy.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  
  const userId = isName ? null : createdBy;
  const shouldFetch = enabled && !!userId;

  const query = useQuery({
    queryKey: queryKeys.eventCreator(userId),
    queryFn: async () => {
      const { data: profile } = await getUserProfile(supabase, userId);
      if (!profile) {
        return 'Unknown User';
      }
      return profile.display_name || profile.email || 'Unknown User';
    },
    enabled: shouldFetch,
    staleTime: 10 * 60 * 1000, // 10 minutes - profiles change rarely
    cacheTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    retry: 1,
    onError: (error) => {
      console.error('Error fetching creator profile:', error);
    },
  });

  // If createdBy is already a name, return it directly
  const creatorName = isName ? createdBy : (query.data || null);

  return {
    creatorName,
    isLoading: shouldFetch ? query.isLoading : false,
    error: query.error,
    isName, // Expose whether it's a name or needs fetching
  };
};

