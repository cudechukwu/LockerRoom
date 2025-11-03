/**
 * IncomingCallScreen
 * Full-screen incoming call UI with accept/reject actions
 * Modern iOS-style design with caller information
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY, FONT_WEIGHTS } from '../constants/typography';
import { useCallSession } from '../hooks/useCallSession';
import { useAuthTeam } from '../hooks/useAuthTeam';
import { getCallSession, rejectCall, joinCall } from '../api/calling';
import { getAgoraToken } from '../api/calling';
import { queryKeys } from '../hooks/queryKeys';
import { supabase } from '../lib/supabase';
import { useAgoraEngine } from '../hooks/useAgoraEngine';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const IncomingCallScreen = ({ navigation, route }) => {
  const { callSessionId } = route.params || {};
  const insets = useSafeAreaInsets();
  const { data: authTeam } = useAuthTeam();
  const currentUserId = authTeam?.userId;

  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch call session data
  const { data: callSession, isLoading } = useQuery({
    queryKey: queryKeys.callSession(callSessionId),
    queryFn: async () => {
      if (!callSessionId) return null;
      const { data, error } = await getCallSession(callSessionId);
      if (error) throw error;
      return data;
    },
    enabled: !!callSessionId,
    staleTime: 0, // Always fresh for incoming calls
  });

  // Subscribe to real-time call status changes
  const { callSession: realtimeCallSession, status } = useCallSession(callSessionId, {
    enabled: !!callSessionId && !!callSession,
    onStatusChange: (newStatus) => {
      // Auto-navigate if call was rejected/ended by caller
      if (['ended', 'rejected', 'missed', 'cancelled'].includes(newStatus)) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        navigation.goBack();
      }
      // Auto-navigate to active call if caller connected
      if (newStatus === 'connected') {
        // Call was answered by caller, we should join
        handleAccept();
      }
    },
  });

  // Use realtime session if available, otherwise fallback to fetched
  const activeCallSession = realtimeCallSession || callSession;

  // Get caller information (initiator of the call)
  const initiatorId = activeCallSession?.initiator_id;
  const isIncomingCall = initiatorId !== currentUserId;

  // Fetch caller profile
  const { data: callerProfile } = useQuery({
    queryKey: ['callerProfile', initiatorId],
    queryFn: async () => {
      if (!initiatorId) return null;
      const { data, error } = await supabase
        .from('user_profiles')
        .select('display_name, avatar_url')
        .eq('id', initiatorId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!initiatorId,
    staleTime: 5 * 60 * 1000,
  });

  // Determine call type
  const callType = activeCallSession?.call_type || 'audio';
  const isVideoCall = callType === 'video' || callType === 'group_video';
  const isGroupCall = callType?.includes('group');

  // Initialize Agora engine (for when we accept)
  const agoraEngine = useAgoraEngine(activeCallSession, {
    enableVideo: isVideoCall,
  });

  /**
   * Handle accept call
   */
  const handleAccept = useCallback(async () => {
    if (isProcessing || !activeCallSession || !callSessionId) return;

    try {
      setIsProcessing(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Update call status to connecting
      await joinCall(callSessionId, currentUserId ? { id: currentUserId } : null);

      // Get Agora token
      const { data: tokenData, error: tokenError } = await getAgoraToken(
        callSessionId,
        currentUserId ? { id: currentUserId } : null
      );

      if (tokenError || !tokenData?.token) {
        throw new Error('Failed to get call token');
      }

      // Join Agora channel (engine initializes automatically if needed)
      // The join function uses callSession from the hook's scope
      await agoraEngine.join(tokenData.token);

      // Navigate to active call screen
      navigation.replace('ActiveCall', {
        callSessionId,
        callType: callType,
        isInitiator: false,
      });
    } catch (error) {
      console.error('Error accepting call:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setIsProcessing(false);
      // Show error and go back
      navigation.goBack();
    }
  }, [
    isProcessing,
    activeCallSession,
    callSessionId,
    currentUserId,
    agoraEngine,
    callType,
    navigation,
  ]);

  /**
   * Handle reject call
   */
  const handleReject = useCallback(async () => {
    if (isProcessing || !callSessionId) return;

    try {
      setIsProcessing(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

      // Reject the call
      await rejectCall(callSessionId, currentUserId ? { id: currentUserId } : null);

      // Navigate back
      navigation.goBack();
    } catch (error) {
      console.error('Error rejecting call:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      // Still navigate back even on error
      navigation.goBack();
    }
  }, [isProcessing, callSessionId, currentUserId, navigation]);

  // Auto-dismiss if call is no longer ringing
  useEffect(() => {
    if (status && !['ringing', 'connecting'].includes(status)) {
      // Call was answered or ended
      if (status === 'connected') {
        // Call was answered by caller, accept it
        handleAccept();
      } else {
        // Call was rejected/ended
        navigation.goBack();
      }
    }
  }, [status, handleAccept, navigation]);

  // Loading state
  if (isLoading || !activeCallSession) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.TEXT_PRIMARY} />
          <Text style={styles.loadingText}>Loading call...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const callerName = callerProfile?.display_name || 'Unknown';
  const callerAvatar = callerProfile?.avatar_url;

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        {/* Caller Avatar */}
        <View style={styles.avatarContainer}>
          {callerAvatar ? (
            <Image
              source={{ uri: `${callerAvatar}?t=${Date.now()}` }}
              style={styles.avatar}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={80} color={COLORS.TEXT_MUTED} />
            </View>
          )}
          {/* Ripple animation background (optional - can add Animated later) */}
          <View style={styles.ripple} />
        </View>

        {/* Caller Name */}
        <Text style={styles.callerName}>{callerName}</Text>

        {/* Call Type Label */}
        <Text style={styles.callTypeLabel}>
          {isGroupCall ? 'Group ' : ''}
          {isVideoCall ? 'Video' : 'Audio'} Call
        </Text>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {/* Reject Button */}
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={handleReject}
            disabled={isProcessing}
            activeOpacity={0.7}
          >
            <View style={styles.rejectButtonInner}>
              <Ionicons name="call" size={28} color={COLORS.WHITE} />
            </View>
            <Text style={styles.actionButtonLabel}>Decline</Text>
          </TouchableOpacity>

          {/* Accept Button */}
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={handleAccept}
            disabled={isProcessing}
            activeOpacity={0.7}
          >
            <View style={styles.acceptButtonInner}>
              <Ionicons
                name={isVideoCall ? 'videocam' : 'call'}
                size={28}
                color={COLORS.WHITE}
              />
            </View>
            <Text style={styles.actionButtonLabel}>Accept</Text>
          </TouchableOpacity>
        </View>

        {/* Processing Indicator */}
        {isProcessing && (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="small" color={COLORS.TEXT_PRIMARY} />
            <Text style={styles.processingText}>
              {status === 'connecting' ? 'Connecting...' : 'Processing...'}
            </Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
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
  avatarContainer: {
    width: 200,
    height: 200,
    borderRadius: 100,
    marginBottom: 40,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatar: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    borderColor: COLORS.TEXT_PRIMARY,
  },
  avatarPlaceholder: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.BACKGROUND_CARD,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: COLORS.TEXT_PRIMARY,
  },
  ripple: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    // Could add animated ripple effect here
  },
  callerName: {
    ...TYPOGRAPHY.h1,
    fontSize: 32,
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 8,
    textAlign: 'center',
  },
  callTypeLabel: {
    ...TYPOGRAPHY.bodyLarge,
    color: COLORS.TEXT_MUTED,
    marginBottom: 60,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  actionButton: {
    alignItems: 'center',
    gap: 12,
  },
  rejectButton: {},
  rejectButtonInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.ERROR,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '135deg' }], // Rotate phone icon to show decline
  },
  acceptButton: {},
  acceptButtonInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.SUCCESS,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonLabel: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: FONT_WEIGHTS.MEDIUM,
  },
  processingContainer: {
    marginTop: 30,
    alignItems: 'center',
    gap: 12,
  },
  processingText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.TEXT_MUTED,
  },
});

export default IncomingCallScreen;

