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

const ProfileCard = ({ 
  profile, 
  onPress, 
  size = 'medium',
  showRole = true,
  showJersey = true,
  style 
}) => {
  if (!profile) return null;

  const { user_profiles, team_members } = profile;
  const displayName = user_profiles?.display_name || 'Unknown Player';
  const avatarUrl = user_profiles?.avatar_url;
  const role = team_members?.role || 'player';
  const jerseyNumber = profile.jersey_number;
  const position = profile.position;
  const staffTitle = profile.staff_title;

  // Debug logging (only if no avatar)
  if (!avatarUrl) {
    console.log('ProfileCard - no avatar URL for', displayName);
  }

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

  const getRoleColor = (role) => {
    switch (role) {
      case 'coach':
        return '#F59E0B'; // Amber
      case 'trainer':
        return '#10B981'; // Emerald
      case 'assistant':
        return '#8B5CF6'; // Purple
      case 'player':
        return '#3B82F6'; // Blue
      default:
        return '#6B7280'; // Gray
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'coach':
        return 'Coach';
      case 'trainer':
        return 'Trainer';
      case 'assistant':
        return 'Assistant';
      case 'player':
        return 'Player';
      default:
        return 'Member';
    }
  };

  const isPlayer = role === 'player';
  const primaryInfo = isPlayer ? position : staffTitle;
  const secondaryInfo = isPlayer ? (jerseyNumber ? `#${jerseyNumber}` : null) : role;

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
            onError={(error) => {
              console.log('Avatar load error for', displayName);
              console.log('Avatar URL:', avatarUrl);
              console.log('Error details:', error.nativeEvent?.error);
            }}
            onLoad={() => {
              console.log('Avatar loaded successfully for', displayName);
              console.log('Avatar URL:', avatarUrl);
            }}
          />
        ) : (
          <View style={[styles.avatarPlaceholder, { width: cardSize.avatarSize, height: cardSize.avatarSize }]}>
            <Text style={[styles.avatarText, { fontSize: cardSize.avatarSize * 0.4 }]}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      {/* Player Info - Right side of image */}
      <View style={styles.playerInfoContainer}>
        {/* Jersey Number */}
        {isPlayer && jerseyNumber && (
          <Text style={[styles.jerseyNumber, { fontSize: cardSize.fontSize * 1.5 }]}>
            #{jerseyNumber}
          </Text>
        )}
        
        {/* Name */}
        <Text
          style={[
            styles.playerName,
            { fontSize: cardSize.fontSize }
          ]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {displayName}
        </Text>

        {/* Position */}
        {isPlayer && position && (
          <Text
            style={[
              styles.position,
              { fontSize: cardSize.titleSize }
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {position}
          </Text>
        )}

        {/* Class Year */}
        {isPlayer && profile.class_year && (
          <Text
            style={[
              styles.classYear,
              { fontSize: cardSize.titleSize }
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {profile.class_year}
          </Text>
        )}

        {/* Height & Weight */}
        {isPlayer && (profile.height_cm || profile.weight_kg) && (
          <Text
            style={[
              styles.physicalInfo,
              { fontSize: cardSize.titleSize * 0.9 }
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {profile.height_cm ? `${Math.floor(profile.height_cm / 30.48)}'${Math.floor((profile.height_cm % 30.48) / 2.54)}"` : 'Height'} • 
            {profile.weight_kg ? `${Math.round(profile.weight_kg * 2.205)} lbs` : 'Weight'}
          </Text>
        )}

        {/* Major */}
        {isPlayer && profile.major && (
          <Text
            style={[
              styles.major,
              { fontSize: cardSize.titleSize * 0.9 }
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {profile.major}
          </Text>
        )}

        {/* Staff Info */}
        {!isPlayer && staffTitle && (
          <Text
            style={[
              styles.staffTitle,
              { fontSize: cardSize.titleSize }
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {staffTitle}
          </Text>
        )}

        {/* Role Badge */}
        {showRole && (
          <View style={[styles.roleBadge, { backgroundColor: getRoleColor(role) }]}>
            <Text style={styles.roleText}>
              {getRoleLabel(role)}
            </Text>
          </View>
        )}
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
  playerInfoContainer: {
    flex: 1,
    paddingVertical: 8,
  },
  jerseyNumber: {
    fontWeight: getFontWeight('BOLD'),
    color: COLORS.PRIMARY_BLACK,
    marginBottom: 4,
  },
  playerName: {
    fontWeight: getFontWeight('SEMIBOLD'),
    color: COLORS.PRIMARY_BLACK,
    marginBottom: 2,
  },
  position: {
    color: '#6B7280',
    marginBottom: 2,
  },
  classYear: {
    color: '#9CA3AF',
    marginBottom: 4,
  },
  physicalInfo: {
    color: '#6B7280',
    marginBottom: 2,
  },
  major: {
    color: '#6B7280',
    marginBottom: 4,
  },
  staffTitle: {
    color: '#F59E0B',
    fontWeight: getFontWeight('MEDIUM'),
    marginBottom: 4,
  },
  name: {
    fontWeight: getFontWeight('SEMIBOLD'),
    color: COLORS.PRIMARY_BLACK,
    textAlign: 'center',
    marginBottom: 4,
  },
  primaryInfo: {
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 2,
  },
  secondaryInfo: {
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 8,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 'auto',
  },
  roleText: {
    color: '#FFFFFF',
    fontSize: getFontSize('XS'),
    fontWeight: getFontWeight('MEDIUM'),
  },
});

export default ProfileCard;
