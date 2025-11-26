import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSharedMedia } from '../api/chat';
import { useSupabase } from '../providers/SupabaseProvider';
import { getFontSize, getFontWeight } from '../constants/fonts';
import ImageViewer from './ImageViewer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_SIZE = (SCREEN_WIDTH - 80) / 3; // 3 columns with padding

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const SharedMediaSection = ({ channelId, conversationType = 'channel' }) => {
  const supabase = useSupabase();
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState(null);

  useEffect(() => {
    loadMedia();
  }, [channelId]);

  const loadMedia = async () => {
    const cacheKey = `conversation_media_${channelId}`;
    
    try {
      // Try AsyncStorage first (survives app restarts)
      setLoading(true);
      const cachedJson = await AsyncStorage.getItem(cacheKey);
      
      if (cachedJson) {
        const cached = JSON.parse(cachedJson);
        const now = Date.now();
        const age = now - cached.timestamp;
        
        // Show cached data immediately
        setMedia(cached.data);
        setLoading(false);
        
        // Refresh in background if stale (5+ min old)
        if (age > CACHE_TTL) {
          refreshInBackground(cacheKey);
        }
      } else {
        // No cache - fetch from API
        await refreshInBackground(cacheKey);
      }
    } catch (error) {
      console.error('Error loading shared media:', error);
      setMedia([]);
      setLoading(false);
    }
  };

  const refreshInBackground = async (cacheKey) => {
    try {
      const { data, error } = await getSharedMedia(supabase, channelId, { limit: 6 });
      if (error) throw error;
      
      const mediaData = data || [];
      
      // Prefetch images to prime OS cache
      mediaData.forEach(item => {
        const uri = item.thumbnail_url || item.s3_url;
        if (uri) {
          Image.prefetch(uri).catch(() => {}); // Silent fail
        }
      });
      
      // Update UI
      setMedia(mediaData);
      setLoading(false);
      
      // Save to AsyncStorage with TTL
      const cacheData = {
        data: mediaData,
        timestamp: Date.now(),
        expiresAt: Date.now() + CACHE_TTL
      };
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Background refresh failed:', error);
      setMedia([]);
      setLoading(false);
    }
  };

  const renderMediaItem = ({ item, index }) => {
    const imageUri = item.thumbnail_url || item.s3_url;
    if (!imageUri) return null;
    
    return (
      <TouchableOpacity
        style={styles.mediaItem}
        activeOpacity={0.7}
        onPress={() => {
          setSelectedImageUri(imageUri);
          setShowImageViewer(true);
        }}
      >
        <Image
          source={{ uri: imageUri }}
          style={styles.mediaImage}
          resizeMode="cover"
          defaultSource={require('../../assets/LockerRoom.png')}
          cachePolicy="immutable"
        />
        <View style={styles.mediaOverlay}>
          <Ionicons name="image-outline" size={12} color="#FFFFFF" />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Shared Media</Text>
        <View style={styles.card}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#FFFFFF" />
          </View>
        </View>
      </View>
    );
  }

  if (media.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Shared Media</Text>
        <View style={styles.card}>
          <View style={styles.emptyContainer}>
            <Ionicons name="images-outline" size={32} color="#8E8E93" />
            <Text style={styles.emptyText}>No media shared yet</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Shared Media</Text>
      
      <View style={styles.card}>
        <FlatList
          data={media}
          renderItem={renderMediaItem}
          keyExtractor={(item) => item.id}
          numColumns={3}
          scrollEnabled={false}
          contentContainerStyle={styles.mediaGrid}
        />
        
        {media.length >= 6 && (
          <TouchableOpacity
            style={styles.viewAllButton}
            activeOpacity={0.7}
            onPress={() => {
              // TODO: Navigate to full media gallery
              console.log('View all media');
            }}
          >
            <Text style={styles.viewAllText}>View All Media</Text>
            <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
          </TouchableOpacity>
        )}
      </View>

      {/* Image Viewer Modal */}
      <ImageViewer
        visible={showImageViewer}
        imageUri={selectedImageUri}
        onClose={() => {
          setShowImageViewer(false);
          setSelectedImageUri(null);
        }}
        onDownload={(uri) => {
          // TODO: Implement image download
          console.log('Downloading:', uri);
        }}
      />
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
  mediaGrid: {
    gap: 8,
  },
  mediaItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    marginRight: 8,
    marginBottom: 8,
  },
  mediaImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2A2A2A',
  },
  mediaOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 4,
    padding: 4,
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
    fontSize: getFontSize('SM'),
    color: '#8E8E93',
    fontWeight: getFontWeight('MEDIUM'),
  },
});

export default SharedMediaSection;

