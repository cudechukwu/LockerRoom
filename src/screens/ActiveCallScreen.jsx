/**
 * ActiveCallScreen
 * Full-screen active call UI for 1-on-1 calls
 * Features: Video rendering, mute/video toggle, end call, switch camera
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';
import RtcEngine from 'react-native-agora';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY, FONT_WEIGHTS } from '../constants/typography';
import { useCallSession } from '../hooks/useCallSession';
import { useAgoraEngine } from '../hooks/useAgoraEngine';
import { useAuthTeam } from '../hooks/useAuthTeam';
import { endCall, getCallSession } from '../api/calling';
import { queryKeys } from '../hooks/queryKeys';
import { supabase } from '../lib/supabase';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Format call duration as MM:SS
 */
const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const ActiveCallScreen = ({ navigation, route }) => {
  const { callSessionId, callType, isInitiator, agoraToken } = route.params || {};
  const insets = useSafeAreaInsets();
  const { data: authTeam } = useAuthTeam();
  const currentUserId = authTeam?.userId;

  const [callDuration, setCallDuration] = useState(0);
  const [isEndingCall, setIsEndingCall] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const durationIntervalRef = useRef(null);

  // Fetch call session data
  const { data: callSession } = useQuery({
    queryKey: queryKeys.callSession(callSessionId),
    queryFn: async () => {
      if (!callSessionId) return null;
      const { data, error } = await getCallSession(callSessionId);
      if (error) throw error;
      return data;
    },
    enabled: !!callSessionId,
    staleTime: 0,
  });

  // Subscribe to real-time call status
  const { callSession: realtimeCallSession, status, participants } = useCallSession(callSessionId, {
    enabled: !!callSessionId && !!callSession,
    onStatusChange: (newStatus) => {
      // Auto-navigate if call ended
      if (['ended', 'missed', 'rejected', 'failed', 'cancelled'].includes(newStatus)) {
        navigation.goBack();
      }
    },
  });

  const activeCallSession = realtimeCallSession || callSession;

  // Determine call type
  const isVideoCall = callType === 'video' || callType === 'group_video';
  const isGroupCall = callType?.includes('group');

  // Initialize Agora engine
  const agoraEngine = useAgoraEngine(activeCallSession, {
    enableVideo: isVideoCall,
  });

  // Auto-join for initiators (if token provided)
  useEffect(() => {
    if (isInitiator && agoraToken && activeCallSession && !hasJoined) {
      const joinAsInitiator = async () => {
        try {
          // Initialize engine if needed
          if (!agoraEngine.engine && !agoraEngine.isInitializing) {
            await agoraEngine.initialize();
          }
          
          // Wait a bit for engine to be ready, then join
          const checkAndJoin = async () => {
            if (agoraEngine.engine || agoraEngine.isInitializing === false) {
              await agoraEngine.join(agoraToken);
              setHasJoined(true);
            } else {
              // Retry after a short delay
              setTimeout(checkAndJoin, 100);
            }
          };
          
          checkAndJoin();
        } catch (error) {
          console.error('Error joining as initiator:', error);
        }
      };
      joinAsInitiator();
    }
  }, [isInitiator, agoraToken, activeCallSession, hasJoined, agoraEngine]);

  // Get other participant (for 1-on-1 calls)
  const otherParticipant = participants?.find(p => p.user_id !== currentUserId);
  const otherParticipantId = otherParticipant?.user_id;

  // Fetch other participant profile
  const { data: otherParticipantProfile } = useQuery({
    queryKey: ['callParticipantProfile', otherParticipantId],
    queryFn: async () => {
      if (!otherParticipantId) return null;
      const { data, error } = await supabase
        .from('user_profiles')
        .select('display_name, avatar_url')
        .eq('id', otherParticipantId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!otherParticipantId,
    staleTime: 5 * 60 * 1000,
  });

  // Start call timer (simplified - only depends on status)
  useEffect(() => {
    if (status === 'connected') {
      durationIntervalRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      // Reset timer when call is not connected
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      setCallDuration(0);
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    };
  }, [status]);


  /**
   * Handle end call
   */
  const handleEndCall = useCallback(async () => {
    if (isEndingCall) return;

    try {
      setIsEndingCall(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

      // Leave Agora channel
      await agoraEngine.leave();

      // End call in database
      await endCall(callSessionId, currentUserId ? { id: currentUserId } : null);

      // Navigate back
      navigation.goBack();
    } catch (error) {
      console.error('Error ending call:', error);
      // Still navigate back even on error
      navigation.goBack();
    }
  }, [isEndingCall, callSessionId, currentUserId, agoraEngine, navigation]);

  /**
   * Handle toggle mute
   */
  const handleToggleMute = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await agoraEngine.toggleMute();
  }, [agoraEngine]);

  /**
   * Handle toggle video
   */
  const handleToggleVideo = useCallback(async () => {
    if (!isVideoCall) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await agoraEngine.toggleVideo();
  }, [agoraEngine, isVideoCall]);

  /**
   * Handle switch camera
   */
  const handleSwitchCamera = useCallback(async () => {
    if (!isVideoCall) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await agoraEngine.switchCamera();
  }, [agoraEngine, isVideoCall]);

  const participantName = otherParticipantProfile?.display_name || 'Unknown';
  const participantAvatar = otherParticipantProfile?.avatar_url;

  // Loading state
  if (!activeCallSession || agoraEngine.isInitializing) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.TEXT_PRIMARY} />
          <Text style={styles.loadingText}>Connecting...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        {/* Video Views */}
        {isVideoCall ? (
          <View style={styles.videoContainer}>
            {/* Remote Video (Full Screen) */}
            {agoraEngine.remoteUids.length > 0 && agoraEngine.remoteUids[0] ? (
              <View style={styles.remoteVideo}>
                {/* Note: Video rendering will be handled by Agora engine via setupRemoteVideo */}
                {/* For now, show placeholder until video stream is established */}
                <View style={styles.videoPlaceholder}>
                  <Image
                    source={participantAvatar ? { uri: participantAvatar } : null}
                    style={styles.placeholderAvatar}
                    resizeMode="cover"
                  />
                  <View style={styles.placeholderOverlay}>
                    <Ionicons name="person" size={80} color={COLORS.TEXT_MUTED} />
                    <Text style={styles.placeholderName}>{participantName}</Text>
                    <Text style={styles.connectingText}>Connecting video...</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={[styles.remoteVideo, styles.videoPlaceholder]}>
                <Image
                  source={participantAvatar ? { uri: participantAvatar } : null}
                  style={styles.placeholderAvatar}
                  resizeMode="cover"
                />
                <View style={styles.placeholderOverlay}>
                  <Ionicons name="person" size={80} color={COLORS.TEXT_MUTED} />
                  <Text style={styles.placeholderName}>{participantName}</Text>
                </View>
              </View>
            )}

            {/* Local Video (Picture-in-Picture) */}
            {agoraEngine.videoEnabled && (
              <View style={styles.localVideoContainer}>
                {/* Note: Local video rendering will be handled by Agora engine via setupLocalVideo */}
                <View style={styles.localVideo}>
                  <View style={styles.localVideoPlaceholder}>
                    <Ionicons name="videocam" size={24} color={COLORS.TEXT_MUTED} />
                  </View>
                </View>
              </View>
            )}
          </View>
        ) : (
          /* Audio Call UI */
          <View style={styles.audioContainer}>
            <View style={styles.avatarContainer}>
              {participantAvatar ? (
                <Image
                  source={{ uri: `${participantAvatar}?t=${Date.now()}` }}
                  style={styles.audioAvatar}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.audioAvatar, styles.avatarPlaceholder]}>
                  <Ionicons name="person" size={100} color={COLORS.TEXT_MUTED} />
                </View>
              )}
            </View>
            <Text style={styles.participantName}>{participantName}</Text>
            <Text style={styles.callStatus}>
              {status === 'connecting' ? 'Connecting...' : formatDuration(callDuration)}
            </Text>
          </View>
        )}

        {/* Participant Info Overlay (Video Calls) */}
        {isVideoCall && (
          <View style={styles.participantInfoOverlay}>
            <Text style={styles.participantNameOverlay}>{participantName}</Text>
            <Text style={styles.callDurationOverlay}>{formatDuration(callDuration)}</Text>
          </View>
        )}

        {/* Call Controls */}
        <View style={styles.controlsContainer}>
          <View style={styles.controlsRow}>
            {/* Mute Button */}
            <TouchableOpacity
              style={[
                styles.controlButton,
                agoraEngine.isMuted && styles.controlButtonActive,
              ]}
              onPress={handleToggleMute}
              activeOpacity={0.7}
            >
              <Ionicons
                name={agoraEngine.isMuted ? 'mic-off' : 'mic'}
                size={24}
                color={COLORS.WHITE}
              />
            </TouchableOpacity>

            {/* Video Toggle (Video Calls Only) */}
            {isVideoCall && (
              <TouchableOpacity
                style={[
                  styles.controlButton,
                  !agoraEngine.videoEnabled && styles.controlButtonActive,
                ]}
                onPress={handleToggleVideo}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={agoraEngine.videoEnabled ? 'videocam' : 'videocam-off'}
                  size={24}
                  color={COLORS.WHITE}
                />
              </TouchableOpacity>
            )}

            {/* Switch Camera (Video Calls Only) */}
            {isVideoCall && agoraEngine.videoEnabled && (
              <TouchableOpacity
                style={styles.controlButton}
                onPress={handleSwitchCamera}
                activeOpacity={0.7}
              >
                <Ionicons name="camera-reverse" size={24} color={COLORS.WHITE} />
              </TouchableOpacity>
            )}

            {/* End Call Button */}
            <TouchableOpacity
              style={[styles.controlButton, styles.endCallButton]}
              onPress={handleEndCall}
              disabled={isEndingCall}
              activeOpacity={0.7}
            >
              <Ionicons name="call" size={24} color={COLORS.WHITE} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Ending Call Indicator */}
        {isEndingCall && (
          <View style={styles.endingContainer}>
            <ActivityIndicator size="small" color={COLORS.TEXT_PRIMARY} />
            <Text style={styles.endingText}>Ending call...</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.TEXT_MUTED,
  },
  videoContainer: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
  },
  remoteVideo: {
    flex: 1,
    width: '100%',
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
  },
  videoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  placeholderAvatar: {
    width: '100%',
    height: '100%',
    opacity: 0.3,
  },
  placeholderOverlay: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  placeholderName: {
    ...TYPOGRAPHY.h2,
    color: COLORS.TEXT_PRIMARY,
  },
  connectingText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.TEXT_MUTED,
    marginTop: 8,
  },
  localVideoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND_CARD,
  },
  localVideoContainer: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 120,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.TEXT_PRIMARY,
    backgroundColor: COLORS.BACKGROUND_CARD,
  },
  localVideo: {
    width: '100%',
    height: '100%',
  },
  audioContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  avatarContainer: {
    marginBottom: 40,
  },
  audioAvatar: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    borderColor: COLORS.TEXT_PRIMARY,
  },
  avatarPlaceholder: {
    backgroundColor: COLORS.BACKGROUND_CARD,
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantName: {
    ...TYPOGRAPHY.h1,
    fontSize: 32,
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 8,
    textAlign: 'center',
  },
  callStatus: {
    ...TYPOGRAPHY.bodyLarge,
    color: COLORS.TEXT_MUTED,
    textAlign: 'center',
  },
  participantInfoOverlay: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 140, // Avoid overlap with local video
    gap: 8,
  },
  participantNameOverlay: {
    ...TYPOGRAPHY.h2,
    color: COLORS.TEXT_PRIMARY,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  callDurationOverlay: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.TEXT_PRIMARY,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.BACKGROUND_CARD,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.9,
  },
  controlButtonActive: {
    backgroundColor: COLORS.ERROR,
  },
  endCallButton: {
    backgroundColor: COLORS.ERROR,
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  endingContainer: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 12,
  },
  endingText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.TEXT_MUTED,
  },
});

export default ActiveCallScreen;

