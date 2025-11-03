/**
 * Coordinate conversion utilities for the playbook system
 * Converts between normalized coordinates (0-1) and pixel coordinates
 */

// Field dimensions (matching FootballField component)
const getFieldDimensions = () => {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = require('react-native').Dimensions.get('window');
  const CARD_MARGIN = 40;
  const CARD_WIDTH = SCREEN_WIDTH - (CARD_MARGIN * 2);
  const CARD_PADDING = 16;
  const FIELD_HEIGHT = SCREEN_HEIGHT * 0.50;
  const FIELD_WIDTH = FIELD_HEIGHT * 0.53;
  
  // Calculate actual field boundaries
  const fieldLeft = -100;
  const fieldRight = SCREEN_WIDTH + 100;
  const fieldTop = -50;
  const fieldBottom = FIELD_HEIGHT + 50;
  
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
