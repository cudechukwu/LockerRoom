/**
 * useAttendance Hook
 * Fetches attendance data with proper React Query + Realtime synchronization
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo, useEffect, useRef } from 'react';
import { useSupabase } from '../providers/SupabaseProvider';
import { getEventAttendance } from '../api/attendance';
import { queryKeys } from './queryKeys';
import { useRealtimeAttendance } from './useRealtimeAttendance';

/**
 * Hook to fetch event attendance with real-time updates
 * Properly synchronizes React Query polling with real-time subscriptions
 * @param {string} eventId - Event ID
 * @param {boolean} enabled - Whether to enable the query
 * @returns {Object} { attendance, attendanceByUserId, isLoading, error, refetch }
 */
export function useAttendance(eventId, enabled = true) {
  const supabase = useSupabase();
  const shouldFetch = enabled && !!eventId;
  const hasSubscribedRef = useRef(false);
  const attendanceByUserIdRef = useRef(new Map());

  // Log only once per eventId change (not on every render) - dev mode only
  useEffect(() => {
    if (shouldFetch && __DEV__) {
      console.log('🔍 useAttendance hook initialized:', {
        eventId,
        enabled,
        shouldFetch,
        hasSupabase: !!supabase,
      });
    }
  }, [eventId, shouldFetch, enabled]); // Removed supabase from deps - it's stable

  // Fetch attendance data with React Query
  const attendanceQuery = useQuery({
    queryKey: queryKeys.eventAttendance(eventId),
    queryFn: async () => {
      if (__DEV__) {
      console.log('🚀 useAttendance queryFn executing for eventId:', eventId);
      }
      
      if (!supabase) {
        throw new Error('Supabase client not available');
      }
      const { data: attendance, error } = await getEventAttendance(supabase, eventId);
      if (error) {
        if (__DEV__) {
        console.error('❌ getEventAttendance returned error:', error);
        }
        throw error;
      }
      
      // Debug logging - dev mode only
      if (__DEV__) {
      console.log('📊 Attendance data fetched:', {
        eventId,
        count: attendance?.length || 0,
        records: attendance?.map(a => ({
          user_id: a.user_id,
          status: a.status,
          checked_in_at: a.checked_in_at,
          is_deleted: a.is_deleted,
        })) || [],
      });
      }
      
      return attendance || [];
    },
    enabled: shouldFetch,
    staleTime: 60000, // 1 minute cache - prevents constant refetching
    refetchOnMount: false, // Use cache if available - real-time handles updates
    refetchOnWindowFocus: false, // Use cache - real-time handles updates
    refetchOnReconnect: false, // Use cache - real-time handles updates
    refetchInterval: false, // Disable polling - real-time handles updates
    retry: 1,
    onError: (error) => {
      if (__DEV__) {
      console.error('❌ Error fetching attendance:', error);
      }
    },
    onSuccess: (data) => {
      if (__DEV__) {
      console.log('✅ Attendance query succeeded:', {
        eventId,
        count: data?.length || 0,
      });
      }
    },
  });

  // Store attendanceByUserId in a stable ref to prevent unnecessary re-renders
  // Update ref when data changes, but keep reference stable
  useEffect(() => {
    if (!attendanceQuery.data) {
      attendanceByUserIdRef.current = new Map();
      return;
    }
    
    const map = new Map();
    attendanceQuery.data.forEach((attendance) => {
      map.set(attendance.user_id, attendance);
    });
    
    attendanceByUserIdRef.current = map;
    
    // Log only when data changes (not on every render) - dev mode only
    if (__DEV__ && map.size > 0) {
      console.log('✅ Attendance map built:', {
        size: map.size,
        userIds: Array.from(map.keys()),
        eventId,
      });
    }
  }, [attendanceQuery.data, eventId]);

  // Reset subscription flag when eventId changes (ensures clean subscription per event)
  useEffect(() => {
    hasSubscribedRef.current = false;
  }, [eventId]);

  // Enable subscription once after initial fetch succeeds (React Query guarantees isSuccess only when data is stable)
  useEffect(() => {
    if (!shouldFetch || hasSubscribedRef.current) return;
    
    // Use isSuccess instead of data && !isLoading to avoid race conditions
    // React Query guarantees isSuccess only turns true after data stabilizes
    if (attendanceQuery.isSuccess) {
      hasSubscribedRef.current = true;
    }
  }, [shouldFetch, attendanceQuery.isSuccess]);

  // Subscribe to real-time updates - only enable once per eventId after data is stable
  // useRealtimeAttendance handles cleanup when enabled becomes false or eventId changes
  useRealtimeAttendance(
    eventId,
    shouldFetch && hasSubscribedRef.current
  );

  return {
    attendance: attendanceQuery.data || [],
    attendanceByUserId: attendanceByUserIdRef.current, // Stable reference
    isLoading: attendanceQuery.isLoading,
    error: attendanceQuery.error,
    refetch: attendanceQuery.refetch,
  };
}
