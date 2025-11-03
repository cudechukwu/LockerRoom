import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getConversationStats } from '../api/chat';
import { getFontSize, getFontWeight } from '../constants/fonts';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const ConversationStats = ({ channelId, conversationType = 'channel' }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [channelId]);

  const loadStats = async () => {
    const cacheKey = `conversation_stats_${channelId}`;
    
    try {
      setLoading(true);
      const cachedJson = await AsyncStorage.getItem(cacheKey);
      
      if (cachedJson) {
        const cached = JSON.parse(cachedJson);
        const age = Date.now() - cached.timestamp;
        
        setStats(cached.data);
        setLoading(false);
        
        if (age > CACHE_TTL) {
          refreshInBackground(cacheKey);
        }
      } else {
        await refreshInBackground(cacheKey);
      }
    } catch (error) {
      console.error('Error loading conversation stats:', error);
      const fallbackStats = {
        totalMessages: 0,
        pinnedMessages: 0,
        mediaFiles: 0,
        lastActivity: null
      };
      setStats(fallbackStats);
      setLoading(false);
    }
  };

  const refreshInBackground = async (cacheKey) => {
    try {
      const { data, error } = await getConversationStats(channelId);
      if (error) throw error;
      
      const statsData = data || {
        totalMessages: 0,
        pinnedMessages: 0,
        mediaFiles: 0,
        lastActivity: null
      };
      
      setStats(statsData);
      setLoading(false);
      
      const cacheData = {
        data: statsData,
        timestamp: Date.now(),
        expiresAt: Date.now() + CACHE_TTL
      };
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Background refresh failed:', error);
      const fallbackStats = {
        totalMessages: 0,
        pinnedMessages: 0,
        mediaFiles: 0,
        lastActivity: null
      };
      setStats(fallbackStats);
      setLoading(false);
    }
  };

  const formatLastActivity = (timestamp) => {
    if (!timestamp) return 'No activity';
    
    const now = new Date();
    const lastActivity = new Date(timestamp);
    const diffMs = now - lastActivity;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return lastActivity.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Statistics</Text>
        <View style={styles.card}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#FFFFFF" />
          </View>
        </View>
      </View>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Statistics</Text>
      
      <View style={styles.card}>
        <View style={styles.statsGrid}>
          {/* Total Messages */}
          <View style={styles.statItem}>
            <View style={styles.statIconContainer}>
              <Ionicons name="chatbubbles-outline" size={20} color="#007AFF" />
            </View>
            <Text style={styles.statValue}>{stats.totalMessages || 0}</Text>
            <Text style={styles.statLabel}>Messages</Text>
          </View>

          {/* Pinned Messages */}
          <View style={styles.statItem}>
            <View style={[styles.statIconContainer, { backgroundColor: '#FF950020' }]}>
              <Ionicons name="pin" size={20} color="#FF9500" />
            </View>
            <Text style={styles.statValue}>{stats.pinnedMessages || 0}</Text>
            <Text style={styles.statLabel}>Pinned</Text>
          </View>

          {/* Media Files */}
          <View style={styles.statItem}>
            <View style={[styles.statIconContainer, { backgroundColor: '#34C75920' }]}>
              <Ionicons name="images-outline" size={20} color="#34C759" />
            </View>
            <Text style={styles.statValue}>{stats.mediaFiles || 0}</Text>
            <Text style={styles.statLabel}>Media</Text>
          </View>
        </View>

        {/* Last Activity */}
        {stats.lastActivity && (
          <View style={styles.activityRow}>
            <Ionicons name="time-outline" size={16} color="#8E8E93" />
            <Text style={styles.activityText}>
              Last active {formatLastActivity(stats.lastActivity)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: getFontSize('BASE'),
    fontWeight: getFontWeight('SEMIBOLD'),
    color: '#FFFFFF',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#1A1A1A',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 16,
  },
  loadingContainer: {
    paddingVertical: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#007AFF20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: getFontSize('LG'),
    fontWeight: getFontWeight('BOLD'),
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: getFontSize('XS'),
    color: '#8E8E93',
    fontWeight: getFontWeight('REGULAR'),
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  activityText: {
    fontSize: getFontSize('SM'),
    color: '#8E8E93',
    fontWeight: getFontWeight('REGULAR'),
  },
});

export default ConversationStats;

