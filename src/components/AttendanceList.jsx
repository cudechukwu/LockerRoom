/**
 * Attendance List Component
 * Refactored to use hooks and services for clean separation of concerns
 */

import React, { useState, useMemo, useCallback, memo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { getFontWeight, getFontSize } from '../constants/fonts';
import { useTeamMembers } from '../hooks/useTeamMembers';
import { useAttendance } from '../hooks/useAttendance';
import { useMarkAttendance } from '../hooks/useMarkAttendance';
import { sortMembersByAttendance, getStatusLabel } from '../services/attendanceService';
import AttendanceRow, { ITEM_HEIGHT } from './Attendance/AttendanceRow';

function AttendanceList({ eventId, teamId, isCoach = false, event = null, scrollEnabled = true }) {
  // Selection state for bulk actions - use ref to prevent wasteful re-renders
  // INVARIANT: selectedPlayersRef is the source of truth, but we must always call
  // setSelectedPlayers() after mutating the ref to keep UI in sync
  const selectedPlayersRef = useRef(new Set());
  const [selectedPlayers, setSelectedPlayers] = useState(new Set());

  // Fetch team members (with group filtering)
  const { filteredMembers, isLoading: isLoadingMembers } = useTeamMembers(teamId, event);

  // Fetch attendance data (with real-time updates)
  const { attendance, attendanceByUserId, isLoading: isLoadingAttendance } = useAttendance(eventId, !!eventId);

  // Mark attendance hook
  const { markAttendance, bulkMarkAttendance, isMarking, markingUserId } = useMarkAttendance(eventId, teamId);

  // Sort members by attendance status, then alphabetically
  const sortedMembers = useMemo(() => {
    return sortMembersByAttendance(filteredMembers, attendanceByUserId);
  }, [filteredMembers, attendanceByUserId]);

  // Toggle player selection for bulk actions
  const togglePlayerSelection = useCallback((userId) => {
    if (!isCoach) return;
    
    const newSet = new Set(selectedPlayersRef.current);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    selectedPlayersRef.current = newSet;
    setSelectedPlayers(newSet); // Trigger UI update
  }, [isCoach]);

  // Handle manual mark for a single player
  const handleManualMark = useCallback(async (userId, status) => {
    if (!isCoach) return;

    const result = await markAttendance(userId, status);
    if (result.success) {
      // Clear selection if this player was selected
      const newSet = new Set(selectedPlayersRef.current);
      newSet.delete(userId);
      selectedPlayersRef.current = newSet;
      setSelectedPlayers(newSet);
    }
  }, [isCoach, markAttendance]);

  // Handle bulk mark
  const handleBulkMark = useCallback(async (status) => {
    if (!isCoach || selectedPlayersRef.current.size === 0) return;

    const statusLabel = getStatusLabel(status);
    Alert.alert(
      'Bulk Mark Attendance',
      `Mark ${selectedPlayersRef.current.size} player(s) as ${statusLabel}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark',
          onPress: async () => {
            try {
              const userIds = Array.from(selectedPlayersRef.current);
              const result = await bulkMarkAttendance(userIds, status);
              if (result.success) {
                const newSet = new Set();
                selectedPlayersRef.current = newSet;
                setSelectedPlayers(newSet);
              }
            } catch (error) {
              if (__DEV__) {
                console.error('Error in bulk mark attendance:', error);
              }
              Alert.alert('Error', 'Failed to mark attendance. Please try again.');
            }
          },
        },
      ]
    );
  }, [isCoach, bulkMarkAttendance]);

  // Show status menu for a player
  const showStatusMenu = useCallback((userId) => {
    if (!isCoach) return;

    Alert.alert(
      'Mark Attendance',
      'Select status:',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Present', onPress: () => handleManualMark(userId, 'present') },
        { text: 'Late (<10min)', onPress: () => handleManualMark(userId, 'late_10') },
        { text: 'Late (<30min)', onPress: () => handleManualMark(userId, 'late_30') },
        { text: 'Very Late', onPress: () => handleManualMark(userId, 'very_late') },
        { text: 'Absent', onPress: () => handleManualMark(userId, 'absent') },
        { text: 'Excused', onPress: () => handleManualMark(userId, 'excused') },
      ]
    );
  }, [isCoach, handleManualMark]);

  // Memoize keyExtractor to prevent FlatList from re-rendering unnecessarily
  // Convert to string to avoid React Native warnings for numeric IDs
  const keyExtractor = useCallback((item) => String(item.id), []);

  // getItemLayout for FlatList performance optimization (60+ rows)
  // ITEM_HEIGHT is defined outside component to avoid closure reallocation
  const getItemLayout = useCallback((_, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  }), []);

  // Render attendance row - optimized to reduce closure dependencies
  // Pass props directly instead of computing in closure to improve memoization
  const renderMember = useCallback(({ item: member }) => {
    return (
      <AttendanceRow
        member={member}
        attendance={attendanceByUserId.get(member.id)}
        isSelected={selectedPlayers.has(member.id)}
        isCoach={isCoach}
        markingUserId={markingUserId}
        isMarking={isMarking}
        onToggleSelect={togglePlayerSelection}
        onShowMenu={showStatusMenu}
      />
    );
  }, [attendanceByUserId, selectedPlayers, isCoach, isMarking, markingUserId, togglePlayerSelection, showStatusMenu]);

  // Loading state - AFTER all hooks
  if (isLoadingMembers || isLoadingAttendance) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.TEXT_PRIMARY} />
        <Text style={styles.loadingText}>Loading attendance...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Stats Bar removed - now using AttendanceSummary in EventDetailsScreen */}

      {/* Bulk Actions Bar (coaches only) - memoized to prevent list rerenders */}
      {isCoach && selectedPlayers.size > 0 && (
        <BulkActionsBar
          count={selectedPlayers.size}
          handleBulkMark={handleBulkMark}
          isMarking={isMarking}
        />
      )}

      {/* Attendance List */}
      <FlatList
        data={sortedMembers}
        keyExtractor={keyExtractor}
        renderItem={renderMember}
        getItemLayout={getItemLayout}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollEnabled} // Configurable - enable for long lists, disable if parent handles scrolling
        nestedScrollEnabled={true} // Allow nested scrolling if needed
        removeClippedSubviews={true} // Improve performance for long lists
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color={COLORS.TEXT_SECONDARY} />
            <Text style={styles.emptyText}>No members found</Text>
          </View>
        }
      />
    </View>
  );
}

// Memoized BulkActionsBar to prevent list rerenders when selection changes
const BulkActionsBar = memo(({ count, handleBulkMark, isMarking }) => (
  <View style={styles.bulkActionsBar}>
    <Text style={styles.bulkActionsText}>
      {count} selected
    </Text>
    <View style={styles.bulkActionsButtons}>
      <TouchableOpacity
        style={[styles.bulkActionButton, { backgroundColor: COLORS.SUCCESS }]}
        onPress={() => handleBulkMark('present')}
        disabled={isMarking}
      >
        <Text style={styles.bulkActionButtonText}>Mark Present</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.bulkActionButton, { backgroundColor: COLORS.WARNING }]}
        onPress={() => handleBulkMark('late_10')}
        disabled={isMarking}
      >
        <Text style={styles.bulkActionButtonText}>Mark Late</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.bulkActionButton, { backgroundColor: COLORS.ERROR }]}
        onPress={() => handleBulkMark('absent')}
        disabled={isMarking}
      >
        <Text style={styles.bulkActionButtonText}>Mark Absent</Text>
      </TouchableOpacity>
    </View>
  </View>
));

const styles = StyleSheet.create({
  container: {
    // Remove flex: 1 to allow parent ScrollView to control scrolling
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: getFontSize('BASE'),
    fontWeight: getFontWeight('MEDIUM'),
    color: COLORS.TEXT_SECONDARY,
  },
  listContent: {
    paddingBottom: 16,
  },
  bulkActionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.BACKGROUND_CARD_SECONDARY,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.SUCCESS + '40',
  },
  bulkActionsText: {
    fontSize: getFontSize('BASE'),
    fontWeight: getFontWeight('MEDIUM'),
    color: COLORS.TEXT_PRIMARY,
  },
  bulkActionsButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  bulkActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  bulkActionButtonText: {
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('SEMIBOLD'),
    color: COLORS.WHITE,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: getFontSize('BASE'),
    fontWeight: getFontWeight('MEDIUM'),
    color: COLORS.TEXT_SECONDARY,
  },
});

// Memoize component to prevent unnecessary re-renders
// This works now that useTeamMembers returns stable references (Fix 0B)
export default React.memo(AttendanceList);