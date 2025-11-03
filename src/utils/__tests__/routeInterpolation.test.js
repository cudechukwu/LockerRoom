/**
 * Basic tests for route interpolation functionality
 * These are simple validation tests to ensure the math works correctly
 */

import { getPositionAtT, getPlayerTotalDuration, findRouteSegment } from '../routeInterpolation';

// Simple test runner
const runTests = () => {
  console.log('🧪 Running Route Interpolation Tests...');
  
  // Test 1: Linear interpolation between two points
  const points = [{ x: 0, y: 0 }, { x: 1, y: 1 }];
  const position = getPositionAtT(points, 0.5);
  console.log('Test 1 - Linear interpolation:', position);
  console.log('Expected: { x: 0.5, y: 0.5 }, Got:', position);
  
  // Test 2: Player duration calculation
  const mockPlayer = {
    track: [
      { duration: 1000 },
      { duration: 2000 },
      { duration: 1500 }
    ]
  };
  const duration = getPlayerTotalDuration(mockPlayer);
  console.log('Test 2 - Player duration:', duration);
  console.log('Expected: 4500, Got:', duration);
  
  // Test 3: Route segment finding
  const segment = findRouteSegment(mockPlayer, 0.6); // 60% through total duration
  console.log('Test 3 - Route segment:', segment);
  console.log('Expected: segmentIndex around 1, Got:', segment);
  
  console.log('✅ Tests completed!');
};

export { runTests };
