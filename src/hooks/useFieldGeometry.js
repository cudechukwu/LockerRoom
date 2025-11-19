/**
 * Centralized field geometry hook
 * Provides all field-related calculations and utilities with configurable extended bounds
 */

import { useMemo } from 'react';
import { Dimensions } from 'react-native';

/**
 * Main field geometry hook
 * @param {Object} options - Configuration options
 * @param {number} options.extendX - Horizontal extension as ratio of screen width (default: 0.26 = 26%)
 * @param {number} options.extendY - Vertical extension as ratio of screen height (default: 0.07 = 7%)
 * @param {number} options.fieldHeightRatio - Field height as ratio of available viewport (default: calculated dynamically)
 * @param {number} options.fieldAspectRatio - Field width/height ratio (default: 0.85)
 * @param {number} options.headerHeight - Header height in pixels (default: calculated as percentage)
 * @param {number} options.controlsHeight - Bottom controls height in pixels (default: calculated as percentage)
 * @param {number} options.safeAreaTop - Safe area top inset (default: 0)
 * @param {number} options.safeAreaBottom - Safe area bottom inset (default: 0)
 * @returns {Object} - Field geometry utilities and constants
 */
export function useFieldGeometry({ 
  extendX = 0.26, // 26% of screen width for horizontal extension
  extendY = 0.07, // 7% of screen height for vertical extension
  fieldHeightRatio = null, // If null, will calculate based on available space
  fieldAspectRatio = 0.85, // Increased from 0.7 to 0.85 for wider field
  headerHeight = null, // If null, will calculate as percentage
  controlsHeight = null, // If null, will calculate as percentage
  safeAreaTop = 0,
  safeAreaBottom = 0
} = {}) {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
  
  // Calculate responsive constants based on screen size
  // Use smaller dimension for consistent scaling across devices
  const SCREEN_MIN = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT);
  const CHIP_SIZE = SCREEN_MIN * 0.05; // 5% of smaller screen dimension (increased from 4% for slightly larger chips)
  const CARD_MARGIN = SCREEN_WIDTH * 0.015; // 1.5% of screen width for minimal padding
  const CARD_PADDING = SCREEN_WIDTH * 0.01; // 1% of screen width for minimal padding
  
  // Calculate header height if not provided (approximately 60-70px, but responsive)
  const calculatedHeaderHeight = headerHeight !== null ? headerHeight : SCREEN_HEIGHT * 0.10; // ~10% of screen height for header
  
  // Field should extend from header all the way to bottom of screen
  // Palette overlays on top, so we don't subtract controls height
  // Calculate available viewport height (screen minus safe areas and header only)
  const availableHeight = SCREEN_HEIGHT - safeAreaTop - safeAreaBottom - calculatedHeaderHeight;
  
  // Calculate field height - use all available space (field extends from header to bottom of screen)
  // The palette will overlay on top of the field
  const maxFieldHeight = availableHeight; // Use 100% of available space - field goes to bottom
  const ratioBasedHeight = fieldHeightRatio !== null ? SCREEN_HEIGHT * fieldHeightRatio : null;
  
  // Use the larger value to maximize field size
  const FIELD_HEIGHT = ratioBasedHeight !== null 
    ? Math.max(ratioBasedHeight, maxFieldHeight)
    : maxFieldHeight;
  
  // Calculate extension values as pixels from ratios
  const extendXPixels = SCREEN_WIDTH * extendX;
  const extendYPixels = SCREEN_HEIGHT * extendY;
  
  // Field dimensions - make field much larger and wider (all percentage-based)
  const FIELD_WIDTH = Math.min(SCREEN_WIDTH * 0.96, FIELD_HEIGHT * fieldAspectRatio); // Much wider field, 96% of screen width
  const CARD_WIDTH = SCREEN_WIDTH - (CARD_MARGIN * 2);
  
  // Field positioning - minimal offset for better balance
  const FIELD_LEFT_OFFSET = CARD_MARGIN; // Minimal offset
  
  // Field bounds with extended safe areas
  const fieldBounds = useMemo(() => ({
    // Base field bounds (visible field) - positioned more to the left
    top: 0,
    bottom: FIELD_HEIGHT,
    left: FIELD_LEFT_OFFSET,
    right: FIELD_LEFT_OFFSET + FIELD_WIDTH,
    
    // Extended bounds for safe interaction areas (percentage-based)
    extendedTop: -extendYPixels,
    extendedBottom: FIELD_HEIGHT + extendYPixels,
    extendedLeft: FIELD_LEFT_OFFSET - extendXPixels,
    extendedRight: FIELD_LEFT_OFFSET + FIELD_WIDTH + extendXPixels,
  }), [FIELD_HEIGHT, FIELD_WIDTH, FIELD_LEFT_OFFSET, extendXPixels, extendYPixels]);
  
  // Field dimensions object
  const fieldDimensions = useMemo(() => ({
    width: FIELD_WIDTH,
    height: FIELD_HEIGHT,
    aspectRatio: fieldAspectRatio,
    cardWidth: CARD_WIDTH,
    cardMargin: CARD_MARGIN,
    cardPadding: CARD_PADDING,
  }), [FIELD_WIDTH, FIELD_HEIGHT, fieldAspectRatio, CARD_WIDTH, CARD_MARGIN, CARD_PADDING]);
  
  // Conversion utilities
  const normalizedToPixels = useMemo(() => {
    return (normalized) => {
      if (!normalized || typeof normalized.x !== 'number' || typeof normalized.y !== 'number') {
        return { x: 0, y: 0 };
      }
      
      return {
        x: fieldBounds.extendedLeft + (normalized.x * (fieldBounds.extendedRight - fieldBounds.extendedLeft)),
        y: fieldBounds.extendedTop + (normalized.y * (fieldBounds.extendedBottom - fieldBounds.extendedTop))
      };
    };
  }, [fieldBounds]);
  
  const pixelsToNormalized = useMemo(() => {
    return (pixels) => {
      if (!pixels || typeof pixels.x !== 'number' || typeof pixels.y !== 'number') {
        return { x: 0, y: 0 };
      }
      
      return {
        x: Math.max(0, Math.min(1, (pixels.x - fieldBounds.extendedLeft) / (fieldBounds.extendedRight - fieldBounds.extendedLeft))),
        y: Math.max(0, Math.min(1, (pixels.y - fieldBounds.extendedTop) / (fieldBounds.extendedBottom - fieldBounds.extendedTop)))
      };
    };
  }, [fieldBounds]);
  
  // Geometry helper functions
  const isWithinField = useMemo(() => {
    return (x, y) => {
      // Use touch overlay bounds for field interaction detection
      const isWithin = x >= touchOverlayBounds.left && x <= touchOverlayBounds.right &&
                       y >= touchOverlayBounds.top && y <= touchOverlayBounds.bottom;
      
      return isWithin;
    };
  }, [touchOverlayBounds]);
  
  const constrainToField = useMemo(() => {
    return (x, y) => {
      return {
        x: Math.max(fieldBounds.extendedLeft, Math.min(x, fieldBounds.extendedRight)),
        y: Math.max(fieldBounds.extendedTop, Math.min(y, fieldBounds.extendedBottom))
      };
    };
  }, [fieldBounds]);
  
  const getFieldCenter = useMemo(() => {
    return () => ({
      x: (fieldBounds.left + fieldBounds.right) / 2,
      y: (fieldBounds.top + fieldBounds.bottom) / 2
    });
  }, [fieldBounds]);
  
  // Touch overlay dimensions for FootballField component
  const touchOverlayDimensions = useMemo(() => ({
    width: SCREEN_WIDTH + 200, // Extended width for touch area
    height: FIELD_HEIGHT + 100, // Extended height for touch area
    left: -CARD_MARGIN + 150,
    top: -50
  }), [SCREEN_WIDTH, FIELD_HEIGHT, CARD_MARGIN]);
  
  // Touch overlay bounds - these should match the actual touch area
  // Make them much more generous to cover the entire screen area
  const touchOverlayBounds = useMemo(() => ({
    left: 0, // Start from screen edge
    right: SCREEN_WIDTH + 400, // Extend well beyond screen width
    top: 0, // Start from screen top
    bottom: SCREEN_HEIGHT + 400 // Extend well beyond screen height
  }), [SCREEN_WIDTH, SCREEN_HEIGHT]);
  
  // Field scale for future zoom/pan features
  const fieldScale = 1;
  
  return useMemo(() => ({
    // Field boundaries
    fieldBounds,
    touchOverlayBounds,
    
    // Field dimensions
    fieldDimensions,
    
    // Standard constants
    chipSize: CHIP_SIZE,
    fieldScale,
    
    // Conversion utilities
    normalizedToPixels,
    pixelsToNormalized,
    
    // Geometry helpers
    isWithinField,
    constrainToField,
    getFieldCenter,
    
    // Touch overlay dimensions
    touchOverlayDimensions,
    
    // Utility functions
    getFieldBounds: () => fieldBounds,
    getFieldDimensions: () => fieldDimensions,
  }), [
    fieldBounds,
    touchOverlayBounds,
    fieldDimensions,
    normalizedToPixels,
    pixelsToNormalized,
    isWithinField,
    constrainToField,
    getFieldCenter,
    touchOverlayDimensions
  ]);
}