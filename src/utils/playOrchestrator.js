/**
 * Play Orchestrator - Multi-agent timeline system for realistic football simulation
 * Coordinates asynchronous player movements with reactive behaviors
 */

/**
 * Create a player timeline with independent phases
 * @param {Object} player - Player object
 * @param {Array} preSnapRoutes - Pre-snap movement routes
 * @param {Array} mainPlayRoutes - Main play routes
 * @param {Object} options - Timeline options
 * @returns {Object} - Player timeline configuration
 */
export const createPlayerTimeline = (player, preSnapRoutes = [], mainPlayRoutes = [], options = {}) => {
  const {
    preSnapDuration = 2000,    // Default 2 seconds for pre-snap motion
    mainPlayDuration = 3000,   // Default 3 seconds for main play
    preSnapStartTime = 0,      // When pre-snap motion begins
    snapTime = 2000,           // When the snap occurs
  } = options;

  return {
    playerId: player.id,
    phases: [
      {
        name: 'preSnap',
        startTime: preSnapStartTime,
        duration: preSnapDuration,
        routes: preSnapRoutes,
        active: preSnapRoutes.length > 0
      },
      {
        name: 'mainPlay',
        startTime: snapTime,
        duration: mainPlayDuration,
        routes: mainPlayRoutes,
        active: mainPlayRoutes.length > 0
      }
    ],
    snapTime,
    totalDuration: Math.max(preSnapStartTime + preSnapDuration, snapTime + mainPlayDuration)
  };
};

/**
 * Get player position at a specific global time
 * @param {Object} timeline - Player timeline configuration
 * @param {number} globalTime - Current global time in milliseconds
 * @returns {Object} - Current position {x, y}
 */
export const getPlayerPositionAtTime = (timeline, globalTime) => {
  if (!timeline || !timeline.phases) {
    return { x: 0, y: 0 };
  }

  // Find the active phase at this time
  const activePhase = timeline.phases.find(phase => {
    const phaseStart = phase.startTime;
    const phaseEnd = phase.startTime + phase.duration;
    
    // Special handling for the snap transition
    if (phase.name === 'preSnap' && globalTime >= timeline.snapTime) {
      return false; // Pre-snap phase ends exactly at snap time
    }
    
    return globalTime >= phaseStart && globalTime < phaseEnd;
  });

  if (!activePhase || !activePhase.active || !activePhase.routes.length) {
    // No active phase or no routes, return anchor position
    // This ensures players without pre-snap routes remain visible at their anchor positions
    return timeline.anchor || { x: 0, y: 0 };
  }

  // Calculate progress within this phase (0-1)
  const phaseProgress = Math.max(0, Math.min(1, 
    (globalTime - activePhase.startTime) / activePhase.duration
  ));

  // Get position from the first route in this phase
  const route = activePhase.routes[0];
  if (!route || !route.points || route.points.length < 2) {
    return timeline.anchor || { x: 0, y: 0 };
  }

  // Use the existing interpolation logic
  return getPositionAlongRoute(route.points, phaseProgress);
};

/**
 * Get position along a route (reusing existing logic)
 * @param {Array} points - Route points
 * @param {number} progress - Progress along route (0-1)
 * @returns {Object} - Position {x, y}
 */
const getPositionAlongRoute = (points, progress) => {
  if (!points || points.length < 2) {
    return { x: 0, y: 0 };
  }

  if (points.length === 2) {
    const p0 = points[0];
    const p1 = points[1];
    return {
      x: p0.x + (p1.x - p0.x) * progress,
      y: p0.y + (p1.y - p0.y) * progress
    };
  }

  // For multiple points, follow the exact path
  const totalSegments = points.length - 1;
  const segmentIndex = Math.floor(progress * totalSegments);
  const segmentProgress = (progress * totalSegments) - segmentIndex;
  
  const clampedSegmentIndex = Math.min(segmentIndex, totalSegments - 1);
  const clampedSegmentProgress = Math.min(segmentProgress, 1);
  
  const p0 = points[clampedSegmentIndex];
  const p1 = points[clampedSegmentIndex + 1];
  
  return {
    x: p0.x + (p1.x - p0.x) * clampedSegmentProgress,
    y: p0.y + (p1.y - p0.y) * clampedSegmentProgress
  };
};

/**
 * Calculate the maximum duration across all player timelines
 * @param {Array} timelines - Array of player timelines
 * @returns {number} - Maximum duration in milliseconds
 */
export const getMaxTimelineDuration = (timelines) => {
  if (!Array.isArray(timelines) || timelines.length === 0) {
    return 5000; // Default 5 seconds
  }

  const maxDuration = Math.max(
    ...timelines.map(timeline => timeline.totalDuration || 0),
    5000 // Minimum 5 seconds
  );

  return maxDuration;
};

/**
 * Get all active players at a specific time
 * @param {Array} timelines - Array of player timelines
 * @param {number} globalTime - Current global time
 * @returns {Array} - Array of active player IDs
 */
export const getActivePlayersAtTime = (timelines, globalTime) => {
  return timelines
    .filter(timeline => {
      return timeline.phases.some(phase => {
        const phaseStart = phase.startTime;
        const phaseEnd = phase.startTime + phase.duration;
        return globalTime >= phaseStart && globalTime <= phaseEnd && phase.active;
      });
    })
    .map(timeline => timeline.playerId);
};

/**
 * Check if a specific player is active at a given time
 * @param {Object} timeline - Player timeline
 * @param {number} globalTime - Current global time
 * @returns {boolean} - Whether the player is active
 */
export const isPlayerActiveAtTime = (timeline, globalTime) => {
  if (!timeline || !timeline.phases) return false;
  
  return timeline.phases.some(phase => {
    const phaseStart = phase.startTime;
    const phaseEnd = phase.startTime + phase.duration;
    return globalTime >= phaseStart && globalTime <= phaseEnd && phase.active;
  });
};
