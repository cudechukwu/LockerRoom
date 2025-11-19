import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY, scaleFont, FONT_WEIGHTS } from '../constants/typography';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

const EnhancedProfileCard = ({ 
  profile, 
  userRole, 
  isEditing = false, 
  onEditToggle,
  onFieldEdit,
  onImageEdit
}) => {
  const isPlayer = userRole === 'player';
  const isStaff = ['coach', 'trainer', 'assistant'].includes(userRole);

  const renderPlayerProfile = () => (
    <View style={styles.heroSection}>
      {/* Background Pattern */}
      <View style={styles.backgroundPattern}>
        <Text style={styles.backgroundNumber}>
          {profile.jersey_number || '??'}
        </Text>
      </View>
      
      {/* Player Image */}
      <View style={styles.playerImageContainer}>
        {profile.user_profiles?.avatar_url ? (
          <Image
            key={`${profile.user_profiles?.avatar_url}-${Date.now()}`}
            source={{ 
              uri: `${profile.user_profiles.avatar_url}?t=${Date.now()}`
            }}
            style={styles.playerImage}
            resizeMode="cover"
            onLoad={() => console.log('Player image loaded:', profile.user_profiles?.avatar_url)}
            onError={(error) => {
              console.log('Player image error:', error.nativeEvent?.error);
              // Set image to null to show fallback
            }}
          />
        ) : (
          <View style={[styles.playerImage, styles.avatarPlaceholder]}>
            <Ionicons name="person" size={60} color={COLORS.TEXT_MUTED} />
          </View>
        )}
        <TouchableOpacity 
          style={styles.imageEditButton}
          onPress={() => onImageEdit && onImageEdit()}
        >
          <Ionicons name="pencil" size={10} color={COLORS.WHITE} />
        </TouchableOpacity>
      </View>

      {/* Player Info */}
      <View style={styles.playerInfoSection}>
        <Text style={styles.playerName}>
          {profile.user_profiles?.display_name || 'Unknown Player'}
        </Text>
        <Text style={styles.playerTitle}>
          #{profile.jersey_number || '??'} • {profile.position || 'Position'}
        </Text>
        <Text style={styles.playerDepartment}>
          {profile.class_year || 'Year'} • {profile.major || 'Major'}
        </Text>
        
        <View style={styles.playerStats}>
          <View style={styles.playerStatCard}>
            <Text 
              style={styles.playerStatValue}
              numberOfLines={1}
              ellipsizeMode="tail"
              adjustsFontSizeToFit={true}
              minimumFontScale={0.85}
            >
              {profile.height_cm ? 
                `${Math.floor(profile.height_cm / 30.48)}'${Math.floor((profile.height_cm % 30.48) / 2.54)}"` : 
                '--'
              }
            </Text>
            <Text style={styles.playerStatLabel}>Height</Text>
          </View>
          <View style={styles.playerStatCard}>
            <Text 
              style={styles.playerStatValue}
              numberOfLines={1}
              ellipsizeMode="tail"
              adjustsFontSizeToFit={true}
              minimumFontScale={0.85}
            >
              {profile.weight_kg ? Math.round(profile.weight_kg * 2.205) : '--'}
            </Text>
            <Text style={styles.playerStatLabel}>Weight</Text>
          </View>
          <View style={styles.playerStatCard}>
            <Text 
              style={styles.playerStatValue}
              numberOfLines={1}
              ellipsizeMode="tail"
              adjustsFontSizeToFit={true}
              minimumFontScale={0.85}
            >
              {profile.hometown || '--'}
            </Text>
            <Text style={styles.playerStatLabel}>Hometown</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderStaffProfile = () => (
    <View style={styles.staffHeroSection}>
      {/* Background Pattern */}
      <View style={styles.backgroundPattern}>
        <Text style={styles.backgroundNumber}>
          {profile.staff_title ? profile.staff_title.split(' ').map(word => word[0]).join('') : 'SC'}
        </Text>
      </View>
      
      {/* Staff Image */}
      <View style={styles.staffImageContainer}>
        <Image
          key={`${profile.user_profiles?.avatar_url}-${Date.now()}`}
          source={{ 
            uri: profile.user_profiles?.avatar_url || 'https://via.placeholder.com/100'
          }}
          style={styles.staffImage}
          resizeMode="cover"
          onLoad={() => console.log('Staff image loaded:', profile.user_profiles?.avatar_url)}
          onError={(error) => console.log('Staff image error:', error)}
        />
        <TouchableOpacity 
          style={styles.imageEditButton}
          onPress={() => onImageEdit && onImageEdit()}
        >
          <Ionicons name="pencil" size={10} color={COLORS.WHITE} />
        </TouchableOpacity>
      </View>

      {/* Staff Info */}
      <View style={styles.staffInfoSection}>
        <Text style={styles.staffName}>
          {profile.user_profiles?.display_name || 'Unknown Staff'}
        </Text>
        <Text style={styles.staffTitle}>
          {profile.staff_title || 'Staff Title'}
        </Text>
        <Text style={styles.staffDepartment}>
          {profile.department || 'Department'}
        </Text>
        
        <View style={styles.staffStats}>
          <View style={styles.staffStatCard}>
            <Text 
              style={styles.staffStatValue}
              numberOfLines={1}
              ellipsizeMode="tail"
              adjustsFontSizeToFit={true}
              minimumFontScale={0.85}
            >
              {profile.years_experience || '--'}
            </Text>
            <Text style={styles.staffStatLabel}>Years Exp</Text>
          </View>
          <View style={styles.staffStatCard}>
            <Text 
              style={styles.staffStatValue}
              numberOfLines={1}
              ellipsizeMode="tail"
              adjustsFontSizeToFit={true}
              minimumFontScale={0.85}
            >
              {profile.certifications?.length || 0}
            </Text>
            <Text style={styles.staffStatLabel}>Certs</Text>
          </View>
          <View style={styles.staffStatCard}>
            <Text 
              style={styles.staffStatValue}
              numberOfLines={1}
              ellipsizeMode="tail"
              adjustsFontSizeToFit={true}
              minimumFontScale={0.85}
            >
              {profile.specialties?.length || 0}
            </Text>
            <Text style={styles.staffStatLabel}>Specs</Text>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.profileContainer}>
      {isPlayer ? renderPlayerProfile() : renderStaffProfile()}
      
      {/* Edit Button */}
      <TouchableOpacity 
        style={styles.editButton}
        onPress={onEditToggle}
      >
        <Ionicons 
          name={isEditing ? "checkmark" : "create-outline"} 
          size={20} 
          color={isEditing ? COLORS.SUCCESS : COLORS.TEXT_MUTED} 
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  profileContainer: {
    position: 'relative',
    width: '100%',
  },
  
  // Player Profile Styles
  heroSection: {
    backgroundColor: COLORS.BACKGROUND_CARD,
    padding: 24,
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  backgroundPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.05,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backgroundNumber: {
    fontSize: scaleFont(200), // Use typography scaling
    fontWeight: FONT_WEIGHTS.BOLD, // Use typography system
    color: COLORS.PRIMARY_BLACK,
    opacity: 0.1,
  },
  playerImageContainer: {
    marginRight: 20,
    position: 'relative',
  },
  playerImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: COLORS.WARNING,
  },
  playerInfoSection: {
    flex: 1,
  },
  playerName: {
    ...TYPOGRAPHY.bodyMedium, // Smaller than eventTitle (14px vs 16px)
    marginBottom: 8,
  },
  playerTitle: {
    ...TYPOGRAPHY.eventTime, // Match HomeScreen card secondary text
    color: COLORS.WARNING, // Keep orange accent
    marginBottom: 4,
  },
  playerDepartment: {
    ...TYPOGRAPHY.eventTime, // Match HomeScreen card secondary text
    marginBottom: 20,
  },
  playerStats: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  playerStatCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  playerStatValue: {
    ...TYPOGRAPHY.bodyMedium, // Much smaller than insightValue (14px vs 19px)
    fontWeight: '600',
    marginBottom: 2,
    textAlign: 'center',
    color: COLORS.TEXT_PRIMARY,
    lineHeight: 18, // Fixed line height
  },
  playerStatLabel: {
    ...TYPOGRAPHY.insightLabel, // Match HomeScreen insight cards
    textAlign: 'center',
    color: COLORS.TEXT_MUTED,
    marginTop: 2,
  },
  
  // Staff Profile Styles
  staffHeroSection: {
    backgroundColor: COLORS.BACKGROUND_CARD,
    padding: 24,
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  staffImageContainer: {
    marginRight: 20,
    position: 'relative',
  },
  staffImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: COLORS.WARNING,
  },
  staffInfoSection: {
    flex: 1,
  },
  staffName: {
    ...TYPOGRAPHY.bodyMedium, // Smaller than eventTitle (14px vs 16px)
    marginBottom: 8,
  },
  staffTitle: {
    ...TYPOGRAPHY.eventTime, // Match HomeScreen card secondary text
    color: COLORS.WARNING, // Keep orange accent
    marginBottom: 4,
  },
  staffDepartment: {
    ...TYPOGRAPHY.eventTime, // Match HomeScreen card secondary text
    marginBottom: 20,
  },
  staffStats: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  staffStatCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minWidth: 90, // Increased minimum width
    height: 75, // Fixed height for uniform appearance
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  staffStatValue: {
    ...TYPOGRAPHY.bodyMedium, // Much smaller than insightValue (14px vs 19px)
    fontWeight: '600',
    marginBottom: 2,
    textAlign: 'center',
    color: COLORS.TEXT_PRIMARY,
    lineHeight: 18, // Fixed line height
  },
  staffStatLabel: {
    ...TYPOGRAPHY.insightLabel, // Match HomeScreen insight cards
    textAlign: 'center',
    color: COLORS.TEXT_MUTED,
    marginTop: 2,
  },
  
  // Edit Button
  editButton: {
    position: 'absolute',
    top: 30,
    right: 30,
    backgroundColor: COLORS.BACKGROUND_CARD, // Match HomeScreen insightCard background
    padding: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  // Image Edit Button
  imageEditButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 4,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.WHITE,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  // Avatar Placeholder
  avatarPlaceholder: {
    backgroundColor: COLORS.BACKGROUND_CARD,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.BACKGROUND_MUTED,
  },
});

export default EnhancedProfileCard;
