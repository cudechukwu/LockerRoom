import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getPinnedMessages } from '../api/chat';
import { getFontSize, getFontWeight } from '../constants/fonts';
import { COLORS } from '../constants/colors';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const PinnedMessagesCard = ({ channelId, conversationType = 'channel' }) => {
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPinnedMessages();
  }, [channelId]);

  const loadPinnedMessages = async () => {
    const cacheKey = `conversation_pinned_${channelId}`;
    
    try {
      setLoading(true);
      const cachedJson = await AsyncStorage.getItem(cacheKey);
      
      if (cachedJson) {
        const cached = JSON.parse(cachedJson);
        const age = Date.now() - cached.timestamp;
        
        setPinnedMessages(cached.data);
        setLoading(false);
        
        if (age > CACHE_TTL) {
          refreshInBackground(cacheKey);
        }
      } else {
        await refreshInBackground(cacheKey);
      }
    } catch (error) {
      console.error('Error loading pinned messages:', error);
      setPinnedMessages([]);
      setLoading(false);
    }
  };

  const refreshInBackground = async (cacheKey) => {
    try {
      const { data, error } = await getPinnedMessages(channelId, { limit: 3 });
      if (error) throw error;
      
      const pinnedData = data || [];
      setPinnedMessages(pinnedData);
      setLoading(false);
      
      const cacheData = {
        data: pinnedData,
        timestamp: Date.now(),
        expiresAt: Date.now() + CACHE_TTL
      };
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Background refresh failed:', error);
      setPinnedMessages([]);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pinned Messages</Text>
        <View style={styles.card}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#FFFFFF" />
          </View>
        </View>
      </View>
    );
  }

  if (pinnedMessages.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pinned Messages</Text>
        <View style={styles.card}>
          <View style={styles.emptyContainer}>
            <Ionicons name="pin-outline" size={32} color="#8E8E93" />
            <Text style={styles.emptyText}>No pinned messages</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        Pinned Messages {pinnedMessages.length > 3 && `(${pinnedMessages.length})`}
      </Text>
      
      <View style={styles.card}>
        {pinnedMessages.map((message, index) => (
          <TouchableOpacity
            key={message.id}
            style={[
              styles.messageItem,
              index < pinnedMessages.length - 1 && styles.messageItemBorder
            ]}
            activeOpacity={0.7}
            onPress={() => {
              // TODO: Navigate to message in chat
              console.log('Navigate to message:', message.id);
            }}
          >
          <View style={styles.pinIconContainer}>
            <Ionicons name="pin" size={14} color={COLORS.PRIMARY} />
          </View>
            
            <View style={styles.messageContent}>
              <Text 
                style={styles.messageSender}
                numberOfLines={1}
              >
                {message.sender_profile?.display_name ?? 'Unknown'}
              </Text>
              <Text 
                style={styles.messageText}
                numberOfLines={2}
              >
                {message.content ?? ''}
              </Text>
              <Text style={styles.messageTime}>
                {new Date(message.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric'
                })}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
        
        {pinnedMessages.length >= 3 && (
          <TouchableOpacity
            style={styles.viewAllButton}
            activeOpacity={0.7}
            onPress={() => {
              // TODO: Navigate to all pinned messages
              console.log('View all pinned messages');
            }}
          >
            <Text style={styles.viewAllText}>View All Pinned Messages</Text>
            <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
          </TouchableOpacity>
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
    overflow: 'hidden',
  },
  loadingContainer: {
    paddingVertical: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 32,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: getFontSize('SM'),
    color: '#8E8E93',
    textAlign: 'center',
  },
  messageItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  pinIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${COLORS.PRIMARY}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  messageContent: {
    flex: 1,
  },
  messageSender: {
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('MEDIUM'),
    color: '#FFFFFF',
    marginBottom: 4,
  },
  messageText: {
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('REGULAR'),
    color: '#CCCCCC',
    marginBottom: 4,
    lineHeight: 18,
  },
  messageTime: {
    fontSize: getFontSize('XS'),
    color: '#8E8E93',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  viewAllText: {
    fontSize: getFontSize('SM'),
    color: '#8E8E93',
    fontWeight: getFontWeight('MEDIUM'),
  },
});

export default PinnedMessagesCard;

