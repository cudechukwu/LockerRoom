/**
 * Field interactions hook - abstracts all field interaction logic
 * Provides clean, testable interface for field operations
 */

import { useCallback } from 'react';
import { createPlayer, createRouteSegment, addRouteToPlayer } from '../utils/playerDataModel';

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

  return {
    // Player operations
    placePlayer,
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
