/**
 * Player data model utilities and constants
 * Defines the new normalized coordinate system for players and routes
 */

/**
 * Default duration for route segments (in milliseconds)
 */
export const DEFAULT_ROUTE_DURATION = 2000; // 2 seconds

/**
 * Available easing functions for route animations
 */
export const EASING_OPTIONS = {
  LINEAR: 'linear',
  EASE_IN: 'easeIn',
  EASE_OUT: 'easeOut',
  EASE_IN_OUT: 'easeInOut'
};

/**
 * Create a new player with normalized coordinates
 * @param {Object} params - Player creation parameters
 * @param {string} params.position - Position abbreviation (e.g., 'QB', 'WR')
 * @param {Object} params.anchor - Normalized anchor point { x: 0-1, y: 0-1 }
 * @param {string} [params.id] - Optional custom ID
 * @returns {Object} - New player object
 */
export const createPlayer = ({ position, anchor, id = null }) => {
  const playerId = id || `player_${Date.now()}`;
  
  return {
    id: playerId,
    position,
    anchor,
    color: getPositionColor(position),
    track: [], // Main play routes
    preSnapRoutes: [], // Pre-snap movement routes
    timeline: null // Will be populated by play orchestrator
  };
};

/**
 * Create a new route segment
 * @param {Object} params - Route creation parameters
 * @param {Array} params.points - Array of normalized points { x: 0-1, y: 0-1 }
 * @param {number} [params.duration] - Duration in milliseconds
 * @param {string} [params.easing] - Easing function
 * @param {string} [params.id] - Optional custom ID
 * @returns {Object} - New route segment
 */
export const createRouteSegment = ({ 
  points, 
  duration = DEFAULT_ROUTE_DURATION, 
  easing = EASING_OPTIONS.EASE_OUT,
  id = null 
}) => {
  const routeId = id || `route_${Date.now()}`;
  
  return {
    id: routeId,
    points,
    duration,
    easing
  };
};

/**
 * Add a route segment to a player
 * @param {Object} player - Player object
 * @param {Object} routeSegment - Route segment to add
 * @returns {Object} - Updated player with new route segment
 */
export const addRouteToPlayer = (player, routeSegment) => {
  return {
    ...player,
    track: [...player.track, routeSegment]
  };
};

/**
 * Add a pre-snap route to a player
 * @param {Object} player - Player object
 * @param {Object} preSnapRoute - Pre-snap route segment to add
 * @returns {Object} - Updated player with new pre-snap route
 */
export const addPreSnapRouteToPlayer = (player, preSnapRoute) => {
  return {
    ...player,
    preSnapRoutes: [...player.preSnapRoutes, preSnapRoute]
  };
};

/**
 * Remove a route segment from a player
 * @param {Object} player - Player object
 * @param {string} routeId - ID of route segment to remove
 * @returns {Object} - Updated player without the route segment
 */
export const removeRouteFromPlayer = (player, routeId) => {
  return {
    ...player,
    track: player.track.filter(route => route.id !== routeId)
  };
};

/**
 * Update a player's anchor position
 * @param {Object} player - Player object
 * @param {Object} newAnchor - New normalized anchor point { x: 0-1, y: 0-1 }
 * @returns {Object} - Updated player with new anchor
 */
export const updatePlayerAnchor = (player, newAnchor) => {
  return {
    ...player,
    anchor: newAnchor
  };
};

/**
 * Get color for a position (matching PlayerChip logic)
 * @param {string} position - Position abbreviation
 * @returns {string} - Hex color code
 */
export const getPositionColor = (position) => {
  const positionGroup = position?.toUpperCase();
  
  // Defense positions
  if (['DT', 'DE', 'LB', 'CB', 'S', 'NT', 'OLB', 'ILB', 'FS', 'SS'].includes(positionGroup)) {
    return '#000000'; // Black
  }
  
  // Offense positions (except QB)
  if (['WR', 'RB', 'TE', 'OL', 'C', 'G', 'T', 'FB', 'HB'].includes(positionGroup)) {
    return '#DC2626'; // Red
  }
  
  // Quarterback
  if (positionGroup === 'QB') {
    return '#2563EB'; // Blue
  }
  
  // Special teams
  if (['K', 'P', 'LS', 'KR', 'PR'].includes(positionGroup)) {
    return '#059669'; // Green
  }
  
  // Default
  return '#6B7280'; // Gray
};

/**
 * Validate that a normalized coordinate is within bounds (0-1)
 * @param {Object} coordinate - { x: number, y: number }
 * @returns {Object} - Clamped coordinate within bounds
 */
export const clampNormalizedCoordinate = (coordinate) => {
  return {
    x: Math.max(0, Math.min(1, coordinate.x)),
    y: Math.max(0, Math.min(1, coordinate.y))
  };
};

/**
 * Validate that a route segment has valid points
 * @param {Object} routeSegment - Route segment to validate
 * @returns {boolean} - true if route segment is valid
 */
export const validateRouteSegment = (routeSegment) => {
  if (!routeSegment || !routeSegment.points || !Array.isArray(routeSegment.points)) {
    return false;
  }
  
  if (routeSegment.points.length < 2) {
    return false;
  }
  
  // Check that all points are valid normalized coordinates
  return routeSegment.points.every(point => 
    typeof point.x === 'number' && 
    typeof point.y === 'number' &&
    point.x >= 0 && point.x <= 1 &&
    point.y >= 0 && point.y <= 1
  );
};

/**
 * Calculate the total duration of all route segments for a player
 * @param {Object} player - Player object
 * @returns {number} - Total duration in milliseconds
 */
export const getPlayerTotalDuration = (player) => {
  if (!player.track || !Array.isArray(player.track)) {
    return 0;
  }
  
  return player.track.reduce((total, segment) => total + (segment.duration || 0), 0);
};
