/**
 * useCallSession Hook
 * Manages call session state and Supabase realtime subscriptions
 * 
 * Handles:
 * - Call session data fetching and updates
 * - Real-time status changes (ringing → connecting → connected → ended)
 * - Participant presence tracking with heartbeats
 * - Participant join/leave events
 * - Auto-cleanup on unmount
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { getCallSession, getAgoraToken } from '../api/calling';
import { queryKeys } from './queryKeys';
import { useAuthTeam } from './useAuthTeam';
import { CALL_STATUS } from './useAgoraEngine';

const DISABLE_CALL_REALTIME = true; // TODO: flip back to false once Realtime infra is stable

/**
 * Simple debounce utility
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Merge participants array with new data
 */
function mergeParticipants(oldParticipants, newParticipant) {
  if (!oldParticipants || !Array.isArray(oldParticipants)) {
    return newParticipant ? [newParticipant] : [];
  }

  const existingIndex = oldParticipants.findIndex(
    p => p.user_id === newParticipant?.user_id || p.id === newParticipant?.id
  );

  if (existingIndex >= 0) {
    // Update existing participant
    const updated = [...oldParticipants];
    updated[existingIndex] = { ...updated[existingIndex], ...newParticipant };
    return updated;
  } else {
    // Add new participant
    return [...oldParticipants, newParticipant];
  }
}

/**
 * Hook for managing call session state and realtime subscriptions
 * @param {string} callSessionId - Call session ID
 * @param {Object} options - Optional configuration
 * @param {boolean} options.enabled - Whether to enable the subscription (default: true)
 * @param {Function} options.onStatusChange - Callback when call status changes
 * @param {Function} options.onParticipantJoin - Callback when participant joins
 * @param {Function} options.onParticipantLeave - Callback when participant leaves
 * @param {Function} options.onReconnect - Callback on reconnection
 * @param {Function} options.onError - Callback on error
 * @returns {Object} Call session state and control functions
 */
