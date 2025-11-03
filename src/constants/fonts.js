// LockerRoom App Font System
export const FONTS = {
  // Brand/Logo Font - Athletic, distinctive, for "LockerRoom" wordmark
  BRAND: {
    // Primary brand font - modern system fonts
    PRIMARY: 'System',
    // Alternative - iOS/Android system fonts
    ALTERNATIVE: 'SF Pro Display',
    // Fallback - guaranteed to work
    FALLBACK: 'System',
  },
  
  // UI Fonts - Clean, legible, for all app functionality
  UI: {
    // Primary UI font - modern system fonts
    PRIMARY: 'System',
    // Secondary UI font - alternative system option
    SECONDARY: 'SF Pro Text',
    // Fallback UI font - guaranteed to work
    FALLBACK: 'System',
  },
  
  // Font Weights
  WEIGHTS: {
    LIGHT: '300',
    REGULAR: '400',
    MEDIUM: '500',
    SEMIBOLD: '600',
    BOLD: '700',
    EXTRABOLD: '800',
  },
  
  // Font Sizes
  SIZES: {
    XS: 12,
    SM: 14,
    BASE: 16,
    LG: 18,
    XL: 20,
    '2XL': 24,
    '3XL': 32,
    '4XL': 40,
    '5XL': 48,
  },
};

// Font utility functions
export const getFontFamily = (type = 'UI', variant = 'PRIMARY') => {
  return FONTS[type][variant] || FONTS.UI.FALLBACK;
};

export const getFontWeight = (weight = 'REGULAR') => {
  return FONTS.WEIGHTS[weight] || FONTS.WEIGHTS.REGULAR;
};

export const getFontSize = (size = 'BASE') => {
  return FONTS.SIZES[size] || FONTS.SIZES.BASE;
};
