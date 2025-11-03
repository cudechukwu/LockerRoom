/**
 * Migration helper for converting old pixel-based player data to normalized coordinates
 * Maintains backward compatibility during the transition period
 */

import { pixelsToNormalized, convertPixelRouteToNormalized } from './coordinateUtils';

/**
 * Check if player data is in the old format (pixel-based)
 * @param {Object} player - Player object
 * @returns {boolean} - true if data is in old format
 */
export const isOldFormat = (player) => {
  // Old format has x, y as direct properties and routes as arrays of pixel points
  return (
    player.hasOwnProperty('x') && 
    player.hasOwnProperty('y') && 
    typeof player.x === 'number' && 
    typeof player.y === 'number' &&
    player.routes && 
    Array.isArray(player.routes) &&
    player.routes.length > 0 &&
    Array.isArray(player.routes[0]) &&
    player.routes[0].length > 0 &&
    player.routes[0][0].hasOwnProperty('x') &&
    player.routes[0][0].hasOwnProperty('y')
  );
};

/**
 * Migrate a single player from old format to new format
 * @param {Object} oldPlayer - Player in old format
 * @returns {Object} - Player in new format
 */
export const migratePlayer = (oldPlayer) => {
  if (!isOldFormat(oldPlayer)) {
    // Already in new format, return as-is
    return oldPlayer;
  }

  // Convert anchor point from pixels to normalized
  const anchor = pixelsToNormalized({ x: oldPlayer.x, y: oldPlayer.y });

  // Convert routes from pixel arrays to normalized route segments
  const track = oldPlayer.routes.map((route, index) => ({
    id: `route_${index + 1}`,
    points: convertPixelRouteToNormalized(route),
    duration: 2000, // Default 2 seconds
    easing: 'easeOut' // Default easing
  }));

  // Extract position string from position object
  const position = typeof oldPlayer.position === 'object' ? 
    oldPlayer.position.pos || oldPlayer.position.abbreviation || 'UNKNOWN' : 
    oldPlayer.position;

  // Generate color based on position
  const color = getPositionColor(position);

  return {
    id: oldPlayer.id,
    position,
    anchor,
    color,
    track,
    // Keep any additional properties
    ...(oldPlayer.speed && { speed: oldPlayer.speed }),
    ...(oldPlayer.delay && { delay: oldPlayer.delay })
  };
};

/**
 * Get color for a position (matching PlayerChip logic)
 * @param {string} position - Position abbreviation
 * @returns {string} - Hex color code
 */
const getPositionColor = (position) => {
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
 * Migrate an array of players from old format to new format
 * @param {Array} players - Array of players (mixed old/new format)
 * @returns {Array} - Array of players in new format
 */
export const migratePlayers = (players) => {
  if (!Array.isArray(players)) {
    return [];
  }
  
  return players.map(migratePlayer);
};

/**
 * Migrate a single route from old format to new format
 * @param {Array} oldRoute - Route as array of pixel points
 * @returns {Object} - Route segment in new format
 */
export const migrateRoute = (oldRoute) => {
  if (!Array.isArray(oldRoute) || oldRoute.length === 0) {
    return null;
  }

  return {
    id: `route_${Date.now()}`,
    points: convertPixelRouteToNormalized(oldRoute),
    duration: 2000,
    easing: 'easeOut'
  };
};
