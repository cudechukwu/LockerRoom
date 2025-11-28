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
 * @param {string} eventId - Event ID to subscribe to (can be instanceId for recurring events)
 * @param {boolean} enabled - Whether the subscription should be active
 * @param {string|null} instanceDate - Instance date (YYYY-MM-DD) for recurring events
 */
export function useRealtimeAttendance(eventId, enabled = true, instanceDate = null) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !eventId || !supabase) return;

    // Extract original event ID if eventId is an instanceId
    let originalEventId = eventId;
    let finalInstanceDate = instanceDate;
    
    if (eventId && eventId.includes(':')) {
      // Instance ID format: "eventId:YYYY-MM-DD"
      const parts = eventId.split(':');
      originalEventId = parts[0];
      if (!finalInstanceDate && parts[1]) {
        finalInstanceDate = parts[1];
      }
    }

    if (__DEV__) {
    console.log('🔔 Setting up real-time subscription for event:', {
      eventId,
      originalEventId,
      instanceDate: finalInstanceDate,
    });
    }

    // Subscribe to changes in event_attendance table for this event
    // For recurring events, we subscribe to the original event_id
    // The payload will include instance_date, so we can filter client-side if needed
    const channel = supabase
      .channel(`event_attendance:${originalEventId}${finalInstanceDate ? `:${finalInstanceDate}` : ''}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'event_attendance',
          filter: `event_id=eq.${originalEventId}`, // Subscribe to original event_id
        },
        (payload) => {
          const payloadInstanceDate = payload.new?.instance_date || payload.old?.instance_date;
          
          // For recurring events with instanceDate, only process if it matches
          if (finalInstanceDate && payloadInstanceDate !== finalInstanceDate) {
            // This attendance change is for a different instance, ignore it
            return;
          }
          
          // For non-recurring events, only process if instance_date is null
          if (!finalInstanceDate && payloadInstanceDate !== null) {
            // This attendance change is for a recurring instance, ignore it
            return;
          }

          if (__DEV__) {
          console.log('📢 Real-time attendance change:', {
            event: payload.eventType,
            new: payload.new,
            old: payload.old,
            eventId,
            originalEventId,
            instanceDate: finalInstanceDate,
            payloadInstanceDate,
          });
          }

          // Create a unique key for this event+instance combination
          const cacheKey = finalInstanceDate ? `${originalEventId}:${finalInstanceDate}` : originalEventId;

          // Debounced invalidation to avoid refetch storms
          // Multiple real-time events (e.g., UPDATE for checked_in_at + status) within 75ms
          // collapse into a single refetch, preventing database hammering and battery drain
          if (invalidateTimers.has(cacheKey)) {
            clearTimeout(invalidateTimers.get(cacheKey));
          }

          const timer = setTimeout(() => {
          // Invalidate the attendance query to refetch fresh data
          // Use the original eventId (which may be an instanceId) for query key
          queryClient.invalidateQueries({
            queryKey: queryKeys.eventAttendance(eventId),
          });

          // Also invalidate user attendance status queries
          queryClient.invalidateQueries({
            queryKey: queryKeys.userAttendanceStatus(eventId),
          });

            // Clean up timer from map
            invalidateTimers.delete(cacheKey);
          }, 75); // 50-100ms is perfect: small enough to feel instant, large enough to collapse events

          invalidateTimers.set(cacheKey, timer);
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
    }, [eventId, enabled, instanceDate, supabase, queryClient]);
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
