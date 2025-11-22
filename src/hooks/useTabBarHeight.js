import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Custom hook to calculate tab bar height based on platform
 * @param {Object} options - Configuration options
 * @param {number} options.iosHeight - Tab bar height for iOS (default: 88)
 * @param {number} options.androidHeight - Tab bar height for Android (default: 60)
 * @param {number} options.bottomOffset - Additional bottom offset adjustment (default: -10)
 * @returns {number} Adjusted tab bar height including safe area insets
 */
export function useTabBarHeight(options = {}) {
  const {
    iosHeight = 88,
    androidHeight = 60,
    bottomOffset = -10,
  } = options;

  const insets = useSafeAreaInsets();
  const tabBarHeight = Platform.OS === 'ios' ? iosHeight : androidHeight;
  const adjustedTabBarHeight = tabBarHeight + Math.max(insets.bottom + bottomOffset, 0);

  return adjustedTabBarHeight;
}

