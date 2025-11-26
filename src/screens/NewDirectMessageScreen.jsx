import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createChannel } from '../api/chat';
import { getTeamMemberProfiles } from '../api/profiles';
import { useSupabase } from '../providers/SupabaseProvider';
import { colors } from '../constants/chatColors';
import { fonts } from '../constants/chatFonts';
import { getFontFamily, getFontWeight, getFontSize, isTablet } from '../constants/fonts';
import ScreenBackground from '../components/ScreenBackground';

const NewDirectMessageScreen = ({ navigation, route }) => {
  const supabase = useSupabase();
  const { teamId } = route.params;
  const [searchQuery, setSearchQuery] = useState('');
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadTeamMembers();
  }, [teamId, supabase]);

  const loadTeamMembers = async () => {
    try {
      // Fetch real team members from API
      const { data: profilesData, error } = await getTeamMemberProfiles(supabase, teamId);
      
      if (error) {
        throw error;
      }
      
      // Transform to the format expected by the screen
      const members = (profilesData || []).map(profile => ({
        id: profile.user_id,
        name: profile.user_profiles?.display_name || 'Unknown User',
        role: profile.team_members?.role || 'player',
        position: profile.position || '',
        email: '', // Not needed for this screen
        avatar_url: profile.user_profiles?.avatar_url
      }));
      
      setTeamMembers(members);
    } catch (err) {
      console.error('Error loading team members:', err);
      Alert.alert('Error', 'Failed to load team members. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = teamMembers.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return colors.error;
      case 'coach':
        return colors.secondary;
      case 'trainer':
        return colors.accent;
      case 'captain':
        return colors.warning;
      case 'player':
        return colors.primary;
      default:
        return colors.gray;
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin':
        return 'shield';
      case 'coach':
        return 'school';
      case 'trainer':
        return 'fitness';
      case 'captain':
        return 'star';
      case 'player':
        return 'person';
      default:
        return 'person-outline';
    }
  };

  const handleStartConversation = async (member) => {
    setCreating(true);
    try {
      // Create a DM channel
      const { data, error } = await createChannel({
        team_id: teamId,
        name: member.name,
        description: `Direct message with ${member.name}`,
        type: 'dm',
        is_private: true
      });

      if (error) {
        throw error;
      }

      // Navigate to the new DM
      navigation.navigate('DirectMessageChat', {
        channelId: data.id,
        channelName: member.name,
        teamId,
        isGroup: false
      });

    } catch (err) {
      console.error('Error creating DM:', err);
      Alert.alert('Error', 'Failed to start conversation. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const renderMemberItem = ({ item }) => (
    <TouchableOpacity
      style={styles.memberItem}
      onPress={() => handleStartConversation(item)}
      disabled={creating}
      activeOpacity={0.7}
    >
      <View style={styles.memberAvatar}>
        <Text style={styles.memberAvatarText}>
          {item.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      
      <View style={styles.memberInfo}>
        <View style={styles.memberHeader}>
          <Text style={styles.memberName}>{item.name}</Text>
          <View style={[styles.roleBadge, { backgroundColor: getRoleColor(item.role) }]}>
            <Ionicons 
              name={getRoleIcon(item.role)} 
              size={12} 
              color={colors.white} 
            />
            <Text style={styles.roleText}>
              {item.role.charAt(0).toUpperCase() + item.role.slice(1)}
            </Text>
          </View>
        </View>
        
        <Text style={styles.memberPosition}>{item.position}</Text>
        <Text style={styles.memberEmail}>{item.email}</Text>
      </View>
      
      <View style={styles.memberActions}>
        <Ionicons name="chatbubble-outline" size={20} color={colors.primary} />
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-back" size={24} color="#3A3A3E" />
      </TouchableOpacity>
      
      <View style={styles.headerInfo}>
        <Text style={styles.headerTitle}>New Message</Text>
        <Text style={styles.headerSubtitle}>Start a conversation</Text>
      </View>
    </View>
  );

  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color={colors.gray} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search team members..."
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
      <Ionicons name="people-outline" size={64} color={colors.gray} />
      <Text style={styles.emptyTitle}>No Members Found</Text>
      <Text style={styles.emptySubtitle}>
        Try adjusting your search terms
      </Text>
    </View>
  );

  if (loading) {
    return (
      <ScreenBackground>
        <SafeAreaView style={styles.container}>
          {renderHeader()}
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading team members...</Text>
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
          data={filteredMembers}
          renderItem={renderMemberItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />
        
        {creating && (
          <View style={styles.creatingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.creatingText}>Starting conversation...</Text>
          </View>
        )}
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
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.2,
    borderBottomColor: colors.border,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: getFontSize(isTablet ? 'LG' : 'BASE'),
    fontWeight: getFontWeight('SEMIBOLD'),
    color: '#3A3A3E',
  },
  headerSubtitle: {
    fontSize: getFontSize('XS'),
    fontWeight: getFontWeight('REGULAR'),
    color: '#5A5A5F',
    marginTop: 2,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
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
    color: '#3A3A3E', // Dark grayish color for better visibility
    marginLeft: 12,
  },
  listContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginVertical: 4,
    backgroundColor: colors.white,
    borderRadius: 12,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  memberAvatarText: {
    fontSize: 18,
    fontFamily: fonts.semiBold,
    color: colors.white,
  },
  memberInfo: {
    flex: 1,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  memberName: {
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('MEDIUM'),
    color: '#3A3A3E', // Dark grayish color for better visibility
    marginRight: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 10,
    fontFamily: fonts.semiBold,
    color: colors.white,
    marginLeft: 4,
  },
  memberPosition: {
    fontSize: getFontSize('XS'),
    fontWeight: getFontWeight('REGULAR'),
    color: colors.gray,
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: getFontSize('XS'),
    fontWeight: getFontWeight('REGULAR'),
    color: colors.gray,
  },
  memberActions: {
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('REGULAR'),
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
    fontSize: getFontSize('BASE'),
    fontWeight: getFontWeight('SEMIBOLD'),
    color: '#3A3A3E',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('REGULAR'),
    color: colors.gray,
    textAlign: 'center',
    lineHeight: 20,
  },
  creatingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  creatingText: {
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('REGULAR'),
    color: colors.white,
    marginTop: 16,
  },
});

export default NewDirectMessageScreen;
