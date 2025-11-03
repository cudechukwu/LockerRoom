/**
 * Reactive Trigger System for Defensive Responses
 * Creates realistic football behavior where defensive players react to offensive pre-snap motion
 */

/**
 * Create a reactive trigger configuration
 * @param {Object} config - Trigger configuration
 * @param {string} config.triggerPlayerId - ID of the player whose movement triggers the reaction
 * @param {string} config.responderPlayerId - ID of the player who will react
 * @param {number} config.distanceThreshold - Distance in normalized units (0-1) to trigger reaction
 * @param {number} config.responseDelay - Delay in milliseconds before response starts
 * @param {Array} config.responseRoute - Route points for the defensive response
 * @param {string} config.responseType - Type of response ('follow', 'shift', 'rotate', 'custom')
 * @returns {Object} - Reactive trigger configuration
 */
export const createReactiveTrigger = ({
  triggerPlayerId,
  responderPlayerId,
  distanceThreshold = 0.15, // Default ~15 yards in normalized units
  responseDelay = 500, // Default 0.5 second delay
  responseRoute = [],
  responseType = 'follow'
}) => {
  return {
    id: `trigger_${triggerPlayerId}_${responderPlayerId}_${Date.now()}`,
    triggerPlayerId,
    responderPlayerId,
    distanceThreshold,
    responseDelay,
    responseRoute,
    responseType,
    isActive: false,
    hasTriggered: false,
    triggerTime: null,
    createdAt: new Date().toISOString()
  };
};

/**
 * Calculate distance between two normalized points
 * @param {Object} point1 - First point {x, y}
 * @param {Object} point2 - Second point {x, y}
 * @returns {number} - Distance in normalized units
 */
