import { PixelRatio, useWindowDimensions } from 'react-native';
import { COLORS } from './colors';

/**
 * Dynamically scale font size based on device pixel density and accessibility settings
 * This responds to both static and dynamic accessibility changes
 */
export const scaleFont = (size) => {
  const scale = PixelRatio.getFontScale();
  return size * scale;
};

/**
 * Enhanced scaling that responds to dynamic accessibility changes
 * Use this in components that need real-time accessibility updates
 */
export const useScaledFontSize = (size) => {
  const { fontScale } = useWindowDimensions();
  return size * fontScale;
};

/**
 * Font sizes based on design scale
 */
export const FONT_SIZES = {
  XS: 12,
  SM: 14,
  BASE: 16,
  MD: 18,
  LG: 20,
  XL: 24,
  XXL: 32,
  // Specialized sizes for specific use cases
  CHANNEL_NAME: 15, // Slightly smaller than BASE for channel names
  SEARCH_INPUT: 16, // Standard input size
  ACTION_TEXT: 13, // For action sheet text
};

/**
 * Font weights for readability and consistency
 */
export const FONT_WEIGHTS = {
  LIGHT: '300',
  REGULAR: '400',
  MEDIUM: '500',
  SEMIBOLD: '600',
  BOLD: '700',
  EXTRABOLD: '800',
};

/**
 * Font families (if you use custom fonts like Inter or SF Pro)
 */
export const FONT_FAMILIES = {
  DEFAULT: 'System',
  INTER_REGULAR: 'Inter-Regular',
  INTER_MEDIUM: 'Inter-Medium',
  INTER_BOLD: 'Inter-Bold',
};

/**
 * Line heights for consistent vertical rhythm
 * These maintain proper spacing and readability across all text elements
 */
export const LINE_HEIGHTS = {
  XS: 14,
  SM: 18,
  BASE: 22,
  LG: 26,
  XL: 32,
  XXL: 40,
};

/**
 * Semantic type families for better organization and validation
 * These groups help enforce consistent usage patterns across screens
 */
export const TYPESETS = {
  headings: ['h1', 'h2', 'sectionTitle'],
  titles: ['title', 'subtitle'],
  body: ['body', 'bodyLarge', 'bodyMedium'],
  meta: ['caption', 'captionSmall', 'overline', 'badge'],
  interactive: ['button', 'buttonSmall'],
  specialized: ['greeting', 'teamName', 'teamSubtitle', 'notificationBadge'],
  events: ['eventTitle', 'eventTime', 'gameMode', 'countdown'],
  feed: ['feedName', 'feedAction', 'feedContent', 'feedTime', 'feedHeader', 'feedPoll', 'feedDrills'],
  calendar: ['calendarDay', 'calendarCircle', 'calendarEvent'],
  insights: ['insightLabel', 'insightValue', 'insightSubtext'],
  stats: ['statText', 'statSubtext'],
  navigation: ['viewAllLink', 'loading'],
};

/**
 * Reusable text styles — the real power here.
 * These can be extended or overridden per screen if needed.
 */
