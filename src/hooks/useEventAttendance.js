/**
 * useEventAttendance Hook
 * Fetches attendance data and calculates stats
 * 
 * Handles:
 * - Attendance list fetching
 * - Current user's attendance status
 * - Attendance stats calculation (present, late, absent, total)
 */

import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '../providers/SupabaseProvider';
import { getEventAttendance } from '../api/attendance';
import { queryKeys } from './queryKeys';
import { useMemo, useState, useEffect } from 'react';
import { calculateAttendanceStats, getUserAttendanceStatus } from '../services/attendanceService';

/**
 * Hook to fetch event attendance data and stats
 * @param {string|null} eventId - Event ID (can be instanceId for recurring events)
 * @param {boolean} enabled - Whether to enable the query
 * @param {boolean} includeStats - Whether to calculate stats (for coaches/creators)
 * @param {string|null} instanceDate - Instance date (YYYY-MM-DD) for recurring events
 * @returns {Object} React Query result with attendance, stats, userAttendance, isLoading, error
 */
export const useEventAttendance = (eventId, enabled = true, includeStats = false, instanceDate = null) => {
  const supabase = useSupabase();
  const shouldFetch = enabled && !!eventId;
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

  // Fetch attendance data
  const attendanceQuery = useQuery({
    queryKey: queryKeys.eventAttendance(eventId),
    queryFn: async () => {
      if (!supabase) {
        throw new Error('Supabase client not available');
      }
      const { data: attendance, error } = await getEventAttendance(supabase, eventId, { instanceDate });
      if (error) {
        throw error;
      }
      return attendance || [];
    },
    enabled: shouldFetch,
    staleTime: 1 * 60 * 1000, // 1 minute - attendance changes frequently
    cacheTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
    onError: (error) => {
      console.error('Error fetching attendance:', error);
    },
  });

  // Create a Map for O(1) lookup (same pattern as useAttendance)
  const attendanceByUserId = useMemo(() => {
    if (!attendanceQuery.data) return new Map();
    
    const map = new Map();
    attendanceQuery.data.forEach((attendance) => {
      map.set(attendance.user_id, attendance);
    });
    return map;
  }, [attendanceQuery.data]);

  // Calculate user's attendance status using service (with Map for O(1) lookup)
  const userAttendance = useMemo(() => {
    if (!attendanceByUserId || !currentUser) {
      return null;
    }
    return getUserAttendanceStatus(attendanceByUserId, currentUser.id);
  }, [attendanceByUserId, currentUser]);

  // Calculate stats if requested using service
  const stats = useMemo(() => {
    if (!includeStats || !attendanceQuery.data) {
      return null;
    }
    return calculateAttendanceStats(attendanceQuery.data);
  }, [attendanceQuery.data, includeStats]);

  return {
    attendance: attendanceQuery.data || [],
    userAttendance,
    stats,
    isLoading: attendanceQuery.isLoading || isLoadingUser,
    error: attendanceQuery.error,
    // NO refetch exposed - all refetching is internal via React Query invalidation
  };
};

