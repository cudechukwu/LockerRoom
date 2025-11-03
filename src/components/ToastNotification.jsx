import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { getFontSize, getFontWeight } from '../constants/fonts';

const { width } = Dimensions.get('window');

const ToastNotification = ({ 
  visible, 
  message, 
  senderName, 
  channelName, 
  onPress, 
  onDismiss,
  duration = 4000 
}) => {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Slide in animation
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto dismiss after duration
      const timer = setTimeout(() => {
        dismissToast();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const dismissToast = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onDismiss) onDismiss();
    });
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.toast}
        onPress={() => {
          if (onPress) onPress();
          dismissToast();
        }}
        activeOpacity={0.8}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="chatbubble-outline" size={20} color={COLORS.WHITE} />
          </View>
          
          <View style={styles.textContainer}>
            <Text style={styles.senderText} numberOfLines={1}>
              {senderName}
            </Text>
            <Text style={styles.channelText} numberOfLines={1}>
              in {channelName}
            </Text>
            <Text style={styles.messageText} numberOfLines={2}>
              {message}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.dismissButton}
            onPress={dismissToast}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={18} color={COLORS.WHITE} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  toast: {
    backgroundColor: COLORS.PRIMARY_BLACK,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  senderText: {
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('SEMIBOLD'),
    color: COLORS.WHITE,
    marginBottom: 2,
  },
  channelText: {
    fontSize: getFontSize('XS'),
    fontWeight: getFontWeight('MEDIUM'),
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  messageText: {
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('REGULAR'),
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 18,
  },
  dismissButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ToastNotification;

