/**
 * Coordinate conversion utilities for the playbook system
 * Converts between normalized coordinates (0-1) and pixel coordinates
 */

// Field dimensions (matching FootballField component)
const getFieldDimensions = () => {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = require('react-native').Dimensions.get('window');
  
  // Calculate responsive constants based on screen size (all percentage-based)
  const CARD_MARGIN = SCREEN_WIDTH * 0.015; // 1.5% of screen width for minimal padding
  const CARD_WIDTH = SCREEN_WIDTH - (CARD_MARGIN * 2);
  const CARD_PADDING = SCREEN_WIDTH * 0.01; // 1% of screen width for minimal padding
  // Calculate field height to fill available viewport space from header to bottom
  // Account for header (~10%), controls (~30% when visible), and safe areas (~2% total)
  const headerHeight = SCREEN_HEIGHT * 0.10; // ~10% for header
  const controlsHeight = SCREEN_HEIGHT * 0.30; // ~30% for controls when visible
  const safeAreaBuffer = SCREEN_HEIGHT * 0.02; // ~2% for safe areas (minimal)
  const availableHeight = SCREEN_HEIGHT - headerHeight - controlsHeight - safeAreaBuffer;
  const FIELD_HEIGHT = availableHeight * 0.98; // Use 98% of available space to maximize field size
  const FIELD_WIDTH = Math.min(SCREEN_WIDTH * 0.96, FIELD_HEIGHT * 0.85); // Much wider field (96% of screen width)
  
  // Calculate extension values as percentage of screen size
  const extendX = SCREEN_WIDTH * 0.26; // 26% of screen width for horizontal extension
  const extendY = SCREEN_HEIGHT * 0.07; // 7% of screen height for vertical extension
  
  // Calculate actual field boundaries (all percentage-based)
  const fieldLeft = -extendX;
  const fieldRight = SCREEN_WIDTH + extendX;
  const fieldTop = -extendY;
  const fieldBottom = FIELD_HEIGHT + extendY;
  
  return {
    fieldLeft,
    fieldRight,
    fieldTop,
    fieldBottom,
    fieldWidth: fieldRight - fieldLeft,
    fieldHeight: fieldBottom - fieldTop,
    CARD_MARGIN,
    CARD_WIDTH,
    CARD_PADDING,
    FIELD_HEIGHT,
    FIELD_WIDTH
  };
};

/**
 * Convert normalized coordinates (0-1) to pixel coordinates
 * @param {Object} normalized - { x: 0-1, y: 0-1 }
 * @returns {Object} - { x: pixels, y: pixels }
 */
export const normalizedToPixels = (normalized) => {
  const { fieldLeft, fieldTop, fieldWidth, fieldHeight } = getFieldDimensions();
  
  return {
    x: fieldLeft + (normalized.x * fieldWidth),
    y: fieldTop + (normalized.y * fieldHeight)
  };
};

/**
 * Convert pixel coordinates to normalized coordinates (0-1)
 * @param {Object} pixels - { x: pixels, y: pixels }
 * @returns {Object} - { x: 0-1, y: 0-1 }
 */
export const pixelsToNormalized = (pixels) => {
  const { fieldLeft, fieldTop, fieldWidth, fieldHeight } = getFieldDimensions();
  
  return {
    x: Math.max(0, Math.min(1, (pixels.x - fieldLeft) / fieldWidth)),
    y: Math.max(0, Math.min(1, (pixels.y - fieldTop) / fieldHeight))
  };
};

/**
 * Convert an array of pixel points to normalized points
 * @param {Array} pixelPoints - Array of { x: pixels, y: pixels }
 * @returns {Array} - Array of { x: 0-1, y: 0-1 }
 */
export const convertPixelRouteToNormalized = (pixelPoints) => {
  return pixelPoints.map(point => pixelsToNormalized(point));
};

/**
 * Convert an array of normalized points to pixel points
 * @param {Array} normalizedPoints - Array of { x: 0-1, y: 0-1 }
 * @returns {Array} - Array of { x: pixels, y: pixels }
 */
export const convertNormalizedRouteToPixels = (normalizedPoints) => {
  return normalizedPoints.map(point => normalizedToPixels(point));
};

/**
 * Get field boundaries for hit testing
 * @returns {Object} - Field boundary coordinates
 */
export const getFieldBounds = () => {
  const { fieldLeft, fieldRight, fieldTop, fieldBottom } = getFieldDimensions();
  return { fieldLeft, fieldRight, fieldTop, fieldBottom };
};

/**
 * Check if a point is within field boundaries
 * @param {Object} point - { x: pixels, y: pixels }
 * @returns {boolean}
 */
export const isWithinFieldBounds = (point) => {
  const { fieldLeft, fieldRight, fieldTop, fieldBottom } = getFieldBounds();
  return point.x >= fieldLeft && point.x <= fieldRight &&
         point.y >= fieldTop && point.y <= fieldBottom;
};
