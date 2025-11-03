/**
 * Round-trip test for coordinate conversion
 * Ensures normalized ↔ pixels conversion is consistent
 */

import { useFieldGeometry } from '../../hooks/useFieldGeometry';

// Simple test runner for coordinate conversion
const runCoordinateTests = () => {
  console.log('🧪 Running Coordinate Conversion Tests...');
  
  // Test points
  const testPoints = [
    { x: 0, y: 0 },      // Top-left
    { x: 0.5, y: 0.5 },  // Center
    { x: 1, y: 1 },      // Bottom-right
    { x: 0.25, y: 0.75 }, // Random point
  ];
  
  // Create a mock field geometry (we'll use the actual hook in real testing)
  const mockFieldGeometry = {
    normalizedToPixels: (normalized) => {
      // Mock conversion - in real app this comes from useFieldGeometry
      const SCREEN_WIDTH = 400;
      const FIELD_HEIGHT = 300;
      const FIELD_WIDTH = FIELD_HEIGHT * 0.53;
      const extendX = 100;
      const extendY = 50;
      
      const fieldBounds = {
        extendedLeft: (SCREEN_WIDTH - FIELD_WIDTH) / 2 - extendX,
        extendedRight: (SCREEN_WIDTH + FIELD_WIDTH) / 2 + extendX,
        extendedTop: -extendY,
        extendedBottom: FIELD_HEIGHT + extendY,
      };
      
      return {
        x: fieldBounds.extendedLeft + (normalized.x * (fieldBounds.extendedRight - fieldBounds.extendedLeft)),
        y: fieldBounds.extendedTop + (normalized.y * (fieldBounds.extendedBottom - fieldBounds.extendedTop))
      };
    },
    
    pixelsToNormalized: (pixels) => {
      // Mock conversion - in real app this comes from useFieldGeometry
      const SCREEN_WIDTH = 400;
      const FIELD_HEIGHT = 300;
      const FIELD_WIDTH = FIELD_HEIGHT * 0.53;
      const extendX = 100;
      const extendY = 50;
      
      const fieldBounds = {
        extendedLeft: (SCREEN_WIDTH - FIELD_WIDTH) / 2 - extendX,
        extendedRight: (SCREEN_WIDTH + FIELD_WIDTH) / 2 + extendX,
        extendedTop: -extendY,
        extendedBottom: FIELD_HEIGHT + extendY,
      };
      
      return {
        x: Math.max(0, Math.min(1, (pixels.x - fieldBounds.extendedLeft) / (fieldBounds.extendedRight - fieldBounds.extendedLeft))),
        y: Math.max(0, Math.min(1, (pixels.y - fieldBounds.extendedTop) / (fieldBounds.extendedBottom - fieldBounds.extendedTop)))
      };
    }
  };
  
  // Run round-trip tests
  testPoints.forEach((originalPoint, index) => {
    const pixels = mockFieldGeometry.normalizedToPixels(originalPoint);
    const backToNormalized = mockFieldGeometry.pixelsToNormalized(pixels);
    
    const error = Math.sqrt(
      Math.pow(originalPoint.x - backToNormalized.x, 2) + 
      Math.pow(originalPoint.y - backToNormalized.y, 2)
    );
    
    console.log(`Test ${index + 1}:`, {
      original: originalPoint,
      pixels,
      backToNormalized,
      error,
      passed: error < 0.001
    });
  });
  
  console.log('✅ Coordinate conversion tests completed!');
};

export { runCoordinateTests };
 * Round-trip test for coordinate conversion
 * Ensures normalized ↔ pixels conversion is consistent
 */

import { useFieldGeometry } from '../../hooks/useFieldGeometry';

// Simple test runner for coordinate conversion
const runCoordinateTests = () => {
  console.log('🧪 Running Coordinate Conversion Tests...');
  
  // Test points
  const testPoints = [
    { x: 0, y: 0 },      // Top-left
    { x: 0.5, y: 0.5 },  // Center
    { x: 1, y: 1 },      // Bottom-right
    { x: 0.25, y: 0.75 }, // Random point
  ];
  
  // Create a mock field geometry (we'll use the actual hook in real testing)
  const mockFieldGeometry = {
    normalizedToPixels: (normalized) => {
      // Mock conversion - in real app this comes from useFieldGeometry
      const SCREEN_WIDTH = 400;
      const FIELD_HEIGHT = 300;
      const FIELD_WIDTH = FIELD_HEIGHT * 0.53;
      const extendX = 100;
      const extendY = 50;
      
      const fieldBounds = {
        extendedLeft: (SCREEN_WIDTH - FIELD_WIDTH) / 2 - extendX,
        extendedRight: (SCREEN_WIDTH + FIELD_WIDTH) / 2 + extendX,
        extendedTop: -extendY,
        extendedBottom: FIELD_HEIGHT + extendY,
      };
      
      return {
        x: fieldBounds.extendedLeft + (normalized.x * (fieldBounds.extendedRight - fieldBounds.extendedLeft)),
        y: fieldBounds.extendedTop + (normalized.y * (fieldBounds.extendedBottom - fieldBounds.extendedTop))
      };
    },
    
    pixelsToNormalized: (pixels) => {
      // Mock conversion - in real app this comes from useFieldGeometry
      const SCREEN_WIDTH = 400;
      const FIELD_HEIGHT = 300;
      const FIELD_WIDTH = FIELD_HEIGHT * 0.53;
      const extendX = 100;
      const extendY = 50;
      
      const fieldBounds = {
        extendedLeft: (SCREEN_WIDTH - FIELD_WIDTH) / 2 - extendX,
        extendedRight: (SCREEN_WIDTH + FIELD_WIDTH) / 2 + extendX,
        extendedTop: -extendY,
        extendedBottom: FIELD_HEIGHT + extendY,
      };
      
      return {
        x: Math.max(0, Math.min(1, (pixels.x - fieldBounds.extendedLeft) / (fieldBounds.extendedRight - fieldBounds.extendedLeft))),
        y: Math.max(0, Math.min(1, (pixels.y - fieldBounds.extendedTop) / (fieldBounds.extendedBottom - fieldBounds.extendedTop)))
      };
    }
  };
  
  // Run round-trip tests
  testPoints.forEach((originalPoint, index) => {
    const pixels = mockFieldGeometry.normalizedToPixels(originalPoint);
    const backToNormalized = mockFieldGeometry.pixelsToNormalized(pixels);
    
    const error = Math.sqrt(
      Math.pow(originalPoint.x - backToNormalized.x, 2) + 
      Math.pow(originalPoint.y - backToNormalized.y, 2)
    );
    
    console.log(`Test ${index + 1}:`, {
      original: originalPoint,
      pixels,
      backToNormalized,
      error,
      passed: error < 0.001
    });
  });
  
  console.log('✅ Coordinate conversion tests completed!');
};

export { runCoordinateTests };
