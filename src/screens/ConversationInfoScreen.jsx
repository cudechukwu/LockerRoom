import React, { useState, useEffect, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/chatColors';
import { fonts } from '../constants/chatFonts';
import { getFontFamily, getFontWeight, getFontSize } from '../constants/fonts';
import { COLORS } from '../constants/colors';
import ScreenBackground from '../components/ScreenBackground';
import MemberPreviewBottomSheet from '../components/MemberPreviewBottomSheet';
import MuteOptionsBottomSheet from '../components/MuteOptionsBottomSheet';
import SharedMediaSection from '../components/SharedMediaSection';
import PinnedMessagesCard from '../components/PinnedMessagesCard';
import { getTeamInfo } from '../api/teamMembers';
import { getChannel, getChannelMembers, isChannelMuted, muteChannel, unmuteChannel, isChannelAdmin, updateChannelMemberRole, uploadChannelImage, updateChannelImage } from '../api/chat';
import ImagePickerModal from '../components/ImagePickerModal';
import { dataCache, CACHE_KEYS } from '../utils/dataCache';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../hooks/queryKeys';
import { supabase } from '../lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Normalize API conversation types to UI types
const normalizeConversationType = (apiType) => {
  const typeMap = {
    'direct_message': 'dm',
    'team': 'channel',
    'position': 'channel',
    'announcements': 'channel',
    'group_dm': 'group_dm',
    'channel': 'channel',
    'dm': 'dm'
  };
  return typeMap[apiType] || 'channel';
};

const ConversationInfoScreen = ({ navigation, route }) => {
  const { conversationId, conversationType: routeType = 'channel', channelName, teamId } = route.params;
  const [conversation, setConversation] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState(null);
  const [showMemberPreview, setShowMemberPreview] = useState(false);
  const [showMuteOptions, setShowMuteOptions] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [teamInfo, setTeamInfo] = useState(null);
  const [teamLoading, setTeamLoading] = useState(true);
  const [channelCreatorId, setChannelCreatorId] = useState(null);
  const [isCurrentUserAdmin, setIsCurrentUserAdmin] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [optimisticChannelImage, setOptimisticChannelImage] = useState(null);
  const queryClient = useQueryClient();
  
  // Sort members by role priority (admins/moderators first)
  const sortedMembers = React.useMemo(() => {
    if (!members) return [];
    
    const rolePriority = {
      'admin': 1,
      'moderator': 2,
      'member': 3
    };
    
    return [...members].sort((a, b) => {
      const aPriority = rolePriority[a.channelRole] || 3;
      const bPriority = rolePriority[b.channelRole] || 3;
      return aPriority - bPriority;
    });
  }, [members]);

  // Load channel data on mount
  useEffect(() => {
    // On mount, check cache first to prevent unnecessary loading state
    const cacheKey = CACHE_KEYS.CHANNEL_INFO(conversationId);
    const membersCacheKey = CACHE_KEYS.CHANNEL_MEMBERS(conversationId);
    const cachedInfo = dataCache.get(cacheKey);
    const cachedMembers = dataCache.get(membersCacheKey);
    const cachedTeamInfo = teamId ? dataCache.get(CACHE_KEYS.TEAM_INFO(teamId)) : null;
    
    if (cachedInfo) {
      // Has cache - load immediately without spinner
      setConversation(cachedInfo);
      setLoading(false);
      
      if (cachedMembers) {
        setMembers(cachedMembers);
        setMembersLoading(false);
      }
      
      if (cachedTeamInfo) {
        setTeamInfo(cachedTeamInfo);
        setTeamLoading(false);
      }
      
      // Then refresh in background
      loadChannelData(true);
      loadMembersData(true);
      if (teamId) {
        loadTeamData();
      }
    } else {
      // No cache - normal loading
      loadChannelData();
      loadMembersData();
      if (teamId) {
        loadTeamData();
      }
    }
  }, [conversationId, teamId]);

  // Smart refresh when screen comes into focus - silent background refresh
  useFocusEffect(
    React.useCallback(() => {
      loadChannelData(true); // silent refresh - no spinner
      loadMembersData(true); // silent refresh - no spinner
      loadTeamData();
    }, [conversationId, teamId])
  );

  const loadChannelData = async (silentRefresh = false) => {
    try {
      const cacheKey = CACHE_KEYS.CHANNEL_INFO(conversationId);
      const cachedData = dataCache.get(cacheKey);
      
      // Cache-first: show cached data immediately if available
      if (cachedData && !silentRefresh) {
        setConversation(cachedData);
        // Load fresh data in background
        loadChannelData(true);
        return;
      }
      
      // No cache or explicit refresh - show loading
      if (!silentRefresh) {
        setLoading(true);
      }
      
      const { data: channelData, error } = await getChannel(conversationId);
      
      if (error) throw error;
      
      if (channelData) {
        // Normalize the conversation type from API response
        const apiType = channelData.type || routeType;
        const normalizedType = normalizeConversationType(apiType);
        
        // Check if channel is muted
        const muted = await isChannelMuted(conversationId);
        
        // Check if current user is admin
        const admin = await isChannelAdmin(conversationId);
        setIsCurrentUserAdmin(admin);
        
        // Store creator ID for badge display
        setChannelCreatorId(channelData.created_by);
        
        // Format channel data for the UI
        const formattedData = {
          id: channelData.id,
          name: channelData.name,
          description: channelData.description || 'No description',
          createdDate: new Date(channelData.created_at).toLocaleDateString(),
          visibility: channelData.visibility || 'Discoverable',
          joinPolicy: channelData.is_private ? 'Invite Only' : 'Open',
          isMuted: muted,
          isPrivate: channelData.is_private,
          isAnnouncements: channelData.is_announcements,
          memberCount: channelData.memberCount || 0,
          image_url: channelData.image_url, // Include channel image URL
          type: normalizedType
        };
        
        // Cache it
        dataCache.set(cacheKey, formattedData, 5 * 60 * 1000);
        setConversation(formattedData);
        setIsMuted(muted);
      }
    } catch (error) {
      console.error('Error loading channel data:', error);
      if (!silentRefresh) {
        Alert.alert('Error', 'Failed to load channel information');
      }
    } finally {
      if (!silentRefresh) {
        setLoading(false);
      }
    }
  };

  const loadMembersData = async (silentRefresh = false) => {
    try {
      const cacheKey = CACHE_KEYS.CHANNEL_MEMBERS(conversationId);
      const cachedMembers = dataCache.get(cacheKey);
      
      // Cache-first: show cached data immediately if available
      if (cachedMembers && !silentRefresh) {
        setMembers(cachedMembers);
        // Load fresh data in background
        loadMembersData(true);
        return;
      }
      
      // No cache or explicit refresh - show loading
      if (!silentRefresh) {
        setMembersLoading(true);
      }
      
      const { data: membersData, error } = await getChannelMembers(conversationId, teamId);
      
      if (error) throw error;
      
      if (membersData) {
        // Cache it
        dataCache.set(cacheKey, membersData, 5 * 60 * 1000);
        setMembers(membersData);
      }
    } catch (error) {
      console.error('Error loading members:', error);
      if (!silentRefresh) {
        Alert.alert('Error', 'Failed to load channel members');
      }
    } finally {
      if (!silentRefresh) {
        setMembersLoading(false);
      }
    }
  };

  const loadTeamData = async () => {
    try {
      if (teamId) {
        // Check for cached data first
        const cachedTeamInfo = dataCache.get(CACHE_KEYS.TEAM_INFO(teamId));
        
        if (cachedTeamInfo) {
          setTeamInfo(cachedTeamInfo);
          setTeamLoading(false);
          
          // Silent refresh in background
          const teamData = await getTeamInfo(teamId);
          dataCache.set(CACHE_KEYS.TEAM_INFO(teamId), teamData, 5 * 60 * 1000);
          setTeamInfo(teamData);
          return;
        }
        
        // No cache - fetch (shows loading)
        const teamData = await getTeamInfo(teamId);
        dataCache.set(CACHE_KEYS.TEAM_INFO(teamId), teamData, 5 * 60 * 1000);
        setTeamInfo(teamData);
        setTeamLoading(false);
      }
    } catch (error) {
      console.error('Error loading team data:', error);
      setTeamLoading(false);
    }
  };

  const handleMemberPress = (member) => {
    setSelectedMember(member);
    setShowMemberPreview(true);
  };

  const handleUpdateMemberRole = async (memberId, newRole) => {
    try {
      const { error } = await updateChannelMemberRole(conversationId, memberId, newRole);
      if (error) throw error;
      
      // Refresh members list
      await loadMembersData();
      setShowMemberPreview(false);
      Alert.alert('Success', `Member role updated to ${newRole}`);
    } catch (error) {
      console.error('Error updating member role:', error);
      Alert.alert('Error', 'Failed to update member role');
    }
  };

  const handleChannelImageSelected = async (imageAsset) => {
    try {
      console.log('Updating channel image...');
      console.log('Image asset:', imageAsset);
      
      // Create file object from ImagePicker asset
      const file = {
        uri: imageAsset.uri,
        name: `channel_${Date.now()}.jpg`,
        type: imageAsset.mimeType || 'image/jpeg',
      };

      console.log('File object created:', file);

      // OPTIMISTIC UPDATE: Show the new image immediately by using the local file
      setOptimisticChannelImage(imageAsset.uri);

      // Upload channel image
      const { data: uploadData, error: uploadError } = await uploadChannelImage(conversationId, file);
      if (uploadError) throw uploadError;

      // OPTIMISTIC UPDATE: Update to the uploaded image URL with cache bust
      const newImageUrl = `${uploadData.url}?v=${Date.now()}`;
      setOptimisticChannelImage(newImageUrl);

      // Update channel with new image URL
      const { error: updateError } = await updateChannelImage(conversationId, uploadData.url);
      if (updateError) throw updateError;

      // INVALIDATE CACHE: Clear old cached data
      const cacheKey = CACHE_KEYS.CHANNEL_INFO(conversationId);
      dataCache.clear(cacheKey);
      
      // Also clear the channel details cache in chat screen
      const channelDetailsCacheKey = `channel_details_${conversationId}`;
      dataCache.clear(channelDetailsCacheKey);

      // ✅ OPTIMISTIC UPDATE: Invalidate React Query cache for instant refresh
      // This updates channels list, chat header, etc. without manual refresh
      if (teamId) {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id;
        await queryClient.invalidateQueries({ queryKey: queryKeys.teamConversations(teamId, userId) });
        await queryClient.invalidateQueries({ queryKey: queryKeys.channelDetails(conversationId) });
      }

      // Refresh channel data
      await loadChannelData(true);
      
      // Clear optimistic state after refresh
      setOptimisticChannelImage(null);
      
      Alert.alert('Success', 'Channel image updated successfully!');
    } catch (error) {
      console.error('Error updating channel image:', error);
      // Clear optimistic state on error
      setOptimisticChannelImage(null);
      Alert.alert('Error', 'Failed to update channel image');
    }
  };

  const handleMutePress = () => {
    setShowMuteOptions(true);
  };

  const handleMuteDuration = async (duration) => {
    setShowMuteOptions(false);
    
    try {
      if (duration === 'Unmute') {
        // Unmute the channel
        await unmuteChannel(conversationId);
        setIsMuted(false);
        Alert.alert('Unmuted', 'Notifications have been restored');
      } else {
        // Map duration to hours
        const durationMap = {
          '8 hours': 8,
          '24 hours': 24,
          'Until unmuted': 0
        };
        const durationHours = durationMap[duration] || 24;
        
        // Mute the channel
        await muteChannel(conversationId, durationHours);
        setIsMuted(true);
    Alert.alert('Muted', `Notifications muted for ${duration}`);
      }
    } catch (error) {
      console.error('Error toggling mute:', error);
      Alert.alert('Error', 'Failed to update mute status');
    }
  };

  const handleLeaveChannel = () => {
    const isGroup = conversation.type === 'group_dm';
    Alert.alert(
      `Leave ${isGroup ? 'Group' : 'Channel'}`,
      `Are you sure you want to leave this ${isGroup ? 'group' : 'channel'}? You won't receive messages from this ${isGroup ? 'group' : 'channel'} anymore.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Leave', 
          style: 'destructive',
          onPress: () => {
            // TODO: Implement leave channel/group logic
            navigation.goBack();
          }
        }
      ]
    );
  };

  const handleBlockUser = () => {
    Alert.alert(
      'Block User',
      'Are you sure you want to block this user? You won\'t be able to send or receive messages from them.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Block', 
          style: 'destructive',
          onPress: () => {
            // TODO: Implement block user logic
            navigation.goBack();
          }
        }
      ]
    );
  };

  // Get channel icon based on name and type
  const getChannelIcon = (type, name) => {
    const nameLower = name ? name.toLowerCase() : '';
    
    // Check for specific channel names first
    if (nameLower.includes('announcement')) return 'megaphone';
    if (nameLower.includes('general')) return 'chatbubbles';
    if (nameLower.includes('offense')) return 'football';
    if (nameLower.includes('defense')) return 'shield';
    if (nameLower.includes('special')) return 'flash';
    if (nameLower.includes('coach')) return 'school';
    if (nameLower.includes('trainer')) return 'fitness';
    if (nameLower.includes('training')) return 'fitness';
    
    // Then check by type
    switch (type) {
      case 'team':
        return 'people';
      case 'announcements':
        return 'megaphone';
      case 'position':
        return 'football';
      case 'coach':
        return 'school';
      case 'trainer':
        return 'fitness';
      case 'casual':
        return 'chatbubbles';
      default:
        return 'chatbubbles';
    }
  };

  // Memoize the logo source to prevent cache-busting flicker
  const logoSource = useMemo(() => {
    // OPTIMISTIC UPDATE: If we have a new image being uploaded, show it immediately
    if (optimisticChannelImage) {
      return { uri: optimisticChannelImage, isIcon: false };
    }
    
    // PRIORITY: Show channel image if available (for channels)
    if (conversation?.image_url) {
      return { uri: conversation.image_url, isIcon: false };
    }
    
    // No channel image - return icon info
    const iconName = getChannelIcon(conversation?.type, conversation?.name);
    return { iconName, isIcon: true };
  }, [conversation?.image_url, conversation?.type, conversation?.name, optimisticChannelImage]);


  const renderMember = ({ item }) => {
    const isCreator = item.user_id === channelCreatorId;
    const isChannelAdmin = item.channelRole === 'admin';
    const isTeamAdmin = item.teamRole === 'admin';
    
    // Only show role text if not a member
    let roleText = '';
    
    if (isCreator && isChannelAdmin) {
      roleText = 'Owner';
    } else if (isChannelAdmin) {
      roleText = 'Admin';
    } else if (item.channelRole === 'moderator') {
      roleText = 'Moderator';
    } else if (isTeamAdmin) {
      roleText = 'Team Admin';
    }
    // Don't show anything for regular members
    
    return (
    <TouchableOpacity 
      style={styles.memberItem}
      onPress={() => handleMemberPress(item)}
      activeOpacity={0.7}
    >
      <Image source={{ uri: item.avatar }} style={styles.memberAvatar} />
      <View style={styles.memberInfo}>
          <View style={styles.memberNameRow}>
        <Text style={styles.memberName}>{item.name}</Text>
            {roleText && (
              <Text style={styles.roleText}> • {roleText}</Text>
            )}
          </View>
        {item.position && (
          <Text style={styles.memberPosition}>
              {item.position}
          </Text>
        )}
      </View>
      <View style={styles.memberRoleContainer}>
        {item.isOnline && <View style={styles.onlineIndicator} />}
      </View>
    </TouchableOpacity>
  );
  };

  const renderChannelInfo = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        {conversation.type === 'group_dm' ? 'Group Info' : 'Channel Info'}
      </Text>
      
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Description</Text>
          <Text style={styles.infoValue}>{conversation.description || 'No description'}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Created</Text>
          <Text style={styles.infoValue}>{conversation.createdDate}</Text>
        </View>
        
        {/* Only show visibility and join policy for channels, not group DMs */}
        {conversation.type === 'channel' && (
          <>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Visibility</Text>
              <Text style={styles.infoValue}>{conversation.visibility}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Join Policy</Text>
              <Text style={styles.infoValue}>{conversation.joinPolicy}</Text>
            </View>
          </>
        )}
      </View>
    </View>
  );

  const renderDMInfo = () => {
    // Get the other user (not "You")
    const otherUser = members.find(member => member.name !== 'You') || members[0];
    
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Info</Text>
        
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status</Text>
            <Text style={styles.infoValue}>
              {otherUser?.isOnline ? 'Online' : `Last seen ${otherUser?.lastSeen || 'recently'}`}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Position</Text>
            <Text style={styles.infoValue}>{otherUser?.position || 'Not specified'}</Text>
          </View>
          
          {otherUser?.bio && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Bio</Text>
              <Text style={styles.infoValue}>{otherUser.bio}</Text>
            </View>
          )}
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Team Role</Text>
            <Text style={styles.infoValue}>
              {otherUser?.teamRole ? otherUser.teamRole.charAt(0).toUpperCase() + otherUser.teamRole.slice(1) : 'Member'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading || !conversation) {
    return (
      <ScreenBackground>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            <Text style={styles.backText}>Close Info</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Channel/DM Header */}
          <View style={styles.channelHeader}>
            <TouchableOpacity 
              style={styles.avatarContainer}
              onPress={() => conversation.type !== 'dm' ? setShowImagePicker(true) : null}
              activeOpacity={conversation.type !== 'dm' ? 0.7 : 1}
              disabled={conversation.type === 'dm'}
            >
              {logoSource.isIcon ? (
                <View style={[styles.channelAvatar, styles.iconContainer]}>
                  <Ionicons name={logoSource.iconName} size={30} color="#CCCCCC" />
                </View>
              ) : (
              <Image 
                  source={logoSource} 
                style={styles.channelAvatar} 
              />
              )}
              <View style={styles.editIconContainer}>
                <Ionicons name="pencil" size={12} color="white" />
              </View>
            </TouchableOpacity>
            <View style={styles.channelInfo}>
              <Text style={styles.channelName}>{conversation.name}</Text>
              <Text style={styles.memberCount}>
                {conversation.type === 'dm' 
                  ? 'Direct message' 
                  : `${conversation.memberCount} member${conversation.memberCount !== 1 ? 's' : ''}`
                }
              </Text>
            </View>
          </View>

          {/* Controls */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Controls</Text>
            
            <View style={styles.controlsCard}>
              <TouchableOpacity 
                style={styles.controlItem}
                onPress={handleMutePress}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={isMuted ? "volume-mute" : "volume-high"} 
                  size={20} 
                  color="#FFFFFF" 
                />
                <Text style={styles.controlText}>
                  {isMuted ? 'Unmute' : 'Mute'} Notifications
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
              </TouchableOpacity>

              {conversation.type === 'channel' ? (
                <TouchableOpacity 
                  style={styles.controlItem}
                  onPress={() => Alert.alert('Invite Members', 'Invite flow coming soon')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="person-add" size={20} color="#FFFFFF" />
                  <Text style={styles.controlText}>Invite Members</Text>
                  <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
                </TouchableOpacity>
              ) : conversation.type === 'group_dm' ? (
                <TouchableOpacity 
                  style={styles.controlItem}
                  onPress={() => Alert.alert('Add Members', 'Add members flow coming soon')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="person-add" size={20} color="#FFFFFF" />
                  <Text style={styles.controlText}>Add Members</Text>
                  <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={styles.controlItem}
                  onPress={() => Alert.alert('View Profile', 'Profile view coming soon')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="person" size={20} color="#FFFFFF" />
                  <Text style={styles.controlText}>View Profile</Text>
                  <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
                </TouchableOpacity>
              )}

              <TouchableOpacity 
                style={[styles.controlItem, styles.dangerControl]}
                onPress={
                  conversation.type === 'channel' ? handleLeaveChannel : 
                  conversation.type === 'group_dm' ? handleLeaveChannel : 
                  handleBlockUser
                }
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={
                    conversation.type === 'channel' ? "exit" : 
                    conversation.type === 'group_dm' ? "exit" : 
                    "ban"
                  } 
                  size={20} 
                  color="#FF3B30" 
                />
                <Text style={[styles.controlText, styles.dangerText]}>
                  {conversation.type === 'channel' ? 'Leave Channel' : 
                   conversation.type === 'group_dm' ? 'Leave Group' : 
                   'Block User'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Channel/Group/DM Info */}
          {conversation.type === 'channel' || conversation.type === 'group_dm' ? renderChannelInfo() : renderDMInfo()}

          {/* Shared Media - Show for all conversation types */}
          <SharedMediaSection 
            channelId={conversationId} 
            conversationType={conversation.type}
          />

          {/* Pinned Messages - Show for channels and group DMs */}
          {conversation.type !== 'dm' && (
            <PinnedMessagesCard 
              channelId={conversationId} 
              conversationType={conversation.type}
            />
          )}

          {/* Members List - Only show for channels and group DMs, not for 1-on-1 DMs */}
          {conversation.type !== 'dm' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Members {membersLoading ? '' : `(${members.length})`}
              </Text>
              
              <View style={styles.membersCard}>
                {membersLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={COLORS.PRIMARY} />
                  </View>
                ) : (
                  <FlatList
                    data={sortedMembers}
                    renderItem={renderMember}
                    keyExtractor={(item) => item.id}
                    scrollEnabled={false}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={() => (
                      <Text style={styles.emptyMembersText}>No members found</Text>
                    )}
                  />
                )}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Bottom Sheets */}
        <MemberPreviewBottomSheet
          visible={showMemberPreview}
          member={selectedMember}
          onClose={() => setShowMemberPreview(false)}
          conversationType={conversation.type}
          isCurrentUserAdmin={isCurrentUserAdmin}
          onUpdateRole={handleUpdateMemberRole}
          teamId={teamId}
        />

        <MuteOptionsBottomSheet
          visible={showMuteOptions}
          onClose={() => setShowMuteOptions(false)}
          onSelectDuration={handleMuteDuration}
        />

        {/* Image Picker Modal for Channel Image */}
        <ImagePickerModal
          visible={showImagePicker}
          onClose={() => setShowImagePicker(false)}
          onImageSelected={handleChannelImageSelected}
          currentImageUrl={conversation?.image_url}
          userId={null}
          customUploadFunction={async (imageAsset) => {
            // Handle channel image upload directly
            await handleChannelImageSelected(imageAsset);
          }}
          onDelete={async () => {
            // Handle channel image deletion
            try {
              const { error } = await updateChannelImage(conversationId, null);
              if (error) throw error;
              
              // Invalidate cache
              const cacheKey = CACHE_KEYS.CHANNEL_INFO(conversationId);
              dataCache.clear(cacheKey);
              
              const channelDetailsCacheKey = `channel_details_${conversationId}`;
              dataCache.clear(channelDetailsCacheKey);
              
              if (teamId) {
                const { data: authData } = await supabase.auth.getUser();
                const userId = authData?.user?.id;
                await queryClient.invalidateQueries({ queryKey: queryKeys.teamConversations(teamId, userId) });
              }
              
              await loadChannelData(true);
              Alert.alert('Success', 'Channel image removed successfully!');
            } catch (error) {
              console.error('Error deleting channel image:', error);
              Alert.alert('Error', 'Failed to remove channel image');
            }
          }}
        />
      </SafeAreaView>
    </ScreenBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: fonts.regular,
  },
  emptyMembersText: {
    textAlign: 'center',
    fontSize: getFontSize('SM'),
    color: '#8E8E93',
    paddingVertical: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: fonts.medium,
    marginLeft: 4,
  },
  content: {
    flex: 1,
  },
  channelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  channelAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  iconContainer: {
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#007AFF',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  channelInfo: {
    flex: 1,
  },
  channelName: {
    fontSize: getFontSize('LG'),
    fontWeight: getFontWeight('SEMIBOLD'),
    color: '#FFFFFF',
    marginBottom: 4,
  },
  memberCount: {
    fontSize: getFontSize('XS'),
    color: '#8E8E93',
    fontWeight: getFontWeight('REGULAR'),
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: getFontSize('BASE'),
    fontWeight: getFontWeight('SEMIBOLD'),
    color: '#FFFFFF',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  infoCard: {
    backgroundColor: '#1A1A1A',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('MEDIUM'),
    color: '#8E8E93',
    flex: 1,
  },
  infoValue: {
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('REGULAR'),
    color: '#FFFFFF',
    flex: 2,
    textAlign: 'right',
  },
  controlsCard: {
    backgroundColor: '#1A1A1A',
    marginHorizontal: 20,
    borderRadius: 12,
  },
  controlItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  controlText: {
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('REGULAR'),
    color: '#FFFFFF',
    marginLeft: 12,
    flex: 1,
  },
  dangerControl: {
    borderBottomWidth: 0,
  },
  dangerText: {
    color: '#FF3B30',
  },
  membersCard: {
    backgroundColor: '#1A1A1A',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 16,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberName: {
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('MEDIUM'),
    color: '#FFFFFF',
    marginBottom: 2,
  },
  roleText: {
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('REGULAR'),
    color: '#8E8E93',
    marginBottom: 2,
  },
  memberPosition: {
    fontSize: getFontSize('XS'),
    fontWeight: getFontWeight('REGULAR'),
    color: '#8E8E93',
  },
  memberRoleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34C759',
  },
});

export default ConversationInfoScreen;
