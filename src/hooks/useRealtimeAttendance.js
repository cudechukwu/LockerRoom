/**
 * Real-time attendance subscription hook
 * Listens for changes to event_attendance table and updates React Query cache
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '../providers/SupabaseProvider';
import { queryKeys } from './queryKeys';

// Module-level debounce timers per eventId to prevent refetch storms
// Multiple real-time events within 75ms collapse into a single invalidation
const invalidateTimers = new Map();

/**
 * Subscribe to real-time attendance changes for a specific event
 * @param {string} eventId - Event ID to subscribe to
 * @param {boolean} enabled - Whether the subscription should be active
 */
export function useRealtimeAttendance(eventId, enabled = true) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !eventId || !supabase) return;

    if (__DEV__) {
    console.log('🔔 Setting up real-time subscription for event:', eventId);
    }

    // Subscribe to changes in event_attendance table for this event
    const channel = supabase
      .channel(`event_attendance:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'event_attendance',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          if (__DEV__) {
          console.log('📢 Real-time attendance change:', {
            event: payload.eventType,
            new: payload.new,
            old: payload.old,
            eventId,
          });
          }

          // Debounced invalidation to avoid refetch storms
          // Multiple real-time events (e.g., UPDATE for checked_in_at + status) within 75ms
          // collapse into a single refetch, preventing database hammering and battery drain
          if (invalidateTimers.has(eventId)) {
            clearTimeout(invalidateTimers.get(eventId));
          }

          const timer = setTimeout(() => {
          // Invalidate the attendance query to refetch fresh data
          queryClient.invalidateQueries({
            queryKey: queryKeys.eventAttendance(eventId),
          });

          // Also invalidate user attendance status queries
          queryClient.invalidateQueries({
            queryKey: queryKeys.userAttendanceStatus(eventId),
          });

            // Clean up timer from map
            invalidateTimers.delete(eventId);
          }, 75); // 50-100ms is perfect: small enough to feel instant, large enough to collapse events

          invalidateTimers.set(eventId, timer);
        }
      )
      .subscribe((status, err) => {
        if (!__DEV__) return;
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time subscription active for event:', eventId);
        } else if (status === 'CHANNEL_ERROR') {
          // Real-time subscription failed - log but don't crash
          // The app will still work, just without real-time updates
          console.warn('⚠️ Real-time subscription error for event:', eventId, err);
          console.warn('   The app will continue to work, but real-time updates may not be available.');
          console.warn('   Make sure real-time is enabled for event_attendance table in Supabase.');
        } else if (status === 'TIMED_OUT') {
          console.warn('⚠️ Real-time subscription timed out for event:', eventId);
        } else if (status === 'CLOSED') {
          console.log('🔕 Real-time subscription closed for event:', eventId);
        }
      });

    // Cleanup subscription on unmount or when eventId changes
    return () => {
      if (__DEV__) {
      console.log('🔕 Cleaning up real-time subscription for event:', eventId);
      }
      
      // Clear any pending debounce timer for this eventId
      if (invalidateTimers.has(eventId)) {
        clearTimeout(invalidateTimers.get(eventId));
        invalidateTimers.delete(eventId);
      }
      
      supabase.removeChannel(channel);
    };
  }, [eventId, enabled, supabase, queryClient]);
}

/**
 * Subscribe to real-time attendance changes for multiple events
 * Useful for calendar view where you need to track multiple events
 * @param {string[]} eventIds - Array of event IDs to subscribe to
 * @param {boolean} enabled - Whether the subscription should be active
 */
export function useRealtimeAttendanceMultiple(eventIds = [], enabled = true) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !eventIds || eventIds.length === 0 || !supabase) return;

    console.log('🔔 Setting up real-time subscriptions for events:', eventIds);

    // Create a filter for all event IDs
    // Supabase doesn't support OR filters directly, so we'll use a channel per event
    // or filter by team_id if all events are from the same team
    const channels = eventIds.map((eventId) => {
      const channel = supabase
        .channel(`event_attendance:${eventId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'event_attendance',
            filter: `event_id=eq.${eventId}`,
          },
          (payload) => {
            if (__DEV__) {
            console.log('📢 Real-time attendance change:', {
              event: payload.eventType,
              eventId: payload.new?.event_id || payload.old?.event_id,
            });
            }

            const changedEventId = payload.new?.event_id || payload.old?.event_id;
            if (!changedEventId) return;

            // Debounced invalidation to avoid refetch storms
            // Multiple real-time events within 75ms collapse into a single refetch
            if (invalidateTimers.has(changedEventId)) {
              clearTimeout(invalidateTimers.get(changedEventId));
            }

            const timer = setTimeout(() => {
            // Invalidate queries for the affected event
            queryClient.invalidateQueries({
              queryKey: queryKeys.eventAttendance(changedEventId),
            });

            queryClient.invalidateQueries({
              queryKey: queryKeys.userAttendanceStatus(changedEventId),
            });

              // Clean up timer from map
              invalidateTimers.delete(changedEventId);
            }, 75); // 50-100ms is perfect: small enough to feel instant, large enough to collapse events

            invalidateTimers.set(changedEventId, timer);
          }
        )
        .subscribe((status, err) => {
          if (status === 'CHANNEL_ERROR') {
            console.warn('⚠️ Real-time subscription error for event:', eventId, err);
          }
        });

      return channel;
    });

    // Cleanup all subscriptions
    return () => {
      if (__DEV__) {
      console.log('🔕 Cleaning up real-time subscriptions for events:', eventIds);
      }
      
      // Clear any pending debounce timers for these eventIds
      eventIds.forEach((eventId) => {
        if (invalidateTimers.has(eventId)) {
          clearTimeout(invalidateTimers.get(eventId));
          invalidateTimers.delete(eventId);
        }
      });
      
      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
  }, [eventIds.join(','), enabled, supabase, queryClient]);
}
