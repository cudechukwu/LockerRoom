import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY } from '../constants/typography';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

const ReactionBar = ({ visible, messageId, onEmojiPress, onMorePress, onDismiss, anchorX, anchorY }) => {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const backgroundOpacity = useSharedValue(0);
  const labelOpacity = useSharedValue(0);

  React.useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, { damping: 20, stiffness: 180 });
      opacity.value = withTiming(1, { duration: 200 });
      backgroundOpacity.value = withTiming(1, { duration: 200 });
      labelOpacity.value = withTiming(1, { duration: 250, delay: 150 });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      scale.value = withTiming(0, { duration: 150 });
      opacity.value = withTiming(0, { duration: 150 });
      backgroundOpacity.value = withTiming(0, { duration: 150 });
      labelOpacity.value = withTiming(0, { duration: 100 });
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(scale.value, [0, 1], [10, -8]);
    return {
      transform: [
        { translateY },
        { scale: scale.value }
      ],
      opacity: opacity.value,
    };
  });

  const backgroundStyle = useAnimatedStyle(() => {
    return {
      opacity: backgroundOpacity.value * 0.25,
    };
  });

  const labelStyle = useAnimatedStyle(() => {
    return {
      opacity: labelOpacity.value,
    };
  });

  if (!visible) return null;

  // Calculate position to anchor above the message
  const barWidth = SCREEN_WIDTH - 32;
  const leftPosition = Math.max(16, Math.min(anchorX - barWidth / 2, SCREEN_WIDTH - barWidth - 16));
  const topPosition = Math.max(80, anchorY - 120); // Position above the message, with safe area offset

  return (
    <>
      {/* Backdrop overlay */}
      <TouchableWithoutFeedback onPress={onDismiss}>
        <Animated.View style={[StyleSheet.absoluteFill, backgroundStyle, styles.backdrop]} />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          styles.container,
          animatedStyle,
          {
            left: leftPosition,
            top: topPosition,
          },
        ]}
      >
        <View style={styles.barWrapper}>
          <BlurView intensity={30} tint="dark" style={styles.barBlur}>
            <View style={styles.barContent}>
              {QUICK_REACTIONS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={styles.emojiButton}
                  onPress={() => onEmojiPress?.(messageId, emoji)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.emoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
              
              <TouchableOpacity
                style={styles.moreButton}
                onPress={onMorePress}
                activeOpacity={0.7}
              >
                <Text style={styles.moreText}>+</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
        
        <Animated.Text style={[styles.label, labelStyle]}>Tap and hold to super react</Animated.Text>
        
        {/* Arrow pointing down to message */}
        <Animated.View style={[styles.arrow, { opacity: opacity.value }]} />
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: '#000',
    zIndex: 999,
  },
  container: {
    position: 'absolute',
    zIndex: 1000,
    alignItems: 'center',
  },
  barWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  barBlur: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  barContent: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 28,
  },
  moreButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.BACKGROUND_MUTED,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  moreText: {
    fontSize: 20,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '300',
  },
  label: {
    ...TYPOGRAPHY.caption,
    color: COLORS.TEXT_MUTED,
    marginTop: 8,
    fontSize: 11,
  },
  arrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'rgba(0,0,0,0.3)',
    marginTop: 4,
  },
});

export default ReactionBar;