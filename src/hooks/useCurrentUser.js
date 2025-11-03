import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from './queryKeys';

/**
 * Centralized hook to get current authenticated user
 * Single source of truth for user data - improves cache coherence
 * @returns {Object} React Query result with user data
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.currentUser(),
    queryFn: async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      return user;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - user rarely changes
    retry: 1,
  });
}

