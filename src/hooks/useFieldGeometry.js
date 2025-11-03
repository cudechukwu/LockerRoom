/**
 * Centralized field geometry hook
 * Provides all field-related calculations and utilities with configurable extended bounds
 */

import { useMemo } from 'react';
import { Dimensions } from 'react-native';

/**
 * Main field geometry hook
 * @param {Object} options - Configuration options
 * @param {number} options.extendX - Horizontal extension beyond field bounds (default: 100)
 * @param {number} options.extendY - Vertical extension beyond field bounds (default: 50)
 * @param {number} options.fieldHeightRatio - Field height as ratio of screen height (default: 0.5)
 * @param {number} options.fieldAspectRatio - Field width/height ratio (default: 0.7)
 * @returns {Object} - Field geometry utilities and constants
 */
export function useFieldGeometry({ 
  extendX = 100, 
  extendY = 50, 
  fieldHeightRatio = 0.5,
  fieldAspectRatio = 0.7 // Increased from 0.53 to 0.7 for wider field
} = {}) {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
  
  // Standard constants
  const CHIP_SIZE = 28;
  const CARD_MARGIN = 40;
  const CARD_PADDING = 16;
  
  // Field dimensions - make field wider and position it more to the left
  const FIELD_HEIGHT = SCREEN_HEIGHT * fieldHeightRatio;
  const FIELD_WIDTH = Math.min(SCREEN_WIDTH * 0.8, FIELD_HEIGHT * fieldAspectRatio); // Wider field, max 80% of screen width
  const CARD_WIDTH = SCREEN_WIDTH - (CARD_MARGIN * 2);
  
  // Field positioning - center the field but with some left offset for balance
  const FIELD_LEFT_OFFSET = CARD_MARGIN * 1.6; // Smaller offset for better balance
  
  // Field bounds with extended safe areas
  const fieldBounds = useMemo(() => ({
    // Base field bounds (visible field) - positioned more to the left
    top: 0,
    bottom: FIELD_HEIGHT,
    left: FIELD_LEFT_OFFSET,
    right: FIELD_LEFT_OFFSET + FIELD_WIDTH,
    
    // Extended bounds for safe interaction areas
    extendedTop: -extendY,
    extendedBottom: FIELD_HEIGHT + extendY,
    extendedLeft: FIELD_LEFT_OFFSET - extendX,
    extendedRight: FIELD_LEFT_OFFSET + FIELD_WIDTH + extendX,
  }), [FIELD_HEIGHT, FIELD_WIDTH, FIELD_LEFT_OFFSET, extendX, extendY]);
  
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