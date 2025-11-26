/**
 * EventHeader Component
 * Header UI for event details modal
 * 
 * Displays:
 * - Close button
 * - Title
 * - Edit/Delete buttons (if permissions allow)
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { TYPOGRAPHY, FONT_SIZES, FONT_WEIGHTS, scaleFont } from '../../constants/typography';

const EventHeader = ({ 
  onClose, 
  onEdit, 
  onDelete, 
  canEdit = false, 
  canDelete = false 
}) => {
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={COLORS.TEXT_SECONDARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Event Details</Text>
        <View style={styles.headerRight}>
          {canEdit ? (
            <TouchableOpacity onPress={onEdit} style={styles.editButton}>
              <Ionicons name="pencil" size={20} color={COLORS.TEXT_PRIMARY} />
            </TouchableOpacity>
          ) : null}
          {canDelete ? (
            <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: COLORS.BACKGROUND_CARD,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: COLORS.BACKGROUND_CARD,
    borderBottomWidth: 0,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    ...TYPOGRAPHY.title,
    fontSize: scaleFont(FONT_SIZES.BASE),
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editButton: {
    padding: 4,
  },
  deleteButton: {
    padding: 4,
  },
});

export default EventHeader;

