/**
 * GroupCallScreen
 * Multi-participant call UI with grid layout
 * Features: Dynamic grid (2x2, 3x3), active speaker highlighting, participant list
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
  ScrollView,
  FlatList,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring, 
  withRepeat,
  withTiming,
  FadeIn, 
  FadeOut,
  FadeInUp,
  FadeOutDown,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useQuery } from '@tanstack/react-query';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY, FONT_WEIGHTS } from '../constants/typography';
import { useCallSession } from '../hooks/useCallSession';
import { useAgoraEngine } from '../hooks/useAgoraEngine';
import { useJoinAsInitiator } from '../hooks/useJoinAsInitiator';
import { useAuthTeam } from '../hooks/useAuthTeam';
import { endCall, getCallSession } from '../api/calling';
import { queryKeys } from '../hooks/queryKeys';
import { supabase } from '../lib/supabase';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Memoized Participant Cell Component to reduce re-renders
const ParticipantCell = React.memo(({ 
  participant, 
  currentUserId, 
  isVideoCall, 
  cellSize, 
  cellMargin, 
  isActiveSpeaker 
}) => {
  const pulseScale = useSharedValue(1);
  
  React.useEffect(() => {
    if (isActiveSpeaker) {
      pulseScale.value = withRepeat(
        withTiming(1.1, { duration: 600 }),
        -1,
        true
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 200 });
    }
  }, [isActiveSpeaker, pulseScale]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const isCurrentUser = participant.user_id === currentUserId;
  
  return (
    <Animated.View
      entering={FadeInUp.springify()}
      exiting={FadeOutDown.duration(150)}
      style={[
        styles.participantCell,
        { 
          width: cellSize, 
          height: cellSize,
          margin: cellMargin,
        },
        isActiveSpeaker && styles.activeSpeakerCell,
      ]}
    >
      {isVideoCall ? (
        <View style={styles.videoCell}>
          {(participant.user?.avatar_url || participant.user_profiles?.avatar_url) ? (
            <Image
              source={{ uri: participant.user?.avatar_url || participant.user_profiles?.avatar_url }}
              style={styles.videoAvatar}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.videoAvatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={40} color={COLORS.TEXT_MUTED} />
            </View>
          )}
          {isCurrentUser && (
            <View style={styles.localVideoBadge}>
              <Text style={styles.localVideoBadgeText}>You</Text>
            </View>
          )}
          {isActiveSpeaker && (
            <Animated.View 
              entering={FadeIn}
              exiting={FadeOut}
              style={[styles.activeSpeakerIndicator, pulseStyle]}
            >
              <View style={styles.activeSpeakerRing} />
              <Ionicons name="mic" size={16} color={COLORS.WHITE} />
            </Animated.View>
          )}
        </View>
      ) : (
        <View style={styles.audioCell}>
          {(participant.user?.avatar_url || participant.user_profiles?.avatar_url) ? (
            <Image
              source={{ uri: participant.user?.avatar_url || participant.user_profiles?.avatar_url }}
              style={styles.audioAvatar}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.audioAvatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={50} color={COLORS.TEXT_MUTED} />
            </View>
          )}
          <Text style={styles.participantName} numberOfLines={1}>
            {participant.user?.display_name || participant.user_profiles?.display_name || 'Unknown'}
          </Text>
          {isActiveSpeaker && (
            <Animated.View 
              entering={FadeIn}
              exiting={FadeOut}
              style={[styles.audioActiveIndicator, pulseStyle]}
            >
              <Ionicons name="mic" size={14} color={COLORS.WHITE} />
            </Animated.View>
          )}
        </View>
      )}
    </Animated.View>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.participant.user_id === nextProps.participant.user_id &&
    prevProps.isActiveSpeaker === nextProps.isActiveSpeaker &&
    prevProps.cellSize === nextProps.cellSize &&
    prevProps.cellMargin === nextProps.cellMargin &&
    prevProps.isVideoCall === nextProps.isVideoCall
  );
});

const GroupCallScreen = ({ navigation, route }) => {
  const { callSessionId, callType, isInitiator, agoraToken } = route.params || {};
  const insets = useSafeAreaInsets();
  const { data: authTeam } = useAuthTeam();
  const currentUserId = authTeam?.userId;

  const [isEndingCall, setIsEndingCall] = useState(false);
  const [showParticipantList, setShowParticipantList] = useState(false);
  const [durationTick, setDurationTick] = useState(0);
  const callStartTimeRef = useRef(null);
  const durationIntervalRef = useRef(null);
  const activeSpeakerRef = useRef(null);
  const endButtonScale = useSharedValue(1);

  const { callSession: realtimeCallSession, status, participants } = useCallSession(callSessionId, {
    enabled: !!callSessionId,
    onStatusChange: (newStatus) => {
      if (['ended', 'missed', 'rejected', 'failed', 'cancelled'].includes(newStatus)) {
        navigation.goBack();
      }
    },
  });

  const hasRealtimeData = !!realtimeCallSession;

  const { data: callSession } = useQuery({
    queryKey: queryKeys.callSession(callSessionId),
    queryFn: async () => {
      if (!callSessionId) return null;
      const { data, error } = await getCallSession(callSessionId);
      if (error) throw error;
      return data;
    },
    enabled: !!callSessionId && !hasRealtimeData,
    staleTime: 0,
  });

  const activeCallSession = realtimeCallSession || callSession;
  const isVideoCall = callType === 'group_video';

  const agoraEngine = useAgoraEngine(activeCallSession, {
    enableVideo: isVideoCall,
    onError: (error) => {
      console.error('Agora engine error:', error);
      Alert.alert('Call Error', 'There was a problem with the call. Please try again.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    },
  });

  const { joinError: initiatorJoinError, status: joinStatus } = useJoinAsInitiator({
    isInitiator,
    hasJoined: agoraEngine.isConnected,
    activeCallSession,
    agoraEngine,
    agoraToken,
    onJoinSuccess: () => {
      console.log('✅ Successfully joined as initiator');
    },
  });

  useEffect(() => {
    if (status === 'failed' || initiatorJoinError) {
      const errorMessage = initiatorJoinError?.message || 'Call failed';
      Alert.alert(
        'Call Failed',
        errorMessage.includes('not configured')
          ? 'Agora is not configured. Please add EXPO_PUBLIC_AGORA_APP_ID to your .env file.'
          : 'Please check your network and try again.',
        [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]
      );
    }
  }, [status, initiatorJoinError, navigation]);

  useEffect(() => {
    if (agoraEngine.engine) {
      const handleVolumeIndicator = (volumes) => {
        if (volumes && volumes.length > 0) {
          const activeSpeaker = volumes[0];
          if (activeSpeaker.volume > 3) {
            activeSpeakerRef.current = activeSpeaker.uid;
          }
        }
      };

      agoraEngine.engine.addListener('VolumeIndication', handleVolumeIndicator);

      return () => {
        agoraEngine.engine?.removeListener('VolumeIndication', handleVolumeIndicator);
      };
    }
  }, [agoraEngine.engine]);

  useEffect(() => {
    if (status === 'connected') {
      if (!callStartTimeRef.current) {
        callStartTimeRef.current = Date.now();
      }
      
      durationIntervalRef.current = setInterval(() => {
        setDurationTick(prev => prev + 1);
      }, 1000);
    } else {
      callStartTimeRef.current = null;
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [status]);

  const callDuration = callStartTimeRef.current 
    ? Math.floor((Date.now() - callStartTimeRef.current) / 1000)
    : 0;

  const handleToggleMute = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await agoraEngine.toggleMute();
    } catch (error) {
      console.error('Error toggling mute:', error);
    }
  }, [agoraEngine]);

  const handleToggleVideo = useCallback(async () => {
    if (!isVideoCall) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await agoraEngine.toggleVideo();
    } catch (error) {
      console.error('Error toggling video:', error);
    }
  }, [agoraEngine, isVideoCall]);

  const handleSwitchCamera = useCallback(async () => {
    if (!isVideoCall) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await agoraEngine.switchCamera();
    } catch (error) {
      console.error('Error switching camera:', error);
    }
  }, [agoraEngine, isVideoCall]);

  const handleEndCall = useCallback(async () => {
    if (isEndingCall) return;
    
    try {
      setIsEndingCall(true);
      endButtonScale.value = withSpring(0.9);
      
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      await agoraEngine.leave();
      await endCall(callSessionId, currentUserId ? { id: currentUserId } : null);
      
      navigation.goBack();
    } catch (error) {
      console.error('Error ending call:', error);
      setIsEndingCall(false);
      endButtonScale.value = withSpring(1);
    }
  }, [callSessionId, currentUserId, agoraEngine, navigation, isEndingCall, endButtonScale]);

  const endButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: endButtonScale.value }],
  }));

  const participantCount = participants?.length || 0;
  const otherParticipants = participants?.filter(p => p.user_id !== currentUserId) || [];

  const getGridLayout = (count) => {
    if (count <= 1) return { cols: 1, rows: 1 };
    if (count <= 4) return { cols: 2, rows: 2 };
    if (count <= 9) return { cols: 3, rows: 3 };
    return { cols: 3, rows: 3 };
  };

  const { cols, rows } = getGridLayout(participantCount);
  const cellMargin = participantCount > 4 ? 2 : 4;
  const cellSize = Math.min(
    (SCREEN_WIDTH - (cellMargin * 2 * (cols + 1))) / cols,
    (SCREEN_HEIGHT - 200 - (cellMargin * 2 * (rows + 1))) / rows
  );

  const renderParticipant = useCallback(({ item: participant }) => {
    const isActiveSpeaker = activeSpeakerRef.current === participant.user_id;
    
    return (
      <ParticipantCell
        participant={participant}
        currentUserId={currentUserId}
        isVideoCall={isVideoCall}
        cellSize={cellSize}
        cellMargin={cellMargin}
        isActiveSpeaker={isActiveSpeaker}
      />
    );
  }, [currentUserId, isVideoCall, cellSize, cellMargin]);

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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.callDuration}>{formatDuration(callDuration)}</Text>
          <TouchableOpacity
            style={styles.participantCountButton}
            onPress={() => setShowParticipantList(!showParticipantList)}
          >
            <Ionicons name="people" size={20} color={COLORS.WHITE} />
            <Text style={styles.participantCountText}>{participantCount}</Text>
          </TouchableOpacity>
        </View>

        {/* Participant Grid */}
        <View style={styles.gridContainer}>
          <FlatList
            data={participants}
            renderItem={renderParticipant}
            keyExtractor={(item) => item.user_id || item.id}
            numColumns={cols}
            scrollEnabled={false}
            contentContainerStyle={[
              styles.gridContent,
              { margin: cellMargin },
            ]}
            columnWrapperStyle={cols > 1 ? { marginBottom: cellMargin * 2 } : null}
          />
        </View>

        {/* Participant List Modal (for >8 participants) */}
        {showParticipantList && participantCount > 8 && (
          <BlurView intensity={80} tint="dark" style={styles.participantListOverlay}>
            <View style={styles.participantListContainer}>
              <View style={styles.participantListHeader}>
                <Text style={styles.participantListTitle}>Participants ({participantCount})</Text>
                <TouchableOpacity onPress={() => setShowParticipantList(false)}>
                  <Ionicons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.participantListScroll}>
                {participants.map((participant) => (
                  <View key={participant.user_id} style={styles.participantListItem}>
                    {(participant.user?.avatar_url || participant.user_profiles?.avatar_url) ? (
                      <Image
                        source={{ uri: participant.user?.avatar_url || participant.user_profiles?.avatar_url }}
                        style={styles.listAvatar}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.listAvatar, styles.avatarPlaceholder]}>
                        <Ionicons name="person" size={20} color={COLORS.TEXT_MUTED} />
                      </View>
                    )}
                    <Text style={styles.listParticipantName}>
                      {participant.user?.display_name || participant.user_profiles?.display_name || 'Unknown'}
                      {participant.user_id === currentUserId && ' (You)'}
                    </Text>
                    {activeSpeakerRef.current === participant.user_id && (
                      <Ionicons name="mic" size={16} color={COLORS.PRIMARY_BLACK} />
                    )}
                  </View>
                ))}
              </ScrollView>
            </View>
          </BlurView>
        )}

        {/* Controls */}
        <View style={styles.controlsContainer}>
          <View style={styles.controlsRow}>
            <TouchableOpacity
              style={[
                styles.controlButton,
                agoraEngine.isMuted && styles.controlButtonActive,
              ]}
              onPress={handleToggleMute}
            >
              <Ionicons
                name={agoraEngine.isMuted ? 'mic-off' : 'mic'}
                size={24}
                color={COLORS.WHITE}
              />
            </TouchableOpacity>

            {isVideoCall && (
              <>
                <TouchableOpacity
                  style={[
                    styles.controlButton,
                    !agoraEngine.videoEnabled && styles.controlButtonActive,
                  ]}
                  onPress={handleToggleVideo}
                >
                  <Ionicons
                    name={agoraEngine.videoEnabled ? 'videocam' : 'videocam-off'}
                    size={24}
                    color={COLORS.WHITE}
                  />
                </TouchableOpacity>

                {agoraEngine.videoEnabled && (
                  <TouchableOpacity
                    style={styles.controlButton}
                    onPress={handleSwitchCamera}
                  >
                    <Ionicons name="camera-reverse" size={24} color={COLORS.WHITE} />
                  </TouchableOpacity>
                )}
              </>
            )}

            <Animated.View style={endButtonAnimatedStyle}>
              <TouchableOpacity
                style={[styles.controlButton, styles.endCallButton]}
                onPress={handleEndCall}
                disabled={isEndingCall}
              >
                <Ionicons name="call" size={24} color={COLORS.WHITE} />
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.PRIMARY_BLACK,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.TEXT_MUTED,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  callDuration: {
    fontSize: 16,
    fontWeight: FONT_WEIGHTS.MEDIUM,
    color: COLORS.WHITE,
  },
  participantCountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  participantCountText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: FONT_WEIGHTS.MEDIUM,
    color: COLORS.WHITE,
  },
  gridContainer: {
    flex: 1,
    padding: 8,
  },
  gridContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  participantCell: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: COLORS.BACKGROUND_SECONDARY,
  },
  activeSpeakerCell: {
    borderWidth: 2,
    borderColor: COLORS.WHITE,
  },
  videoCell: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoAvatar: {
    width: '100%',
    height: '100%',
  },
  audioCell: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  audioAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 8,
  },
  avatarPlaceholder: {
    backgroundColor: COLORS.BACKGROUND_SECONDARY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantName: {
    fontSize: 12,
    color: COLORS.WHITE,
    textAlign: 'center',
  },
  localVideoBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  localVideoBadgeText: {
    fontSize: 12,
    color: COLORS.WHITE,
    fontWeight: FONT_WEIGHTS.MEDIUM,
  },
  activeSpeakerIndicator: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    borderRadius: 12,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeSpeakerRing: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 255, 0, 0.3)',
    borderWidth: 2,
    borderColor: 'rgba(0, 255, 0, 0.8)',
  },
  audioActiveIndicator: {
    marginTop: 4,
    backgroundColor: 'rgba(0, 255, 0, 0.8)',
    borderRadius: 10,
    padding: 4,
  },
  participantListOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantListContainer: {
    width: '80%',
    maxHeight: '70%',
    backgroundColor: COLORS.WHITE,
    borderRadius: 16,
    padding: 20,
  },
  participantListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  participantListTitle: {
    fontSize: 18,
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.PRIMARY_BLACK,
  },
  participantListScroll: {
    maxHeight: 400,
  },
  participantListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BACKGROUND_SECONDARY,
  },
  listAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  listParticipantName: {
    flex: 1,
    fontSize: 16,
    color: COLORS.PRIMARY_BLACK,
  },
  controlsContainer: {
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonActive: {
    backgroundColor: COLORS.WHITE,
  },
  endCallButton: {
    backgroundColor: '#FF3B30',
  },
});

export default GroupCallScreen;

