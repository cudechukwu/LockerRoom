import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  TouchableOpacity,
  Alert,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY } from '../constants/typography';
import { useSupabase } from '../providers/SupabaseProvider';
import ViewProfileCard from '../components/ViewProfileCard';
import ProfileSkeletonLoader from '../components/ProfileSkeletonLoader';
import ImageViewer from '../components/ImageViewer';
import SharedChannelsSection from '../components/SharedChannelsSection';
import SharedMediaSection from '../components/SharedMediaSection';
import { getTeamMemberProfile } from '../api/profiles';
import { findOrCreateDirectMessage } from '../api/chat';
import { createCallSession, getAgoraToken } from '../api/calling';
import { useAuthTeam } from '../hooks/useAuthTeam';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { queryKeys } from '../hooks/queryKeys';
import { getTeamInfo } from '../api/teamMembers';

const { width, height } = Dimensions.get('window');

const ViewProfileScreen = ({ navigation, route }) => {
  const supabase = useSupabase();
  const { userId, teamId: routeTeamId, userName } = route.params || {};
  
  // Get current user's team for DM creation
  const { data: authTeam } = useAuthTeam();
  const currentTeamId = routeTeamId || authTeam?.teamId;
  const currentUserId = authTeam?.userId;
  
  // Get current user (centralized - single source of truth)
  const { data: currentUser } = useCurrentUser();
  
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  
  // State for image viewer
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState(null);
  
  // State for call actions (prevent double-taps)
  const [isStartingAudioCall, setIsStartingAudioCall] = useState(false);
  const [isStartingVideoCall, setIsStartingVideoCall] = useState(false);
  const [isStartingMessage, setIsStartingMessage] = useState(false);
  
  // Parallel queries for better performance - removes sequential latency
  const queryResults = useQueries({
    queries: [
      {
        queryKey: ['viewProfile', currentTeamId, userId],
        queryFn: async () => {
          if (!currentTeamId || !userId) {
            throw new Error('Missing teamId or userId');
          }
          const { data, error: profileError } = await getTeamMemberProfile(supabase, currentTeamId, userId);
          if (profileError) throw profileError;
          return data;
        },
        enabled: !!currentTeamId && !!userId,
        staleTime: 5 * 60 * 1000, // 5 minutes
      },
      {
        queryKey: ['teamInfo', currentTeamId],
        queryFn: async () => {
          if (!currentTeamId) return null;
          return await getTeamInfo(currentTeamId);
        },
        enabled: !!currentTeamId,
        staleTime: 10 * 60 * 1000, // 10 minutes
      },
      {
        queryKey: ['dmChannel', currentTeamId, userId, currentUserId],
        queryFn: async () => {
          if (!currentTeamId || !userId || !currentUserId) return null;

          // Try to find existing DM
          const { data: channels, error } = await supabase
            .from('channels')
            .select('id, channel_members!inner(user_id)')
            .eq('team_id', currentTeamId)
            .eq('type', 'dm')
            .in('channel_members.user_id', [currentUserId, userId]);

          if (error) {
            console.error('Error finding DM:', error);
            return null;
          }

          // Find channel where both users are members
          const dmChannel = channels?.find(ch => {
            const memberIds = (ch.channel_members || []).map(m => m.user_id);
            return memberIds.includes(currentUserId) && memberIds.includes(userId);
          });

          return dmChannel?.id || null;
        },
        enabled: !!currentTeamId && !!userId && !!currentUserId,
        staleTime: 5 * 60 * 1000,
      },
    ],
  });

  const [profileQuery, teamInfoQuery, dmChannelQuery] = queryResults;
  
  // Extract data from parallel queries
  const profileData = profileQuery?.data;
  const teamInfo = teamInfoQuery?.data;
  const dmChannelId = dmChannelQuery?.data;
  
  // Combined loading/error states
  const isLoading = queryResults.some(q => q.isLoading && !q.data);
  const isFetching = queryResults.some(q => q.isFetching);
  const error = queryResults.find(q => q.error)?.error;

  const teamColor = teamInfo?.primary_color || COLORS.WARNING;

  // Determine user role from profile data
  const userRole = profileData?.team_members?.role || 'player';
  const isPlayer = userRole === 'player';
  const displayName = profileData?.user_profiles?.display_name || userName || 'Unknown User';
  const bio = profileData?.user_profiles?.bio;
  const isViewingOwnProfile = currentUserId && userId && currentUserId === userId;

  // Handle profile photo press - memoized to prevent re-renders
  const handlePhotoPress = useCallback((imageUri) => {
    setSelectedImageUri(imageUri);
    setShowImageViewer(true);
  }, []);

  // Handle audio call - memoized
  const handleAudio = useCallback(async () => {
    if (isStartingAudioCall || isStartingVideoCall || !currentTeamId || !userId || !currentUser) {
      if (!currentTeamId || !userId || !currentUser) {
        Alert.alert('Error', 'Unable to start call. Missing information.');
      }
      return;
    }

    try {
      setIsStartingAudioCall(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Create call session
      const { data: callSession, error: sessionError } = await createCallSession(
        currentTeamId,
        [userId], // Single recipient for 1-on-1 call
        'audio',
        null, // No channel ID for direct calls
        currentUser
      );

      if (sessionError || !callSession) {
        throw sessionError || new Error('Failed to create call session');
      }

      // Get Agora token
      const { data: tokenData, error: tokenError } = await getAgoraToken(
        callSession.id,
        currentUser
      );

      if (tokenError || !tokenData?.token) {
        throw tokenError || new Error('Failed to get call token');
      }

      // Navigate to ActiveCallScreen (initiator joins immediately)
      navigation.navigate('ActiveCall', {
        callSessionId: callSession.id,
        callType: 'audio',
        isInitiator: true,
        agoraToken: tokenData.token, // Pass token for immediate join
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error('Error starting audio call:', err);
      Alert.alert('Error', 'Failed to start call. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setIsStartingAudioCall(false); // Reset on error
    }
  }, [currentTeamId, userId, currentUser, navigation, isStartingAudioCall, isStartingVideoCall]);

  // Handle video call - memoized
  const handleVideo = useCallback(async () => {
    if (isStartingVideoCall || isStartingAudioCall || !currentTeamId || !userId || !currentUser) {
      if (!currentTeamId || !userId || !currentUser) {
        Alert.alert('Error', 'Unable to start call. Missing information.');
      }
      return;
    }

    try {
      setIsStartingVideoCall(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Create call session
      const { data: callSession, error: sessionError } = await createCallSession(
        currentTeamId,
        [userId], // Single recipient for 1-on-1 call
        'video',
        null, // No channel ID for direct calls
        currentUser
      );

      if (sessionError || !callSession) {
        throw sessionError || new Error('Failed to create call session');
      }

      // Get Agora token
      const { data: tokenData, error: tokenError } = await getAgoraToken(
        callSession.id,
        currentUser
      );

      if (tokenError || !tokenData?.token) {
        throw tokenError || new Error('Failed to get call token');
      }

      // Navigate to ActiveCallScreen (initiator joins immediately)
      navigation.navigate('ActiveCall', {
        callSessionId: callSession.id,
        callType: 'video',
        isInitiator: true,
        agoraToken: tokenData.token, // Pass token for immediate join
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error('Error starting video call:', err);
      Alert.alert('Error', 'Failed to start call. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setIsStartingVideoCall(false); // Reset on error
    }
  }, [currentTeamId, userId, currentUser, navigation, isStartingVideoCall, isStartingAudioCall]);

  // Handle message button - memoized with dependencies
  const handleMessage = useCallback(async () => {
    if (isStartingMessage || !currentTeamId || !userId) {
      if (!currentTeamId || !userId) {
        Alert.alert('Error', 'Unable to start conversation. Missing information.');
      }
      return;
    }

    try {
      setIsStartingMessage(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Find or create DM
      const { data: dmChannel, error: dmError } = await findOrCreateDirectMessage(
        supabase,
        currentTeamId,
        userId,
        displayName
      );

      if (dmError) {
        throw dmError;
      }

      if (!dmChannel) {
        throw new Error('Failed to create or find DM channel');
      }

      // Optimistically update conversations cache (reuse currentUserId)
      if (currentUserId) {
        const cacheKey = queryKeys.teamConversations(currentTeamId, currentUserId);
        queryClient.setQueryData(cacheKey, (existing) => {
          if (!existing) return existing;
          const convs = existing.allConversations ? [...existing.allConversations] : [];
          const alreadyExists = convs.some(c => c.id === dmChannel.id);
          if (alreadyExists) return existing;

          const nowIso = new Date().toISOString();
          const optimisticDM = {
            id: dmChannel.id,
            name: displayName,
            type: 'dm',
            is_private: true,
            visibility: 'hidden',
            last_message_time: nowIso,
            updated_at: nowIso,
            unread_count: 0,
            icon_name: 'person',
            avatar_url: profileData?.user_profiles?.avatar_url || null,
            description: null,
          };

          convs.unshift(optimisticDM);
          return { ...existing, allConversations: convs };
        });

        // Background refetch to reconcile with server
        queryClient.invalidateQueries({ queryKey: cacheKey });
      }

      // Navigate to DM
      navigation.navigate('DirectMessageChat', {
        channelId: dmChannel.id,
        channelName: displayName,
        teamId: currentTeamId
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error('Error creating DM:', err);
      Alert.alert('Error', 'Failed to start conversation. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [currentTeamId, userId, displayName, currentUserId, queryClient, navigation, profileData]);

  // Handle block user - memoized
  const handleBlock = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Block User',
      `Are you sure you want to block ${displayName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: () => {
            // TODO: Implement block functionality
            Alert.alert('Blocked', `${displayName} has been blocked.`);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  }, [displayName]);

  // Handle report user - memoized
  const handleReport = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Report User',
      `Report ${displayName} for inappropriate behavior?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          style: 'destructive',
          onPress: () => {
            // TODO: Implement report functionality
            Alert.alert('Reported', `Thank you for reporting. We'll review this report.`);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  }, [displayName]);

  // Loading state
  if (isLoading && !profileData) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color={COLORS.TEXT_PRIMARY} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{displayName || 'Profile'}</Text>
            <View style={styles.headerRight} />
          </View>
          <ProfileSkeletonLoader />
        </SafeAreaView>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color={COLORS.TEXT_PRIMARY} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Profile</Text>
            <View style={styles.headerRight} />
          </View>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={COLORS.TEXT_MUTED} />
            <Text style={styles.errorText}>Failed to load profile</Text>
            <Text style={styles.errorSubtext}>
              {error.message || 'Unable to load this user\'s profile.'}
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.retryText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // No profile data
  if (!profileData) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color={COLORS.TEXT_PRIMARY} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Profile</Text>
            <View style={styles.headerRight} />
          </View>
          <View style={styles.errorContainer}>
            <Ionicons name="person-outline" size={48} color={COLORS.TEXT_MUTED} />
            <Text style={styles.errorText}>No profile found</Text>
            <Text style={styles.errorSubtext}>
              This user doesn't have a profile set up yet.
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.retryText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Floating Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.goBack();
          }}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.TEXT_PRIMARY} />
        </TouchableOpacity>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* View Profile Card */}
          <ViewProfileCard
            profile={profileData}
            userRole={userRole}
            onPhotoPress={handlePhotoPress}
            teamColor={teamColor}
            teamName={teamInfo?.name}
            school={teamInfo?.school}
            onAudioPress={handleAudio}
            onVideoPress={handleVideo}
            onMessagePress={handleMessage}
            isAudioLoading={isStartingAudioCall}
            isVideoLoading={isStartingVideoCall}
            isMessageLoading={isStartingMessage}
            isDisabled={isStartingAudioCall || isStartingVideoCall || isStartingMessage || isFetching}
          />

          {/* Bio Section - Only show if bio exists and is meaningful */}
          {bio && bio.trim() && bio !== 'Profile created during migration' && (
            <View style={styles.bioSection}>
              <View style={styles.bioCard}>
                <Text style={styles.bioText}>{bio}</Text>
              </View>
            </View>
          )}

          {/* About Section */}
          <View style={styles.aboutSection}>
            <Text style={styles.aboutTitle}>About</Text>
            {isPlayer ? (
              <>
                {profileData.class_year && (
                  <View style={styles.aboutField}>
                    <Text style={styles.aboutLabel}>Year</Text>
                    <Text style={styles.aboutValue}>{profileData.class_year}</Text>
                  </View>
                )}
                {profileData.major && (
                  <View style={styles.aboutField}>
                    <Text style={styles.aboutLabel}>Major</Text>
                    <Text style={styles.aboutValue}>{profileData.major}</Text>
                  </View>
                )}
                {profileData.hometown && (
                  <View style={styles.aboutField}>
                    <Text style={styles.aboutLabel}>Hometown</Text>
                    <Text style={styles.aboutValue}>{profileData.hometown}</Text>
                  </View>
                )}
                {profileData.high_school && (
                  <View style={styles.aboutField}>
                    <Text style={styles.aboutLabel}>High School</Text>
                    <Text style={styles.aboutValue}>{profileData.high_school}</Text>
                  </View>
                )}
                {profileData.contact_email && (
                  <View style={styles.aboutField}>
                    <Text style={styles.aboutLabel}>Email</Text>
                    <Text style={styles.aboutValue}>{profileData.contact_email}</Text>
                  </View>
                )}
                {profileData.contact_phone && (
                  <View style={styles.aboutField}>
                    <Text style={styles.aboutLabel}>Phone</Text>
                    <Text style={styles.aboutValue}>{profileData.contact_phone}</Text>
                  </View>
                )}
              </>
            ) : (
              <>
                {profileData.staff_title && (
                  <View style={styles.aboutField}>
                    <Text style={styles.aboutLabel}>Title</Text>
                    <Text style={styles.aboutValue}>{profileData.staff_title}</Text>
                  </View>
                )}
                {profileData.department && (
                  <View style={styles.aboutField}>
                    <Text style={styles.aboutLabel}>Department</Text>
                    <Text style={styles.aboutValue}>{profileData.department}</Text>
                  </View>
                )}
                {profileData.contact_email && (
                  <View style={styles.aboutField}>
                    <Text style={styles.aboutLabel}>Email</Text>
                    <Text style={styles.aboutValue}>{profileData.contact_email}</Text>
                  </View>
                )}
                {profileData.contact_phone && (
                  <View style={styles.aboutField}>
                    <Text style={styles.aboutLabel}>Phone</Text>
                    <Text style={styles.aboutValue}>{profileData.contact_phone}</Text>
                  </View>
                )}
              </>
            )}
          </View>

          {/* Shared Channels Section */}
          {currentTeamId && userId && (
            <SharedChannelsSection
              teamId={currentTeamId}
              otherUserId={userId}
              onChannelPress={(channel) => {
                navigation.navigate('ChannelChat', {
                  channelId: channel.id,
                  channelName: channel.name,
                  teamId: currentTeamId,
                });
              }}
            />
          )}

          {/* Shared Media Section - Only show if DM exists */}
          {dmChannelId && (
            <SharedMediaSection
              channelId={dmChannelId}
              conversationType="dm"
            />
          )}

          {/* Block and Report Actions - Only show if not viewing own profile */}
          {!isViewingOwnProfile && (
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity
                style={[styles.actionButton, styles.blockButton]}
                onPress={handleBlock}
                activeOpacity={0.7}
              >
                <Text style={styles.blockButtonText}>Block {displayName}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.reportButton]}
                onPress={handleReport}
                activeOpacity={0.7}
              >
                <Text style={styles.reportButtonText}>Report {displayName}</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Image Viewer Modal */}
        <ImageViewer
          visible={showImageViewer}
          imageUri={selectedImageUri}
          onClose={() => {
            setShowImageViewer(false);
            setSelectedImageUri(null);
          }}
          onDownload={(uri) => {
            // TODO: Implement image download if needed
            console.log('Download image:', uri);
          }}
        />
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    zIndex: 100,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  bioSection: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  bioCard: {
    backgroundColor: COLORS.BACKGROUND_CARD,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  bioText: {
    ...TYPOGRAPHY.body,
    color: COLORS.TEXT_MUTED,
    lineHeight: 22,
  },
  aboutSection: {
    backgroundColor: COLORS.BACKGROUND_CARD,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 12,
  },
  aboutTitle: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 12,
  },
  aboutField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.BACKGROUND_MUTED,
  },
  aboutLabel: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.TEXT_MUTED,
  },
  aboutValue: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  actionButtonsContainer: {
    marginHorizontal: 20,
    marginBottom: 32,
    gap: 12,
  },
  actionButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockButton: {
    backgroundColor: COLORS.BACKGROUND_CARD,
  },
  blockButtonText: {
    ...TYPOGRAPHY.button,
    color: '#EF4444',
  },
  reportButton: {
    backgroundColor: COLORS.BACKGROUND_CARD,
  },
  reportButtonText: {
    ...TYPOGRAPHY.button,
    color: '#EF4444',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtext: {
    ...TYPOGRAPHY.eventTime,
    color: COLORS.TEXT_MUTED,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: COLORS.BACKGROUND_CARD_SECONDARY,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.TEXT_PRIMARY,
  },
});

export default ViewProfileScreen;

