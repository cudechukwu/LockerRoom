import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY } from '../constants/typography';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

// Simple skeleton box component
const SkeletonBox = ({ width, height, borderRadius = 4, style }) => (
  <View
    style={[
      {
        width,
        height,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius,
      },
      style,
    ]}
  />
);

const ChannelsSkeletonLoader = () => {
  return (
    <View style={styles.container}>
      {/* Header skeleton */}
      <View style={styles.header}>
        <SkeletonBox width="70%" height={20} borderRadius={10} />
        <SkeletonBox width="40%" height={16} borderRadius={8} style={{ marginTop: 8 }} />
      </View>
      
      {/* Filter tabs skeleton */}
      <View style={styles.filterTabs}>
        {[1, 2, 3, 4].map(i => (
          <SkeletonBox 
            key={i} 
            width={60} 
            height={32} 
            borderRadius={16} 
            style={{ marginRight: 8 }}
          />
        ))}
      </View>
      
      {/* List items skeleton */}
      <View style={styles.list}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <View key={i} style={styles.skeletonItem}>
            {/* Avatar skeleton */}
            <SkeletonBox width={48} height={48} borderRadius={24} />
            
            {/* Content skeleton */}
            <View style={styles.skeletonContent}>
              <SkeletonBox width="60%" height={18} borderRadius={9} />
              <SkeletonBox width="40%" height={14} borderRadius={7} style={{ marginTop: 6 }} />
            </View>
            
            {/* Unread dot skeleton */}
            <SkeletonBox width={8} height={8} borderRadius={4} />
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.PRIMARY_BLACK,
  },
  header: {
    paddingHorizontal: isTablet ? 24 : 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: isTablet ? 24 : 20,
    paddingBottom: 12,
  },
  list: {
    flex: 1,
    paddingHorizontal: isTablet ? 24 : 20,
  },
  skeletonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 0,
  },
  skeletonContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
});

export default ChannelsSkeletonLoader;
