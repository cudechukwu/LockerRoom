/**
 * ErrorState Component
 * Error display for EventDetailsModal
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { getFontWeight, getFontSize } from '../../constants/fonts';

export default function ErrorState({ error, onRetry, onClose }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.content}>
        <Ionicons name="alert-circle" size={64} color={COLORS.ERROR} style={styles.icon} />
        <Text style={styles.title}>Unable to Load Event</Text>
        <Text style={styles.message}>
          {error || 'An error occurred while loading event details. Please try again.'}
        </Text>
        
        {onRetry && (
          <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <Ionicons name="refresh" size={20} color={COLORS.WHITE} style={styles.retryIcon} />
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND_CARD,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  icon: {
    marginBottom: 24,
  },
  title: {
    fontSize: getFontSize('XL'),
    fontWeight: getFontWeight('BOLD'),
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: getFontSize('BASE'),
    fontWeight: getFontWeight('REGULAR'),
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryIcon: {
    marginRight: 8,
  },
  retryText: {
    fontSize: getFontSize('BASE'),
    fontWeight: getFontWeight('SEMIBOLD'),
    color: COLORS.WHITE,
  },
});