export function useCallSession(callSessionId, options = {}) {
  const {
    enabled = true,
    onStatusChange,
    onParticipantJoin,
    onParticipantLeave,
    onReconnect,
    onError,
  } = options;

  const { data: authTeam } = useAuthTeam();
  const currentUserId = authTeam?.userId;
  const queryClient = useQueryClient();

  // Refs for subscriptions and lifecycle tracking
  const callChannelRef = useRef(null);
  const isActiveRef = useRef(true);
  const lastHeartbeatRef = useRef(Date.now());
  const heartbeatBackoffRef = useRef(30000); // Start at 30s, adapts dynamically
  const lastRealtimeTokenRef = useRef(null);

  // Local state for real-time updates
  const [participants, setParticipants] = useState([]);
  const [presenceMap, setPresenceMap] = useState({});
  const presenceMapRef = useRef({});

  // Fetch call session data
  const {
    data: callSessionData,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: queryKeys.callSession(callSessionId),
    queryFn: async () => {
      if (!callSessionId) return null;
      const { data, error } = await getCallSession(callSessionId);
      if (error) throw error;
      return data;
    },
    enabled: enabled && !!callSessionId,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: (data) => {
      // Refetch if call is active (not ended)
      if (data?.status && !['ended', 'missed', 'rejected', 'failed', 'cancelled'].includes(data.status)) {
        return 60 * 1000; // Every minute for active calls
      }
      return false; // Don't refetch ended calls
    },
  });

  const callSession = callSessionData || null;

  /**
   * Handle presence state updates (debounced to reduce re-renders)
   */
  const handlePresenceSync = useCallback(() => {
    if (!callChannelRef.current || !isActiveRef.current) return;

    const state = callChannelRef.current.presenceState();
    const newPresenceMap = {};
    const presentUserIds = [];

    // Process presence state
    Object.entries(state).forEach(([userId, presences]) => {
      if (presences && presences.length > 0) {
        const latestPresence = presences[presences.length - 1];
        newPresenceMap[userId] = {
          user_id: userId,
          status: latestPresence.status || 'connected',
          joined_at: latestPresence.joined_at,
          last_seen: latestPresence.last_seen || latestPresence.joined_at,
        };
        presentUserIds.push(userId);
      }
    });

    // Only update if presenceMap actually changed (prevent infinite loops)
    const presenceMapStr = JSON.stringify(newPresenceMap);
    const prevPresenceMapStr = JSON.stringify(presenceMapRef.current);
    
    if (presenceMapStr !== prevPresenceMapStr) {
      presenceMapRef.current = newPresenceMap;
      setPresenceMap(newPresenceMap);
    }

    // Update participants list based on presence (will be debounced below)
    if (callSession?.call_participants) {
      const updatedParticipants = callSession.call_participants.map(p => ({
        ...p,
        is_present: presentUserIds.includes(p.user_id),
        presence: newPresenceMap[p.user_id] || null,
      }));
      setParticipants(updatedParticipants);
    }
  }, [callSession]);

  // Debounce presence sync to reduce React re-renders (100ms debounce)
  const debouncedPresenceSync = useMemo(
    () => debounce(handlePresenceSync, 100),
    [handlePresenceSync]
  );

  /**
   * Subscribe to call session realtime updates with retry logic
   */
  const subscribe = useCallback(async () => {
    // Duplicate subscription prevention
    if (callChannelRef.current) {
      console.log('Already subscribed to call channel, skipping duplicate subscription');
      return;
    }

    if (DISABLE_CALL_REALTIME) {
      if (__DEV__) {
        console.warn('🛑 useCallSession: Realtime calling temporarily disabled');
      }
      return;
    }

    if (!callSessionId || !currentUserId || !enabled) return;

    // Track component mount state
    isActiveRef.current = true;

    try {
      // Ensure Realtime connection has current auth token before creating channel
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('❌ useCallSession.getSession error:', sessionError);
        return;
      }

      const accessToken = session?.access_token;
      if (!accessToken) {
        console.warn('⚠️ useCallSession: no access token available for realtime channel');
      } else if (lastRealtimeTokenRef.current !== accessToken) {
        const setAuthFn =
          typeof supabase.realtime.setAuth === 'function'
            ? supabase.realtime.setAuth.bind(supabase.realtime)
            : typeof supabase.realtime.setAuthToken === 'function'
              ? supabase.realtime.setAuthToken.bind(supabase.realtime)
              : null;

        if (setAuthFn) {
          try {
            await setAuthFn(accessToken);
            lastRealtimeTokenRef.current = accessToken;
            console.log('🔑 useCallSession: realtime auth set before channel subscribe');
          } catch (setAuthError) {
            console.error('❌ useCallSession: failed to set realtime auth token', setAuthError);
            return;
          }
        } else {
          console.warn('⚠️ useCallSession: realtime auth setter not available on client');
        }
      }

      // Create Presence channel for call signaling
      const callChannel = supabase.channel(`call:${callSessionId}`, {
        config: {
          presence: {
            key: currentUserId,
          },
          retry: true, // ✅ ensures auto-reconnect (prevents CLOSE event spam)
        },
      });

      // Subscribe to call session status changes
      callChannel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'call_sessions',
          filter: `id=eq.${callSessionId}`,
        },
        (payload) => {
          if (!isActiveRef.current) return;

          const updatedSession = payload.new;
          
          // Merge into cache instead of invalidating (prevents refetch storms)
          queryClient.setQueryData(
            queryKeys.callSession(callSessionId),
            (old) => {
              if (!old) return updatedSession;
              return { ...old, ...updatedSession };
            }
          );

          // Trigger status change callback
          if (payload.old?.status !== updatedSession.status) {
            onStatusChange?.(updatedSession.status, updatedSession);
          }
        }
      );

      // Subscribe to participant changes
      callChannel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'call_participants',
          filter: `call_session_id=eq.${callSessionId}`,
        },
        (payload) => {
          if (!isActiveRef.current) return;

          // Merge participant changes instead of invalidating (prevents refetch storms)
          queryClient.setQueryData(
            queryKeys.callSession(callSessionId),
            (old) => {
              if (!old) return old;
              
              const currentParticipants = old.call_participants || [];
              let updatedParticipants;

              if (payload.eventType === 'INSERT') {
                updatedParticipants = [...currentParticipants, payload.new];
              } else if (payload.eventType === 'UPDATE') {
                updatedParticipants = currentParticipants.map(p =>
                  (p.id === payload.new.id || p.user_id === payload.new.user_id)
                    ? { ...p, ...payload.new }
                    : p
                );
              } else if (payload.eventType === 'DELETE') {
                updatedParticipants = currentParticipants.filter(
                  p => p.id !== payload.old.id && p.user_id !== payload.old.user_id
                );
              } else {
                updatedParticipants = currentParticipants;
              }

              return {
                ...old,
                call_participants: updatedParticipants,
              };
            }
          );

          if (payload.eventType === 'INSERT') {
            onParticipantJoin?.(payload.new);
          } else if (payload.eventType === 'DELETE') {
            onParticipantLeave?.(payload.old);
          }
        }
      );

      // Presence sync event
      callChannel.on('presence', { event: 'sync' }, () => {
        if (!isActiveRef.current) return;
        debouncedPresenceSync();
      });

      // Participant joined presence channel
      callChannel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
        if (!isActiveRef.current) return;
        console.log('User joined presence channel:', key);
        debouncedPresenceSync();
        
        if (key !== currentUserId) {
          onParticipantJoin?.({ user_id: key });
        }
      });

      // Participant left presence channel
      callChannel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        if (!isActiveRef.current) return;
        console.log('User left presence channel:', key);
        debouncedPresenceSync();
        
        if (key !== currentUserId) {
          onParticipantLeave?.({ user_id: key });
        }
      });

      // Subscribe to channel with retry policy (handles network jitter)
      let subscribeStatus = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        if (!isActiveRef.current) return;

        try {
          subscribeStatus = await new Promise((resolve) => {
            callChannel.subscribe((status) => {
              resolve(status);
            });
          });

          if (subscribeStatus === 'SUBSCRIBED') {
            break;
          }
        } catch (err) {
          console.error(`Subscription attempt ${attempt + 1} failed:`, err);
          if (attempt < 2) {
            // Exponential backoff: 2s, 4s
            await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
          }
        }
      }

      if (subscribeStatus !== 'SUBSCRIBED') {
        // Add delay after final retry cleanup
        await callChannel.unsubscribe().catch(() => {});
        await supabase.removeChannel(callChannel).catch(() => {});
        await new Promise(r => setTimeout(r, 300));
        throw new Error('Failed to subscribe to call channel after 3 attempts');
      }

      // Only set callChannelRef after successful subscription
      callChannelRef.current = callChannel;

      // Track our presence
      await callChannel.track({
        user_id: currentUserId,
        joined_at: new Date().toISOString(),
        status: 'connected',
      });

      // Initial presence sync
      debouncedPresenceSync();

      onReconnect?.();

        // Heartbeat loop with dynamic backoff (adapts to connection quality)
        const heartbeatLoop = async () => {
          while (isActiveRef.current && callChannelRef.current) {
            try {
              const now = Date.now();

              // Use presence.update() for lighter heartbeats (if available)
              // Otherwise fall back to track()
              if (callChannelRef.current.presence?.update) {
                await callChannelRef.current.presence.update({
                  user_id: currentUserId,
                  last_seen: new Date().toISOString(),
                  status: 'connected',
                });
              } else {
                // Fallback to track() if update() not available
                await callChannelRef.current.track({
                  user_id: currentUserId,
                  last_seen: new Date().toISOString(),
                  status: 'connected',
                });
              }

              lastHeartbeatRef.current = now;
              heartbeatBackoffRef.current = 30000; // Reset to 30s on success
            } catch (err) {
              console.error('Failed to send presence heartbeat:', err);
              // Exponential backoff on error (max 60s)
              heartbeatBackoffRef.current = Math.min(heartbeatBackoffRef.current * 1.5, 60000);
            }

            // Wait for next heartbeat (dynamic interval based on backoff)
            await new Promise(resolve => setTimeout(resolve, heartbeatBackoffRef.current));
          }
        };

        // Start heartbeat loop
        heartbeatLoop();

    } catch (error) {
      console.error('Error subscribing to call session:', error);
      onError?.(error);
    }
  }, [
    callSessionId,
    currentUserId,
    enabled,
    queryClient,
    onStatusChange,
    onParticipantJoin,
    onParticipantLeave,
    onReconnect,
    onError,
    debouncedPresenceSync,
  ]);

  /**
   * Unsubscribe from call session updates
   */
  const unsubscribe = useCallback(async () => {
    // Mark as inactive to stop heartbeat loop and prevent async operations after unmount
    isActiveRef.current = false;

    // Note: Heartbeat loop will exit automatically when isActiveRef.current becomes false
    // No need to clear interval since we're using a while loop

    // Guard against double unsubscribe
    if (!callChannelRef.current) return;

    const channel = callChannelRef.current;
    callChannelRef.current = null; // Clear ref first to prevent double unsubscribe

    try {
      // Remove our presence before unsubscribing
      await channel.untrack?.();
      await channel.unsubscribe();
      await supabase.removeChannel(channel);
      // Small delay to prevent immediate reopen conflicts
      await new Promise(r => setTimeout(r, 300));
    } catch (error) {
      console.error('Error unsubscribing from call channel:', error);
    } finally {
      // Clear presence state
      setPresenceMap({});
      setParticipants([]);
    }
  }, []);

  // Set up subscription when call session is available
  useEffect(() => {
    if (callSession && currentUserId && enabled) {
      subscribe();
    }

    return () => {
      unsubscribe();
    };
  }, [callSession, currentUserId, enabled, subscribe, unsubscribe]);

  // Update participants when call session changes (with presence merge)
  // Use useMemo to prevent infinite loops from presenceMap object reference changes
  const participantsWithPresence = useMemo(() => {
    if (!callSession?.call_participants) return [];
    
    return callSession.call_participants.map(p => ({
      ...p,
      is_present: presenceMap[p.user_id] !== undefined,
      presence: presenceMap[p.user_id] || null,
    }));
  }, [callSession?.call_participants, presenceMap]);

  useEffect(() => {
    if (!isActiveRef.current) return;
    setParticipants(participantsWithPresence);
  }, [participantsWithPresence]);

  return {
    // Call session data
    callSession,
    participants,
    presenceMap,
    
    // Loading/error states
    isLoading,
    error: queryError,
    
    // Control functions
    subscribe,
    unsubscribe,
    
    // Derived state
    status: callSession?.status || null,
    isActive: callSession?.status && ['ringing', 'connecting', 'connected'].includes(callSession.status),
    isEnded: callSession?.status && ['ended', 'missed', 'rejected', 'failed', 'cancelled'].includes(callSession.status),
  };
}
