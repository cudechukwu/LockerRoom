/**
 * CoachActions Component
 * Coach/creator action buttons
 * 
 * Displays:
 * - Generate QR code button
 */

import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { getFontWeight, getFontSize } from '../../constants/fonts';

const CoachActions = ({ onGenerateQR, isLoading = false }) => {
  return (
    <View style={styles.coachActions}>
      <TouchableOpacity 
        style={styles.qrButton}
        onPress={onGenerateQR}
        disabled={isLoading}
      >
        <Ionicons name="qr-code-outline" size={20} color={COLORS.TEXT_PRIMARY} />
        <Text style={styles.qrButtonText}>
          {isLoading ? 'Generating...' : 'Generate QR Code'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  coachActions: {
    // Removed margin - handled by parent
  },
  qrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    gap: 8,
  },
  qrButtonText: {
    fontSize: getFontSize('BASE'),
    fontWeight: getFontWeight('SEMIBOLD'),
    color: COLORS.TEXT_PRIMARY,
  },
});

export default CoachActions;

