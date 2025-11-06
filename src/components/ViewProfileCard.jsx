import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence } from 'react-native-reanimated';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY, scaleFont, FONT_WEIGHTS } from '../constants/typography';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

const ViewProfileCard = ({ 
  profile, 
  userRole,
  onPhotoPress,
  teamColor,
  teamName,
  school,
  onAudioPress,
  onVideoPress,
  onMessagePress,
  isAudioLoading = false,
  isVideoLoading = false,
  isMessageLoading = false,
  isDisabled = false,
}) => {
  const isPlayer = userRole === 'player';
  const isStaff = ['coach', 'trainer', 'assistant'].includes(userRole);
  const accentColor = teamColor || COLORS.WARNING;
  
  // Pulse animation for video button press
  const [showVideoPulse, setShowVideoPulse] = useState(false);
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0);
  
  useEffect(() => {
    if (showVideoPulse) {
      pulseScale.value = withSequence(
        withTiming(1.2, { duration: 300 }),
        withTiming(1, { duration: 300 })
      );
      pulseOpacity.value = withSequence(
        withTiming(0.5, { duration: 300 }),
        withTiming(0, { duration: 300 })
      );
      
      // Reset after animation
      setTimeout(() => setShowVideoPulse(false), 600);
    }
  }, [showVideoPulse]);
  
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));
  
  const handleVideoPress = () => {
    if (!isDisabled && onVideoPress) {
      setShowVideoPulse(true);
      onVideoPress();
    }
  };

  const renderPlayerProfile = () => (
    <View style={styles.heroSection}>
      {/* Large Profile Photo - Centered */}
      <View style={styles.photoContainer}>
        <TouchableOpacity 
          onPress={() => {
            if (profile.user_profiles?.avatar_url && onPhotoPress) {
              onPhotoPress(profile.user_profiles.avatar_url);
            }
          }}
          activeOpacity={profile.user_profiles?.avatar_url ? 0.8 : 1}
        >
          {profile.user_profiles?.avatar_url ? (
            <Image
              key={`${profile.user_profiles?.avatar_url}-${Date.now()}`}
              source={{ 
                uri: `${profile.user_profiles.avatar_url}?t=${Date.now()}`
              }}
              style={[styles.largeProfileImage, { borderColor: accentColor }]}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.largeProfileImage, styles.avatarPlaceholder, { borderColor: accentColor }]}>
              <Ionicons name="person" size={80} color={COLORS.TEXT_MUTED} />
            </View>
          )}
        </TouchableOpacity>
        
        {/* Pulse animation ring for video calls */}
        {showVideoPulse && (
          <Animated.View 
            style={[
              styles.pulseRing,
              { borderColor: accentColor },
              pulseStyle
            ]}
          />
        )}
      </View>

      {/* Name and Info - Centered */}
      <View style={styles.infoContainer}>
        <Text style={styles.nameText}>
          {profile.user_profiles?.display_name || 'Unknown Player'}
        </Text>
        <View style={styles.titleRow}>
          {profile.jersey_number && (
            <Text style={[styles.titleText, { color: accentColor }]}>
              #{profile.jersey_number}
            </Text>
          )}
          {profile.jersey_number && profile.position && (
            <Text style={styles.titleSeparator}> • </Text>
          )}
          {profile.position && (
            <Text style={[styles.titleText, { color: accentColor }]}>
              {profile.position}
            </Text>
          )}
        </View>
        {(teamName || school || profile.class_year) && (
          <Text style={styles.subtitleText}>
            {[teamName || school, profile.class_year].filter(Boolean).join(' • ')}
          </Text>
        )}
      </View>
      
      {/* Quick Action Buttons - Styled as stat cards */}
      <View style={styles.statsContainer}>
        <TouchableOpacity 
          style={[styles.statCard, isDisabled && styles.statCardDisabled]}
          onPress={onAudioPress}
          activeOpacity={0.7}
          disabled={isDisabled || isAudioLoading}
        >
          {isAudioLoading ? (
            <ActivityIndicator size="small" color={COLORS.TEXT_PRIMARY} />
          ) : (
            <Ionicons name="call-outline" size={24} color={isDisabled ? COLORS.TEXT_MUTED : COLORS.TEXT_PRIMARY} />
          )}
          <Text style={[styles.statLabel, isDisabled && styles.statLabelDisabled]}>Audio</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.statCard, isDisabled && styles.statCardDisabled]}
          onPress={handleVideoPress}
          activeOpacity={0.7}
          disabled={isDisabled || isVideoLoading}
        >
          {isVideoLoading ? (
            <ActivityIndicator size="small" color={COLORS.TEXT_PRIMARY} />
          ) : (
            <Ionicons name="videocam-outline" size={24} color={isDisabled ? COLORS.TEXT_MUTED : COLORS.TEXT_PRIMARY} />
          )}
          <Text style={[styles.statLabel, isDisabled && styles.statLabelDisabled]}>Video</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.statCard, isDisabled && styles.statCardDisabled]}
          onPress={onMessagePress}
          activeOpacity={0.7}
          disabled={isDisabled || isMessageLoading}
        >
          {isMessageLoading ? (
            <ActivityIndicator size="small" color={COLORS.TEXT_PRIMARY} />
          ) : (
            <Ionicons name="chatbubble-outline" size={24} color={isDisabled ? COLORS.TEXT_MUTED : COLORS.TEXT_PRIMARY} />
          )}
          <Text style={[styles.statLabel, isDisabled && styles.statLabelDisabled]}>Message</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
