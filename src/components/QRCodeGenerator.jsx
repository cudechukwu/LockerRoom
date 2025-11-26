/**
 * QR Code Generator Component
 * Displays a QR code for coaches to share with players for check-in
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Share,
  Alert,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY, FONT_SIZES, FONT_WEIGHTS, scaleFont } from '../constants/typography';
import { generateEventQRCode } from '../api/attendance';
import { useSupabase } from '../providers/SupabaseProvider';
import * as Haptics from 'expo-haptics';

export default function QRCodeGenerator({ visible, onClose, eventId, eventName }) {
  const supabase = useSupabase();
  const [qrToken, setQrToken] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (visible && eventId) {
      loadQRCode();
    } else {
      // Reset state when modal closes
      setQrToken(null);
      setExpiresAt(null);
      setError(null);
    }
  }, [visible, eventId]);

  const loadQRCode = async () => {
    if (!supabase) {
      setError('Supabase client not available');
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: apiError } = await generateEventQRCode(supabase, eventId);

      if (apiError) {
        throw apiError;
      }

      if (data) {
        setQrToken(data.qr_token);
        setExpiresAt(data.expires_at);
      }
    } catch (err) {
      console.error('Error generating QR code:', err);
      setError(err.message || 'Failed to generate QR code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    if (!qrToken) return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      await Share.share({
        message: `Check in to ${eventName || 'this event'} using this QR code:\n\n${qrToken}`,
        title: `QR Code for ${eventName || 'Event'}`,
      });
    } catch (err) {
      console.error('Error sharing QR code:', err);
    }
  };

  const formatExpiration = (expiresAtStr) => {
    if (!expiresAtStr) return 'Unknown';
    
    try {
      const expires = new Date(expiresAtStr);
      const now = new Date();
      const diffMs = expires - now;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);

      if (diffMins < 0) return 'Expired';
      if (diffMins < 60) return `Expires in ${diffMins} min`;
      if (diffHours < 24) return `Expires in ${diffHours} hr`;
      
      return expires.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch (err) {
      return 'Unknown';
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      presentationStyle="overFullScreen"
    >
      <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.modalTint} />
      
      <View style={styles.container}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Check-In QR Code</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Content */}
          <View style={styles.body}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.TEXT_PRIMARY} />
                <Text style={styles.loadingText}>Generating QR code...</Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={48} color={COLORS.ERROR} />
                <Text style={styles.errorTitle}>Error</Text>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={loadQRCode}>
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            ) : qrToken ? (
              <>
                <View style={styles.qrContainer}>
                  <View style={styles.qrWrapper}>
                    <QRCode
                      value={qrToken}
                      size={240}
                      color={COLORS.TEXT_PRIMARY}
                      backgroundColor={COLORS.BACKGROUND_PRIMARY}
                      logo={undefined}
                    />
                  </View>
                </View>

                <View style={styles.infoContainer}>
                  <Text style={styles.eventName}>{eventName || 'Event'}</Text>
                  <View style={styles.expirationRow}>
                    <Ionicons name="time-outline" size={16} color={COLORS.TEXT_TERTIARY} />
                    <Text style={styles.expirationText}>
                      {formatExpiration(expiresAt)}
                    </Text>
                  </View>
                </View>

                <View style={styles.actions}>
                  <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
                    <Ionicons name="share-outline" size={20} color={COLORS.TEXT_PRIMARY} />
                    <Text style={styles.shareButtonText}>Share QR Code</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
  },
  content: {
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 40,
    maxHeight: '90%',
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
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...TYPOGRAPHY.LG,
    ...FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
  },
  placeholder: {
    width: 36,
  },
  body: {
    padding: 24,
    alignItems: 'center',
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    ...TYPOGRAPHY.BASE,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 16,
  },
  errorContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  errorTitle: {
    ...TYPOGRAPHY.LG,
    ...FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    ...TYPOGRAPHY.BASE,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryButtonText: {
    ...TYPOGRAPHY.BASE,
    ...FONT_WEIGHTS.MEDIUM,
    color: COLORS.TEXT_PRIMARY,
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  qrWrapper: {
    backgroundColor: COLORS.WHITE,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  infoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  eventName: {
    ...TYPOGRAPHY.XL,
    ...FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 8,
    textAlign: 'center',
  },
  expirationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  expirationText: {
    ...TYPOGRAPHY.SM,
    color: COLORS.TEXT_TERTIARY,
  },
  actions: {
    width: '100%',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  shareButtonText: {
    ...TYPOGRAPHY.BASE,
    ...FONT_WEIGHTS.MEDIUM,
    color: COLORS.TEXT_PRIMARY,
  },
});

