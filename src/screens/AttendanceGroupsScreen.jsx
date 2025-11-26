/**
 * Attendance Groups Management Screen
 * Allows coaches to create, edit, and manage custom attendance groups
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { getFontWeight, getFontSize } from '../constants/fonts';
import { useSupabase } from '../providers/SupabaseProvider';
import ScreenBackground from '../components/ScreenBackground';
import AttendanceGroupModal from '../components/AttendanceGroupModal';
import {
  getTeamAttendanceGroups,
  deleteAttendanceGroup,
  getGroupMembers,
} from '../api/attendanceGroups';

const AttendanceGroupsScreen = ({ navigation }) => {
  const supabase = useSupabase();
  const insets = useSafeAreaInsets();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [teamId, setTeamId] = useState(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [groupMemberCounts, setGroupMemberCounts] = useState({});

  useEffect(() => {
    loadTeamId();
  }, []);

  useEffect(() => {
    if (teamId) {
      loadGroups();
    }
  }, [teamId]);

  const loadTeamId = async () => {
    try {
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

      if (teamMember) {
        setTeamId(teamMember.team_id);
      }
    } catch (error) {
      console.error('Error loading team ID:', error);
    }
  };

  const loadGroups = async () => {
    if (!teamId) return;

    try {
      setLoading(true);
      const { data, error } = await getTeamAttendanceGroups(supabase, teamId);

      if (error) throw error;

      setGroups(data || []);

      // Load member counts for each group
      const counts = {};
      for (const group of data || []) {
        const { data: members } = await getGroupMembers(supabase, group.id);
        counts[group.id] = members?.length || 0;
      }
      setGroupMemberCounts(counts);
    } catch (error) {
      console.error('Error loading groups:', error);
      Alert.alert('Error', 'Failed to load attendance groups.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadGroups();
    setRefreshing(false);
  };

  const handleCreateGroup = () => {
    setEditingGroup(null);
    setShowGroupModal(true);
  };

  const handleEditGroup = (group) => {
    setEditingGroup(group);
    setShowGroupModal(true);
  };

  const handleDeleteGroup = (group) => {
    Alert.alert(
      'Delete Group',
      `Are you sure you want to delete "${group.name}"? This will remove all member assignments but won't affect past events.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await deleteAttendanceGroup(supabase, group.id);
              if (error) throw error;
              await loadGroups();
            } catch (error) {
              console.error('Error deleting group:', error);
              Alert.alert('Error', 'Failed to delete group.');
            }
          },
        },
      ]
    );
  };

  const handleGroupSaved = () => {
    setShowGroupModal(false);
    setEditingGroup(null);
    loadGroups();
  };

  const renderGroup = ({ item: group }) => {
    const memberCount = groupMemberCounts[group.id] || 0;

    return (
      <TouchableOpacity
        style={styles.groupCard}
        onPress={() => handleEditGroup(group)}
        activeOpacity={0.7}
      >
        <View style={styles.groupCardContent}>
          <View style={styles.groupHeader}>
            <View style={styles.groupInfo}>
              <View style={[styles.groupIcon, group.color && { backgroundColor: group.color }]}>
                <Ionicons name="people" size={20} color={COLORS.WHITE} />
              </View>
              <View style={styles.groupDetails}>
                <Text style={styles.groupName}>{group.name}</Text>
                {group.description ? (
                  <Text style={styles.groupDescription} numberOfLines={1}>
                    {group.description}
                  </Text>
                ) : null}
              </View>
            </View>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteGroup(group)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="trash-outline" size={20} color={COLORS.ERROR} />
            </TouchableOpacity>
          </View>
          <View style={styles.groupFooter}>
            <Text style={styles.memberCount}>
              {memberCount} {memberCount === 1 ? 'member' : 'members'}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.TEXT_TERTIARY} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="people-outline" size={64} color={COLORS.TEXT_TERTIARY} />
      <Text style={styles.emptyStateTitle}>No Attendance Groups</Text>
      <Text style={styles.emptyStateText}>
        Create custom groups to assign to events.{'\n'}
        Only group members will see and can check in to those events.
      </Text>
      <TouchableOpacity style={styles.createButton} onPress={handleCreateGroup}>
        <Ionicons name="add" size={20} color={COLORS.WHITE} />
        <Text style={styles.createButtonText}>Create Your First Group</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && groups.length === 0) {
    return (
      <ScreenBackground>
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color={COLORS.WHITE} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Attendance Groups</Text>
            <View style={styles.headerRight} />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          </View>
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.WHITE} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Attendance Groups</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleCreateGroup}
          >
            <Ionicons name="add" size={24} color={COLORS.WHITE} />
          </TouchableOpacity>
        </View>

        {groups.length === 0 ? (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={COLORS.WHITE}
              />
            }
          >
            {renderEmptyState()}
          </ScrollView>
        ) : (
          <FlatList
            data={groups}
            renderItem={renderGroup}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={COLORS.WHITE}
              />
            }
            ListEmptyComponent={renderEmptyState}
          />
        )}

        <AttendanceGroupModal
          visible={showGroupModal}
          onClose={() => {
            setShowGroupModal(false);
            setEditingGroup(null);
          }}
          onSave={handleGroupSaved}
          teamId={teamId}
          group={editingGroup}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: getFontSize('XL'),
    fontWeight: getFontWeight('BOLD'),
    color: COLORS.WHITE,
  },
  headerRight: {
    width: 32,
  },
  addButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
  },
  listContent: {
    padding: 20,
  },
  groupCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
  },
  groupCardContent: {
    padding: 16,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  groupInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  groupIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  groupDetails: {
    flex: 1,
  },
  groupName: {
    fontSize: getFontSize('BASE'),
    fontWeight: getFontWeight('SEMIBOLD'),
    color: COLORS.WHITE,
    marginBottom: 4,
  },
  groupDescription: {
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('REGULAR'),
    color: COLORS.TEXT_TERTIARY,
  },
  deleteButton: {
    padding: 4,
  },
  groupFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  memberCount: {
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('MEDIUM'),
    color: COLORS.TEXT_SECONDARY,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: getFontSize('XL'),
    fontWeight: getFontWeight('BOLD'),
    color: COLORS.WHITE,
    marginTop: 20,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: getFontSize('BASE'),
    fontWeight: getFontWeight('REGULAR'),
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  createButtonText: {
    fontSize: getFontSize('BASE'),
    fontWeight: getFontWeight('SEMIBOLD'),
    color: COLORS.WHITE,
  },
});

export default AttendanceGroupsScreen;