export const TYPOGRAPHY = {
  h1: {
    fontSize: scaleFont(FONT_SIZES.XL),
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
    letterSpacing: -0.3,
    lineHeight: LINE_HEIGHTS.XL,
  },
  h2: {
    fontSize: scaleFont(FONT_SIZES.LG),
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
    color: COLORS.TEXT_PRIMARY,
    letterSpacing: -0.2,
    lineHeight: LINE_HEIGHTS.LG,
  },
  title: {
    fontSize: scaleFont(FONT_SIZES.BASE),
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
    color: COLORS.TEXT_PRIMARY,
    letterSpacing: -0.2,
    lineHeight: LINE_HEIGHTS.BASE,
  },
  subtitle: {
    fontSize: scaleFont(FONT_SIZES.BASE),
    fontWeight: FONT_WEIGHTS.MEDIUM,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: LINE_HEIGHTS.BASE,
  },
  body: {
    fontSize: scaleFont(FONT_SIZES.BASE),
    fontWeight: FONT_WEIGHTS.REGULAR,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: LINE_HEIGHTS.BASE,
  },
  bodyLarge: {
    fontSize: scaleFont(FONT_SIZES.MD),
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
    color: COLORS.TEXT_PRIMARY,
    letterSpacing: -0.3,
    lineHeight: LINE_HEIGHTS.LG,
  },
  bodyMedium: {
    fontSize: scaleFont(FONT_SIZES.SM),
    fontWeight: FONT_WEIGHTS.MEDIUM,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: LINE_HEIGHTS.SM,
  },
  caption: {
    fontSize: scaleFont(FONT_SIZES.SM),
    fontWeight: FONT_WEIGHTS.MEDIUM,
    color: COLORS.TEXT_TERTIARY,
    lineHeight: LINE_HEIGHTS.SM,
  },
  captionSmall: {
    fontSize: scaleFont(FONT_SIZES.XS),
    fontWeight: FONT_WEIGHTS.MEDIUM,
    color: COLORS.TEXT_TERTIARY,
    lineHeight: LINE_HEIGHTS.XS,
  },
  overline: {
    fontSize: scaleFont(FONT_SIZES.XS),
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
    letterSpacing: 1.1,
    color: COLORS.TEXT_TERTIARY,
    lineHeight: LINE_HEIGHTS.XS,
  },
  badge: {
    fontSize: scaleFont(FONT_SIZES.XS),
    fontWeight: FONT_WEIGHTS.BOLD,
    letterSpacing: 0.3,
  },
  button: {
    fontSize: scaleFont(FONT_SIZES.SM),
    fontWeight: FONT_WEIGHTS.BOLD,
    letterSpacing: -0.1,
  },
  buttonSmall: {
    fontSize: scaleFont(FONT_SIZES.XS),
    fontWeight: FONT_WEIGHTS.BOLD,
    letterSpacing: -0.1,
  },
  // Specialized styles for specific use cases
  greeting: {
    fontSize: scaleFont(FONT_SIZES.BASE),
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
    color: COLORS.TEXT_PRIMARY,
    letterSpacing: -0.2,
  },
  teamName: {
    fontSize: scaleFont(FONT_SIZES.BASE),
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  teamSubtitle: {
    fontSize: scaleFont(FONT_SIZES.SM),
    fontWeight: FONT_WEIGHTS.REGULAR,
    color: COLORS.TEXT_TERTIARY,
    letterSpacing: -0.05,
  },
  notificationBadge: {
    fontSize: scaleFont(FONT_SIZES.XS),
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
    color: COLORS.TEXT_PRIMARY,
  },
  sectionTitle: {
    fontSize: scaleFont(FONT_SIZES.SM),
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
    letterSpacing: -0.2,
  },
  eventTitle: {
    fontSize: scaleFont(FONT_SIZES.BASE),
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
    letterSpacing: -0.3,
  },
  eventTime: {
    fontSize: scaleFont(FONT_SIZES.XS),
    fontWeight: FONT_WEIGHTS.MEDIUM,
    color: COLORS.TEXT_TERTIARY,
    letterSpacing: -0.1,
  },
  gameMode: {
    fontSize: scaleFont(13),
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
    color: '#FF6666',
    letterSpacing: -0.2,
  },
  countdown: {
    fontSize: scaleFont(FONT_SIZES.SM),
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
    color: COLORS.TEXT_PRIMARY,
  },
  insightLabel: {
    fontSize: scaleFont(10),
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
    color: COLORS.TEXT_TERTIARY,
    textAlign: 'center',
  },
  insightValue: {
    fontSize: scaleFont(19),
    fontWeight: FONT_WEIGHTS.EXTRABOLD,
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
  },
  insightSubtext: {
    fontSize: scaleFont(10),
    fontWeight: FONT_WEIGHTS.MEDIUM,
    color: COLORS.TEXT_TERTIARY,
    textAlign: 'center',
  },
  statText: {
    fontSize: scaleFont(FONT_SIZES.SM),
    fontWeight: FONT_WEIGHTS.MEDIUM,
    color: COLORS.TEXT_PRIMARY,
  },
  statSubtext: {
    fontSize: scaleFont(10),
    fontWeight: FONT_WEIGHTS.REGULAR,
    color: COLORS.TEXT_TERTIARY,
  },
  viewAllLink: {
    fontSize: scaleFont(FONT_SIZES.SM),
    fontWeight: FONT_WEIGHTS.MEDIUM,
    color: COLORS.TEXT_PRIMARY,
    letterSpacing: -0.1,
  },
  calendarDay: {
    fontSize: scaleFont(13),
    fontWeight: FONT_WEIGHTS.MEDIUM,
    color: COLORS.TEXT_TERTIARY,
  },
  calendarCircle: {
    fontSize: scaleFont(FONT_SIZES.XS),
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
  },
  calendarEvent: {
    fontSize: scaleFont(FONT_SIZES.XS),
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
    color: COLORS.TEXT_PRIMARY,
  },
  feedAvatar: {
    fontSize: scaleFont(15),
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
  },
  feedName: {
    fontSize: scaleFont(FONT_SIZES.SM),
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
    color: COLORS.TEXT_PRIMARY,
  },
  feedRoleBadge: {
    fontSize: scaleFont(10),
    fontWeight: FONT_WEIGHTS.BOLD,
    letterSpacing: 0.3,
  },
  feedAction: {
    fontSize: scaleFont(FONT_SIZES.XS),
    fontWeight: FONT_WEIGHTS.REGULAR,
    color: COLORS.TEXT_TERTIARY,
  },
  feedContent: {
    fontSize: scaleFont(15),
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 21,
  },
  feedTime: {
    fontSize: scaleFont(11),
    fontWeight: FONT_WEIGHTS.MEDIUM,
    color: COLORS.TEXT_TERTIARY,
  },
  feedReaction: {
    fontSize: scaleFont(13),
  },
  feedReactionCount: {
    fontSize: scaleFont(11),
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
    color: COLORS.TEXT_SECONDARY,
  },
  feedCTAButton: {
    fontSize: scaleFont(FONT_SIZES.XS),
    fontWeight: FONT_WEIGHTS.BOLD,
    letterSpacing: -0.1,
  },
  feedHeader: {
    fontSize: scaleFont(FONT_SIZES.SM),
    fontWeight: FONT_WEIGHTS.REGULAR,
    color: COLORS.TEXT_PRIMARY,
    lineHeight: 18,
  },
  feedPoll: {
    fontSize: scaleFont(FONT_SIZES.SM),
    fontWeight: FONT_WEIGHTS.REGULAR,
    color: COLORS.TEXT_TERTIARY,
    fontStyle: 'italic',
  },
  feedDrills: {
    fontSize: scaleFont(FONT_SIZES.SM),
    fontWeight: FONT_WEIGHTS.REGULAR,
    color: COLORS.TEXT_TERTIARY,
    lineHeight: 16,
  },
  loading: {
    fontSize: scaleFont(FONT_SIZES.SM),
    fontWeight: FONT_WEIGHTS.REGULAR,
    color: COLORS.TEXT_TERTIARY,
    textAlign: 'center',
  },
  // Specialized UI variants
  channelName: {
    fontSize: scaleFont(FONT_SIZES.CHANNEL_NAME),
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
    color: COLORS.TEXT_PRIMARY,
    letterSpacing: -0.2,
  },
  searchInput: {
    fontSize: scaleFont(FONT_SIZES.SEARCH_INPUT),
    fontWeight: FONT_WEIGHTS.REGULAR,
    color: COLORS.TEXT_SECONDARY,
  },
  actionText: {
    fontSize: scaleFont(FONT_SIZES.ACTION_TEXT),
    fontWeight: FONT_WEIGHTS.REGULAR,
    color: COLORS.TEXT_SECONDARY,
  },
  actionTextDestructive: {
    fontSize: scaleFont(FONT_SIZES.ACTION_TEXT),
    fontWeight: FONT_WEIGHTS.REGULAR,
    color: COLORS.ERROR,
  },
  filterTabActive: {
    fontSize: scaleFont(FONT_SIZES.SM),
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
    color: COLORS.TEXT_SECONDARY,
    letterSpacing: -0.2,
  },
  fabMenuText: {
    fontSize: scaleFont(FONT_SIZES.SM),
    fontWeight: FONT_WEIGHTS.MEDIUM,
    color: COLORS.TEXT_SECONDARY,
  },
};

/**
 * Theme-based typography helper
 * @param {string} theme - 'dark' or 'light'
 * @returns {object} Typography styles with theme-specific colors
 */
export const getTypography = (theme = 'dark') => {
  const themeColors = theme === 'dark' ? {
    primary: COLORS.TEXT_PRIMARY,
    secondary: COLORS.TEXT_SECONDARY,
    tertiary: COLORS.TEXT_TERTIARY,
  } : {
    primary: COLORS.PRIMARY_BLACK,
    secondary: COLORS.MEDIUM_GRAY,
    tertiary: COLORS.LIGHT_GRAY,
  };

  return Object.keys(TYPOGRAPHY).reduce((acc, key) => {
    acc[key] = {
      ...TYPOGRAPHY[key],
      color: TYPOGRAPHY[key].color === COLORS.TEXT_PRIMARY ? themeColors.primary :
             TYPOGRAPHY[key].color === COLORS.TEXT_SECONDARY ? themeColors.secondary :
             TYPOGRAPHY[key].color === COLORS.TEXT_TERTIARY ? themeColors.tertiary :
             TYPOGRAPHY[key].color,
    };
    return acc;
  }, {});
};

/**
 * Utility function to create custom typography styles
 * @param {object} baseStyle - Base typography style to extend
 * @param {object} overrides - Style overrides
 * @returns {object} Combined style object
 */
export const createTypographyStyle = (baseStyle, overrides = {}) => {
  return {
    ...baseStyle,
    ...overrides,
  };
};

/**
 * Validation utilities for typography usage
 */
export const TypographyValidator = {
  /**
   * Check if a variant belongs to a specific typeset
   * @param {string} variant - Typography variant name
   * @param {string} typeset - Typeset name
   * @returns {boolean} Whether variant belongs to typeset
   */
  belongsToTypeset: (variant, typeset) => {
    return TYPESETS[typeset]?.includes(variant) || false;
  },

  /**
   * Get all variants for a specific typeset
   * @param {string} typeset - Typeset name
   * @returns {string[]} Array of variant names
   */
  getVariantsForTypeset: (typeset) => {
    return TYPESETS[typeset] || [];
  },

  /**
   * Validate that only appropriate typography variants are used in a context
   * @param {string[]} usedVariants - Array of variants being used
   * @param {string} context - Context name (e.g., 'card', 'header', 'feed')
   * @returns {object} Validation result with suggestions
   */
  validateContext: (usedVariants, context) => {
    const suggestions = {
      card: ['title', 'body', 'caption'],
      header: ['h1', 'h2', 'subtitle'],
      feed: ['feedName', 'feedContent', 'feedTime'],
      button: ['button', 'buttonSmall'],
    };

    const recommended = suggestions[context] || [];
    const invalid = usedVariants.filter(v => !recommended.includes(v));

    return {
      isValid: invalid.length === 0,
      invalid,
      recommended,
    };
  },
};
