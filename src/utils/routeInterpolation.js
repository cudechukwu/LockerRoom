/**
 * Route interpolation utilities for precise player movement along routes
 * Follows the exact path drawn by interpolating between consecutive points
 */

/**
 * Get position along a route segment following the exact path drawn
 * @param {Array} points - Array of route points [{x, y}, {x, y}, ...]
 * @param {number} t - Progress along route (0-1)
 * @param {boolean} smooth - Whether to use smooth curves or exact path (default: false for exact path)
 * @returns {Object} - Interpolated position {x, y}
 */
export const getPositionAtT = (points, t, smooth = false) => {
  if (!points || points.length < 2) {
    return { x: 0, y: 0 };
  }
  
  if (points.length === 2) {
    // Linear interpolation between two points
    const p0 = points[0];
    const p1 = points[1];
    return {
      x: p0.x + (p1.x - p0.x) * t,
      y: p0.y + (p1.y - p0.y) * t
    };
  }
  
  if (smooth) {
    // Use smooth quadratic Bezier curves (old behavior)
    const p0 = points[0];
    const p1 = points[points.length - 1];
    const cx = (p0.x + p1.x) / 2;
    const cy = p0.y;
    
    const x = Math.pow(1 - t, 2) * p0.x + 2 * (1 - t) * t * cx + Math.pow(t, 2) * p1.x;
    const y = Math.pow(1 - t, 2) * p0.y + 2 * (1 - t) * t * cy + Math.pow(t, 2) * p1.y;
    
    return { x, y };
  }
  
  // For multiple points, follow the exact path by interpolating between consecutive points
  // Calculate which segment we're in and the progress within that segment
  const totalSegments = points.length - 1;
  const segmentIndex = Math.floor(t * totalSegments);
  const segmentProgress = (t * totalSegments) - segmentIndex;
  
  // Clamp to valid range
  const clampedSegmentIndex = Math.min(segmentIndex, totalSegments - 1);
  const clampedSegmentProgress = Math.min(segmentProgress, 1);
  
  // Get the two points for this segment
  const p0 = points[clampedSegmentIndex];
  const p1 = points[clampedSegmentIndex + 1];
  
  // Linear interpolation between these two points
  return {
    x: p0.x + (p1.x - p0.x) * clampedSegmentProgress,
    y: p0.y + (p1.y - p0.y) * clampedSegmentProgress
  };
};

/**
 * Get the total duration for a player's route
 * @param {Object} player - Player object with track array
 * @returns {number} - Total duration in milliseconds
 */
export const getPlayerTotalDuration = (player) => {
  if (!player.track || !Array.isArray(player.track)) {
    return 0;
  }
  
  return player.track.reduce((total, segment) => total + (segment.duration || 0), 0);
};

/**
 * Find which route segment a player should be in based on global progress
 * @param {Object} player - Player object with track array
 * @param {number} globalProgress - Global timeline progress (0-1)
 * @returns {Object} - { segmentIndex, segmentProgress }
 */
export const findRouteSegment = (player, globalProgress) => {
  if (!player.track || player.track.length === 0) {
    return { segmentIndex: -1, segmentProgress: 0 };
  }
  
  const totalDuration = getPlayerTotalDuration(player);
  if (totalDuration === 0) {
    return { segmentIndex: 0, segmentProgress: 0 };
  }
  
  // Convert global progress to time
  const currentTime = globalProgress * totalDuration;
  
  let accumulatedTime = 0;
  for (let i = 0; i < player.track.length; i++) {
    const segment = player.track[i];
    const segmentDuration = segment.duration || 0;
    
    if (currentTime <= accumulatedTime + segmentDuration) {
      // Found the segment
      const segmentProgress = segmentDuration > 0 ? 
        (currentTime - accumulatedTime) / segmentDuration : 0;
      return { segmentIndex: i, segmentProgress };
    }
    
    accumulatedTime += segmentDuration;
  }
  
  // If we've exceeded all segments, use the last one at 100%
  return { segmentIndex: player.track.length - 1, segmentProgress: 1 };
};

/**
 * Get a player's current position based on global timeline progress
 * @param {Object} player - Player object with track array
 * @param {number} globalProgress - Global timeline progress (0-1)
 * @returns {Object} - Current position {x, y}
 */
export const getPlayerPositionAtProgress = (player, globalProgress) => {
  if (!player.track || player.track.length === 0) {
    // No route, return anchor position
    return player.anchor || { x: 0, y: 0 };
  }
  
  const { segmentIndex, segmentProgress } = findRouteSegment(player, globalProgress);
  
  if (segmentIndex === -1 || segmentIndex >= player.track.length) {
    return player.anchor || { x: 0, y: 0 };
  }
  
  const segment = player.track[segmentIndex];
  if (!segment.points || segment.points.length < 2) {
    return player.anchor || { x: 0, y: 0 };
  }
  
  // Get interpolated position along this segment
  return getPositionAtT(segment.points, segmentProgress);
};

/**
 * Calculate the maximum duration across all players
 * @param {Array} players - Array of player objects
 * @returns {number} - Maximum duration in milliseconds
 */
export const getMaxDuration = (players) => {
  if (!Array.isArray(players) || players.length === 0) {
    return 5000; // Default 5 seconds
  }
  
  return Math.max(
    ...players.map(player => getPlayerTotalDuration(player)),
    5000 // Minimum 5 seconds
  );
};
