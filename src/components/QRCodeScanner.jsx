/**
 * QR Code Scanner Component
 * Uses expo-camera to scan QR codes for event check-in
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY, FONT_SIZES, FONT_WEIGHTS, scaleFont } from '../constants/typography';
import { verifyQRToken } from '../api/attendance';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

export default function QRCodeScanner({ visible, onClose, onScanSuccess, eventId, teamId }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const alertShownRef = useRef(false);
  const lastScanTimeRef = useRef(0);

  useEffect(() => {
    if (visible) {
      setScanned(false);
      setIsProcessing(false);
      alertShownRef.current = false;
      lastScanTimeRef.current = 0;
    }
  }, [visible]);

  const showAlert = (title, message, onPress) => {
    // Debounce alerts to prevent double-triggering on Android
    if (alertShownRef.current) return;
    
    alertShownRef.current = true;
    Alert.alert(title, message, [
      {
        text: 'OK',
        onPress: () => {
          alertShownRef.current = false;
          if (onPress) onPress();
        },
      },
    ]);
  };

  const handleBarCodeScanned = async ({ type, data }) => {
    // Throttle scans: ignore if within 100ms of last scan (Android double-trigger protection)
    const now = Date.now();
    if (now - lastScanTimeRef.current < 100) return;
    lastScanTimeRef.current = now;

    if (scanned || isProcessing) return;

    setScanned(true);
    setIsProcessing(true);

    try {
      // Verify QR token FIRST (before haptics to avoid double-vibration)
      const verification = verifyQRToken(data);
      
      // Handle both old format (null/decoded) and new format ({valid, data, reason})
      let isValid = false;
      let decoded = null;
      let reason = 'invalid_token_format';

      if (verification && typeof verification === 'object') {
        if ('valid' in verification) {
          // New format
          isValid = verification.valid;
          decoded = verification.data;
          reason = verification.reason || 'invalid';
        } else {
          // Old format: assume it's the decoded token
          isValid = true;
          decoded = verification;
        }
      } else if (verification) {
        // Direct decoded token (old format)
        isValid = true;
        decoded = verification;
      }

      if (!isValid || !decoded) {
        // Haptic feedback only after validation fails (to avoid double-trigger)
        if (Platform.OS === 'ios') {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        
        showAlert(
          'Invalid QR Code',
          reason === 'expired' 
            ? 'This QR code has expired. Please ask your coach for a new one.'
            : reason === 'invalid_base64'
            ? 'This QR code format is invalid. Please try again.'
            : 'This QR code is invalid. Please try again.',
          () => {
            setScanned(false);
            setIsProcessing(false);
          }
        );
        return;
      }

      // Verify event and team match
      if (decoded.event_id !== eventId || decoded.team_id !== teamId) {
        if (Platform.OS === 'ios') {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        
        showAlert(
          'Wrong Event',
          'This QR code is for a different event. Please scan the correct QR code.',
          () => {
            setScanned(false);
            setIsProcessing(false);
          }
        );
        return;
      }

      // Success - haptic feedback AFTER validation passes
      if (Platform.OS === 'ios') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // Success - pass token to parent
      if (onScanSuccess) {
        onScanSuccess(data);
      }
      
      // Close scanner
      onClose();
    } catch (error) {
      console.error('Error processing QR code:', error);
      
      if (Platform.OS === 'ios') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      
      showAlert(
        'Error',
        'Failed to process QR code. Please try again.',
        () => {
          setScanned(false);
          setIsProcessing(false);
        }
      );
    }
  };

  if (!visible) return null;

  // Request camera permission
  // Use 'fade' animation on Android for better performance
  const animationType = Platform.OS === 'android' ? 'fade' : 'slide';

  if (!permission) {
    return (
      <Modal visible={visible} transparent animationType={animationType}>
        <View style={styles.container}>
          <View style={styles.content}>
            <ActivityIndicator size="large" color={COLORS.TEXT_PRIMARY} />
            <Text style={styles.loadingText}>Checking camera permissions...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} transparent animationType={animationType}>
        <View style={styles.container}>
          <View style={styles.content}>
            <Ionicons name="camera-outline" size={64} color={COLORS.TEXT_SECONDARY} />
            <Text style={styles.title}>Camera Permission Required</Text>
            <Text style={styles.message}>
              We need access to your camera to scan QR codes for check-in.
            </Text>
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={requestPermission}
            >
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // Calculate scan frame size - use min of width/height for better centering
  const scanFrameSize = Math.min(width, height) * 0.65;

  return (
    <Modal visible={visible} transparent animationType={animationType}>
      <View style={styles.container}>
        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
        >
          {/* Header - positioned absolutely, doesn't block camera */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Scan QR Code</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Gradient overlay - transparent in center, dark on edges (like Snapchat) */}
          <View style={styles.overlayContainer} pointerEvents="none">
            {/* Top gradient - fades from dark to transparent */}
            <LinearGradient
              colors={['rgba(0, 0, 0, 0.6)', 'rgba(0, 0, 0, 0.3)', 'transparent']}
              locations={[0, 0.5, 1]}
              style={styles.topGradient}
            />
            
            {/* Middle section with transparent scan area */}
            <View style={styles.middleSection}>
              {/* Left side overlay */}
              <LinearGradient
                colors={['rgba(0, 0, 0, 0.3)', 'transparent', 'rgba(0, 0, 0, 0.3)']}
                locations={[0, 0.5, 1]}
                style={styles.sideOverlay}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
              
              {/* Scan frame area - transparent center */}
              <View style={[styles.scanArea, { width: scanFrameSize, height: scanFrameSize }]}>
                <View style={styles.scanFrame}>
                  <View style={[styles.corner, styles.topLeft]} />
                  <View style={[styles.corner, styles.topRight]} />
                  <View style={[styles.corner, styles.bottomLeft]} />
                  <View style={[styles.corner, styles.bottomRight]} />
                </View>
              </View>
              
              {/* Right side overlay */}
              <LinearGradient
                colors={['rgba(0, 0, 0, 0.3)', 'transparent', 'rgba(0, 0, 0, 0.3)']}
                locations={[0, 0.5, 1]}
                style={styles.sideOverlay}
                start={{ x: 1, y: 0 }}
                end={{ x: 0, y: 0 }}
              />
            </View>

            {/* Bottom gradient - fades from transparent to dark */}
            <LinearGradient
              colors={['transparent', 'rgba(0, 0, 0, 0.3)', 'rgba(0, 0, 0, 0.6)']}
              locations={[0, 0.5, 1]}
              style={styles.bottomGradient}
            />
          </View>

          {/* Instructions - positioned absolutely at bottom */}
          <View style={styles.instructions}>
            {isProcessing ? (
              <>
                <ActivityIndicator size="small" color={COLORS.TEXT_PRIMARY} />
                <Text style={styles.instructionText}>Processing...</Text>
              </>
            ) : (
              <Text style={styles.instructionText}>
                Position the QR code within the frame
              </Text>
            )}
          </View>
        </CameraView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    ...TYPOGRAPHY.BASE,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 16,
  },
  camera: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    zIndex: 10,
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  topGradient: {
    flex: 1,
    minHeight: 100,
  },
  bottomGradient: {
    flex: 1,
    minHeight: 100,
  },
  middleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 280, // Minimum height for scan frame
  },
  sideOverlay: {
    flex: 1,
    minWidth: 20,
  },
  scanArea: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...TYPOGRAPHY.LG,
    ...FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
  },
  placeholder: {
    width: 40,
  },
  scanFrame: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: COLORS.TEXT_PRIMARY,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },
  instructions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 60,
    paddingHorizontal: 20,
    alignItems: 'center',
    zIndex: 10,
  },
  instructionText: {
    ...TYPOGRAPHY.BASE,
    color: COLORS.TEXT_PRIMARY,
    marginTop: 12,
    textAlign: 'center',
  },
  title: {
    ...TYPOGRAPHY.XL,
    ...FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    ...TYPOGRAPHY.BASE,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  permissionButton: {
    backgroundColor: COLORS.TEXT_PRIMARY,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 16,
  },
  permissionButtonText: {
    ...TYPOGRAPHY.BASE,
    ...FONT_WEIGHTS.BOLD,
    color: COLORS.BACKGROUND_PRIMARY,
  },
  cancelButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  cancelButtonText: {
    ...TYPOGRAPHY.BASE,
    color: COLORS.TEXT_SECONDARY,
  },
});

