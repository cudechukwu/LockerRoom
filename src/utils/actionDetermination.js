/**
 * Action determination utilities for field interactions
 * Determines what action to take based on current state and tap location
 */

/**
 * Determine what action to take based on current state and tap location
 * @param {Object} params - Action determination parameters
 * @param {number} params.x - Tap X coordinate
 * @param {number} params.y - Tap Y coordinate
 * @param {Array} params.players - Current players array
 * @param {Object} params.fieldGeometry - Field geometry utilities
 * @param {Object} params.interactionState - Current interaction state
 * @returns {Object} - Action result with type and data
 */
export const determineAction = ({ x, y, players, fieldGeometry, interactionState }) => {
  const { isDrawingRoute, isDrawingCurrentRoute, selectedPlayer, selectedChip, isDeleteMode } = interactionState;

  // Find if there's a player at the tap location
  const playerAtLocation = findPlayerAtLocation(x, y, players, fieldGeometry);

  // Route drawing mode logic
  if (isDrawingRoute) {
    if (isDrawingCurrentRoute && selectedPlayer) {
      // Currently drawing a route, add point
      return {
        type: 'updateRoute',
        data: { location: { x, y } }
      };
    }
    
    if (playerAtLocation) {
      // Found a player, start drawing route for them
      return {
        type: 'startRoute',
        data: { playerId: playerAtLocation.id }
      };
    }
    
    // No player found, no action
    return { type: 'none', data: null };
  }

  // Delete mode logic
  if (isDeleteMode) {
    if (playerAtLocation) {
      return {
        type: 'deletePlayer',
        data: { playerId: playerAtLocation.id }
      };
    }
    return { type: 'none', data: null };
  }

  // Normal mode logic
  if (selectedChip) {
    // Have a chip selected, place player
    return {
      type: 'placePlayer',
      data: { position: selectedChip, location: { x, y } }
    };
  }

  // No action available
  return { type: 'none', data: null };
};

/**
 * Find if there's a player at the given location
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {Array} players - Current players array
 * @param {Object} fieldGeometry - Field geometry utilities
 * @returns {Object|null} - Player at location or null
 */
export const findPlayerAtLocation = (x, y, players, fieldGeometry) => {
  return players.find(player => {
    const playerPixels = fieldGeometry.normalizedToPixels(player.anchor);
    const distance = Math.sqrt(
      Math.pow(playerPixels.x - x, 2) + Math.pow(playerPixels.y - y, 2)
    );
    return distance < fieldGeometry.chipSize;
  });
};

/**
 * Get action description for debugging
 * @param {Object} action - Action object with type and data
 * @returns {string} - Human-readable action description
 */
export const getActionDescription = (action) => {
  switch (action.type) {
    case 'placePlayer':
      return `Place ${action.data.position} player at (${action.data.location.x}, ${action.data.location.y})`;
    case 'deletePlayer':
      return `Delete player ${action.data.playerId}`;
    case 'startRoute':
      return `Start route for player ${action.data.playerId}`;
    case 'updateRoute':
      return `Add route point at (${action.data.location.x}, ${action.data.location.y})`;
    case 'none':
      return 'No action';
    default:
      return `Unknown action: ${action.type}`;
  }
};
