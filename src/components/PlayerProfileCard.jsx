import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { getFontWeight, getFontSize } from '../constants/fonts';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

const PlayerProfileCard = ({ 
  profile, 
  onPress, 
  size = 'large',
  style 
}) => {
  if (!profile) return null;

  const { user_profiles } = profile;
  const displayName = user_profiles?.display_name || 'Unknown Player';
  const avatarUrl = user_profiles?.avatar_url;
  const bio = user_profiles?.bio;

  const getCardSize = () => {
    switch (size) {
      case 'small':
        return {
          cardWidth: isTablet ? 120 : 100,
          cardHeight: isTablet ? 120 : 100,
          avatarSize: isTablet ? 118 : 98,
        };
      case 'large':
        return {
          cardWidth: isTablet ? 200 : 160,
          cardHeight: isTablet ? 200 : 160,
          avatarSize: isTablet ? 198 : 158,
        };
      default: // medium
        return {
          cardWidth: isTablet ? 160 : 130,
          cardHeight: isTablet ? 160 : 130,
          avatarSize: isTablet ? 158 : 128,
        };
    }
  };

  const cardSize = getCardSize();

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          width: cardSize.cardWidth,
          height: cardSize.cardHeight,
        },
        style
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      <View style={[styles.avatarContainer, { width: cardSize.avatarSize, height: cardSize.avatarSize }]}>
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={[styles.avatar, { width: cardSize.avatarSize, height: cardSize.avatarSize }]}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.avatarPlaceholder, { width: cardSize.avatarSize, height: cardSize.avatarSize }]}>
            <Text style={[styles.avatarText, { fontSize: cardSize.avatarSize * 0.4 }]}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      {/* Player Info - This is where you'll design the layout */}
      <View style={styles.infoContainer}>
        <Text style={styles.jerseyNumber}>#{profile.jersey_number || '--'}</Text>
        <Text style={styles.playerName}>{displayName}</Text>
        <Text style={styles.position}>{profile.position || 'Position'}</Text>
        <Text style={styles.classYear}>{profile.class_year || 'Class'}</Text>
        <Text style={styles.physicalInfo}>
          {profile.height_cm ? `${Math.floor(profile.height_cm / 30.48)}'${Math.floor((profile.height_cm % 30.48) / 2.54)}"` : 'Height'} • 
          {profile.weight_kg ? `${Math.round(profile.weight_kg * 2.205)} lbs` : 'Weight'}
        </Text>
        <Text style={styles.hometown}>{profile.hometown || 'Hometown'}</Text>
        <Text style={styles.major}>{profile.major || 'Major'}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 1,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  avatarContainer: {
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 12,
  },
  avatar: {
    borderRadius: 4,
  },
  avatarPlaceholder: {
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#6B7280',
    fontWeight: getFontWeight('BOLD'),
  },
  infoContainer: {
    flex: 1,
    paddingVertical: 8,
  },
  jerseyNumber: {
    fontSize: getFontSize('XL'),
    fontWeight: getFontWeight('BOLD'),
    color: COLORS.PRIMARY_BLACK,
    marginBottom: 4,
  },
  playerName: {
    fontSize: getFontSize('LG'),
    fontWeight: getFontWeight('SEMIBOLD'),
    color: COLORS.PRIMARY_BLACK,
    marginBottom: 2,
  },
  position: {
    fontSize: getFontSize('BASE'),
    color: '#6B7280',
    marginBottom: 2,
  },
  classYear: {
    fontSize: getFontSize('SM'),
    color: '#9CA3AF',
    marginBottom: 8,
  },
  physicalInfo: {
    fontSize: getFontSize('SM'),
    color: '#6B7280',
    marginBottom: 4,
  },
  hometown: {
    fontSize: getFontSize('SM'),
    color: '#6B7280',
    marginBottom: 2,
  },
  major: {
    fontSize: getFontSize('SM'),
    color: '#6B7280',
  },
});

export default PlayerProfileCard;
