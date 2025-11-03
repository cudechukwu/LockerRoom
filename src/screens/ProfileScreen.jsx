import React, { useState } from 'react';
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
  Image,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY } from '../constants/typography';
import { supabase } from '../lib/supabase';
import EnhancedProfileCard from '../components/EnhancedProfileCard';
import ProfileSkeletonLoader from '../components/ProfileSkeletonLoader';
import NewsSection from '../components/NewsSection';
import AboutSection from '../components/AboutSection';
import SettingsSection from '../components/SettingsSection';
import ImagePickerModal from '../components/ImagePickerModal';
import EditProfileModal from '../components/EditProfileModal';
import { 
  checkProfileCompletion,
  getVisibleFields,
  upsertUserProfile,
  upsertTeamMemberProfile
} from '../api/profiles';
import { useProfileData } from '../hooks/useProfileData';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;

// Memoize heavy components for performance
const MemoizedEnhancedProfileCard = React.memo(EnhancedProfileCard);
const MemoizedNewsSection = React.memo(NewsSection);
const MemoizedAboutSection = React.memo(AboutSection);
const MemoizedSettingsSection = React.memo(SettingsSection);

const ProfileScreen = ({ navigation }) => {
  // New React Query hook replaces all the old state management
  const { data, isLoading, isFetching, error } = useProfileData();
  const queryClient = useQueryClient();
  
  // Extract data from hook
  const {
    teamId,
    userId,
    teamInfo,
    profile,
    userRole,
    isTeamAdmin,
    playerStats
  } = data || {};

  // Debug logging (can be removed in production)
  if (__DEV__) {
    console.log('🔍 ProfileScreen Debug:', {
      hasData: !!data,
      hasProfile: !!profile,
      userRole,
      profileData: profile ? {
        displayName: profile.user_profiles?.display_name,
        jerseyNumber: profile.jersey_number,
        position: profile.position,
        classYear: profile.class_year,
        major: profile.major,
        height: profile.height_cm,
        weight: profile.weight_kg,
        hometown: profile.hometown,
      } : 'null'
    });
  }

  // UI state only
  const [showEditModal, setShowEditModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const insets = useSafeAreaInsets();
  const tabBarHeight = Platform.OS === 'ios' ? 88 : 60;
  const adjustedTabBarHeight = tabBarHeight + Math.max(insets.bottom - 10, 0);

  // Manual refresh handler with haptic feedback
  const handleManualRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Promise.all([
      queryClient.refetchQueries({ queryKey: ['teamInfo'] }),
      queryClient.refetchQueries({ queryKey: ['userProfile'] }),
      queryClient.refetchQueries({ queryKey: ['teamMemberProfile'] }),
      queryClient.refetchQueries({ queryKey: ['teamAdminStatus'] }),
      queryClient.refetchQueries({ queryKey: ['playerStats'] }),
    ]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // Profile update handlers
  const handleProfileUpdated = () => {
    console.log('Profile updated, invalidating queries...');
    queryClient.invalidateQueries({ queryKey: ['teamMemberProfile'] });
    queryClient.invalidateQueries({ queryKey: ['userProfile'] });
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigation.navigate('VideoCover');
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
  };

  const handleFieldEdit = async (field, value) => {
    try {
      console.log(`Edit field ${field} to:`, value);
      console.log('Value type:', typeof value, Array.isArray(value) ? '(array)' : '(not array)');
      
      // Update in database
      if (field === 'display_name') {
        // Update user profile
        const { error } = await upsertUserProfile({
          user_id: userId,
          display_name: value,
          bio: profile?.user_profiles?.bio || '',
        });
        if (error) throw error;
      } else {
        // Update team member profile
        const updateData = { [field]: value };
        console.log('Updating team member profile with:', updateData);
        
        const { error } = await upsertTeamMemberProfile(teamId, userId, updateData);
        if (error) {
          console.error('Database error details:', error);
          throw error;
        }
      }

      // Invalidate queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['teamMemberProfile'] });
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      
      // Toggle edit mode off after successful save
      setIsEditing(false);
      
    } catch (error) {
      console.error('Error updating field:', error);
      Alert.alert('Error', `Failed to update ${field}. Please try again.`);
    }
  };

  const handleNotifications = () => {
    navigation.navigate('Notifications');
  };

  const handleStorageData = () => {
    navigation.navigate('StorageData');
  };

  const handleImageEdit = () => {
    setShowImagePicker(true);
  };


  const handleImageSelected = async (imageUrl) => {
    try {
      console.log('Updating profile with new image URL:', imageUrl);
      
      // Update in database
      const { error } = await upsertUserProfile({
        user_id: userId,
        display_name: profile?.user_profiles?.display_name || '',
        bio: profile?.user_profiles?.bio || '',
        avatar_url: imageUrl,
      });

      if (error) throw error;

      console.log('Profile image updated successfully in database');
      
      // Invalidate queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] }); // For HomeScreen
      queryClient.invalidateQueries({ queryKey: ['teamMemberProfile'] });
      
      // Refetch to update cache immediately
      await queryClient.refetchQueries({ queryKey: ['userProfile'] });
      await queryClient.refetchQueries({ queryKey: ['profile'] });
      await queryClient.refetchQueries({ queryKey: ['teamMemberProfile'] });
      
      // Force refresh the component
      setRefreshKey(prev => prev + 1);
      
      Alert.alert('Success', 'Profile photo updated successfully!');
      
    } catch (error) {
      console.error('Error updating profile image:', error);
      Alert.alert('Error', 'Failed to update profile image. Please try again.');
    }
  };

  // Skeleton loading for first-time load (no cached data)
  if (isLoading && !profile) {
    return <ProfileSkeletonLoader />;
  }

  // Error handling
  if (error) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={[styles.container, { paddingBottom: adjustedTabBarHeight }]}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Failed to load profile</Text>
            <Text style={styles.errorSubtext}>
              {error.message || 'The profile system may need database setup or you may not have a profile yet.'}
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleManualRefresh}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // No profile data
  if (!profile) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={[styles.container, { paddingBottom: adjustedTabBarHeight }]}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>No profile found</Text>
            <Text style={styles.errorSubtext}>
              Please contact your team administrator to set up your profile.
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleManualRefresh}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const isPlayer = userRole === 'player';
  const isStaff = ['coach', 'trainer', 'assistant'].includes(userRole);
  const displayName = profile.user_profiles?.display_name || 'Unknown User';
  const avatarUrl = profile.user_profiles?.avatar_url;
  const bio = profile.user_profiles?.bio;

  // Debug information
  console.log('Profile Debug Info:', {
    userRole,
    isPlayer,
    isStaff,
    displayName,
    hasProfile: !!profile,
    profileKeys: profile ? Object.keys(profile) : [],
    teamId
  });

  // Debug logging (only if no avatar)
  if (!avatarUrl) {
    console.log('Profile loaded - no avatar URL found');
  }
  
  return (
    <View style={styles.container}>
      <SafeAreaView style={[styles.container, { paddingBottom: adjustedTabBarHeight }]}>
        {/* Header with Team Logo */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image 
              source={
                teamInfo?.logo_url
                  ? { uri: `${teamInfo.logo_url}?v=${teamInfo.updated_at || Date.now()}` }
                  : require('../../assets/LockerRoom.png')
              }
              style={styles.teamLogo}
              resizeMode="contain"
            />
          </View>
          <View style={styles.headerRight}>
          {/* Team Management button for admins */}
          {isTeamAdmin && (
            <TouchableOpacity 
              style={styles.teamManagementButton} 
              onPress={() => navigation.navigate('TeamManagement')}
            >
              <Ionicons name="settings" size={20} color={COLORS.TEXT_MUTED} />
            </TouchableOpacity>
          )}
          </View>
        </View>

        <ScrollView 
          style={styles.content}
          refreshControl={
            <RefreshControl 
              refreshing={isFetching} 
              onRefresh={handleManualRefresh}
              tintColor={COLORS.TEXT_PRIMARY}
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Enhanced Profile Card */}
          <MemoizedEnhancedProfileCard
            key={refreshKey}
            profile={profile}
            userRole={userRole}
            isEditing={isEditing}
            onEditToggle={handleEditToggle}
            onFieldEdit={handleFieldEdit}
            onImageEdit={handleImageEdit}
          />

          {/* News Section */}
          <MemoizedNewsSection 
            profile={profile} 
            userRole={userRole} 
          />

          {/* About Section */}
          <MemoizedAboutSection
            profile={profile}
            userRole={userRole}
            isEditing={isEditing}
            onFieldEdit={handleFieldEdit}
          />

          {/* Settings Section */}
          <MemoizedSettingsSection
            onEditProfile={handleEditToggle}
            onSignOut={handleSignOut}
            onNotifications={handleNotifications}
            onStorageData={handleStorageData}
          />
        </ScrollView>

        {/* Image Picker Modal */}
        <ImagePickerModal
          visible={showImagePicker}
          onClose={() => setShowImagePicker(false)}
          onImageSelected={handleImageSelected}
          currentImageUrl={profile?.user_profiles?.avatar_url}
          userId={userId}
        />

        {/* Edit Profile Modal */}
        <EditProfileModal
          visible={showEditModal}
          onClose={() => setShowEditModal(false)}
          profile={profile}
          teamId={teamId}
          userId={userId}
          userRole={userRole}
          isAdmin={isTeamAdmin}
          onProfileUpdated={handleProfileUpdated}
        />

      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND_PRIMARY, // Match HomeScreen grey background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8, // Reduced from 20 to bring content closer
    backgroundColor: 'transparent',
  },
  headerLeft: {
    flex: 1,
    alignItems: 'flex-start',
    backgroundColor: 'transparent',
  },
  teamLogo: {
    width: 32,
    height: 32,
  },
  teamManagementButton: {
    backgroundColor: 'transparent',
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...TYPOGRAPHY.title,
    color: COLORS.TEXT_PRIMARY,
  },
  editButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: COLORS.BACKGROUND_SURFACE,
    borderRadius: 8,
  },
  editButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.TEXT_PRIMARY,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 75,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...TYPOGRAPHY.eventTime, // Smaller text like HomeScreen and ChannelsListScreen
    color: COLORS.TEXT_MUTED, // More muted color
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    ...TYPOGRAPHY.body,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtext: {
    ...TYPOGRAPHY.caption,
    color: COLORS.TEXT_MUTED,
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: COLORS.BACKGROUND_SURFACE,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    ...TYPOGRAPHY.body,
    color: COLORS.TEXT_PRIMARY,
  },
  profileSection: {
    alignItems: 'flex-start',
    paddingVertical: 24,
  },
  profileCard: {
    // ProfileCard component handles its own styling
  },
  bioSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    ...TYPOGRAPHY.sectionTitle,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 12,
  },
  bioText: {
    ...TYPOGRAPHY.body,
    color: COLORS.TEXT_MUTED,
    lineHeight: 22,
  },
  infoSection: {
    marginBottom: 24,
  },
  infoGrid: {
    backgroundColor: COLORS.BACKGROUND_CARD_SECONDARY, // Match HomeScreen nextUpCard background
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BACKGROUND_MUTED,
  },
  infoLabel: {
    ...TYPOGRAPHY.eventTime, // Match HomeScreen card secondary text
    flex: 1,
  },
  infoValue: {
    ...TYPOGRAPHY.bodyMedium, // Smaller than eventTitle (14px vs 16px)
    textAlign: 'right',
    flex: 1,
  },
  statsSection: {
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  statItem: {
    backgroundColor: COLORS.BACKGROUND_CARD, // Match HomeScreen insightCard background
    padding: 16,
    borderRadius: 14, // Match HomeScreen insightCard borderRadius
    alignItems: 'center',
    width: '48%',
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  statValue: {
    ...TYPOGRAPHY.bodyMedium, // Much smaller than insightValue (14px vs 19px)
    marginBottom: 4,
  },
  statLabel: {
    ...TYPOGRAPHY.insightLabel, // Match HomeScreen insight cards exactly
    letterSpacing: 0.5,
    numberOfLines: 1, // Prevent line breaks
    flexWrap: 'nowrap', // Prevent wrapping
  },
  completionSection: {
    backgroundColor: COLORS.BACKGROUND_CARD_SECONDARY, // Match HomeScreen nextUpCard background
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  completionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  completionLabel: {
    ...TYPOGRAPHY.bodyMedium, // Smaller than eventTitle (14px vs 16px)
  },
  completionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  complete: {
    backgroundColor: COLORS.SUCCESS,
  },
  incomplete: {
    backgroundColor: COLORS.WARNING,
  },
  completionText: {
    ...TYPOGRAPHY.eventTime, // Match HomeScreen card secondary text
  },
  completeText: {
    color: COLORS.SUCCESS,
  },
  incompleteText: {
    color: COLORS.WARNING,
  },
  completionNote: {
    ...TYPOGRAPHY.eventTime, // Match HomeScreen card secondary text
  },
  signOutButton: {
    backgroundColor: COLORS.ERROR,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 32,
  },
  signOutText: {
    ...TYPOGRAPHY.body,
    color: COLORS.WHITE,
    textAlign: 'center',
  },
});

export default ProfileScreen;

