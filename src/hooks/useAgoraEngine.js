/**
 * useAgoraEngine Hook
 * Centralized Agora SDK engine management for audio/video calling
 * 
 * Handles:
 * - Engine initialization and cleanup
 * - Joining/leaving channels
 * - Mute/video toggle
 * - Remote participant tracking
 * - Call quality metrics
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform, AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import RtcEngine from 'react-native-agora';
import { AGORA_APP_ID, isAgoraConfigured } from '../config/agora';
import { trackCallMetrics, updateParticipantState, getAgoraToken } from '../api/calling';
import { useAuthTeam } from './useAuthTeam';

// Call status constants (aligns with database enum)
export const CALL_STATUS = {
  RINGING: 'ringing',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  ENDED: 'ended',
  MISSED: 'missed',
  REJECTED: 'rejected',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
};

/**
 * Hook for managing Agora engine and call state
 * @param {Object} callSession - Call session object from database
 * @param {Object} options - Optional configuration
 * @param {boolean} options.enableVideo - Whether to enable video by default (default: true)
 * @param {Function} options.onError - Error callback
 * @param {Function} options.onUserJoined - Callback when user joins
 * @param {Function} options.onUserOffline - Callback when user leaves
 * @returns {Object} Engine state and control functions
 */
export function useAgoraEngine(callSession, options = {}) {
  const {
    enableVideo: defaultEnableVideo = true,
    onError,
    onUserJoined,
    onUserOffline,
  } = options;

  const { data: authTeam } = useAuthTeam();
  const currentUserId = authTeam?.userId;

  // Engine state
  const [engine, setEngine] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(defaultEnableVideo);
  const [remoteUids, setRemoteUids] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState(null);

  // Refs for stable references
  const engineRef = useRef(null);
  const callSessionRef = useRef(callSession);
  const metricsIntervalRef = useRef(null);
  const lastMetricsSentRef = useRef(0);
  const networkTypeRef = useRef('unknown');
  const deviceTypeRef = useRef(Platform.OS); // 'ios' | 'android' | 'web'
  
  // Future enhancements:
  // - Multi-participant mapping: map remoteUids → user_profiles via Supabase subscription
  //   for participant cards (video tiles)
  // - Audio level monitoring: use Agora's AudioVolumeIndication event to show active speakers
  // - Unified call context: extract this hook into CallProvider with context API for simpler
  //   consumption across multiple components
  // const [participants, setParticipants] = useState([]);

  // Update call session ref when it changes
  useEffect(() => {
    callSessionRef.current = callSession;
  }, [callSession]);

  /**
   * Helper function to update participant state in database (fire-and-forget)
   * Prevents UI blocking on network calls
   */
  const updateParticipantStateAsync = useCallback(async (fields) => {
    if (!callSessionRef.current?.id || !currentUserId) return;
    
    // Fire-and-forget: don't await to keep UI responsive
    updateParticipantState(
      callSessionRef.current.id,
      fields,
      { id: currentUserId }
    ).catch(err => {
      console.error('Failed to update participant state:', err);
    });
  }, [currentUserId]);

  // Detect network type on mount and when network changes
  useEffect(() => {
    const updateNetworkType = async () => {
      try {
        const netInfo = await NetInfo.fetch();
        networkTypeRef.current = netInfo?.type || 'unknown';
      } catch (err) {
        console.error('Failed to fetch network info:', err);
        networkTypeRef.current = 'unknown';
      }
    };

    updateNetworkType();
    
    // Subscribe to network changes
    const unsubscribe = NetInfo.addEventListener(state => {
      networkTypeRef.current = state?.type || 'unknown';
    });

      return () => {
        unsubscribe();
      };
  }, []);

  // Auto-reconnect when app comes to foreground (resilient to iOS/Android suspensions)
  useEffect(() => {
    if (!callSession?.id) return;

    const subscription = AppState.addEventListener('change', async (state) => {
      if (state === 'active' && !isConnected && engineRef.current && callSessionRef.current?.id) {
        try {
          console.log('App became active, attempting to reconnect to call...');
          // Get fresh token
          const { data: tokenData, error: tokenError } = await getAgoraToken(
            callSessionRef.current.id,
            currentUserId ? { id: currentUserId } : null
          );

          if (tokenError || !tokenData?.token) {
            console.warn('Auto-reconnect failed: could not get token', tokenError);
            return;
          }

          // Rejoin channel
          if (engineRef.current) {
            await engineRef.current.joinChannel(
              tokenData.token,
              callSessionRef.current.agora_channel_name,
              0,
              { clientRoleType: 1 }
            );
            setIsConnected(true);
            console.log('Auto-reconnected successfully');
          }
        } catch (err) {
          console.warn('Auto-reconnect failed:', err);
          // Don't break the call - user can manually reconnect
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isConnected, callSession?.id, currentUserId]);

  /**
   * Initialize Agora engine
   */
  const initialize = useCallback(async () => {
    if (!isAgoraConfigured()) {
      const err = new Error('Agora is not configured. Please add EXPO_PUBLIC_AGORA_APP_ID to your .env file.');
      console.error('❌ Agora configuration error:', err.message);
      console.error('📋 Fix: Add EXPO_PUBLIC_AGORA_APP_ID=your_app_id to your .env file');
      console.error('📋 Note: This is different from Supabase secrets. You need BOTH:');
      console.error('   1. EXPO_PUBLIC_AGORA_APP_ID in .env (for client-side SDK)');
      console.error('   2. AGORA_APP_ID and AGORA_APP_CERTIFICATE as Supabase secrets (for Edge Function)');
      setError(err);
      onError?.(err);
      throw err;
    }

    // Avoid race condition on concurrent inits: ensure ref and variable reference same instance
    if (engineRef.current) {
      return engineRef.current;
    }

    try {
      setIsInitializing(true);
      setError(null);

      // Create engine and assign to ref immediately to prevent race conditions
      const agoraEngine = engineRef.current = await RtcEngine.create(AGORA_APP_ID);
      
      // Enable video by default
      if (defaultEnableVideo) {
        await agoraEngine.enableVideo();
      }

      // Enable audio
      await agoraEngine.enableAudio();

      // Set up event listeners
      agoraEngine.addListener('UserJoined', (uid, elapsed) => {
        console.log(`User ${uid} joined, elapsed: ${elapsed}ms`);
        setRemoteUids(prev => {
          if (!prev.includes(uid)) {
            return [...prev, uid];
          }
          return prev;
        });
        onUserJoined?.(uid, elapsed);
      });

      agoraEngine.addListener('UserOffline', (uid, reason) => {
        console.log(`User ${uid} offline, reason: ${reason}`);
        setRemoteUids(prev => prev.filter(id => id !== uid));
        onUserOffline?.(uid, reason);
      });

      agoraEngine.addListener('JoinChannelSuccess', (channel, uid, elapsed) => {
        console.log(`Successfully joined channel ${channel} as ${uid}, elapsed: ${elapsed}ms`);
        setIsConnected(true);
        setError(null);
      });

      agoraEngine.addListener('Error', (err) => {
        console.error('Agora engine error:', err);
        const errorObj = new Error(`Agora error: ${err}`);
        setError(errorObj);
        onError?.(errorObj);
      });

      // Track call quality metrics (throttled to every 5 seconds)
      // Future enhancement: batch metrics in memory and push every 30s in bulk if Supabase traffic becomes heavy
      agoraEngine.addListener('RtcStats', async (stats) => {
        if (!callSessionRef.current?.id || !currentUserId) return;

        // Throttle metrics: only send every 5 seconds
        const now = Date.now();
        if (now - lastMetricsSentRef.current < 5000) return;
        lastMetricsSentRef.current = now;

        try {
          // Track metrics in database with actual network and device detection (fire-and-forget)
          trackCallMetrics(callSessionRef.current.id, {
            join_latency_ms: stats.joinTime,
            duration_seconds: Math.floor(stats.duration / 1000),
            packet_loss_percent: stats.rxPacketLossRate || 0,
            avg_bitrate_kbps: Math.floor(stats.txKBitRate || 0),
            video_enabled: videoEnabled,
            audio_enabled: !isMuted,
            network_type: networkTypeRef.current,
            device_type: deviceTypeRef.current,
          }, currentUserId ? { id: currentUserId } : null).catch(metricsError => {
            console.error('Failed to track call metrics:', metricsError);
            // Don't break the call if metrics fail
          });
        } catch (metricsError) {
          console.error('Error processing metrics:', metricsError);
        }
      });

      // Automatic token renewal (prevents dropped calls after 1 hour)
      agoraEngine.addListener('TokenPrivilegeWillExpire', async () => {
        console.log('Token will expire soon, renewing...');
        try {
          if (!callSessionRef.current?.id) {
            console.warn('Cannot renew token: no call session ID');
            return;
          }

          // Get new token from Edge Function
          const { data: tokenData, error: tokenError } = await getAgoraToken(
            callSessionRef.current.id,
            currentUserId ? { id: currentUserId } : null
          );

          if (tokenError || !tokenData?.token) {
            console.error('Failed to renew token:', tokenError);
            return;
          }

          // Renew token with Agora engine
          await agoraEngine.renewToken(tokenData.token);
          console.log('Token renewed successfully');
        } catch (renewError) {
          console.error('Error renewing token:', renewError);
          // Don't break the call - Agora will handle reconnection attempts
        }
      });

      // Engine already assigned to ref above, just update state
      setEngine(agoraEngine);
      setIsInitializing(false);

      return agoraEngine;
    } catch (err) {
      console.error('Failed to initialize Agora engine:', err);
      setIsInitializing(false);
      setError(err);
      onError?.(err);
      throw err;
    }
  }, [defaultEnableVideo, onError, onUserJoined, onUserOffline, currentUserId, videoEnabled, isMuted, updateParticipantStateAsync]);

  /**
   * Join Agora channel
   * @param {string} token - Agora token from Edge Function
   * @param {number} uid - User ID (0 for auto-assign)
   */
  const join = useCallback(async (token, uid = 0) => {
    if (!engineRef.current) {
      await initialize();
    }

    if (!callSession?.agora_channel_name) {
      throw new Error('Call session missing agora_channel_name');
    }

    try {
      setError(null);
      const channelName = callSession.agora_channel_name;
      
      await engineRef.current.joinChannel(token, channelName, uid, {
        clientRoleType: 1, // RtcClientRoleBroadcaster (can publish audio/video)
      });

      setIsConnected(true);
    } catch (err) {
      console.error('Failed to join channel:', err);
      setError(err);
      setIsConnected(false);
      onError?.(err);
      throw err;
    }
  }, [callSession, initialize, onError]);

  /**
   * Leave channel and cleanup (with safe error handling)
   */
  const leave = useCallback(async () => {
    try {
      if (engineRef.current) {
        // Safe leave: sometimes Agora emits UserOffline before leaveChannel resolves
        await engineRef.current?.leaveChannel().catch(() => {
          // Ignore errors - continue with cleanup
        });
        await engineRef.current?.destroy().catch(() => {
          // Ignore errors - continue with cleanup
        });
        engineRef.current = null;
      }

      // Clear metrics interval
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current);
        metricsIntervalRef.current = null;
      }

      // Reset metrics throttle
      lastMetricsSentRef.current = 0;

      setEngine(null);
      setIsConnected(false);
      setRemoteUids([]);
      setIsMuted(false);
      setVideoEnabled(defaultEnableVideo);
      setError(null);
    } catch (err) {
      console.error('Error leaving channel:', err);
      // Continue cleanup even if leave fails
      engineRef.current = null;
      setEngine(null);
      setIsConnected(false);
    }
  }, [defaultEnableVideo]);

  /**
   * Toggle mute/unmute
   */
  const toggleMute = useCallback(async () => {
    if (!engineRef.current) return;

    try {
      const newMutedState = !isMuted;
      await engineRef.current.muteLocalAudioStream(newMutedState);
      setIsMuted(newMutedState);

      // Update participant state in database (fire-and-forget for instant UI response)
      updateParticipantStateAsync({ is_muted: newMutedState });
    } catch (err) {
      console.error('Failed to toggle mute:', err);
      setError(err);
      onError?.(err);
    }
  }, [isMuted, updateParticipantStateAsync, onError]);

  /**
   * Toggle video on/off
   */
  const toggleVideo = useCallback(async () => {
    if (!engineRef.current) return;

    try {
      const newVideoState = !videoEnabled;
      await engineRef.current.enableLocalVideo(newVideoState);
      setVideoEnabled(newVideoState);

      // Update participant state in database (fire-and-forget for instant UI response)
      updateParticipantStateAsync({ video_enabled: newVideoState });
    } catch (err) {
      console.error('Failed to toggle video:', err);
      setError(err);
      onError?.(err);
    }
  }, [videoEnabled, updateParticipantStateAsync, onError]);

  /**
   * Switch camera (front/back)
   */
  const switchCamera = useCallback(async () => {
    if (!engineRef.current) return;

    try {
      await engineRef.current.switchCamera();
    } catch (err) {
      console.error('Failed to switch camera:', err);
      setError(err);
      onError?.(err);
    }
  }, [onError]);

  /**
   * Set video enabled state (for external control)
   */
  const setVideo = useCallback(async (enabled) => {
    if (!engineRef.current) return;
    if (videoEnabled === enabled) return;

    try {
      await engineRef.current.enableLocalVideo(enabled);
      setVideoEnabled(enabled);

      // Update participant state in database (fire-and-forget for instant UI response)
      updateParticipantStateAsync({ video_enabled: enabled });
    } catch (err) {
      console.error('Failed to set video:', err);
      setError(err);
      onError?.(err);
    }
  }, [videoEnabled, updateParticipantStateAsync, onError]);

  /**
   * Set mute state (for external control)
   */
  const setMute = useCallback(async (muted) => {
    if (!engineRef.current) return;
    if (isMuted === muted) return;

    try {
      await engineRef.current.muteLocalAudioStream(muted);
      setIsMuted(muted);

      // Update participant state in database (fire-and-forget for instant UI response)
      updateParticipantStateAsync({ is_muted: muted });
    } catch (err) {
      console.error('Failed to set mute:', err);
      setError(err);
      onError?.(err);
    }
  }, [isMuted, updateParticipantStateAsync, onError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (engineRef.current) {
        engineRef.current.destroy().catch(err => {
          console.error('Error destroying engine on unmount:', err);
        });
      }
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current);
      }
    };
  }, []);

  return {
    // Engine instance
    engine: engineRef.current,
    
    // State
    isMuted,
    videoEnabled,
    remoteUids,
    isConnected,
    isInitializing,
    error,
    
    // Control functions
    initialize,
    join,
    leave,
    toggleMute,
    toggleVideo,
    switchCamera,
    setVideo,
    setMute,
  };
}

