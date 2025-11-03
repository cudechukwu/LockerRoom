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

const StaffProfileCard = ({ 
  profile, 
  onPress, 
  size = 'large',
  style 
}) => {
  if (!profile) return null;

  const { user_profiles } = profile;
  const displayName = user_profiles?.display_name || 'Unknown Staff';
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

      {/* Staff Info - This is where you'll design the layout */}
      <View style={styles.infoContainer}>
        <Text style={styles.staffName}>{displayName}</Text>
        <Text style={styles.staffTitle}>{profile.staff_title || 'Title'}</Text>
        <Text style={styles.department}>{profile.department || 'Department'}</Text>
        <Text style={styles.experience}>
          {profile.years_experience ? `${profile.years_experience} years experience` : 'Experience'}
        </Text>
        {profile.certifications && profile.certifications.length > 0 && (
          <Text style={styles.certifications}>
            {profile.certifications.join(', ')}
          </Text>
        )}
        {profile.specialties && profile.specialties.length > 0 && (
          <Text style={styles.specialties}>
            Specialties: {profile.specialties.join(', ')}
          </Text>
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
  infoContainer: {
    flex: 1,
    paddingVertical: 8,
  },
  staffName: {
    fontSize: getFontSize('LG'),
    fontWeight: getFontWeight('SEMIBOLD'),
    color: COLORS.PRIMARY_BLACK,
    marginBottom: 4,
  },
  staffTitle: {
    fontSize: getFontSize('BASE'),
    fontWeight: getFontWeight('MEDIUM'),
    color: '#F59E0B',
    marginBottom: 2,
  },
  department: {
    fontSize: getFontSize('BASE'),
    color: '#6B7280',
    marginBottom: 8,
  },
  experience: {
    fontSize: getFontSize('SM'),
    color: '#6B7280',
    marginBottom: 4,
  },
  certifications: {
    fontSize: getFontSize('SM'),
    color: '#10B981',
    marginBottom: 2,
  },
  specialties: {
    fontSize: getFontSize('SM'),
    color: '#6B7280',
  },
});

export default StaffProfileCard;
