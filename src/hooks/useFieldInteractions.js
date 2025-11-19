/**
 * Field interactions hook - abstracts all field interaction logic
 * Provides clean, testable interface for field operations
 */

import { useCallback } from 'react';
import { createPlayer, createRouteSegment, addRouteToPlayer } from '../utils/playerDataModel';
import { 
  checkFormationCollisions, 
  detectOffensiveStrongSide,
  getFormationWithStrongSide 
} from '../utils/footballFormations';

/**
 * Main field interactions hook
 * @param {Array} players - Current players array
 * @param {Function} setPlayers - State setter for players
 * @param {Object} fieldGeometry - Field geometry utilities
 * @param {Object} interactionState - Current interaction state
 * @param {Function} setInteractionState - State setter for interactions
 * @returns {Object} - Field interaction methods
 */
export function useFieldInteractions(players, setPlayers, fieldGeometry, interactionState, setInteractionState) {
  const {
    isDrawingRoute,
    isDrawingCurrentRoute,
    selectedPlayer,
    selectedChip,
    isDeleteMode,
    currentRoute
  } = interactionState;

  /**
   * Place a new player on the field
   * @param {Object} position - Player position object
   * @param {Object} location - { x: number, y: number } in pixels
   */
  const placePlayer = useCallback((position, location) => {
    if (!position || !location) return;

    const normalizedPoint = fieldGeometry.pixelsToNormalized(location);
    const clampedAnchor = {
      x: Math.max(0, Math.min(1, normalizedPoint.x)),
      y: Math.max(0, Math.min(1, normalizedPoint.y))
    };

    const newPlayer = createPlayer({
      position,
      anchor: clampedAnchor
    });

    setPlayers(prev => [...prev, newPlayer]);
  }, [fieldGeometry, setPlayers]);

  /**
   * Delete a player from the field
   * @param {string} playerId - ID of player to delete
   */
  const deletePlayer = useCallback((playerId) => {
    setPlayers(prev => prev.filter(p => p.id !== playerId));
  }, [setPlayers]);

  /**
   * Start drawing a route for a player
   * @param {string} playerId - ID of player to draw route for
   */
  const startRoute = useCallback((playerId) => {
    setInteractionState(prev => ({
      ...prev,
      selectedPlayer: playerId,
      isDrawingCurrentRoute: true,
      currentRoute: []
    }));
  }, [setInteractionState]);

  /**
   * Add a point to the current route being drawn
   * @param {Object} location - { x: number, y: number } in pixels
   */
  const updateRoute = useCallback((location) => {
    if (!isDrawingCurrentRoute || !selectedPlayer || !location) return;

    const normalizedPoint = fieldGeometry.pixelsToNormalized(location);
    setInteractionState(prev => ({
      ...prev,
      currentRoute: [...prev.currentRoute, normalizedPoint]
    }));
  }, [isDrawingCurrentRoute, selectedPlayer, fieldGeometry, setInteractionState]);

  /**
   * Complete the current route being drawn
   */
  const completeRoute = useCallback(() => {
    if (!selectedPlayer || !currentRoute || currentRoute.length === 0) return;

    const routeSegment = createRouteSegment({
      points: currentRoute
    });

    setPlayers(prev => prev.map(player => {
      if (player.id === selectedPlayer) {
        return addRouteToPlayer(player, routeSegment);
      }
      return player;
    }));

    setInteractionState(prev => ({
      ...prev,
      selectedPlayer: null,
      isDrawingCurrentRoute: false,
      currentRoute: []
    }));
  }, [selectedPlayer, currentRoute, setPlayers, setInteractionState]);

  /**
   * Cancel the current route being drawn
   */
  const cancelRoute = useCallback(() => {
    setInteractionState(prev => ({
      ...prev,
      selectedPlayer: null,
      isDrawingCurrentRoute: false,
      currentRoute: []
    }));
  }, [setInteractionState]);

  /**
   * Clear all players from the field
   */
  const clearAll = useCallback(() => {
    setPlayers([]);
    setInteractionState(prev => ({
      ...prev,
      selectedPlayer: null,
      currentRoute: []
    }));
  }, [setPlayers, setInteractionState]);

  /**
   * Select a player for interaction
   * @param {string} playerId - ID of player to select
   */
  const selectPlayer = useCallback((playerId) => {
    setInteractionState(prev => ({
      ...prev,
      selectedPlayer: playerId
    }));
  }, [setInteractionState]);

  /**
   * Toggle route drawing mode
   */
  const toggleRouteDrawing = useCallback(() => {
    setInteractionState(prev => ({
      ...prev,
      isDrawingRoute: !prev.isDrawingRoute,
      selectedPlayer: null,
      isDrawingCurrentRoute: false,
      currentRoute: [],
      isDeleteMode: false // Exit delete mode when entering route mode
    }));
  }, [setInteractionState]);

  /**
   * Toggle delete mode
   */
  const toggleDeleteMode = useCallback(() => {
    setInteractionState(prev => ({
      ...prev,
      isDeleteMode: !prev.isDeleteMode,
      isDrawingRoute: false, // Exit route mode when entering delete mode
      selectedPlayer: null,
      isDrawingCurrentRoute: false,
      currentRoute: []
    }));
  }, [setInteractionState]);

  /**
   * Set the selected chip for player placement
   * @param {Object} position - Position object to select
   */
  const setSelectedChip = useCallback((position) => {
    setInteractionState(prev => ({
      ...prev,
      selectedChip: position
    }));
  }, [setInteractionState]);

  /**
   * Place a formation on the field
   * @param {Object} formation - Formation object from footballFormations
   * @param {Object} centerLocation - { x: number, y: number } in pixels (center point)
   * @returns {boolean} - Whether placement was successful
   */
  const placeFormation = useCallback((formation, centerLocation) => {
    if (!formation || !centerLocation || !formation.players) return false;

    // Convert center point to normalized coordinates
    const normalizedCenter = fieldGeometry.pixelsToNormalized(centerLocation);
    
    // For defensive formations, auto-detect offensive strong side and orient defense
    let formationToPlace = formation;
    if (formation.type === 'defense' && formation.hasStrongSide) {
      const detectedStrongSide = detectOffensiveStrongSide(players);
      if (detectedStrongSide) {
        // Auto-orient defense based on offensive strong side
        // Defense should align SAM to TE (strong side), WILL to weak side
        formationToPlace = getFormationWithStrongSide(formation, detectedStrongSide);
        console.log(`Auto-oriented defense to match offensive strong side: ${detectedStrongSide}`);
      }
    }
    
    // Check for collisions before placing
    const collisionCheck = checkFormationCollisions(
      formationToPlace,
      normalizedCenter,
      players,
      fieldGeometry
    );

    if (collisionCheck.hasCollision) {
      // Log collisions for debugging
      console.warn('Formation placement blocked by collisions:', collisionCheck.collisions);
      return false;
    }

    // Create all players in the formation with unique IDs
    const baseTimestamp = Date.now();
    const isDefense = formationToPlace.type === 'defense';
    
    const newPlayers = formationToPlace.players.map((playerDef, index) => {
      // Calculate player position relative to center
      const playerX = normalizedCenter.x + playerDef.offsetX;
      
      // For defensive formations, flip Y coordinates so they face the offense
      // Defense should have DL in front (closer to offense) and LBs/DBs behind
      // If offense is at bottom (higher Y), defense DL should be at higher Y, LBs at lower Y
      const playerY = isDefense 
        ? normalizedCenter.y - playerDef.offsetY  // Flip Y: DL (offsetY=0) stays at center, LBs (positive offsetY) go behind
        : normalizedCenter.y + playerDef.offsetY; // Offense: players go deeper (positive offsetY)

      // Clamp to field boundaries
      const clampedAnchor = {
        x: Math.max(0, Math.min(1, playerX)),
        y: Math.max(0, Math.min(1, playerY))
      };

      // Generate unique ID by combining timestamp with index and random component
      const uniqueId = `player_${baseTimestamp}_${index}_${Math.random().toString(36).slice(2, 11)}`;

      // Create player with position and unique ID
      const player = createPlayer({
        position: playerDef.position,
        anchor: clampedAnchor,
        id: uniqueId
      });

      // Add label if provided (e.g., "WR1", "QB", "SAM")
      if (playerDef.label) {
        // Store label in player data for potential future use
        player.label = playerDef.label;
      }

      // Store group information for potential group operations
      if (playerDef.group) {
        player.group = playerDef.group;
      }

      return player;
    });

    // Add all players to the field
    setPlayers(prev => [...prev, ...newPlayers]);
    return true;
  }, [fieldGeometry, players, setPlayers]);

  return {
    // Player operations
    placePlayer,
    placeFormation,
    deletePlayer,
    selectPlayer,
    clearAll,

    // Route operations
    startRoute,
    updateRoute,
    completeRoute,
    cancelRoute,

    // Mode operations
    toggleRouteDrawing,
    toggleDeleteMode,
    setSelectedChip,

    // State getters
    isDrawingRoute,
    isDrawingCurrentRoute,
    selectedPlayer,
    selectedChip,
    isDeleteMode,
    currentRoute
  };
}
