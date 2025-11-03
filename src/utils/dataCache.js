import AsyncStorage from '@react-native-async-storage/async-storage';

// WhatsApp-level persistence: Messages persist between app restarts
class DataCache {
  constructor() {
    this.cache = new Map();
    this.timestamps = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes default TTL
    this.userProfileCache = new Map(); // Persistent user profile cache
    
    // PERSISTENT CACHE: Messages persist forever until manually cleared
    this.messagesCache = new Map(); // channelId -> messages[]
    this.loadPersistentMessages();
  }
  
  // Load messages from AsyncStorage on app start
  async loadPersistentMessages() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const messageKeys = keys.filter(k => k.startsWith('messages_'));
      
      for (const key of messageKeys) {
        const messagesJson = await AsyncStorage.getItem(key);
        if (messagesJson) {
          const messages = JSON.parse(messagesJson);
          const channelId = key.replace('messages_', '');
          this.messagesCache.set(channelId, messages);
        }
      }
      console.log('📱 Loaded persistent messages for', messageKeys.length, 'channels');
    } catch (error) {
      console.error('Error loading persistent messages:', error);
    }
  }
  
  // Get cached messages (with infinite TTL, like WhatsApp)
  getMessages(channelId) {
    return this.messagesCache.get(channelId) || null;
  }
  
  // Store messages persistently
  async setMessages(channelId, messages) {
    this.messagesCache.set(channelId, messages);
    try {
      await AsyncStorage.setItem(`messages_${channelId}`, JSON.stringify(messages));
    } catch (error) {
      console.error('Error persisting messages:', error);
    }
  }
  
  // Clear messages for a channel
  async clearMessages(channelId) {
    this.messagesCache.delete(channelId);
    try {
      await AsyncStorage.removeItem(`messages_${channelId}`);
    } catch (error) {
      console.error('Error clearing messages:', error);
    }
  }
  
  // User profile cache methods (with AsyncStorage persistence)
  async getUserProfile(userId) {
    if (this.userProfileCache.has(userId)) {
      return this.userProfileCache.get(userId);
    }
    
    // Load from AsyncStorage if not in memory
    try {
      const profileJson = await AsyncStorage.getItem(`profile_${userId}`);
      if (profileJson) {
        const profile = JSON.parse(profileJson);
        this.userProfileCache.set(userId, profile);
        return profile;
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
    return null;
  }
  
  async setUserProfile(userId, profile) {
    this.userProfileCache.set(userId, profile);
    try {
      await AsyncStorage.setItem(`profile_${userId}`, JSON.stringify(profile));
    } catch (error) {
      console.error('Error persisting user profile:', error);
    }
  }
  
  async getUserName(userId) {
    const profile = await this.getUserProfile(userId);
    return profile?.display_name || profile?.email || null;
  }
  
  async getUserAvatar(userId) {
    const profile = await this.getUserProfile(userId);
    return profile?.avatar_url || null;
  }

  set(key, data, ttl = this.defaultTTL) {
    this.cache.set(key, data);
    this.timestamps.set(key, Date.now() + ttl);
  }

  get(key) {
    const timestamp = this.timestamps.get(key);
    if (!timestamp || Date.now() > timestamp) {
      // Cache expired
      this.cache.delete(key);
      this.timestamps.delete(key);
      return null;
    }
    return this.cache.get(key);
  }

  has(key) {
    return this.get(key) !== null;
  }

  clear(key) {
    if (key) {
      this.cache.delete(key);
      this.timestamps.delete(key);
    } else {
      this.cache.clear();
      this.timestamps.clear();
    }
  }

  // Clear all team-related data when team changes
  clearTeamData(teamId) {
    const keysToDelete = [];
    for (const key of this.cache.keys()) {
      if (key.includes(`team-${teamId}`) || key.includes('teamInfo') || key.includes('teamData')) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.clear(key));
  }
}

// Export singleton instance
export const dataCache = new DataCache();

// Cache keys
export const CACHE_KEYS = {
  TEAM_INFO: (teamId) => `teamInfo-${teamId}`,
  TEAM_LOGO: (teamId) => `teamLogo-${teamId}`,
  NOTIFICATION_COUNT: (teamId) => `notificationCount-${teamId}`,
  PROFILE_DATA: (userId) => `profileData-${userId}`,
  CHANNELS: (teamId) => `channels-${teamId}`,
  CHANNEL_INFO: (channelId) => `channelInfo-${channelId}`,
  CHANNEL_MEMBERS: (channelId) => `channelMembers-${channelId}`,
};
