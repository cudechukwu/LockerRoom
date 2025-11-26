/**
 * CheckInSection Component
 * Player check-in UI
 * 
 * Displays:
 * - QR scanner button
 * - Location check-in button
 * - Check-out button
 * - Status display
 */

import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { getFontWeight, getFontSize } from '../../constants/fonts';
import { hasEventLocation } from '../../services/eventService';

const CheckInSection = ({
  userAttendance,
  event,
  isCheckingIn,
  isLoadingAttendance,
  onCheckInQR,
  onCheckInLocation,
  onCheckOut,
}) => {
  if (isLoadingAttendance) {
    return (
      <View style={styles.section}>
        <ActivityIndicator size="small" color={COLORS.PRIMARY_BLACK} />
      </View>
    );
  }

  // User is already checked in
  if (userAttendance) {
    // Format check-in method for display
    const getCheckInMethodLabel = (method) => {
      if (!method) return '';
      switch (method) {
        case 'qr_code':
          return 'via QR Code';
        case 'location':
          return 'via Location';
        case 'manual':
          return 'Manually';
        default:
          return '';
      }
    };

    const checkInMethod = getCheckInMethodLabel(userAttendance.check_in_method);

    return (
      <View style={styles.section}>
        <View style={styles.checkInStatus}>
          <View style={{ flex: 1 }}>
            <Text style={styles.checkInStatusText}>
              ✓ Checked in {checkInMethod ? ` ${checkInMethod}` : ''} {userAttendance.checked_in_at 
                ? new Date(userAttendance.checked_in_at).toLocaleTimeString('en-US', { 
                    hour: 'numeric', 
                    minute: '2-digit' 
                  })
                : ''}
            </Text>
            {userAttendance.status ? (
              <Text style={[styles.checkInStatusText, { fontSize: getFontSize('XS'), color: '#6B7280', marginTop: 4 }]}>
                Status: {userAttendance.status.replace('_', ' ').toUpperCase()}
              </Text>
            ) : null}
          </View>
          {!userAttendance.checked_out_at ? (
            <TouchableOpacity 
              style={styles.checkOutButton}
              onPress={onCheckOut}
              disabled={isCheckingIn}
            >
              <Text style={styles.checkOutButtonText}>
                {isCheckingIn ? 'Checking out...' : 'Check Out'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  }

  // User needs to check in
  const eventHasLocation = hasEventLocation(event);
  const isLocationDisabled = isCheckingIn || !eventHasLocation;

  return (
    <View style={styles.section}>
      <TouchableOpacity 
        style={styles.checkInButton}
        onPress={onCheckInQR}
        disabled={isCheckingIn}
      >
        <Ionicons name="qr-code-outline" size={20} color={COLORS.WHITE} />
        <Text style={styles.checkInButtonText}>
          {isCheckingIn ? 'Checking in...' : 'Scan QR Code to Check In'}
        </Text>
      </TouchableOpacity>
      
      {/* Location check-in button */}
      <View style={{ marginTop: 12 }}>
        <TouchableOpacity 
          style={[
            styles.checkInButton, 
            { 
              backgroundColor: isLocationDisabled ? '#E5E7EB' : '#6B7280',
              opacity: isLocationDisabled ? 0.6 : 1,
            }
          ]}
          onPress={onCheckInLocation}
          disabled={isLocationDisabled}
        >
          <Ionicons 
            name="location-outline" 
            size={20} 
            color={isLocationDisabled ? '#9CA3AF' : COLORS.WHITE} 
          />
          <Text style={[
            styles.checkInButtonText,
            { color: isLocationDisabled ? '#9CA3AF' : COLORS.WHITE }
          ]}>
            {isCheckingIn ? 'Checking in...' : 'Check In with Location'}
          </Text>
        </TouchableOpacity>
        
        {!eventHasLocation && (
          <View style={styles.locationWarning}>
            <Ionicons name="information-circle-outline" size={16} color="#6B7280" />
            <Text style={styles.locationWarningText}>
              Location check-in unavailable. Event location not set.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  checkInStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  checkInStatusText: {
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('MEDIUM'),
    color: COLORS.TEXT_PRIMARY,
  },
  checkOutButton: {
    backgroundColor: COLORS.BACKGROUND_MUTED,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  checkOutButtonText: {
    fontSize: getFontSize('XS'),
    fontWeight: getFontWeight('MEDIUM'),
    color: COLORS.TEXT_PRIMARY,
  },
  checkInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.SUCCESS,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  checkInButtonText: {
    fontSize: getFontSize('BASE'),
    fontWeight: getFontWeight('SEMIBOLD'),
    color: COLORS.WHITE,
  },
  locationWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  locationWarningText: {
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('REGULAR'),
    color: COLORS.TEXT_SECONDARY,
    flex: 1,
  },
});

export default CheckInSection;

