import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Image,
  FlatList,
  Modal,
  Animated,
  PanResponder,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Video } from 'expo-av';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY, createTypographyStyle, FONT_SIZES, FONT_WEIGHTS } from '../constants/typography';
import { usePlaybooks, useRefreshPlaybooks, usePrefetchPlaybooks } from '../hooks/usePlaybooks';
import { useAuthTeam } from '../hooks/useAuthTeam';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const PlaybookScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [viewAllModalVisible, setViewAllModalVisible] = useState(false);
  const translateY = useRef(new Animated.Value(0)).current;
  
  // React Query hooks for live data
  const { data: authData } = useAuthTeam();
  const teamId = authData?.teamId;
  const { data, isLoading, isFetching, error } = usePlaybooks(teamId);
  const queryClient = useQueryClient();
  const refreshPlaybooks = useRefreshPlaybooks(teamId);
  const prefetchPlaybooks = usePrefetchPlaybooks(teamId);
  
  // Prefetch data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (teamId) {
        prefetchPlaybooks();
      }
    }, [teamId, prefetchPlaybooks])
  );
  
  // Extract live data from API
  const playbooks = data?.playbooks || [];
  const recentPlays = data?.recent_plays || [];
  const countSummary = data?.count_summary || { total_playbooks: 0, total_plays: 0 };
  const categories = data?.categories || [];
  
  // Memoize expensive computations
  const memoizedPlaybooks = React.useMemo(() => playbooks, [playbooks]);
  const memoizedRecentPlays = React.useMemo(() => recentPlays, [recentPlays]);
  
  // Fallback data for when no live data is available
  const fallbackPlaybooks = [
    { id: '1', name: 'Offense', icon: 'arrow-forward', count: 5, color: COLORS.BACKGROUND_TERTIARY },
    { id: '2', name: 'Defense', icon: 'shield', count: 4, color: COLORS.BACKGROUND_TERTIARY },
    { id: '3', name: 'Special', icon: 'star', count: 3, color: COLORS.BACKGROUND_TERTIARY },
    { id: '4', name: 'Personal', icon: 'person', count: 3, color: COLORS.BACKGROUND_TERTIARY },
    { id: '5', name: 'Amherst', icon: 'trophy', count: 8, color: COLORS.BACKGROUND_TERTIARY },
    { id: '6', name: 'Trinity', icon: 'medal', count: 6, color: COLORS.BACKGROUND_TERTIARY },
    { id: '7', name: 'Fall 2023', icon: 'calendar', count: 2, color: COLORS.BACKGROUND_TERTIARY },
    { id: '8', name: 'Williams', icon: 'flag', count: 7, color: COLORS.BACKGROUND_TERTIARY },
  ];

  const fallbackRecentPlays = [
    { id: '1', name: 'Counter Sweep', updated: '2h ago', icon: 'arrow-forward' },
    { id: '2', name: 'Blitz Shift', updated: '1d ago', icon: 'flash' },
  ];

  // Use live data if available, otherwise fallback to static data
  const displayPlaybooks = memoizedPlaybooks.length > 0 ? memoizedPlaybooks : fallbackPlaybooks;
  const displayRecentPlays = memoizedRecentPlays.length > 0 ? memoizedRecentPlays : fallbackRecentPlays;

  const quickActions = [
    { id: 'football', icon: require('../../assets/helmet.png'), label: 'Football' },
    { id: 'rugby', icon: require('../../assets/rugby.png'), label: 'Rugby' },
    { id: 'hockey', icon: require('../../assets/player.png'), label: 'Hockey' },
    { id: 'lacrosse', icon: require('../../assets/lacrosse.png'), label: 'Lacrosse' },
  ];

  // Manual refresh with haptic feedback
  const handleManualRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refreshPlaybooks();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // Handle errors from React Query
  React.useEffect(() => {
    if (error) {
      console.error('PlaybookScreen error:', error);
    }
  }, [error]);

  // Helper function to truncate text
  const truncateText = (text, maxLength = 12) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      return Math.abs(gestureState.dy) > 5;
    },
    onPanResponderGrant: () => {
      translateY.setOffset(translateY._value);
      translateY.setValue(0);
    },
    onPanResponderMove: (evt, gestureState) => {
      // Allow dragging down but limit upward movement
      const newValue = Math.max(0, gestureState.dy);
      translateY.setValue(newValue);
    },
    onPanResponderRelease: (evt, gestureState) => {
      translateY.flattenOffset();
      
      // If dragged down more than 200px, close the modal
      if (gestureState.dy > 200) {
        setViewAllModalVisible(false);
        translateY.setValue(0);
      } else {
        // Snap back to original position
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  const handleQuickAction = (actionId) => {
    switch (actionId) {
      case 'football':
        navigation.navigate('AnimatedPlaybook');
        break;
      case 'rugby':
        // TODO: Implement rugby playbook screen
        console.log('Rugby playbook - coming soon');
        break;
      case 'hockey':
        // TODO: Implement hockey playbook screen
        console.log('Hockey playbook - coming soon');
        break;
      case 'lacrosse':
        // TODO: Implement lacrosse playbook screen
        console.log('Lacrosse playbook - coming soon');
        break;
      default:
        break;
    }
  };

  const renderQuickActions = React.useCallback(() => (
    <View style={styles.section}>
      <View style={styles.quickActionsContainer}>
        {quickActions.map((action) => (
          <TouchableOpacity 
            key={action.id} 
            style={styles.quickActionButton}
            onPress={() => handleQuickAction(action.id)}
            activeOpacity={0.6}
          >
            <Animated.View style={styles.quickActionIcon}>
              <Image 
                source={action.icon} 
                style={styles.sportIcon} 
                resizeMode="contain"
                tintColor="#FFFFFF"
              />
            </Animated.View>
            <Text style={styles.quickActionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  ), [quickActions]);

  const renderPlaybookCard = ({ item }) => (
    <TouchableOpacity 
      style={styles.playbookCard}
      activeOpacity={0.8}
      onPress={() => {
        // Navigate to specific playbook with live data
        if (item.id && item.name) {
          console.log(`Selected playbook: ${item.name}`);
          // TODO: Navigate to playbook detail screen with item.id
        }
      }}
    >
      <View style={styles.playbookIcon}>
        <Ionicons name={item.icon || 'football'} size={20} color="#FFFFFF" />
      </View>
      <View style={styles.playbookTextContainer}>
        <Text style={styles.playbookName}>{item.name}</Text>
        <Text style={styles.playbookCount}>{item.play_count || item.count || 0} plays</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#666666" style={styles.playbookChevron} />
    </TouchableOpacity>
  );

  const renderPlaybookGroup = ({ item }) => (
    <View style={styles.playbookGroup}>
      {item.map((playbook) => (
        <TouchableOpacity 
          key={playbook.id} 
          style={styles.playbookCard}
          activeOpacity={0.8}
          onPress={() => {
            // TODO: Navigate to specific playbook
            console.log(`Selected playbook: ${playbook.name}`);
          }}
        >
          <View style={styles.playbookIcon}>
            <Ionicons name={playbook.icon} size={20} color="#FFFFFF" />
          </View>
          <View style={styles.playbookTextContainer}>
            <Text 
              style={styles.playbookName}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {truncateText(playbook.name, 10)}
            </Text>
            <Text style={styles.playbookCount}>{playbook.count} plays</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#666666" style={styles.playbookChevron} />
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderMyPlaybooks = () => {
    // Split playbooks into groups of 2 for 2x2 layout
    const playbookGroups = [];
    for (let i = 0; i < displayPlaybooks.length; i += 2) {
      playbookGroups.push(displayPlaybooks.slice(i, i + 2));
    }

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Playbooks</Text>
          <TouchableOpacity onPress={() => setViewAllModalVisible(true)}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.playbooksContainer}>
          <FlatList
            data={playbookGroups}
            renderItem={renderPlaybookGroup}
            keyExtractor={(item, index) => `group-${index}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToAlignment="start"
            decelerationRate="fast"
            nestedScrollEnabled={true}
            contentContainerStyle={styles.playbooksFlatListContent}
            ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
          />
        </View>
      </View>
    );
  };

  const renderViewAllModal = () => (
    <Modal
      visible={viewAllModalVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setViewAllModalVisible(false)}
    >
      <Animated.View 
        style={[
          styles.modalContainer,
          {
            transform: [{ translateY: translateY }]
          }
        ]}
        {...panResponder.panHandlers}
      >
        {/* Drag Handle */}
        <View style={styles.dragHandle} />
        
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>All Playbooks</Text>
          <TouchableOpacity 
            onPress={() => {
              setViewAllModalVisible(false);
              translateY.setValue(0);
            }}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        
        <FlatList
          data={playbooks}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.modalPlaybookItem}
              onPress={() => {
                setViewAllModalVisible(false);
                // TODO: Navigate to specific playbook
                console.log(`Selected playbook: ${item.name}`);
              }}
            >
              <View style={styles.modalPlaybookIcon}>
                <Ionicons name={item.icon} size={24} color="#FFFFFF" />
              </View>
              <View style={styles.modalPlaybookInfo}>
                <Text style={styles.modalPlaybookName}>{item.name}</Text>
                <Text style={styles.modalPlaybookCount}>{item.count} plays</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666666" />
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.modalContent}
          showsVerticalScrollIndicator={false}
        />
      </Animated.View>
    </Modal>
  );

  const renderRecentPlays = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Plays</Text>
      </View>
      
      {displayRecentPlays.map((play) => (
        <TouchableOpacity key={play.id} style={styles.recentPlayItem}>
          <View style={styles.recentPlayIcon}>
            <Ionicons name={play.icon || 'play'} size={16} color="#FFFFFF" />
          </View>
          <View style={styles.recentPlayInfo}>
            <Text style={styles.recentPlayName}>{truncateText(play.name, 15)}</Text>
            <Text style={styles.recentPlayUpdated}>updated {play.updated_at ? new Date(play.updated_at).toLocaleDateString() : play.updated || 'Recently'}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderPlayThumbnail = () => (
    <View style={styles.playThumbnailCard}>
      <Video
        source={require('../../assets/play1.mov')}
        style={styles.playVideo}
        shouldPlay={true}
        isLooping={true}
        isMuted={true}
        resizeMode="cover"
      />
    </View>
  );

  const renderFloatingButton = () => (
    <TouchableOpacity 
      style={styles.floatingButton}
      onPress={() => navigation.navigate('AnimatedPlaybook')}
    >
      <Text style={styles.floatingButtonText}>New Play</Text>
      <Ionicons name="add" size={20} color="#FFFFFF" />
    </TouchableOpacity>
  );

  // Skeleton loading component for first-time load
  const PlaybookSkeleton = () => (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0E0E0E" />
      <SafeAreaView style={styles.safeArea}>
        <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
          {/* Header skeleton */}
          <View style={{ width: 200, height: 28, backgroundColor: COLORS.BACKGROUND_CARD_SECONDARY, borderRadius: 8, marginBottom: 20 }} />
          
          {/* Quick actions skeleton */}
          <View style={{ height: 100, backgroundColor: COLORS.BACKGROUND_CARD, borderRadius: 20, marginBottom: 24 }} />
          
          {/* My playbooks skeleton */}
          <View style={{ height: 200, backgroundColor: COLORS.BACKGROUND_CARD, borderRadius: 20, marginBottom: 24 }} />
          
          {/* Recent plays skeleton */}
          <View style={{ height: 120, backgroundColor: COLORS.BACKGROUND_CARD, borderRadius: 20 }} />
        </View>
      </SafeAreaView>
    </View>
  );
  
  // Show skeleton only when there's no cached data (first-time load)
  if (isLoading && !data) {
    return <PlaybookSkeleton />;
  }
  
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0E0E0E" />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={handleManualRefresh}
              tintColor={COLORS.TEXT_PRIMARY}
              titleColor={COLORS.TEXT_PRIMARY}
              colors={[COLORS.TEXT_PRIMARY]}
              progressBackgroundColor={COLORS.BACKGROUND_CARD_SECONDARY}
            />
          }
        >
          
          {renderQuickActions()}
          {renderMyPlaybooks()}
          {renderRecentPlays()}
          {renderPlayThumbnail()}
        </ScrollView>
        
        {renderFloatingButton()}
        {renderViewAllModal()}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 20, // Add top padding to push content down
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24, // Increased from 16 to add more space between sections
  },
  sectionTitle: {
    ...TYPOGRAPHY.eventTitle, // Match About and Football News section titles
    // No marginBottom to align with View All text on same line
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  viewAllText: {
    ...TYPOGRAPHY.caption,
  },
  
  // Quick Actions
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
  },
  quickActionButton: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.ICON_BACKGROUND_PLAYBOOK,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  quickActionLabel: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sportIcon: {
    width: 33,
    height: 33,
    opacity: 0.8,
  },
  
  // My Playbooks
  playbooksContainer: {
    position: 'relative',
    marginHorizontal: 20,
  },
  playbooksFlatListContent: {
    paddingLeft: 0,
    paddingRight: 20, // Extra padding on right for last item
  },
  playbookGroup: {
    flexDirection: 'column',
    gap: 12,
  },
  playbookCard: {
    backgroundColor: COLORS.BACKGROUND_CARD,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    width: (SCREEN_WIDTH - 64) / 2, // Account for margins and gap
    minHeight: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
    overflow: 'hidden', // Prevent content from breaking layout
  },
  playbookIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.ICON_BACKGROUND_PLAYBOOK,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  playbookTextContainer: {
    flex: 1,
  },
  playbookName: {
    ...TYPOGRAPHY.feedName,
    marginBottom: 2,
    flex: 1,
    numberOfLines: 1,
    ellipsizeMode: 'tail',
  },
  playbookCount: {
    ...TYPOGRAPHY.feedAction,
  },
  playbookChevron: {
    marginLeft: 8,
  },
  
  // Recent Plays
  recentPlayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  recentPlayIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.ICON_BACKGROUND_PLAYBOOK,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  recentPlayInfo: {
    flex: 1,
  },
  recentPlayName: {
    ...TYPOGRAPHY.feedName,
    marginBottom: 2,
  },
  recentPlayUpdated: {
    ...TYPOGRAPHY.feedTime,
  },
  
  // Floating Button
  floatingButton: {
    position: 'absolute',
    bottom: 100, // Move up to be above tab bar
    alignSelf: 'center',
    backgroundColor: COLORS.BACKGROUND_CARD, // Match playbook cards
    paddingVertical: 8, // Reduced from 12
    paddingHorizontal: 16, // Reduced from 24
    borderRadius: 16, // Reduced from 20
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4, // Reduced from 6
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.TEXT_SECONDARY, // Lighter grey instead of pure white
  },
  
  // Refresh indicator
  refreshIndicator: {
    backgroundColor: COLORS.BACKGROUND_CARD_SECONDARY,
    paddingVertical: 8,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  refreshText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.TEXT_SECONDARY,
  },
  
  // Categories
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  categoryChip: {
    backgroundColor: COLORS.BACKGROUND_CARD_SECONDARY,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.TEXT_SECONDARY,
  },
  
  // Play Thumbnail
  playThumbnailCard: {
    marginHorizontal: 20,
    marginBottom: 80, // Increased from 20 to avoid floating button overlap
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  playVideo: {
    width: '100%',
    height: 180,
  },
  
  // View All Modal
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#666666',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BACKGROUND_OVERLAY,
  },
  modalTitle: {
    ...TYPOGRAPHY.eventTitle,
  },
  closeButton: {
    padding: 8,
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalPlaybookItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: COLORS.BACKGROUND_CARD,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  modalPlaybookIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.ICON_BACKGROUND_PLAYBOOK,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  modalPlaybookInfo: {
    flex: 1,
  },
  modalPlaybookName: {
    ...TYPOGRAPHY.feedName,
    marginBottom: 4,
  },
  modalPlaybookCount: {
    ...TYPOGRAPHY.feedAction,
  },
});

export default PlaybookScreen;