export const calculateDistance = (point1, point2) => {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Check if a trigger condition is met
 * @param {Object} trigger - Trigger configuration
 * @param {Object} triggerPosition - Current position of trigger player
 * @param {Object} responderPosition - Current position of responder player
 * @param {number} globalTime - Current global time
 * @returns {boolean} - Whether trigger condition is met
 */
export const checkTriggerCondition = (trigger, triggerPosition, responderPosition, globalTime) => {
  if (!triggerPosition || !responderPosition) return false;
  
  const distance = calculateDistance(triggerPosition, responderPosition);
  const isWithinDistance = distance <= trigger.distanceThreshold;
  
  // Only trigger once per play
  if (trigger.hasTriggered) return false;
  
  return isWithinDistance;
};

/**
 * Generate a defensive response route based on trigger type
 * @param {Object} trigger - Trigger configuration
 * @param {Object} triggerPosition - Current position of trigger player
 * @param {Object} responderPosition - Current position of responder player
 * @returns {Array} - Generated response route points
 */
export const generateResponseRoute = (trigger, triggerPosition, responderPosition) => {
  if (trigger.responseRoute && trigger.responseRoute.length > 0) {
    // Use custom route if provided
    return trigger.responseRoute;
  }
  
  // Generate route based on response type
  switch (trigger.responseType) {
    case 'follow':
      // Generate a route that follows the trigger player
      return generateFollowRoute(triggerPosition, responderPosition);
      
    case 'shift':
      // Generate a lateral shift route
      return generateShiftRoute(triggerPosition, responderPosition);
      
    case 'rotate':
      // Generate a rotation route
      return generateRotateRoute(triggerPosition, responderPosition);
      
    default:
      // Default to follow behavior
      return generateFollowRoute(triggerPosition, responderPosition);
  }
};

/**
 * Generate a follow route (cornerback shadows receiver)
 * @param {Object} triggerPosition - Trigger player position
 * @param {Object} responderPosition - Responder player position
 * @returns {Array} - Follow route points
 */
const generateFollowRoute = (triggerPosition, responderPosition) => {
  // Create a route that maintains distance while following
  const followDistance = 0.08; // Maintain ~8 yards distance
  const direction = {
    x: triggerPosition.x - responderPosition.x,
    y: triggerPosition.y - responderPosition.y
  };
  
  // Normalize direction
  const length = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
  if (length > 0) {
    direction.x /= length;
    direction.y /= length;
  }
  
  // Create follow position
  const followPosition = {
    x: triggerPosition.x - (direction.x * followDistance),
    y: triggerPosition.y - (direction.y * followDistance)
  };
  
  return [responderPosition, followPosition];
};

/**
 * Generate a shift route (lateral movement)
 * @param {Object} triggerPosition - Trigger player position
 * @param {Object} responderPosition - Responder player position
 * @returns {Array} - Shift route points
 */
const generateShiftRoute = (triggerPosition, responderPosition) => {
  // Determine shift direction based on trigger position
  const shiftDistance = 0.05; // Shift ~5 yards
  const shiftDirection = triggerPosition.x > responderPosition.x ? 1 : -1;
  
  const shiftPosition = {
    x: responderPosition.x + (shiftDirection * shiftDistance),
    y: responderPosition.y
  };
  
  return [responderPosition, shiftPosition];
};

/**
 * Generate a rotate route (safety rotation)
 * @param {Object} triggerPosition - Trigger player position
 * @param {Object} responderPosition - Responder player position
 * @returns {Array} - Rotate route points
 */
const generateRotateRoute = (triggerPosition, responderPosition) => {
  // Create a rotation that moves toward the trigger player
  const rotationDistance = 0.06; // Rotate ~6 yards
  const direction = {
    x: triggerPosition.x - responderPosition.x,
    y: triggerPosition.y - responderPosition.y
  };
  
  // Normalize direction
  const length = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
  if (length > 0) {
    direction.x /= length;
    direction.y /= length;
  }
  
  const rotatePosition = {
    x: responderPosition.x + (direction.x * rotationDistance),
    y: responderPosition.y + (direction.y * rotationDistance)
  };
  
  return [responderPosition, rotatePosition];
};

/**
 * Update trigger state based on current game state
 * @param {Object} trigger - Trigger configuration
 * @param {Object} triggerPosition - Current trigger player position
 * @param {Object} responderPosition - Current responder player position
 * @param {number} globalTime - Current global time
 * @returns {Object} - Updated trigger state
 */
export const updateTriggerState = (trigger, triggerPosition, responderPosition, globalTime) => {
  const updatedTrigger = { ...trigger };
  
  // Check if trigger condition is met
  if (checkTriggerCondition(trigger, triggerPosition, responderPosition, globalTime)) {
    if (!trigger.hasTriggered) {
      updatedTrigger.hasTriggered = true;
      updatedTrigger.triggerTime = globalTime;
      updatedTrigger.isActive = true;
      
      // Generate response route
      updatedTrigger.responseRoute = generateResponseRoute(trigger, triggerPosition, responderPosition);
      
      console.log(`🎯 Trigger activated: ${trigger.responderPlayerId} responding to ${trigger.triggerPlayerId}`);
    }
  }
  
  return updatedTrigger;
};

/**
 * Get all active triggers for a specific responder player
 * @param {Array} triggers - Array of all triggers
 * @param {string} responderPlayerId - Player ID to get triggers for
 * @returns {Array} - Active triggers for the responder
 */
export const getActiveTriggersForPlayer = (triggers, responderPlayerId) => {
  return triggers.filter(trigger => 
    trigger.responderPlayerId === responderPlayerId && trigger.isActive
  );
};

/**
 * Validate trigger configuration
 * @param {Object} trigger - Trigger configuration to validate
 * @returns {boolean} - Whether trigger is valid
 */
export const validateTrigger = (trigger) => {
  if (!trigger.triggerPlayerId || !trigger.responderPlayerId) return false;
  if (trigger.distanceThreshold <= 0 || trigger.distanceThreshold > 1) return false;
  if (trigger.responseDelay < 0) return false;
  return true;
};
