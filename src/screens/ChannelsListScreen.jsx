import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Dimensions,
  Image,
  ScrollView,
  TextInput,
  Modal,
  Pressable,
  Animated
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTeamConversations } from '../hooks/useTeamConversations';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../hooks/queryKeys';
import { getTeamMemberProfiles } from '../api/profiles';
import { colors } from '../constants/chatColors';
import { fonts } from '../constants/chatFonts';
import { getFontFamily, getFontWeight, getFontSize } from '../constants/fonts';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY, createTypographyStyle, FONT_SIZES, FONT_WEIGHTS } from '../constants/typography';
import CreateChannelModal from '../components/CreateChannelModal';
import ChannelsSkeletonLoader from '../components/ChannelsSkeletonLoader';
import { createChannel, findOrCreateDirectMessage } from '../api/chat';
import { useSupabase } from '../providers/SupabaseProvider';
import * as Haptics from 'expo-haptics';

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');
const isTablet = width >= 768;

// Stable search input component to prevent focus loss
const SearchInput = React.memo(({ value, onChangeText }) => {
  const inputRef = useRef(null);
  
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
      <Ionicons name="search" size={20} color="rgba(255, 255, 255, 0.5)" style={{ marginRight: 10 }} />
      <TextInput
        ref={inputRef}
        style={{
          flex: 1,
          fontSize: 14,
          fontFamily: 'System',
          color: '#FFFFFF',
          paddingVertical: 4
        }}
        placeholder="Search teammates or channels..."
        placeholderTextColor="rgba(255, 255, 255, 0.4)"
        value={value}
        onChangeText={onChangeText}
      />
      {value.length > 0 && (
        <TouchableOpacity
          onPress={() => onChangeText('')}
          style={{ marginLeft: 8 }}
        >
          <Ionicons name="close-circle" size={20} color="rgba(255, 255, 255, 0.5)" />
        </TouchableOpacity>
      )}
    </View>
  );
}, (prevProps, nextProps) => {
  // Only re-render if value changes
  return prevProps.value === nextProps.value;
});

