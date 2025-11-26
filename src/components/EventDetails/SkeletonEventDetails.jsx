/**
 * SkeletonEventDetails Component
 * Loading skeleton for EventDetailsModal
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';

export default function SkeletonEventDetails() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerButton} />
        <View style={styles.headerButton} />
      </View>
      
      <View style={styles.content}>
        {/* Avatar and title skeleton */}
        <View style={styles.avatarTitleRow}>
          <View style={styles.avatarSkeleton} />
          <View style={styles.titleContainer}>
            <View style={styles.titleSkeleton} />
          </View>
        </View>
        
        {/* Meta information skeletons */}
        <View style={styles.metaContainer}>
          <View style={styles.metaRow}>
            <View style={styles.metaIcon} />
            <View style={styles.metaSkeleton} />
          </View>
          <View style={styles.metaRow}>
            <View style={styles.metaIcon} />
            <View style={styles.metaSkeleton} />
          </View>
          <View style={styles.metaRow}>
            <View style={styles.metaIcon} />
            <View style={styles.metaSkeleton} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND_CARD,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)', // Visible skeleton color
  },
  content: {
    padding: 20,
  },
  avatarTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarSkeleton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.08)', // Visible skeleton color
    marginRight: 16,
  },
  titleContainer: {
    flex: 1,
  },
  titleSkeleton: {
    height: 28,
    width: '60%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)', // Visible skeleton color
    borderRadius: 8,
  },
  metaContainer: {
    gap: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)', // Visible skeleton color
  },
  metaSkeleton: {
    height: 18,
    width: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)', // Visible skeleton color
    borderRadius: 4,
  },
});