212
  const renderStaffProfile = () => (
    <View style={styles.heroSection}>
      {/* Large Profile Photo - Centered */}
      <View style={styles.photoContainer}>
        <TouchableOpacity 
          onPress={() => {
            if (profile.user_profiles?.avatar_url && onPhotoPress) {
              onPhotoPress(profile.user_profiles.avatar_url);
            }
          }}
          activeOpacity={profile.user_profiles?.avatar_url ? 0.8 : 1}
        >
          {profile.user_profiles?.avatar_url ? (
            <Image
              key={`${profile.user_profiles?.avatar_url}-${Date.now()}`}
              source={{ 
                uri: `${profile.user_profiles.avatar_url}?t=${Date.now()}`
              }}
              style={[styles.largeProfileImage, { borderColor: accentColor }]}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.largeProfileImage, styles.avatarPlaceholder, { borderColor: accentColor }]}>
              <Ionicons name="person" size={80} color={COLORS.TEXT_MUTED} />
            </View>
          )}
        </TouchableOpacity>
        
        {/* Pulse animation ring for video calls */}
        {showVideoPulse && (
          <Animated.View 
            style={[
              styles.pulseRing,
              { borderColor: accentColor },
              pulseStyle
            ]}
          />
        )}
      </View>

      {/* Name and Info - Centered */}
      <View style={styles.infoContainer}>
        <Text style={styles.nameText}>
          {profile.user_profiles?.display_name || 'Unknown Staff'}
        </Text>
        <View style={styles.titleRow}>
          {profile.staff_title && (
            <Text style={[styles.titleText, { color: accentColor }]}>
              {profile.staff_title}
            </Text>
          )}
        </View>
        {(teamName || school || profile.department) && (
          <Text style={styles.subtitleText}>
            {[teamName || school, profile.department].filter(Boolean).join(' • ')}
          </Text>
        )}
        {profile.years_experience && profile.years_experience > 0 && (
          <Text style={styles.subtitleText}>
            {profile.years_experience} {profile.years_experience === 1 ? 'year' : 'years'} active
          </Text>
        )}
      </View>
      
      {/* Quick Action Buttons - Styled as stat cards */}
      <View style={styles.statsContainer}>
        <TouchableOpacity 
          style={[styles.statCard, isDisabled && styles.statCardDisabled]}
          onPress={onAudioPress}
          activeOpacity={0.7}
          disabled={isDisabled || isAudioLoading}
        >
          {isAudioLoading ? (
            <ActivityIndicator size="small" color={COLORS.TEXT_PRIMARY} />
          ) : (
            <Ionicons name="call-outline" size={24} color={isDisabled ? COLORS.TEXT_MUTED : COLORS.TEXT_PRIMARY} />
          )}
          <Text style={[styles.statLabel, isDisabled && styles.statLabelDisabled]}>Audio</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.statCard, isDisabled && styles.statCardDisabled]}
          onPress={handleVideoPress}
          activeOpacity={0.7}
          disabled={isDisabled || isVideoLoading}
        >
          {isVideoLoading ? (
            <ActivityIndicator size="small" color={COLORS.TEXT_PRIMARY} />
          ) : (
            <Ionicons name="videocam-outline" size={24} color={isDisabled ? COLORS.TEXT_MUTED : COLORS.TEXT_PRIMARY} />
          )}
          <Text style={[styles.statLabel, isDisabled && styles.statLabelDisabled]}>Video</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.statCard, isDisabled && styles.statCardDisabled]}
          onPress={onMessagePress}
          activeOpacity={0.7}
          disabled={isDisabled || isMessageLoading}
        >
          {isMessageLoading ? (
            <ActivityIndicator size="small" color={COLORS.TEXT_PRIMARY} />
          ) : (
            <Ionicons name="chatbubble-outline" size={24} color={isDisabled ? COLORS.TEXT_MUTED : COLORS.TEXT_PRIMARY} />
          )}
          <Text style={[styles.statLabel, isDisabled && styles.statLabelDisabled]}>Message</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.profileContainer}>
      {isPlayer ? renderPlayerProfile() : renderStaffProfile()}
    </View>
  );
};

const styles = StyleSheet.create({
  profileContainer: {
    position: 'relative',
  },
  
  // Modern iOS Hero Section
  heroSection: {
    backgroundColor: 'transparent',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  
  // Profile Photo - Matching ProfileScreen size
  photoContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  largeProfileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.BACKGROUND_CARD,
    borderWidth: 3,
    // borderColor will be set dynamically
  },
  
  // Info Container
  infoContainer: {
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  nameText: {
    ...TYPOGRAPHY.eventTitle,
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  titleText: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '600',
    textAlign: 'center',
  },
  titleSeparator: {
    ...TYPOGRAPHY.eventTime,
    marginHorizontal: 2,
  },
  subtitleText: {
    ...TYPOGRAPHY.eventTime,
    color: COLORS.TEXT_MUTED,
    textAlign: 'center',
    marginTop: 2,
  },
  
  // Stats Container - Matching ProfileScreen style
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    width: '100%',
    flexWrap: 'wrap',
  },
  statCard: {
    backgroundColor: COLORS.BACKGROUND_CARD,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minWidth: 80,
    maxWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 2,
    textAlign: 'center',
    lineHeight: 18,
  },
  statLabel: {
    ...TYPOGRAPHY.insightLabel,
    textAlign: 'center',
    marginTop: 2,
  },
  
  // Avatar Placeholder
  avatarPlaceholder: {
    backgroundColor: COLORS.BACKGROUND_CARD,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.BACKGROUND_MUTED,
  },
  // Disabled states
  statCardDisabled: {
    opacity: 0.5,
  },
  statLabelDisabled: {
    color: COLORS.TEXT_MUTED,
  },
  // Pulse animation ring (matches avatar size + border)
  pulseRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    top: -10,
    left: -10,
  },
});

export default ViewProfileCard;

