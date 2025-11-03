import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { COLORS } from '../constants/colors';

const { width } = Dimensions.get('window');

/**
 * Profile Skeleton Loader Component
 * 
 * Provides instant visual feedback during cold start
 * Matches the layout structure of ProfileScreen
 */
const ProfileSkeletonLoader = () => {
  return (
    <View style={styles.container}>
      {/* Header skeleton */}
      <View style={styles.header}>
        <View style={styles.logoSkeleton} />
        <View style={styles.settingsSkeleton} />
      </View>
      
      {/* Profile card skeleton */}
      <View style={styles.profileCard}>
        <View style={styles.avatarSkeleton} />
        <View style={styles.nameSkeleton} />
        <View style={styles.roleSkeleton} />
        <View style={styles.bioSkeleton} />
      </View>
      
      {/* Stats section skeleton */}
      <View style={styles.statsSection}>
        <View style={styles.statItemSkeleton} />
        <View style={styles.statItemSkeleton} />
        <View style={styles.statItemSkeleton} />
      </View>
      
      {/* About section skeleton */}
      <View style={styles.aboutSection}>
        <View style={styles.sectionTitleSkeleton} />
        <View style={styles.infoItemSkeleton} />
        <View style={styles.infoItemSkeleton} />
        <View style={styles.infoItemSkeleton} />
      </View>
      
      {/* Settings section skeleton */}
      <View style={styles.settingsSection}>
        <View style={styles.sectionTitleSkeleton} />
        <View style={styles.settingItemSkeleton} />
        <View style={styles.settingItemSkeleton} />
        <View style={styles.settingItemSkeleton} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 8,
    marginBottom: 20,
  },
  logoSkeleton: {
    width: 32,
    height: 32,
    backgroundColor: COLORS.BACKGROUND_MUTED,
    borderRadius: 8,
  },
  settingsSkeleton: {
    width: 36,
    height: 36,
    backgroundColor: COLORS.BACKGROUND_MUTED,
    borderRadius: 8,
  },
  profileCard: {
    backgroundColor: COLORS.BACKGROUND_CARD,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarSkeleton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.BACKGROUND_MUTED,
    marginBottom: 16,
  },
  nameSkeleton: {
    width: 140,
    height: 24,
    backgroundColor: COLORS.BACKGROUND_MUTED,
    borderRadius: 6,
    marginBottom: 8,
  },
  roleSkeleton: {
    width: 100,
    height: 18,
    backgroundColor: COLORS.BACKGROUND_MUTED,
    borderRadius: 4,
    marginBottom: 16,
  },
  bioSkeleton: {
    width: width - 80,
    height: 16,
    backgroundColor: COLORS.BACKGROUND_MUTED,
    borderRadius: 4,
    marginBottom: 8,
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  statItemSkeleton: {
    flex: 1,
    height: 80,
    backgroundColor: COLORS.BACKGROUND_CARD,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aboutSection: {
    backgroundColor: COLORS.BACKGROUND_CARD_SECONDARY,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  sectionTitleSkeleton: {
    width: 120,
    height: 20,
    backgroundColor: COLORS.BACKGROUND_MUTED,
    borderRadius: 4,
    marginBottom: 16,
  },
  infoItemSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BACKGROUND_MUTED,
  },
  settingsSection: {
    backgroundColor: COLORS.BACKGROUND_CARD_SECONDARY,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  settingItemSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BACKGROUND_MUTED,
  },
});

export default ProfileSkeletonLoader;