const ChannelsListScreen = ({ navigation, route }) => {
  const supabase = useSupabase();
  const { teamId } = route.params;
  console.log('🏠 ChannelsListScreen received teamId:', teamId);
  
  // React Query hook for all conversation data
  const { data, isLoading, isFetching, error, refetch } = useTeamConversations(teamId);
  const queryClient = useQueryClient();

  // UI state (not data state)
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFAB, setShowFAB] = useState(true);
  const [showFABMenu, setShowFABMenu] = useState(false);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [actionSheetAnimation] = useState(new Animated.Value(0));
  const [selectedItemRef, setSelectedItemRef] = useState(null);
  const [blurAnimation] = useState(new Animated.Value(0));
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [isLoadingPeople, setIsLoadingPeople] = useState(false);

  const filters = ['All', 'Channels', 'DMs', 'Unread'];

  // Process conversations with filters and search
  const filteredConversations = useMemo(() => {
    if (!data?.allConversations) return [];

    // Normalize types from backend into UI buckets
    const normalized = data.allConversations.map(conv => ({
      ...conv,
      uiType: conv.type === 'dm' ? 'dm' : 'channel',
    }));

    // First apply filter
    let filtered = normalized.filter(conv => {
      switch (activeFilter) {
        case 'Channels':
          return conv.uiType === 'channel';
        case 'DMs':
          return conv.uiType === 'dm';
        case 'Unread':
          return conv.unread_count > 0;
        default:
          return true;
      }
    });

    // Then apply search query if present
    if (searchQuery.trim()) {
      const queryLower = searchQuery.toLowerCase();
      filtered = filtered.filter(conv => {
        const nameMatch = conv.name?.toLowerCase().includes(queryLower);
        const descMatch = conv.description?.toLowerCase().includes(queryLower);
        return nameMatch || descMatch;
      });
    }

    return filtered;
  }, [data?.allConversations, activeFilter, searchQuery]);

  const handleManualRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
    await loadTeamMembers();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // Load team members for People section
  const loadTeamMembers = async () => {
    try {
      setIsLoadingPeople(true);
      const { data: profilesData, error } = await getTeamMemberProfiles(supabase, teamId);
      if (error) throw error;
      
      // Get active conversation user IDs
      const activeUserIds = new Set();
      if (data?.allConversations) {
        data.allConversations.forEach(conv => {
          const uiType = conv.type === 'dm' ? 'dm' : 'channel';
          if (uiType === 'dm') {
            // Extract user IDs from DMs
            const dmUserIds = conv.participants?.map(p => p.user_id) || [];
            dmUserIds.forEach(id => activeUserIds.add(id));
          }
        });
      }
      
      // Only show team members not in active chats
      const inactiveMembers = (profilesData || []).filter(profile => 
        !activeUserIds.has(profile.user_id)
      );
      
      setTeamMembers(inactiveMembers);
    } catch (error) {
      console.error('Error loading team members:', error);
    } finally {
      setIsLoadingPeople(false);
    }
  };

  // Load team members when data is available
  useEffect(() => {
    if (data?.allConversations && teamId) {
      loadTeamMembers();
    }
  }, [data?.allConversations, teamId]);

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
  };

  const handleScroll = (event) => {
    const currentOffset = event.nativeEvent.contentOffset.y;
    const direction = currentOffset > (scrollOffset || 0) ? 'down' : 'up';
    
    if (direction === 'down' && currentOffset > 50) {
      setShowFAB(false);
    } else if (direction === 'up') {
      setShowFAB(true);
    }
    
    setScrollOffset(currentOffset);
  };

  const getChannelEmoji = (type, name) => {
    const nameLower = name.toLowerCase();
    
    // Check for specific channel names first
    if (nameLower.includes('announcement')) return '📢';
    if (nameLower.includes('general')) return '#️⃣';
    if (nameLower.includes('offense')) return '🏈';
    if (nameLower.includes('defense')) return '🛡️';
    if (nameLower.includes('special')) return '⚡';
    if (nameLower.includes('coach')) return '👨‍💼';
    if (nameLower.includes('trainer')) return '🏥';
    if (nameLower.includes('training')) return '🏥';
    
    // Then check by type
    switch (type) {
      case 'team':
        return '#️⃣';
      case 'announcements':
        return '📢';
      case 'position':
        return '🏈';
      case 'coach':
        return '👨‍💼';
      case 'trainer':
        return '🏥';
      case 'casual':
        return '💬';
      default:
        return '#️⃣';
    }
  };

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
      case 'dm':
        return 'person';
      default:
        return 'chatbubbles';
    }
  };

  const getChannelColor = (type) => {
    switch (type) {
      case 'team':
        return colors.primary;
      case 'coach':
        return colors.secondary;
      case 'trainer':
        return colors.accent;
      case 'position':
        return colors.success;
      case 'casual':
        return colors.warning;
      default:
        return colors.gray;
    }
  };

  const getChannelAvatarStyle = (type, name) => {
    const nameLower = name ? name.toLowerCase() : '';
    
    // Check for specific channel names first
    if (nameLower.includes('announcement')) {
      return styles.announcementAvatar;
    }
    if (nameLower.includes('general')) {
      return styles.generalAvatar;
    }
    if (nameLower.includes('training') || nameLower.includes('offense') || nameLower.includes('defense') || nameLower.includes('special')) {
      return styles.trainingAvatar;
    }
    
    // Then check by type
    switch (type) {
      case 'announcements':
        return styles.announcementAvatar;
      case 'team':
        return styles.generalAvatar;
      case 'position':
      case 'coach':
      case 'trainer':
        return styles.trainingAvatar;
      default:
        return styles.generalAvatar;
    }
  };

  // Action handler functions
  const muteConversation = async (item) => {
    Alert.alert(
      'Mute Conversation',
      `Are you sure you want to mute ${item.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Mute', 
          style: 'destructive',
          onPress: () => {
            // TODO: Implement mute functionality
            console.log('Muting conversation:', item.name);
            Alert.alert('Success', `${item.name} has been muted`);
          }
        }
      ]
    );
  };

  const deleteConversation = async (item) => {
    Alert.alert(
      'Delete Conversation',
      `Are you sure you want to delete ${item.name}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            // TODO: Implement delete functionality
            console.log('Deleting conversation:', item.name);
            Alert.alert('Success', `${item.name} has been deleted`);
          }
        }
      ]
    );
  };

  const blockUser = async (item) => {
    Alert.alert(
      'Block User',
      `Are you sure you want to block ${item.name}? You won't receive messages from them anymore.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Block', 
          style: 'destructive',
          onPress: () => {
            // TODO: Implement block functionality
            console.log('Blocking user:', item.name);
            Alert.alert('Success', `${item.name} has been blocked`);
          }
        }
      ]
    );
  };

  const leaveChannel = async (item) => {
    Alert.alert(
      'Leave Channel',
      `Are you sure you want to leave ${item.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Leave', 
          style: 'destructive',
          onPress: () => {
            // TODO: Implement leave functionality
            console.log('Leaving channel:', item.name);
            Alert.alert('Success', `You have left ${item.name}`);
          }
        }
      ]
    );
  };

  const handleLongPress = (item, event) => {
    setSelectedItem(item);
    setShowActionSheet(true);
    
    // Use the actual touch coordinates from the event
    const { pageY } = event.nativeEvent;
    setSelectedItemRef({ 
      x: 0, y: 0, width: width - 40, height: 80, 
      pageX: 20, // Fixed horizontal position (consistent)
      pageY: pageY - 40  // Dynamic vertical position based on touch
    });
    
    // Animate blur and action sheet
    Animated.parallel([
      Animated.timing(blurAnimation, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(actionSheetAnimation, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      })
    ]).start();
  };

  const hideActionSheet = () => {
    Animated.parallel([
      Animated.timing(blurAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(actionSheetAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start(() => {
      setShowActionSheet(false);
      setSelectedItem(null);
      setSelectedItemRef(null);
    });
  };

  const getActionSheetPosition = () => {
    if (!selectedItemRef) return { top: '50%', left: '50%' };
    
    const actionSheetHeight = selectedItem?.type === 'dm' ? 120 : 80; // Much smaller height
    const actionSheetWidth = 140; // Compact width
    const bottomSpace = SCREEN_HEIGHT - (selectedItemRef.pageY + selectedItemRef.height);
    const shouldPlaceBelow = bottomSpace > actionSheetHeight + 20;
    
    return {
      top: shouldPlaceBelow 
        ? selectedItemRef.pageY + selectedItemRef.height + 8
        : selectedItemRef.pageY - actionSheetHeight - 8,
      left: selectedItemRef.pageX + selectedItemRef.width - actionSheetWidth - 8, // Far right of the chat item
    };
  };

  const handleAction = async (action) => {
    if (!selectedItem) return;
    
    try {
      switch (action) {
        case 'mute':
          await muteConversation(selectedItem);
          break;
        case 'delete':
          await deleteConversation(selectedItem);
          break;
        case 'block':
          await blockUser(selectedItem);
          break;
        case 'leave':
          await leaveChannel(selectedItem);
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Error performing action:', error);
      Alert.alert('Error', 'Failed to perform action. Please try again.');
    } finally {
      hideActionSheet();
    }
  };

  const renderPersonItem = ({ item }) => {
    const personName = item.user_profiles?.display_name || 'Unknown User';
    const personAvatar = item.user_profiles?.avatar_url;
    
    return (
      <TouchableOpacity
        style={styles.personItem}
        onPress={async () => {
          try {
            const { data, error } = await findOrCreateDirectMessage(
              supabase,
              teamId,
              item.user_id,
              personName
            );

            if (error) {
              throw error;
            }

            // Optimistically inject DM into conversations cache immediately
            const { data: authData } = await supabase.auth.getUser();
            const userId = authData?.user?.id;

            if (userId) {
              const cacheKey = queryKeys.teamConversations(teamId, userId);
              queryClient.setQueryData(cacheKey, (existing) => {
                if (!existing) return existing;
                const convs = existing.allConversations ? [...existing.allConversations] : [];
                const alreadyExists = convs.some(c => c.id === data.id);
                if (alreadyExists) return existing;

                const nowIso = new Date().toISOString();
                const optimisticDM = {
                  id: data.id,
                  name: personName,
                  type: 'dm',
                  is_private: true,
                  visibility: 'hidden',
                  last_message_time: nowIso,
                  updated_at: nowIso,
                  unread_count: 0,
                  icon_name: 'person',
                  avatar_url: item.user_profiles?.avatar_url || null,
                  description: null,
                };

                convs.unshift(optimisticDM);
                return { ...existing, allConversations: convs };
              });

              // Background refetch to reconcile with server
              await queryClient.invalidateQueries({ queryKey: cacheKey });
            }

            // Navigate to the DM
            navigation.navigate('DirectMessageChat', {
              channelId: data.id,
              channelName: personName,
              teamId
            });
          } catch (err) {
            console.error('Error creating DM:', err);
            Alert.alert('Error', 'Failed to start conversation. Please try again.');
          }
        }}
        activeOpacity={0.6}
      >
        <View style={styles.avatarContainer}>
          {personAvatar ? (
            <Image 
              source={{ uri: personAvatar }} 
              style={styles.personAvatar}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={20} color="#666666" />
            </View>
          )}
        </View>
        
        <View style={styles.channelInfo}>
          <Text style={styles.personName}>{personName}</Text>
          {item.team_members?.role && (
            <Text style={styles.personRole}>{item.team_members.role}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderChannelItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.channelItem,
        item.uiType === 'channel' && styles.channelItemBackground,
      ]}
      onPress={() => {
        if (item.uiType === 'dm') {
          navigation.navigate('DirectMessageChat', { 
            channelId: item.id, 
            channelName: item.name,
            teamId 
          });
        } else {
          navigation.navigate('ChannelChat', { 
            channelId: item.id, 
            channelName: item.name,
            teamId 
          });
        }
      }}
      onLongPress={(event) => handleLongPress(item, event)}
      activeOpacity={0.6}
    >
      <View style={styles.avatarContainer}>
        {item.uiType === 'dm' && item.avatar_url ? (
          // For DMs, show avatar if available
          <Image 
            source={{ uri: item.avatar_url }} 
            style={styles.avatar}
            resizeMode="cover"
            onError={(error) => {
              console.log('Avatar load error for', item.name, ':', error);
            }}
            onLoad={() => {
              console.log('Avatar loaded successfully for', item.name);
            }}
          />
        ) : item.uiType === 'dm' ? (
          // For DMs without avatar, show person icon
          <View style={styles.avatarPlaceholder}>
            <Ionicons
              name="person"
              size={24}
              color="rgba(255, 255, 255, 0.5)"
            />
          </View>
        ) : (
          // For channels, show image if available, otherwise show icon
          item.image_url ? (
            <Image
              source={{ uri: item.image_url }}
              style={styles.channelAvatar}
              resizeMode="cover"
            />
          ) : (
            <View style={[
              styles.channelAvatar,
              getChannelAvatarStyle(item.type, item.name)
            ]}>
              <Ionicons
                name={item.icon_name}
                size={22}
                color="#CCCCCC"
              />
            </View>
          )
        )}
        {/* Online status indicator for DMs */}
        {item.uiType === 'dm' && (
          <View style={styles.statusIndicator} />
        )}
      </View>
      
      <View style={styles.channelInfo}>
        <View style={styles.channelHeader}>
          <Text style={[
            styles.channelName,
            item.type === 'channel' ? styles.channelNameChannel : styles.channelNameDM
          ]} numberOfLines={1}>
            {item.type === 'channel' ? '#' : ''}{item.name}
          </Text>
        </View>
        
        {item.description && (
          <Text style={styles.channelDescription} numberOfLines={1}>
            {item.description}
          </Text>
        )}
        
        {/* Add sublabel for DMs */}
        {item.type === 'dm' && (
          <Text style={styles.channelSublabel}>1:1</Text>
        )}
      </View>
      
      <View style={styles.channelMeta}>
        {item.is_private && (
          <Ionicons name="lock-closed" size={14} color="rgba(255, 255, 255, 0.3)" />
        )}
        {item.unread_count > 0 && (
          <View style={styles.unreadDot} />
        )}
        {item.is_pinned && (
          <Ionicons name="pin" size={14} color="rgba(126, 26, 33, 0.6)" style={styles.pinIcon} />
        )}
      </View>
    </TouchableOpacity>
  );

  const renderFilterTabs = useCallback(() => (
    <View style={styles.filterContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScrollContent}
      >
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterTab,
              activeFilter === filter && styles.activeFilterTab
            ]}
            onPress={() => handleFilterChange(filter)}
          >
            <Text style={[
              styles.filterTabText,
              activeFilter === filter && styles.activeFilterTabText
            ]}>
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  ), [activeFilter]);

  // Don't memoize renderHeader so it can read the current searchQuery value
  const renderHeader = () => (
    <View style={styles.compactHeader}>
      <View style={styles.searchBarCompact}>
        <SearchInput 
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      
      <TouchableOpacity
        style={styles.compactFab}
        onPress={() => setShowCreateModal(true)}
        activeOpacity={0.7}
      >
        <Ionicons 
          name="add" 
          size={22} 
          color="#CCCCCC" 
        />
      </TouchableOpacity>
    </View>
  );

  // Memoize header component for FlatList - only recompute when filter changes
  const listHeaderComponent = useMemo(() => (
    <View style={styles.unifiedHeader}>
      {renderHeader()}
      {renderFilterTabs()}
    </View>
  ), [activeFilter]);

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="chatbubbles-outline" size={24} color={COLORS.TEXT_MUTED} />
      </View>
      <Text style={styles.emptyTitle}>No Messages Yet</Text>
      <Text style={styles.emptySubtitle}>
        Start a conversation with your team
      </Text>
    </View>
  );


  const renderFAB = () => {
    if (!showFAB) return null;

    return (
      <View style={styles.fabContainer}>
        {showFABMenu && (
          <View style={styles.fabMenu}>
            <TouchableOpacity
              style={styles.fabMenuItem}
              onPress={() => {
                setShowCreateModal(true);
                setShowFABMenu(false);
              }}
            >
              <Ionicons name="people" size={16} color="#CCCCCC" />
              <Text style={styles.fabMenuText}>New Channel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.fabMenuItem}
              onPress={() => {
                navigation.navigate('NewDirectMessage', { teamId });
                setShowFABMenu(false);
              }}
            >
              <Ionicons name="chatbubble" size={16} color="#CCCCCC" />
              <Text style={styles.fabMenuText}>New DM</Text>
            </TouchableOpacity>
          </View>
        )}
        
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowFABMenu(!showFABMenu)}
          activeOpacity={0.8}
        >
          <Ionicons 
            name={showFABMenu ? "close" : "add"} 
            size={24} 
            color="#CCCCCC" 
          />
        </TouchableOpacity>
      </View>
    );
  };

  if (isLoading && !data) {
    return (
      <View style={styles.wrapper}>
        <SafeAreaView style={styles.container}>
          <ChannelsSkeletonLoader />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <SafeAreaView style={styles.container}>
        <FlatList
          data={filteredConversations}
          renderItem={renderChannelItem}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={handleManualRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={isLoading ? null : renderEmptyState}
          ListHeaderComponent={listHeaderComponent}
          ListFooterComponent={() => {
            if (teamMembers.length === 0) return null;
            return (
              <View style={styles.peopleSection}>
                <Text style={styles.peopleSectionHeader}>People</Text>
                <FlatList
                  data={teamMembers}
                  renderItem={renderPersonItem}
                  keyExtractor={(item, index) => `person-${item.user_id}-${index}`}
                  scrollEnabled={false}
                />
              </View>
            );
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={true}
          alwaysBounceVertical={false}
          scrollEventThrottle={16}
          removeClippedSubviews={false}
          onScroll={handleScroll}
        />
      </SafeAreaView>
      
      <CreateChannelModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        teamId={teamId}
        onChannelCreated={() => {
          // Invalidate and refetch conversations
          queryClient.invalidateQueries({ queryKey: queryKeys.teamConversations(teamId) });
        }}
      />
      
      {/* Background Blur Overlay */}
      {showActionSheet && (
        <Animated.View 
          style={[
            styles.blurOverlay,
            {
              opacity: blurAnimation,
            }
          ]}
        >
          <BlurView 
            intensity={40} 
            tint="dark" 
            style={StyleSheet.absoluteFill}
          />
          <Pressable 
            style={StyleSheet.absoluteFill}
            onPress={hideActionSheet}
          />
        </Animated.View>
      )}
      
      {/* Elevated Selected Item */}
      {showActionSheet && selectedItemRef && (
        <Animated.View 
          style={[
            styles.elevatedItem,
            {
              top: selectedItemRef.pageY,
              left: selectedItemRef.pageX,
              width: selectedItemRef.width,
              height: selectedItemRef.height,
              opacity: actionSheetAnimation,
              transform: [
                {
                  scale: actionSheetAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.98, 1],
                  }),
                },
              ],
            }
          ]}
        >
          {/* Render the selected item here */}
          <View style={[
            styles.channelItem,
            selectedItem?.uiType === 'channel' && styles.channelItemBackground,
          ]}>
            <View style={styles.avatarContainer}>
              {selectedItem?.type === 'dm' && selectedItem?.avatar_url ? (
                <Image 
                  source={{ uri: selectedItem.avatar_url }} 
                  style={styles.avatar}
                  resizeMode="cover"
                />
              ) : selectedItem?.type === 'dm' ? (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons
                    name="person"
                    size={24}
                    color="rgba(255, 255, 255, 0.5)"
                  />
                </View>
              ) : (
                selectedItem?.image_url ? (
                  <Image
                    source={{ uri: selectedItem.image_url }}
                    style={styles.channelAvatar}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[
                    styles.channelAvatar,
                    getChannelAvatarStyle(selectedItem?.type, selectedItem?.name)
                  ]}>
                    <Ionicons
                      name={selectedItem?.icon_name}
                      size={22}
                      color="#CCCCCC"
                    />
                  </View>
                )
              )}
            </View>
            
            <View style={styles.channelInfo}>
              <View style={styles.channelHeader}>
                <Text style={[
                  selectedItem?.type === 'dm' ? styles.channelNameDM : styles.channelNameChannel
                ]}>
                  {selectedItem?.name}
                </Text>
                {selectedItem?.type === 'dm' && (
                  <Text style={styles.channelSublabel}>Direct message</Text>
                )}
              </View>
              <Text style={styles.channelDescription}>
                {selectedItem?.description || 'No recent messages'}
              </Text>
            </View>
            
            <View style={styles.channelMeta}>
              {selectedItem?.unread_count > 0 && (
                <View style={styles.unreadDot}>
                  <Text style={styles.unreadCount}>{selectedItem.unread_count}</Text>
                </View>
              )}
            </View>
          </View>
        </Animated.View>
      )}
      
      {/* Action Sheet */}
      {showActionSheet && selectedItemRef && (
        <Animated.View 
          style={[
            styles.actionSheetContainer,
            {
              top: getActionSheetPosition().top,
              left: getActionSheetPosition().left,
              opacity: actionSheetAnimation,
              transform: [
                {
                  scale: actionSheetAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.98, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.actionSheetContent}>
            {selectedItem?.type === 'dm' ? (
              // DM Actions
              <>
                <TouchableOpacity 
                  style={styles.actionItem}
                  onPress={() => handleAction('mute')}
                >
                  <Ionicons name="volume-mute" size={16} color="#F9F9F9" />
                  <Text style={styles.actionText}>Mute</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.actionItem}
                  onPress={() => handleAction('delete')}
                >
                  <Ionicons name="trash" size={16} color="#FF6B6B" />
                  <Text style={[styles.actionText, styles.destructiveText]}>Delete</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.actionItem}
                  onPress={() => handleAction('block')}
                >
                  <Ionicons name="ban" size={16} color="#FF6B6B" />
                  <Text style={[styles.actionText, styles.destructiveText]}>Block User</Text>
                </TouchableOpacity>
              </>
            ) : (
              // Channel Actions
              <>
                <TouchableOpacity 
                  style={styles.actionItem}
                  onPress={() => handleAction('mute')}
                >
                  <Ionicons name="volume-mute" size={16} color="#F9F9F9" />
                  <Text style={styles.actionText}>Mute Channel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.actionItem}
                  onPress={() => handleAction('leave')}
                >
                  <Ionicons name="exit" size={16} color="#FF6B6B" />
                  <Text style={[styles.actionText, styles.destructiveText]}>Leave Channel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
  },
  container: {
    flex: 1,
  },
  unifiedHeader: {
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
    paddingTop: 12,
    paddingBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  headerLeft: {
    alignItems: 'center',
  },
  teamLogo: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  headerTitle: {
    ...TYPOGRAPHY.title,
    textAlign: 'center',
  },
  headerSubtitle: {
    ...TYPOGRAPHY.captionSmall,
    marginTop: 2,
    textAlign: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addChannelButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dmButton: {
    alignItems: 'flex-end',
    position: 'relative',
  },
  listContainer: {
    flexGrow: 1,
    paddingBottom: SCREEN_HEIGHT * 0.12,
  },
  channelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: isTablet ? 24 : 20,
    backgroundColor: 'transparent',
  },
  channelItemBackground: {
    backgroundColor: COLORS.CHANNEL_BACKGROUND,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 2,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  announcementAvatar: {
    backgroundColor: 'rgba(126, 26, 33, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(182, 46, 46, 0.3)',
  },
  generalAvatar: {
    backgroundColor: 'rgba(229, 229, 229, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(170, 170, 170, 0.3)',
  },
  trainingAvatar: {
    backgroundColor: 'rgba(126, 26, 33, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 191, 41, 0.3)',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2A2A2A',
    borderWidth: 2.5,
    borderColor: COLORS.BACKGROUND_PRIMARY,
  },
  channelInfo: {
    flex: 1,
    minWidth: 0,
  },
  channelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  channelName: {
    ...TYPOGRAPHY.channelName,
    flex: 1,
  },
  channelNameChannel: {
    ...TYPOGRAPHY.channelName,
  },
  channelNameDM: {
    ...TYPOGRAPHY.channelName,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.UNREAD_DOT,
  },
  announcementBadge: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  channelDescription: {
    ...TYPOGRAPHY.eventTime, // Smaller and non-bold
    letterSpacing: -0.1,
  },
  channelSublabel: {
    ...TYPOGRAPHY.captionSmall,
    marginTop: 2,
    letterSpacing: -0.1,
  },
  channelMeta: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 8,
    flexDirection: 'row',
    gap: 6,
  },
  pinIcon: {
    // No extra margin needed since it's the last item
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    ...TYPOGRAPHY.loading,
    marginTop: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 40,
  },
  emptyIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 20,
    backgroundColor: COLORS.SECONDARY_BACKGROUND,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '600',
    color: COLORS.TEXT_MUTED,
    marginBottom: 6,
    fontSize: 16,
  },
  emptySubtitle: {
    ...TYPOGRAPHY.bodySmall,
    textAlign: 'center',
    color: COLORS.TEXT_MUTED,
    fontSize: 14,
  },
  filterContainer: {
    backgroundColor: 'transparent',
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  filterScrollContent: {
    paddingHorizontal: 0,
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 6,
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  activeFilterTab: {
    backgroundColor: COLORS.ACTIVE_FILTER_BACKGROUND,
  },
  filterTabText: {
    ...TYPOGRAPHY.caption,
    letterSpacing: -0.2,
  },
  activeFilterTabText: {
    ...TYPOGRAPHY.filterTabActive,
  },
  // Search Bar Styles
  searchContainer: {
    paddingHorizontal: isTablet ? 24 : 20,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    ...TYPOGRAPHY.searchInput,
  },
  clearButton: {
    marginLeft: 8,
  },
  // FAB Styles
  fabContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 100,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.ICON_BACKGROUND_CHAT,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  fabMenu: {
    position: 'absolute',
    bottom: 70,
    right: 0,
    backgroundColor: COLORS.ICON_BACKGROUND_CHAT,
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  fabMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  fabMenuText: {
    ...TYPOGRAPHY.fabMenuText,
    marginLeft: 8,
  },
  // Compact Header Styles
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 12,
  },
  searchBarCompact: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND_OVERLAY,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    height: 36,
  },
  searchInputCompact: {
    ...TYPOGRAPHY.searchInput,
  },
  compactFab: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.BACKGROUND_OVERLAY,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  // Contextual Action Sheet Styles
  actionSheetOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  actionSheetBackdrop: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  actionSheetBackdropPressable: {
    flex: 1,
  },
  selectiveBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  actionSheetContainer: {
    position: 'absolute',
    backgroundColor: COLORS.BACKGROUND_SURFACE,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    width: 140,
    minHeight: 80,
    maxHeight: 120,
    zIndex: 1001,
  },
  actionSheetContent: {
    paddingVertical: 4,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 32,
  },
  actionText: {
    ...TYPOGRAPHY.actionText,
    marginLeft: 8,
    flex: 1,
  },
  destructiveText: {
    ...TYPOGRAPHY.actionTextDestructive,
  },
  blurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  peopleSection: {
    marginTop: 24,
    marginBottom: 32,
    paddingHorizontal: isTablet ? 24 : 20,
  },
  peopleSectionHeader: {
    ...TYPOGRAPHY.sectionHeader,
    marginBottom: 12,
    color: '#666666',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  personItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    opacity: 0.5, // Greyish appearance for inactive
  },
  personAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  personName: {
    ...TYPOGRAPHY.body,
    fontSize: 15,
    color: '#CCCCCC',
  },
  personRole: {
    ...TYPOGRAPHY.captionSmall,
    color: '#666666',
    marginTop: 2,
  },
  elevatedItem: {
    position: 'absolute',
    zIndex: 1001,
  },
});

export default ChannelsListScreen;
