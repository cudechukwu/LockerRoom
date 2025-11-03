import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY, FONT_WEIGHTS } from '../constants/typography';
import { getSharedChannels } from '../api/chat';

const SharedChannelsSection = ({ teamId, otherUserId, onChannelPress }) => {
  const { data: channels, isLoading } = useQuery({
    queryKey: ['sharedChannels', teamId, otherUserId],
    queryFn: async () => {
      if (!teamId || !otherUserId) return [];
      const { data, error } = await getSharedChannels(teamId, otherUserId);
      if (error) {
        console.error('Error fetching shared channels:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!teamId && !!otherUserId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Groups in Common</Text>
        <View style={styles.card}>
          <View style={styles.loadingContainer}>
            <Text style={styles.emptyText}>Loading...</Text>
          </View>
        </View>
      </View>
    );
  }

  if (!channels || channels.length === 0) {
    return null; // Don't show section if no shared channels
  }

  const renderChannel = ({ item }) => (
    <TouchableOpacity
      style={styles.channelItem}
      onPress={() => onChannelPress && onChannelPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.channelIconContainer}>
        {item.image_url ? (
          <View style={styles.channelImageContainer}>
            {/* Would use Image component here if image_url exists */}
          </View>
        ) : (
          <View style={[styles.channelIcon, { backgroundColor: COLORS.BACKGROUND_MUTED }]}>
            <Ionicons name={getChannelIcon(item.type)} size={20} color={COLORS.TEXT_PRIMARY} />
          </View>
        )}
      </View>
      <View style={styles.channelInfo}>
        <Text style={styles.channelName}>{item.name}</Text>
        {item.description && (
          <Text style={styles.channelDescription} numberOfLines={1}>
            {item.description}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.TEXT_MUTED} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        {channels.length} {channels.length === 1 ? 'Group' : 'Groups'} in Common
      </Text>
      <View style={styles.card}>
        <FlatList
          data={channels.slice(0, 5)} // Show first 5
          renderItem={renderChannel}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
        />
        {channels.length > 5 && (
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={() => {
              // TODO: Navigate to full list
              console.log('View all channels');
            }}
          >
            <Text style={styles.viewAllText}>See all {channels.length} groups</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.TEXT_MUTED} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const getChannelIcon = (type) => {
  switch (type) {
    case 'team':
      return 'people';
    case 'position':
      return 'grid';
    case 'announcements':
      return 'megaphone';
    default:
      return 'chatbubbles';
  }
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: COLORS.BACKGROUND_CARD,
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 16,
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.TEXT_MUTED,
  },
  channelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.BACKGROUND_MUTED,
  },
  channelIconContainer: {
    marginRight: 12,
  },
  channelIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelInfo: {
    flex: 1,
  },
  channelName: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: FONT_WEIGHTS.MEDIUM,
    marginBottom: 2,
  },
  channelDescription: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.TEXT_MUTED,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
    gap: 4,
  },
  viewAllText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.TEXT_MUTED,
    fontWeight: FONT_WEIGHTS.MEDIUM,
  },
});

export default SharedChannelsSection;

