/**
 * EventHeader Component
 * Header with close and save buttons for event creation modal
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { TYPOGRAPHY, FONT_SIZES, FONT_WEIGHTS, scaleFont } from '../../constants/typography';

const EventHeader = ({ onClose, onSave, topInset = 0 }) => {
  return (
    <View style={[styles.heroSection, { paddingTop: topInset + 4 }]}>
      <View style={styles.heroActionBar}>
        <TouchableOpacity 
          onPress={onClose} 
          style={styles.heroActionButtonLeft} 
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={22} color={COLORS.TEXT_SECONDARY} />
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={onSave} 
          style={styles.heroActionButton}
          activeOpacity={0.7}
        >
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  heroSection: {
    paddingHorizontal: 20,
    paddingBottom: 0,
    marginBottom: 24,
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
  },
  heroActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  heroActionButton: {
    padding: 4,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroActionButtonLeft: {
    paddingTop: 4,
    paddingBottom: 4,
    paddingRight: 8,
    paddingLeft: 0,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  saveButtonText: {
    ...TYPOGRAPHY.body,
    fontSize: scaleFont(FONT_SIZES.SM),
    fontWeight: FONT_WEIGHTS.MEDIUM,
    color: COLORS.TEXT_PRIMARY,
  },
});

export default EventHeader;

