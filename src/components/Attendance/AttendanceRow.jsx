/**
 * AttendanceRow Component
 * Pure UI component for displaying a single attendance row
 */

import React, { useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { getFontWeight, getFontSize } from '../../constants/fonts';
import { getStatusColor, getStatusLabel, formatTime, getAvatarBackgroundColor } from '../../services/attendanceService';

// Item height constant for FlatList getItemLayout optimization
// Calculated from styles: paddingVertical (12*2) + avatar height (48) = 72px
// However, actual rendered height may differ slightly - verify if scrolling jitter occurs
// This is exported so parent components (e.g., AttendanceList) can use it for getItemLayout
export const ITEM_HEIGHT = 68; // Row height (padding + content)

function AttendanceRow({
  member,
  attendance,
  isSelected = false,
  isMarking = false,
  isCoach = false,
  markingUserId,
  onToggleSelect,
  onShowMenu,
}) {
  // Compute isRowMarking from props
  const isRowMarking = isMarking && markingUserId === member.id;
  const status = attendance?.status || 'absent';
  
  // Memoize computed values to prevent recalculation on every render
  const statusColor = useMemo(() => getStatusColor(status), [status]);
  const statusLabel = useMemo(() => getStatusLabel(status), [status]);
  const checkedInTime = useMemo(() => formatTime(attendance?.checked_in_at), [attendance?.checked_in_at]);
  const avatarBackgroundColor = useMemo(() => getAvatarBackgroundColor(statusColor), [statusColor]);

  // Generate avatar initials - handles multi-word names, emojis, and edge cases
  const initials = useMemo(() => {
    if (!member?.name) return '?';
    const parts = member.name.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0][0]?.toUpperCase() || '?';
    // Take first letter of first word and first letter of last word
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [member?.name]);

  // Memoize badge style to prevent creating new objects on every render
  // This improves performance on large lists by maintaining stable references
  // NOTE: Hex concatenation (${statusColor}20) works for hex colors but may fail for RGB/HSL
  // If statusColor format changes, consider adding a utility to normalize to hex first
  const badgeStyle = useMemo(() => (
    status === 'absent'
      ? styles.statusBadgeAbsent
      : { backgroundColor: `${statusColor}20` }
  ), [status, statusColor]);

  // Memoize status text style to prevent creating new objects on every render
  const statusTextStyle = useMemo(() => (
    status === 'absent'
      ? styles.statusTextAbsent
      : { color: statusColor }
  ), [status, statusColor]);

  // Handle press with isRowMarking check
  const handlePress = useCallback(() => {
    if (!isCoach || isRowMarking) return;
    onToggleSelect?.(member.id);
  }, [isCoach, isRowMarking, onToggleSelect, member.id]);

  // Handle long press with isRowMarking check
  const handleLongPress = useCallback(() => {
    if (!isCoach || isRowMarking) return;
    onShowMenu?.(member.id);
  }, [isCoach, isRowMarking, onShowMenu, member.id]);

  return (
    <TouchableOpacity
      style={[
        styles.memberRow,
        isSelected && styles.memberRowSelected,
      ]}
      onPress={handlePress}
      onLongPress={handleLongPress}
      disabled={false}
      activeOpacity={0.7}
    >
      {/* Selection checkbox (coaches only) */}
      {isCoach && (
        <TouchableWithoutFeedback>
        <View style={styles.checkbox}>
          {isSelected ? (
            <Ionicons name="checkmark-circle" size={24} color={COLORS.SUCCESS} />
          ) : (
            <Ionicons name="ellipse-outline" size={24} color={COLORS.TEXT_SECONDARY} />
          )}
        </View>
        </TouchableWithoutFeedback>
      )}

      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: avatarBackgroundColor }, isRowMarking && styles.contentDisabled]}>
        <Text style={[styles.avatarText, { color: statusColor }]}>
          {initials}
        </Text>
      </View>

      {/* Member info */}
      <View style={[styles.memberInfo, isRowMarking && styles.contentDisabled]}>
        <Text style={styles.memberName}>{member.name}</Text>
        {checkedInTime && (
          <Text style={styles.checkInTime}>Checked in at {checkedInTime}</Text>
        )}
      </View>

      {/* Status badge - Red gradient for Absent */}
      <View style={[styles.statusBadge, badgeStyle, isRowMarking && styles.contentDisabled]}>
        <Text style={[styles.statusText, statusTextStyle]}>
          {statusLabel}
        </Text>
      </View>

      {/* Actions menu (coaches only) */}
      {isCoach && (
        <TouchableOpacity
          style={[styles.menuButton, isRowMarking && styles.contentDisabled]}
          onPress={() => onShowMenu?.(member.id)}
          disabled={isRowMarking}
        >
          <Ionicons name="ellipsis-vertical" size={20} color={COLORS.TEXT_SECONDARY} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.BACKGROUND_CARD_SECONDARY,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  memberRowSelected: {
    backgroundColor: COLORS.PRIMARY_BLACK + '40',
    borderColor: COLORS.SUCCESS + '40',
  },
  // Apply opacity only to content (avatar + info) when marking, not the entire row
  // This preserves the selection highlight (green border) when a selected row is being marked
  contentDisabled: {
    opacity: 0.5,
  },
  checkbox: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: getFontSize('LG'),
    fontWeight: getFontWeight('SEMIBOLD'),
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: getFontSize('BASE'),
    fontWeight: getFontWeight('MEDIUM'),
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 2,
  },
  checkInTime: {
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('REGULAR'),
    color: COLORS.TEXT_SECONDARY,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  statusBadgeAbsent: {
    backgroundColor: '#EF444420',
    borderWidth: 1,
    borderColor: '#EF444440',
  },
  statusText: {
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('MEDIUM'),
  },
  statusTextAbsent: {
    color: '#EF4444',
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('SEMIBOLD'),
  },
  menuButton: {
    padding: 4,
  },
});

// Memoize component to prevent unnecessary re-renders
export default React.memo(AttendanceRow, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  // Use nullish coalescing to handle null/undefined properly
  return (
    prevProps.member.id === nextProps.member.id &&
    prevProps.member.name === nextProps.member.name &&
    (prevProps.attendance?.status ?? null) === (nextProps.attendance?.status ?? null) &&
    (prevProps.attendance?.checked_in_at ?? null) === (nextProps.attendance?.checked_in_at ?? null) &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isMarking === nextProps.isMarking &&
    prevProps.markingUserId === nextProps.markingUserId &&
    prevProps.isCoach === nextProps.isCoach
  );
});

