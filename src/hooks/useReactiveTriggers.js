/**
 * Hook for managing reactive triggers and defensive responses
 * Provides a clean API for setting up and managing defensive reactions
 */

import { useState, useCallback, useMemo } from 'react';
import {
  createReactiveTrigger,
  updateTriggerState,
  getActiveTriggersForPlayer,
  validateTrigger
} from '../utils/reactiveTriggers';

/**
 * Hook for managing reactive triggers
 * @param {Array} players - Array of all players
 * @returns {Object} - Trigger management functions and state
 */
export function useReactiveTriggers(players) {
  const [triggers, setTriggers] = useState([]);
  const [activeResponses, setActiveResponses] = useState({});

  /**
   * Add a new reactive trigger
   * @param {Object} config - Trigger configuration
   * @returns {boolean} - Whether trigger was successfully added
   */
  const addTrigger = useCallback((config) => {
    const trigger = createReactiveTrigger(config);
    
    if (!validateTrigger(trigger)) {
      console.error('Invalid trigger configuration:', config);
      return false;
    }
    
    setTriggers(prev => [...prev, trigger]);
    console.log(`✅ Added reactive trigger: ${trigger.responderPlayerId} responds to ${trigger.triggerPlayerId}`);
    return true;
  }, []);

  /**
   * Remove a reactive trigger
   * @param {string} triggerId - ID of trigger to remove
   */
  const removeTrigger = useCallback((triggerId) => {
    setTriggers(prev => prev.filter(trigger => trigger.id !== triggerId));
    console.log(`🗑️ Removed reactive trigger: ${triggerId}`);
  }, []);

  /**
   * Update trigger state based on current game state
   * @param {Object} playerPositions - Current positions of all players
   * @param {number} globalTime - Current global time
   */
  const updateTriggers = useCallback((playerPositions, globalTime) => {
    setTriggers(prev => prev.map(trigger => {
      const triggerPosition = playerPositions[trigger.triggerPlayerId];
      const responderPosition = playerPositions[trigger.responderPlayerId];
      
      return updateTriggerState(trigger, triggerPosition, responderPosition, globalTime);
    }));
  }, []);

  /**
   * Get active responses for a specific player
   * @param {string} playerId - Player ID to get responses for
   * @returns {Array} - Active response routes for the player
   */
  const getPlayerResponses = useCallback((playerId) => {
    const activeTriggers = getActiveTriggersForPlayer(triggers, playerId);
    return activeTriggers.map(trigger => ({
      id: trigger.id,
      route: trigger.responseRoute,
      type: trigger.responseType,
      triggerTime: trigger.triggerTime
    }));
  }, [triggers]);

  /**
   * Clear all triggers
   */
  const clearAllTriggers = useCallback(() => {
    setTriggers([]);
    setActiveResponses({});
    console.log('🧹 Cleared all reactive triggers');
  }, []);

  /**
   * Get trigger statistics
   * @returns {Object} - Trigger statistics
   */
  const getTriggerStats = useCallback(() => {
    const totalTriggers = triggers.length;
    const activeTriggers = triggers.filter(t => t.isActive).length;
    const triggeredCount = triggers.filter(t => t.hasTriggered).length;
    
    return {
      total: totalTriggers,
      active: activeTriggers,
      triggered: triggeredCount,
      pending: totalTriggers - triggeredCount
    };
  }, [triggers]);

  /**
   * Get all triggers for a specific player (as trigger or responder)
   * @param {string} playerId - Player ID
   * @returns {Object} - Triggers where player is trigger or responder
   */
  const getPlayerTriggers = useCallback((playerId) => {
    return triggers.filter(trigger => 
      trigger.triggerPlayerId === playerId || trigger.responderPlayerId === playerId
    );
  }, [triggers]);

  /**
   * Create a quick defensive response setup
   * @param {string} offensivePlayerId - Offensive player ID
   * @param {string} defensivePlayerId - Defensive player ID
   * @param {string} responseType - Type of response ('follow', 'shift', 'rotate')
   * @returns {boolean} - Whether trigger was successfully created
   */
  const createQuickResponse = useCallback((offensivePlayerId, defensivePlayerId, responseType = 'follow') => {
    const config = {
      triggerPlayerId: offensivePlayerId,
      responderPlayerId: defensivePlayerId,
      responseType,
      distanceThreshold: 0.12, // Default ~12 yards
      responseDelay: 300 // Default 0.3 second delay
    };
    
    return addTrigger(config);
  }, [addTrigger]);

  /**
   * Get defensive players (players with defensive positions)
   * @returns {Array} - Array of defensive players
   */
  const getDefensivePlayers = useMemo(() => {
    const defensivePositions = ['DT', 'DE', 'LB', 'CB', 'S', 'NT', 'OLB', 'ILB', 'FS', 'SS'];
    return players.filter(player => 
      defensivePositions.includes(player.position?.toUpperCase())
    );
  }, [players]);

  /**
   * Get offensive players (players with offensive positions)
   * @returns {Array} - Array of offensive players
   */
  const getOffensivePlayers = useMemo(() => {
    const offensivePositions = ['QB', 'WR', 'RB', 'TE', 'OL', 'C', 'G', 'T', 'FB', 'HB'];
    return players.filter(player => 
      offensivePositions.includes(player.position?.toUpperCase())
    );
  }, [players]);

  return {
    // Trigger management
    triggers,
    addTrigger,
    removeTrigger,
    clearAllTriggers,
    
    // Trigger state
    updateTriggers,
    getPlayerResponses,
    getPlayerTriggers,
    
    // Quick setup
    createQuickResponse,
    
    // Player filtering
    getDefensivePlayers,
    getOffensivePlayers,
    
    // Statistics
    getTriggerStats,
    
    // State
    activeResponses
  };
}
