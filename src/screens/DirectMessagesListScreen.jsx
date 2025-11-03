import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getDirectMessages, getUnreadCountsForChannels } from '../api/chat';
import { colors } from '../constants/chatColors';
import { fonts } from '../constants/chatFonts';
import { getFontFamily, getFontWeight, getFontSize, isTablet } from '../constants/fonts';
import ScreenBackground from '../components/ScreenBackground';
import { Dimensions } from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const DirectMessagesListScreen = ({ navigation, route }) => {
  const { teamId } = route.params;
  const [dmChannels, setDmChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDMChannels();
  }, [teamId]);

  const loadDMChannels = async () => {
    try {
      setError(null);
      // Get direct messages (1-on-1 DMs and group DMs)
      const { data, error } = await getDirectMessages(teamId);
      
      if (error) {
        throw error;
      }
      const list = data || [];
      const ids = list.map(c => c.id);
      const unreadMap = await getUnreadCountsForChannels(ids);
      const withUnread = list.map(c => ({ ...c, unread_count: unreadMap[c.id] || 0 }));
      setDmChannels(withUnread);
    } catch (err) {
      console.error('Error loading DM channels:', err);
      setError(err.message);
      Alert.alert('Error', 'Failed to load direct messages. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDMChannels();
  };

  const filteredChannels = dmChannels.filter(channel =>
    channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (channel.description && channel.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getLastMessagePreview = (channel) => {
    // This would typically come from the API
    // For now, we'll use placeholder data
    return channel.last_message || "No messages yet";
  };

  const getUnreadCount = (channel) => {
    // This would typically come from the API
    // For now, we'll use placeholder data
    return channel.unread_count || 0;
  };

  const getChannelAvatar = (channel) => {
    // For group DMs, show first letter of channel name
    // For 1:1 DMs, show first letter of other person's name
    if (channel.type === 'group_dm') {
      return channel.name.charAt(0).toUpperCase();
    }
    // For 1:1 DMs, you'd get the other person's name
    return channel.name.charAt(0).toUpperCase();
  };

  const renderDMItem = ({ item }) => {
    const unreadCount = getUnreadCount(item);
    const lastMessage = getLastMessagePreview(item);
    
    return (
      <TouchableOpacity
        style={styles.dmItem}
        onPress={() => navigation.navigate('DirectMessageChat', { 
          channelId: item.id, 
          channelName: item.name,
          teamId,
          isGroup: item.type === 'group_dm'
        })}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          <View style={[
            styles.avatar,
            unreadCount > 0 && styles.avatarUnread
          ]}>
            <Text style={styles.avatarText}>
              {getChannelAvatar(item)}
            </Text>
          </View>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.dmInfo}>
          <View style={styles.dmHeader}>
            <Text style={[
              styles.dmName,
              unreadCount > 0 && styles.dmNameUnread
            ]}>
              {item.name}
            </Text>
            <Text style={styles.dmTime}>
              {item.last_message_time || 'Now'}
            </Text>
          </View>
          
          <Text style={[
            styles.dmPreview,
            unreadCount > 0 && styles.dmPreviewUnread
          ]} numberOfLines={1}>
            {lastMessage}
          </Text>
          
          {item.type === 'group_dm' && (
            <View style={styles.groupIndicator}>
              <Ionicons name="people" size={12} color={colors.gray} />
              <Text style={styles.groupText}>Group</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color="#3A3A3E" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Direct Messages</Text>
          <Text style={styles.headerSubtitle}>
            {dmChannels.length} conversation{dmChannels.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>
      
      <TouchableOpacity
        style={styles.newDMButton}
        onPress={() => navigation.navigate('NewDirectMessage', { teamId })}
        activeOpacity={0.7}
      >
        <Ionicons name="pencil" size={24} color="#3A3A3E" />
      </TouchableOpacity>
    </View>
  );

  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color={colors.gray} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations..."
          placeholderTextColor={colors.gray}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle" size={20} color={colors.gray} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="chatbubbles-outline" size={64} color={colors.gray} />
      <Text style={styles.emptyTitle}>No Direct Messages</Text>
      <Text style={styles.emptySubtitle}>
        Start a conversation with a teammate or coach
      </Text>
      <TouchableOpacity
        style={styles.startConversationButton}
        onPress={() => navigation.navigate('NewDirectMessage', { teamId })}
        activeOpacity={0.7}
      >
        <Text style={styles.startConversationText}>Start Conversation</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <ScreenBackground>
        <SafeAreaView style={styles.container}>
          {renderHeader()}
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3A3A3E" />
            <Text style={styles.loadingText}>Loading conversations...</Text>
          </View>
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        {renderSearchBar()}
        
        <FlatList
          data={filteredChannels}
          renderItem={renderDMItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#3A3A3E']}
              tintColor="#3A3A3E"
            />
          }
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </ScreenBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Remove solid background - now using ScreenBackground
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 20, // Align with search bar
    paddingRight: 20,
    paddingVertical: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 4, // Reduce horizontal padding to move closer to edge
    marginRight: 8, // Reduce margin to title
  },
  headerTitle: {
    fontSize: getFontSize(isTablet ? 'LG' : 'BASE'),
    fontWeight: getFontWeight('SEMIBOLD'),
    color: '#3A3A3E', // Same as channels screen
  },
  headerSubtitle: {
    fontSize: getFontSize('XS'),
    fontWeight: getFontWeight('REGULAR'),
    color: '#5A5A5F', // Same as channels screen
    marginTop: 2,
  },
  newDMButton: {
    padding: 8,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('REGULAR'),
    color: colors.text,
    marginLeft: 12,
  },
  listContainer: {
    flexGrow: 1,
    paddingHorizontal: isTablet ? 24 : 20,
    paddingTop: 10, // Same as channels screen
    paddingBottom: SCREEN_HEIGHT * 0.12, // Same responsive padding as channels
  },
  dmItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: '0.01%', // Match channels screen padding
    backgroundColor: 'transparent', // Remove card background
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3A3A3E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarUnread: {
    backgroundColor: colors.accent,
  },
  avatarText: {
    fontSize: 18,
    fontFamily: fonts.semiBold,
    color: colors.white,
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: colors.white,
  },
  dmInfo: {
    flex: 1,
  },
  dmHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  dmName: {
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('SEMIBOLD'),
    color: '#3A3A3E', // Same as channels screen
    flex: 1,
  },
  dmNameUnread: {
    color: '#3A3A3E',
  },
  dmTime: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: '#5A5A5F', // Same as Home screen - darker for better visibility
  },
  dmPreview: {
    fontSize: getFontSize('XS'),
    fontWeight: getFontWeight('REGULAR'),
    color: '#5A5A5F', // Same as channels screen
    marginBottom: 4,
  },
  dmPreviewUnread: {
    color: '#3A3A3E', // Same as Home screen - darker for visibility
    fontFamily: fonts.semiBold,
  },
  groupIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupText: {
    fontSize: getFontSize('XS'),
    fontWeight: getFontWeight('REGULAR'),
    color: colors.gray,
    marginLeft: 4,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.gray,
    marginTop: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: fonts.semiBold,
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.gray,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  startConversationButton: {
    backgroundColor: '#3A3A3E',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  startConversationText: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.white,
  },
});

export default DirectMessagesListScreen;
