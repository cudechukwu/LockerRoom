import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Alert,
  Dimensions,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { getFontWeight, getFontSize } from '../constants/fonts';
import ScreenBackground from '../components/ScreenBackground';
import ProfileCard from '../components/ProfileCard';
import { getTeamMemberProfiles } from '../api/profiles';
import { useSupabase } from '../providers/SupabaseProvider';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

const RosterScreen = ({ navigation }) => {
  const supabase = useSupabase();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRole, setSelectedRole] = useState('all');
  const [teamId, setTeamId] = useState(null);

  const insets = useSafeAreaInsets();
  const tabBarHeight = 60;
  const adjustedTabBarHeight = tabBarHeight + Math.max(insets.bottom - 10, 0);

  useEffect(() => {
    loadRoster();
  }, []);

  const loadRoster = async () => {
    try {
      setLoading(true);
      
      // Get current user's team
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigation.navigate('VideoCover');
        return;
      }

      const { data: teamMember } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .single();

      if (!teamMember) {
        Alert.alert('Error', 'You are not a member of any team.');
        return;
      }

      setTeamId(teamMember.team_id);

      // Load all team member profiles
      const { data: profilesData, error } = await getTeamMemberProfiles(supabase, teamMember.team_id);
      if (error) throw error;
      
      setProfiles(profilesData || []);

    } catch (error) {
      console.error('Error loading roster:', error);
      Alert.alert('Error', 'Failed to load roster data.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRoster();
    setRefreshing(false);
  };

  const handleProfilePress = (profile) => {
    // Navigate to profile detail screen
    // For now, just show an alert
    Alert.alert(
      profile.user_profiles?.display_name || 'Unknown Player',
      `Role: ${profile.team_members?.role}\nPosition: ${profile.position || 'N/A'}`,
      [{ text: 'OK' }]
    );
  };

  const getFilteredProfiles = () => {
    if (selectedRole === 'all') return profiles;
    return profiles.filter(profile => profile.team_members?.role === selectedRole);
  };

  const getRoleCounts = () => {
    const counts = {
      all: profiles.length,
      player: profiles.filter(p => p.team_members?.role === 'player').length,
      coach: profiles.filter(p => p.team_members?.role === 'coach').length,
      trainer: profiles.filter(p => p.team_members?.role === 'trainer').length,
      assistant: profiles.filter(p => p.team_members?.role === 'assistant').length,
    };
    return counts;
  };

  const renderRoleFilter = () => {
    const counts = getRoleCounts();
    const roles = [
      { key: 'all', label: 'All', count: counts.all },
      { key: 'player', label: 'Players', count: counts.player },
      { key: 'coach', label: 'Coaches', count: counts.coach },
      { key: 'trainer', label: 'Trainers', count: counts.trainer },
      { key: 'assistant', label: 'Assistants', count: counts.assistant },
    ];

    return (
      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {roles.map(role => (
            <TouchableOpacity
              key={role.key}
              style={[
                styles.filterButton,
                selectedRole === role.key && styles.filterButtonActive
              ]}
              onPress={() => setSelectedRole(role.key)}
            >
              <Text style={[
                styles.filterButtonText,
                selectedRole === role.key && styles.filterButtonTextActive
              ]}>
                {role.label} ({role.count})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderProfile = ({ item: profile }) => (
    <ProfileCard
      profile={profile}
      onPress={() => handleProfilePress(profile)}
      size="medium"
      showRole={true}
      showJersey={profile.team_members?.role === 'player'}
      style={styles.profileCard}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No Profiles Found</Text>
      <Text style={styles.emptySubtitle}>
        {selectedRole === 'all' 
          ? 'No team members have created profiles yet.'
          : `No ${selectedRole}s have created profiles yet.`
        }
      </Text>
    </View>
  );

  if (loading) {
    return (
      <ScreenBackground>
        <SafeAreaView style={[styles.container, { paddingBottom: adjustedTabBarHeight }]}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading roster...</Text>
          </View>
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={[styles.container, { paddingBottom: adjustedTabBarHeight }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Team Roster</Text>
          <Text style={styles.headerSubtitle}>
            {profiles.length} member{profiles.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Role Filter */}
        {renderRoleFilter()}

        {/* Roster Grid */}
        <FlatList
          data={getFilteredProfiles()}
          renderItem={renderProfile}
          keyExtractor={(item) => item.id}
          numColumns={isTablet ? 3 : 2}
          contentContainerStyle={styles.listContainer}
          columnWrapperStyle={isTablet ? styles.row : null}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
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
  },
  header: {
    paddingHorizontal: isTablet ? 24 : 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: getFontSize(isTablet ? 'XL' : 'LG'),
    fontWeight: getFontWeight('BOLD'),
    color: COLORS.PRIMARY_BLACK,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: getFontSize('SM'),
    color: '#6B7280',
  },
  filterContainer: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterScroll: {
    paddingHorizontal: isTablet ? 24 : 20,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 12,
  },
  filterButtonActive: {
    backgroundColor: COLORS.PRIMARY_BLACK,
  },
  filterButtonText: {
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('MEDIUM'),
    color: '#6B7280',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    padding: isTablet ? 24 : 20,
    paddingBottom: 20,
  },
  row: {
    justifyContent: 'space-between',
  },
  profileCard: {
    marginBottom: 16,
    marginRight: isTablet ? 0 : 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: getFontSize('LG'),
    fontWeight: getFontWeight('SEMIBOLD'),
    color: COLORS.PRIMARY_BLACK,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: getFontSize('BASE'),
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: getFontSize('BASE'),
    color: COLORS.PRIMARY_BLACK,
  },
});

export default RosterScreen;
