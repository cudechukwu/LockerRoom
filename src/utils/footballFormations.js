/**
 * Football Formations Presets
 * Provides preset formations with true football spacing rules
 * Supports mirroring/flipping for strong/weak side variations
 */

// Football spacing constants (in normalized coordinates 0-1)
// These represent actual field spacing, not just ratios
const SPACING = {
  // Offensive Line
  OL_GAP: 0.045,
  OL_TO_EDGE: 0.065,
  
  // Depth layering
  QB_DEPTH: 0.07,
  RB_DEPTH: 0.10,
  FB_DEPTH: 0.125,
  
  // Receivers
  WR_SIDELINE: 0.30,
  WR_INSIDE: 0.18,
  WR_SLOT: 0.12,
  WR_TRIPS_STACK: 0.05,
  WR_TRIPS_STAGGER: 0.03,
  
  // TE
  TE_INLINE: 0.03,
  TE_WING: 0.045,

  // Shotgun/Pistol
  SHOTGUN_DEPTH: 0.08,
  PISTOL_DEPTH: 0.06,

  // Defense
  DL_GAP: 0.05,
  LB_DEPTH: 0.075,
  LB_WIDTH: 0.13,
  CB_WIDTH: 0.22,
  S_DEPTH: 0.12,
  S_WIDTH: 0.16,
};


/**
 * Create a formation with proper spacing
 * @param {string} id - Formation ID
 * @param {string} name - Formation name
 * @param {string} type - 'offense' or 'defense'
 * @param {Array} players - Array of player definitions with offsets
 * @param {Object} options - Formation options
 * @returns {Object} - Formation object
 */
const createFormation = (id, name, type, players, options = {}) => {
  return {
    id,
    name,
    type,
    players,
    supportsMirror: options.supportsMirror !== false, // Default true
    hasStrongSide: options.hasStrongSide || false,
    ...options
  };
};

/**
 * Flip formation horizontally (mirror)
 * @param {Array} players - Original player array
 * @returns {Array} - Flipped player array
 */
const flipFormation = (players) => {
  return players.map(player => ({
    ...player,
    offsetX: -player.offsetX, // Flip X coordinate
    // Y stays the same (depth doesn't flip)
  }));
};

// ==================== OFFENSIVE FORMATIONS ====================

/**
 * 1. Shotgun (2x2)
 * QB in shotgun, 2 WR left, 2 WR right, RB next to QB
 */
export const SHOTGUN_2X2 = createFormation(
  'shotgun-2x2',
  'Shotgun (2x2)',
  'offense',
  [
    // Offensive Line (centered, fixed spacing)
    { position: 'C', offsetX: 0, offsetY: 0, group: 'OL' },
    { position: 'LG', offsetX: -SPACING.OL_GAP, offsetY: 0, group: 'OL' },
    { position: 'RG', offsetX: SPACING.OL_GAP, offsetY: 0, group: 'OL' },
    { position: 'LT', offsetX: -SPACING.OL_GAP * 2, offsetY: 0, group: 'OL' },
    { position: 'RT', offsetX: SPACING.OL_GAP * 2, offsetY: 0, group: 'OL' },
    
    // Backfield
    { position: 'QB', offsetX: 0, offsetY: SPACING.SHOTGUN_DEPTH, group: 'backfield' },
    { position: 'RB', offsetX: SPACING.OL_GAP, offsetY: SPACING.SHOTGUN_DEPTH, group: 'backfield' },
    
    // Wide Receivers (2x2)
    { position: 'WR', offsetX: -SPACING.WR_SIDELINE, offsetY: 0, group: 'WR-left', label: 'WR1' },
    { position: 'WR', offsetX: -SPACING.WR_INSIDE, offsetY: 0, group: 'WR-left', label: 'WR2' },
    { position: 'WR', offsetX: SPACING.WR_INSIDE, offsetY: 0, group: 'WR-right', label: 'WR3' },
    { position: 'WR', offsetX: SPACING.WR_SIDELINE, offsetY: 0, group: 'WR-right', label: 'WR4' },
  ],
  { supportsMirror: true }
);

/**
 * 2. Shotgun Trips Right
 * 3 WR stack on right, 1 WR on left, RB next to QB
 */
export const SHOTGUN_TRIPS_RIGHT = createFormation(
  'shotgun-trips-right',
  'Shotgun Trips Right',
  'offense',
  [
    // Offensive Line
    { position: 'C', offsetX: 0, offsetY: 0, group: 'OL' },
    { position: 'LG', offsetX: -SPACING.OL_GAP, offsetY: 0, group: 'OL' },
    { position: 'RG', offsetX: SPACING.OL_GAP, offsetY: 0, group: 'OL' },
    { position: 'LT', offsetX: -SPACING.OL_GAP * 2, offsetY: 0, group: 'OL' },
    { position: 'RT', offsetX: SPACING.OL_GAP * 2, offsetY: 0, group: 'OL' },
    
    // Backfield
    { position: 'QB', offsetX: 0, offsetY: SPACING.SHOTGUN_DEPTH, group: 'backfield' },
    { position: 'RB', offsetX: -SPACING.OL_GAP, offsetY: SPACING.SHOTGUN_DEPTH, group: 'backfield' },
    
    // Wide Receivers - Trips Right (stacked)
    { position: 'WR', offsetX: SPACING.WR_SIDELINE, offsetY: 0, group: 'WR-trips', label: 'WR1' },
    { position: 'WR', offsetX: SPACING.WR_INSIDE, offsetY: -SPACING.WR_TRIPS_STACK, group: 'WR-trips', label: 'WR2' },
    { position: 'WR', offsetX: SPACING.WR_SLOT, offsetY: -SPACING.WR_TRIPS_STACK * 2, group: 'WR-trips', label: 'WR3' },
    
    // Single WR Left
    { position: 'WR', offsetX: -SPACING.WR_SIDELINE, offsetY: 0, group: 'WR-single', label: 'WR4' },
  ],
  { supportsMirror: true, hasStrongSide: true, strongSide: 'right' }
);

/**
 * 3. Shotgun (Doubles + TE)
 * TE inline, 2 WR on TE side, 1 WR opposite
 */
export const SHOTGUN_DOUBLES_TE = createFormation(
  'shotgun-doubles-te',
  'Shotgun (Doubles + TE)',
  'offense',
  [
    // Offensive Line
    { position: 'C', offsetX: 0, offsetY: 0, group: 'OL' },
    { position: 'LG', offsetX: -SPACING.OL_GAP, offsetY: 0, group: 'OL' },
    { position: 'RG', offsetX: SPACING.OL_GAP, offsetY: 0, group: 'OL' },
    { position: 'LT', offsetX: -SPACING.OL_GAP * 2, offsetY: 0, group: 'OL' },
    { position: 'RT', offsetX: SPACING.OL_GAP * 2, offsetY: 0, group: 'OL' },
    
    // Backfield
    { position: 'QB', offsetX: 0, offsetY: SPACING.SHOTGUN_DEPTH, group: 'backfield' },
    { position: 'RB', offsetX: -SPACING.OL_GAP, offsetY: SPACING.SHOTGUN_DEPTH, group: 'backfield' },
    
    // TE inline right
    { position: 'TE', offsetX: SPACING.OL_GAP * 2 + SPACING.TE_INLINE, offsetY: 0, group: 'TE-inline' },
    
    // 2 WR on TE side (right)
    { position: 'WR', offsetX: SPACING.WR_INSIDE, offsetY: 0, group: 'WR-doubles', label: 'WR1' },
    { position: 'WR', offsetX: SPACING.WR_SIDELINE, offsetY: 0, group: 'WR-doubles', label: 'WR2' },
    
    // 1 WR opposite (left)
    { position: 'WR', offsetX: -SPACING.WR_SIDELINE, offsetY: 0, group: 'WR-single', label: 'WR3' },
  ],
  { supportsMirror: true, hasStrongSide: true, strongSide: 'right' }
);

/**
 * 4. I-Formation (Pro Style)
 * QB under center, RB behind FB, behind QB, 2 WR wide, 1 TE
 */
export const I_FORMATION = createFormation(
  'i-formation',
  'I-Formation (Pro Style)',
  'offense',
  [
    // Offensive Line
    { position: 'C', offsetX: 0, offsetY: 0, group: 'OL' },
    { position: 'LG', offsetX: -SPACING.OL_GAP, offsetY: 0, group: 'OL' },
    { position: 'RG', offsetX: SPACING.OL_GAP, offsetY: 0, group: 'OL' },
    { position: 'LT', offsetX: -SPACING.OL_GAP * 2, offsetY: 0, group: 'OL' },
    { position: 'RT', offsetX: SPACING.OL_GAP * 2, offsetY: 0, group: 'OL' },
    
    // Backfield (under center)
    { position: 'QB', offsetX: 0, offsetY: SPACING.QB_DEPTH, group: 'backfield' },
    { position: 'FB', offsetX: 0, offsetY: SPACING.FB_DEPTH, group: 'backfield' },
    { position: 'RB', offsetX: 0, offsetY: SPACING.RB_DEPTH, group: 'backfield' },
    
    // Wide Receivers
    { position: 'WR', offsetX: -SPACING.WR_SIDELINE, offsetY: 0, group: 'WR-wide', label: 'WR1' },
    { position: 'WR', offsetX: SPACING.WR_SIDELINE, offsetY: 0, group: 'WR-wide', label: 'WR2' },
    
    // TE (right side)
    { position: 'TE', offsetX: SPACING.OL_GAP * 2 + SPACING.TE_INLINE, offsetY: 0, group: 'TE-inline' },
  ],
  { supportsMirror: true, hasStrongSide: true, strongSide: 'right' }
);

/**
 * 5. Singleback (Ace)
 * QB under center or shotgun, 1 RB, 2 WR each side (2x2)
 */
export const SINGLEBACK_ACE = createFormation(
  'singleback-ace',
  'Singleback (Ace)',
  'offense',
  [
    // Offensive Line
    { position: 'C', offsetX: 0, offsetY: 0, group: 'OL' },
    { position: 'LG', offsetX: -SPACING.OL_GAP, offsetY: 0, group: 'OL' },
    { position: 'RG', offsetX: SPACING.OL_GAP, offsetY: 0, group: 'OL' },
    { position: 'LT', offsetX: -SPACING.OL_GAP * 2, offsetY: 0, group: 'OL' },
    { position: 'RT', offsetX: SPACING.OL_GAP * 2, offsetY: 0, group: 'OL' },
    
    // Backfield
    { position: 'QB', offsetX: 0, offsetY: SPACING.QB_DEPTH, group: 'backfield' },
    { position: 'RB', offsetX: 0, offsetY: SPACING.RB_DEPTH, group: 'backfield' },
    
    // Wide Receivers (2x2)
    { position: 'WR', offsetX: -SPACING.WR_SIDELINE, offsetY: 0, group: 'WR-left', label: 'WR1' },
    { position: 'WR', offsetX: -SPACING.WR_INSIDE, offsetY: 0, group: 'WR-left', label: 'WR2' },
    { position: 'WR', offsetX: SPACING.WR_INSIDE, offsetY: 0, group: 'WR-right', label: 'WR3' },
    { position: 'WR', offsetX: SPACING.WR_SIDELINE, offsetY: 0, group: 'WR-right', label: 'WR4' },
  ],
  { supportsMirror: true }
);

/**
 * 6. Singleback Trips Right
 * 3 WR on right side, TE opposite
 */
export const SINGLEBACK_TRIPS_RIGHT = createFormation(
  'singleback-trips-right',
  'Singleback Trips Right',
  'offense',
  [
    // Offensive Line
    { position: 'C', offsetX: 0, offsetY: 0, group: 'OL' },
    { position: 'LG', offsetX: -SPACING.OL_GAP, offsetY: 0, group: 'OL' },
    { position: 'RG', offsetX: SPACING.OL_GAP, offsetY: 0, group: 'OL' },
    { position: 'LT', offsetX: -SPACING.OL_GAP * 2, offsetY: 0, group: 'OL' },
    { position: 'RT', offsetX: SPACING.OL_GAP * 2, offsetY: 0, group: 'OL' },
    
    // Backfield
    { position: 'QB', offsetX: 0, offsetY: SPACING.QB_DEPTH, group: 'backfield' },
    { position: 'RB', offsetX: 0, offsetY: SPACING.RB_DEPTH, group: 'backfield' },
    
    // Trips Right (stacked)
    { position: 'WR', offsetX: SPACING.WR_SIDELINE, offsetY: 0, group: 'WR-trips', label: 'WR1' },
    { position: 'WR', offsetX: SPACING.WR_INSIDE, offsetY: -SPACING.WR_TRIPS_STACK, group: 'WR-trips', label: 'WR2' },
    { position: 'WR', offsetX: SPACING.WR_SLOT, offsetY: -SPACING.WR_TRIPS_STACK * 2, group: 'WR-trips', label: 'WR3' },
    
    // TE opposite (left)
    { position: 'TE', offsetX: -SPACING.OL_GAP * 2 - SPACING.TE_INLINE, offsetY: 0, group: 'TE-inline' },
  ],
  { supportsMirror: true, hasStrongSide: true, strongSide: 'right' }
);

/**
 * 7. Pistol
 * RB directly behind QB, flexible WR grouping (2x2 default)
 */
export const PISTOL = createFormation(
  'pistol',
  'Pistol',
  'offense',
  [
    // Offensive Line
    { position: 'C', offsetX: 0, offsetY: 0, group: 'OL' },
    { position: 'LG', offsetX: -SPACING.OL_GAP, offsetY: 0, group: 'OL' },
    { position: 'RG', offsetX: SPACING.OL_GAP, offsetY: 0, group: 'OL' },
    { position: 'LT', offsetX: -SPACING.OL_GAP * 2, offsetY: 0, group: 'OL' },
    { position: 'RT', offsetX: SPACING.OL_GAP * 2, offsetY: 0, group: 'OL' },
    
    // Backfield (Pistol depth)
    { position: 'QB', offsetX: 0, offsetY: SPACING.PISTOL_DEPTH, group: 'backfield' },
    { position: 'RB', offsetX: 0, offsetY: SPACING.RB_DEPTH, group: 'backfield' },
    
    // Wide Receivers (2x2 default)
    { position: 'WR', offsetX: -SPACING.WR_SIDELINE, offsetY: 0, group: 'WR-left', label: 'WR1' },
    { position: 'WR', offsetX: -SPACING.WR_INSIDE, offsetY: 0, group: 'WR-left', label: 'WR2' },
    { position: 'WR', offsetX: SPACING.WR_INSIDE, offsetY: 0, group: 'WR-right', label: 'WR3' },
    { position: 'WR', offsetX: SPACING.WR_SIDELINE, offsetY: 0, group: 'WR-right', label: 'WR4' },
  ],
  { supportsMirror: true }
);

/**
 * 8. Empty (3x2)
 * QB alone, 3 WR on one side, 2 WR on other
 */
export const EMPTY_3X2 = createFormation(
  'empty-3x2',
  'Empty (3x2)',
  'offense',
  [
    // Offensive Line
    { position: 'C', offsetX: 0, offsetY: 0, group: 'OL' },
    { position: 'LG', offsetX: -SPACING.OL_GAP, offsetY: 0, group: 'OL' },
    { position: 'RG', offsetX: SPACING.OL_GAP, offsetY: 0, group: 'OL' },
    { position: 'LT', offsetX: -SPACING.OL_GAP * 2, offsetY: 0, group: 'OL' },
    { position: 'RT', offsetX: SPACING.OL_GAP * 2, offsetY: 0, group: 'OL' },
    
    // QB alone
    { position: 'QB', offsetX: 0, offsetY: SPACING.SHOTGUN_DEPTH, group: 'backfield' },
    
    // 3 WR on right (trips)
    { position: 'WR', offsetX: SPACING.WR_SIDELINE, offsetY: 0, group: 'WR-trips', label: 'WR1' },
    { position: 'WR', offsetX: SPACING.WR_INSIDE, offsetY: -SPACING.WR_TRIPS_STACK, group: 'WR-trips', label: 'WR2' },
    { position: 'WR', offsetX: SPACING.WR_SLOT, offsetY: -SPACING.WR_TRIPS_STACK * 2, group: 'WR-trips', label: 'WR3' },
    
    // 2 WR on left (doubles)
    { position: 'WR', offsetX: -SPACING.WR_INSIDE, offsetY: 0, group: 'WR-doubles', label: 'WR4' },
    { position: 'WR', offsetX: -SPACING.WR_SIDELINE, offsetY: 0, group: 'WR-doubles', label: 'WR5' },
  ],
  { supportsMirror: true, hasStrongSide: true, strongSide: 'right' }
);

// ==================== DEFENSIVE FORMATIONS ====================

/**
 * 1. 4-3 Defense
 * 4 DL, 3 LB, 2 CB, 2 Safety
 */
export const DEFENSE_4_3 = createFormation(
  'defense-4-3',
  '4-3 Defense',
  'defense',
  [
    // Defensive Line (4 DL)
    { position: 'DT', offsetX: -SPACING.DL_GAP, offsetY: 0, group: 'DL-front', label: 'DT1' },
    { position: 'DT', offsetX: SPACING.DL_GAP, offsetY: 0, group: 'DL-front', label: 'DT2' },
    { position: 'DE', offsetX: -SPACING.DL_GAP * 2.5, offsetY: 0, group: 'DL-front', label: 'DE1' },
    { position: 'DE', offsetX: SPACING.DL_GAP * 2.5, offsetY: 0, group: 'DL-front', label: 'DE2' },
    
    // Linebackers (3 LB)
    { position: 'LB', offsetX: -SPACING.LB_WIDTH, offsetY: SPACING.LB_DEPTH, group: 'LB-tier', label: 'WILL' },
    { position: 'LB', offsetX: 0, offsetY: SPACING.LB_DEPTH, group: 'LB-tier', label: 'MIKE' },
    { position: 'LB', offsetX: SPACING.LB_WIDTH, offsetY: SPACING.LB_DEPTH, group: 'LB-tier', label: 'SAM' },
    
    // Cornerbacks (2 CB)
    { position: 'CB', offsetX: -SPACING.CB_WIDTH, offsetY: 0, group: 'DB-tier', label: 'CB1' },
    { position: 'CB', offsetX: SPACING.CB_WIDTH, offsetY: 0, group: 'DB-tier', label: 'CB2' },
    
    // Safeties (2 S)
    { position: 'S', offsetX: -SPACING.S_WIDTH, offsetY: SPACING.S_DEPTH, group: 'DB-tier', label: 'FS' },
    { position: 'S', offsetX: SPACING.S_WIDTH, offsetY: SPACING.S_DEPTH, group: 'DB-tier', label: 'SS' },
  ],
  { supportsMirror: true, hasStrongSide: true, strongSide: 'right' }
);

/**
 * 2. 3-4 Defense
 * 3 DL, 4 LB, 2 CB, 2 Safety
 */
export const DEFENSE_3_4 = createFormation(
  'defense-3-4',
  '3-4 Defense',
  'defense',
  [
    // Defensive Line (3 DL)
    { position: 'NT', offsetX: 0, offsetY: 0, group: 'DL-front', label: 'NT' },
    { position: 'DE', offsetX: -SPACING.DL_GAP * 2, offsetY: 0, group: 'DL-front', label: 'DE1' },
    { position: 'DE', offsetX: SPACING.DL_GAP * 2, offsetY: 0, group: 'DL-front', label: 'DE2' },
    
    // Linebackers (4 LB)
    { position: 'OLB', offsetX: -SPACING.LB_WIDTH * 1.5, offsetY: SPACING.LB_DEPTH, group: 'LB-tier', label: 'OLB1' },
    { position: 'ILB', offsetX: -SPACING.LB_WIDTH * 0.5, offsetY: SPACING.LB_DEPTH, group: 'LB-tier', label: 'ILB1' },
    { position: 'ILB', offsetX: SPACING.LB_WIDTH * 0.5, offsetY: SPACING.LB_DEPTH, group: 'LB-tier', label: 'ILB2' },
    { position: 'OLB', offsetX: SPACING.LB_WIDTH * 1.5, offsetY: SPACING.LB_DEPTH, group: 'LB-tier', label: 'OLB2' },
    
    // Cornerbacks (2 CB)
    { position: 'CB', offsetX: -SPACING.CB_WIDTH, offsetY: 0, group: 'DB-tier', label: 'CB1' },
    { position: 'CB', offsetX: SPACING.CB_WIDTH, offsetY: 0, group: 'DB-tier', label: 'CB2' },
    
    // Safeties (2 S)
    { position: 'S', offsetX: -SPACING.S_WIDTH, offsetY: SPACING.S_DEPTH, group: 'DB-tier', label: 'FS' },
    { position: 'S', offsetX: SPACING.S_WIDTH, offsetY: SPACING.S_DEPTH, group: 'DB-tier', label: 'SS' },
  ],
  { supportsMirror: true, hasStrongSide: true, strongSide: 'right' }
);

/**
 * 3. Nickel (4-2-5)
 * 4 DL, 2 LB, 5 DB (nickel back included)
 */
export const DEFENSE_NICKEL = createFormation(
  'defense-nickel',
  'Nickel (4-2-5)',
  'defense',
  [
    // Defensive Line (4 DL)
    { position: 'DT', offsetX: -SPACING.DL_GAP, offsetY: 0, group: 'DL-front', label: 'DT1' },
    { position: 'DT', offsetX: SPACING.DL_GAP, offsetY: 0, group: 'DL-front', label: 'DT2' },
    { position: 'DE', offsetX: -SPACING.DL_GAP * 2.5, offsetY: 0, group: 'DL-front', label: 'DE1' },
    { position: 'DE', offsetX: SPACING.DL_GAP * 2.5, offsetY: 0, group: 'DL-front', label: 'DE2' },
    
    // Linebackers (2 LB)
    { position: 'LB', offsetX: -SPACING.LB_WIDTH * 0.5, offsetY: SPACING.LB_DEPTH, group: 'LB-tier', label: 'MIKE' },
    { position: 'LB', offsetX: SPACING.LB_WIDTH * 0.5, offsetY: SPACING.LB_DEPTH, group: 'LB-tier', label: 'WILL' },
    
    // Defensive Backs (5 DB - Nickel)
    { position: 'CB', offsetX: -SPACING.CB_WIDTH, offsetY: 0, group: 'DB-tier', label: 'CB1' },
    { position: 'CB', offsetX: SPACING.CB_WIDTH, offsetY: 0, group: 'DB-tier', label: 'CB2' },
    { position: 'CB', offsetX: 0, offsetY: SPACING.LB_DEPTH * 0.8, group: 'DB-tier', label: 'NICKEL' },
    { position: 'S', offsetX: -SPACING.S_WIDTH, offsetY: SPACING.S_DEPTH, group: 'DB-tier', label: 'FS' },
    { position: 'S', offsetX: SPACING.S_WIDTH, offsetY: SPACING.S_DEPTH, group: 'DB-tier', label: 'SS' },
  ],
  { supportsMirror: true, hasStrongSide: true, strongSide: 'right' }
);

/**
 * 4. Dime (4-1-6)
 * 4 DL, 1 LB, 6 DB
 */
export const DEFENSE_DIME = createFormation(
  'defense-dime',
  'Dime (4-1-6)',
  'defense',
  [
    // Defensive Line (4 DL)
    { position: 'DT', offsetX: -SPACING.DL_GAP, offsetY: 0, group: 'DL-front', label: 'DT1' },
    { position: 'DT', offsetX: SPACING.DL_GAP, offsetY: 0, group: 'DL-front', label: 'DT2' },
    { position: 'DE', offsetX: -SPACING.DL_GAP * 2.5, offsetY: 0, group: 'DL-front', label: 'DE1' },
    { position: 'DE', offsetX: SPACING.DL_GAP * 2.5, offsetY: 0, group: 'DL-front', label: 'DE2' },
    
    // Linebacker (1 LB)
    { position: 'LB', offsetX: 0, offsetY: SPACING.LB_DEPTH, group: 'LB-tier', label: 'MIKE' },
    
    // Defensive Backs (6 DB)
    { position: 'CB', offsetX: -SPACING.CB_WIDTH, offsetY: 0, group: 'DB-tier', label: 'CB1' },
    { position: 'CB', offsetX: SPACING.CB_WIDTH, offsetY: 0, group: 'DB-tier', label: 'CB2' },
    { position: 'CB', offsetX: -SPACING.CB_WIDTH * 0.5, offsetY: SPACING.LB_DEPTH * 0.8, group: 'DB-tier', label: 'NICKEL' },
    { position: 'CB', offsetX: SPACING.CB_WIDTH * 0.5, offsetY: SPACING.LB_DEPTH * 0.8, group: 'DB-tier', label: 'DIME' },
    { position: 'S', offsetX: -SPACING.S_WIDTH, offsetY: SPACING.S_DEPTH, group: 'DB-tier', label: 'FS' },
    { position: 'S', offsetX: SPACING.S_WIDTH, offsetY: SPACING.S_DEPTH, group: 'DB-tier', label: 'SS' },
  ],
  { supportsMirror: true, hasStrongSide: true, strongSide: 'right' }
);

/**
 * 5. Goal Line Defense
 * 5-6 DL, 4 LB, 2 CB
 */
export const DEFENSE_GOAL_LINE = createFormation(
  'defense-goal-line',
  'Goal Line Defense',
  'defense',
  [
    // Defensive Line (6 DL - goal line stack)
    { position: 'DT', offsetX: -SPACING.DL_GAP * 1.5, offsetY: 0, group: 'DL-front', label: 'DT1' },
    { position: 'NT', offsetX: 0, offsetY: 0, group: 'DL-front', label: 'NT' },
    { position: 'DT', offsetX: SPACING.DL_GAP * 1.5, offsetY: 0, group: 'DL-front', label: 'DT2' },
    { position: 'DE', offsetX: -SPACING.DL_GAP * 3, offsetY: 0, group: 'DL-front', label: 'DE1' },
    { position: 'DE', offsetX: SPACING.DL_GAP * 3, offsetY: 0, group: 'DL-front', label: 'DE2' },
    { position: 'DT', offsetX: -SPACING.DL_GAP * 0.5, offsetY: -SPACING.DL_GAP, group: 'DL-front', label: 'DT3' },
    
    // Linebackers (4 LB)
    { position: 'LB', offsetX: -SPACING.LB_WIDTH * 1.2, offsetY: SPACING.LB_DEPTH * 0.7, group: 'LB-tier', label: 'LB1' },
    { position: 'LB', offsetX: -SPACING.LB_WIDTH * 0.4, offsetY: SPACING.LB_DEPTH * 0.7, group: 'LB-tier', label: 'LB2' },
    { position: 'LB', offsetX: SPACING.LB_WIDTH * 0.4, offsetY: SPACING.LB_DEPTH * 0.7, group: 'LB-tier', label: 'LB3' },
    { position: 'LB', offsetX: SPACING.LB_WIDTH * 1.2, offsetY: SPACING.LB_DEPTH * 0.7, group: 'LB-tier', label: 'LB4' },
    
    // Cornerbacks (2 CB)
    { position: 'CB', offsetX: -SPACING.CB_WIDTH, offsetY: 0, group: 'DB-tier', label: 'CB1' },
    { position: 'CB', offsetX: SPACING.CB_WIDTH, offsetY: 0, group: 'DB-tier', label: 'CB2' },
  ],
  { supportsMirror: true }
);

// ==================== FORMATION GROUPS ====================

export const OFFENSIVE_FORMATIONS = [
  SHOTGUN_2X2,
  SHOTGUN_TRIPS_RIGHT,
  SHOTGUN_DOUBLES_TE,
  I_FORMATION,
  SINGLEBACK_ACE,
  SINGLEBACK_TRIPS_RIGHT,
  PISTOL,
  EMPTY_3X2,
];

export const DEFENSIVE_FORMATIONS = [
  DEFENSE_4_3,
  DEFENSE_3_4,
  DEFENSE_NICKEL,
  DEFENSE_DIME,
  DEFENSE_GOAL_LINE,
];

export const ALL_FORMATIONS = [...OFFENSIVE_FORMATIONS, ...DEFENSIVE_FORMATIONS];

// ==================== POSITION-SPECIFIC PACKAGES ====================

/**
 * D-LINE PACKAGES
 */

// 4-man front (LDE - DT - DT - RDE)
export const DL_4_MAN = createFormation(
  'dl-4-man',
  '4-Man Front',
  'defense',
  [
    { position: 'DE', offsetX: -SPACING.DL_GAP * 2.5, offsetY: 0, group: 'DL-front', label: 'LDE' },
    { position: 'DT', offsetX: -SPACING.DL_GAP, offsetY: 0, group: 'DL-front', label: 'DT1' },
    { position: 'DT', offsetX: SPACING.DL_GAP, offsetY: 0, group: 'DL-front', label: 'DT2' },
    { position: 'DE', offsetX: SPACING.DL_GAP * 2.5, offsetY: 0, group: 'DL-front', label: 'RDE' },
  ],
  { supportsMirror: true, hasStrongSide: true, strongSide: 'right', packageType: 'position-group' }
);

// 3-man front (NT - DE - DE)
export const DL_3_MAN = createFormation(
  'dl-3-man',
  '3-Man Front',
  'defense',
  [
    { position: 'DE', offsetX: -SPACING.DL_GAP * 2, offsetY: 0, group: 'DL-front', label: 'LDE' },
    { position: 'NT', offsetX: 0, offsetY: 0, group: 'DL-front', label: 'NT' },
    { position: 'DE', offsetX: SPACING.DL_GAP * 2, offsetY: 0, group: 'DL-front', label: 'RDE' },
  ],
  { supportsMirror: true, hasStrongSide: true, strongSide: 'right', packageType: 'position-group' }
);

// 5-man Bear front (DE - DT - NT - DT - DE)
export const DL_5_MAN_BEAR = createFormation(
  'dl-5-man-bear',
  '5-Man Bear Front',
  'defense',
  [
    { position: 'DE', offsetX: -SPACING.DL_GAP * 3, offsetY: 0, group: 'DL-front', label: 'LDE' },
    { position: 'DT', offsetX: -SPACING.DL_GAP * 1.5, offsetY: 0, group: 'DL-front', label: 'DT1' },
    { position: 'NT', offsetX: 0, offsetY: 0, group: 'DL-front', label: 'NT' },
    { position: 'DT', offsetX: SPACING.DL_GAP * 1.5, offsetY: 0, group: 'DL-front', label: 'DT2' },
    { position: 'DE', offsetX: SPACING.DL_GAP * 3, offsetY: 0, group: 'DL-front', label: 'RDE' },
  ],
  { supportsMirror: true, hasStrongSide: true, strongSide: 'right', packageType: 'position-group' }
);

/**
 * O-LINE PACKAGES
 */

// 5 OL (LT - LG - C - RG - RT)
export const OL_5_MAN = createFormation(
  'ol-5-man',
  '5-Man O-Line',
  'offense',
  [
    { position: 'T', offsetX: -SPACING.OL_GAP * 2, offsetY: 0, group: 'OL-block', label: 'LT' },
    { position: 'G', offsetX: -SPACING.OL_GAP, offsetY: 0, group: 'OL-block', label: 'LG' },
    { position: 'C', offsetX: 0, offsetY: 0, group: 'OL-block', label: 'C' },
    { position: 'G', offsetX: SPACING.OL_GAP, offsetY: 0, group: 'OL-block', label: 'RG' },
    { position: 'T', offsetX: SPACING.OL_GAP * 2, offsetY: 0, group: 'OL-block', label: 'RT' },
  ],
  { supportsMirror: false, packageType: 'position-group' }
);

// 6 OL jumbo (LT - LG - C - RG - RT - TE/6th OL)
export const OL_6_MAN_JUMBO = createFormation(
  'ol-6-man-jumbo',
  '6-Man Jumbo',
  'offense',
  [
    { position: 'T', offsetX: -SPACING.OL_GAP * 2.5, offsetY: 0, group: 'OL-block', label: 'LT' },
    { position: 'G', offsetX: -SPACING.OL_GAP * 1.5, offsetY: 0, group: 'OL-block', label: 'LG' },
    { position: 'C', offsetX: -SPACING.OL_GAP * 0.5, offsetY: 0, group: 'OL-block', label: 'C' },
    { position: 'G', offsetX: SPACING.OL_GAP * 0.5, offsetY: 0, group: 'OL-block', label: 'RG' },
    { position: 'T', offsetX: SPACING.OL_GAP * 1.5, offsetY: 0, group: 'OL-block', label: 'RT' },
    { position: 'T', offsetX: SPACING.OL_GAP * 2.5, offsetY: 0, group: 'OL-block', label: 'TE/6th' },
  ],
  { supportsMirror: true, hasStrongSide: true, strongSide: 'right', packageType: 'position-group' }
);

/**
 * LB-ONLY GROUPS
 */

// 4-3 LB shell (SAM - MIKE - WILL)
export const LB_4_3_SHELL = createFormation(
  'lb-4-3-shell',
  '4-3 LB Shell',
  'defense',
  [
    { position: 'LB', offsetX: -SPACING.LB_WIDTH, offsetY: 0, group: 'LB-tier', label: 'WILL' },
    { position: 'LB', offsetX: 0, offsetY: 0, group: 'LB-tier', label: 'MIKE' },
    { position: 'LB', offsetX: SPACING.LB_WIDTH, offsetY: 0, group: 'LB-tier', label: 'SAM' },
  ],
  { supportsMirror: true, hasStrongSide: true, strongSide: 'right', packageType: 'position-group' }
);

// 3-4 LB stack (OLB - ILB - ILB - OLB)
export const LB_3_4_STACK = createFormation(
  'lb-3-4-stack',
  '3-4 LB Stack',
  'defense',
  [
    { position: 'OLB', offsetX: -SPACING.LB_WIDTH * 1.5, offsetY: 0, group: 'LB-tier', label: 'OLB1' },
    { position: 'ILB', offsetX: -SPACING.LB_WIDTH * 0.5, offsetY: 0, group: 'LB-tier', label: 'ILB1' },
    { position: 'ILB', offsetX: SPACING.LB_WIDTH * 0.5, offsetY: 0, group: 'LB-tier', label: 'ILB2' },
    { position: 'OLB', offsetX: SPACING.LB_WIDTH * 1.5, offsetY: 0, group: 'LB-tier', label: 'OLB2' },
  ],
  { supportsMirror: true, hasStrongSide: true, strongSide: 'right', packageType: 'position-group' }
);

// 2-backer nickel (MIKE - WILL)
export const LB_2_BACKER_NICKEL = createFormation(
  'lb-2-backer-nickel',
  '2-Backer Nickel',
  'defense',
  [
    { position: 'LB', offsetX: -SPACING.LB_WIDTH * 0.5, offsetY: 0, group: 'LB-tier', label: 'MIKE' },
    { position: 'LB', offsetX: SPACING.LB_WIDTH * 0.5, offsetY: 0, group: 'LB-tier', label: 'WILL' },
  ],
  { supportsMirror: true, hasStrongSide: true, strongSide: 'right', packageType: 'position-group' }
);

/**
 * DB PACKAGES
 */

// Cornerbacks only (CB - CB)
export const DB_CBS_ONLY = createFormation(
  'db-cbs-only',
  'Cornerbacks Only',
  'defense',
  [
    { position: 'CB', offsetX: -SPACING.CB_WIDTH, offsetY: 0, group: 'DB-tier', label: 'CB1' },
    { position: 'CB', offsetX: SPACING.CB_WIDTH, offsetY: 0, group: 'DB-tier', label: 'CB2' },
  ],
  { supportsMirror: true, packageType: 'position-group' }
);

// Safeties only (FS - SS)
export const DB_SAFETIES_ONLY = createFormation(
  'db-safeties-only',
  'Safeties Only',
  'defense',
  [
    { position: 'S', offsetX: -SPACING.S_WIDTH, offsetY: 0, group: 'DB-tier', label: 'FS' },
    { position: 'S', offsetX: SPACING.S_WIDTH, offsetY: 0, group: 'DB-tier', label: 'SS' },
  ],
  { supportsMirror: true, packageType: 'position-group' }
);

// Nickel DB group (CB - CB - NB)
export const DB_NICKEL_GROUP = createFormation(
  'db-nickel-group',
  'Nickel DB Group',
  'defense',
  [
    { position: 'CB', offsetX: -SPACING.CB_WIDTH, offsetY: 0, group: 'DB-tier', label: 'CB1' },
    { position: 'CB', offsetX: SPACING.CB_WIDTH, offsetY: 0, group: 'DB-tier', label: 'CB2' },
    { position: 'CB', offsetX: 0, offsetY: SPACING.LB_DEPTH * 0.8, group: 'DB-tier', label: 'NICKEL' },
  ],
  { supportsMirror: true, packageType: 'position-group' }
);

// Dime DB group (CB - CB - NB - DB)
export const DB_DIME_GROUP = createFormation(
  'db-dime-group',
  'Dime DB Group',
  'defense',
  [
    { position: 'CB', offsetX: -SPACING.CB_WIDTH, offsetY: 0, group: 'DB-tier', label: 'CB1' },
    { position: 'CB', offsetX: SPACING.CB_WIDTH, offsetY: 0, group: 'DB-tier', label: 'CB2' },
    { position: 'CB', offsetX: -SPACING.CB_WIDTH * 0.5, offsetY: SPACING.LB_DEPTH * 0.8, group: 'DB-tier', label: 'NICKEL' },
    { position: 'CB', offsetX: SPACING.CB_WIDTH * 0.5, offsetY: SPACING.LB_DEPTH * 0.8, group: 'DB-tier', label: 'DIME' },
  ],
  { supportsMirror: true, packageType: 'position-group' }
);

/**
 * SKELLY / 7-on-7 OFFENSE (No OL)
 */

// Skelly base (QB + RB + 4 WR)
export const SKELLY_BASE = createFormation(
  'skelly-base',
  'Skelly Base',
  'offense',
  [
    { position: 'QB', offsetX: 0, offsetY: SPACING.SHOTGUN_DEPTH, group: 'backfield', label: 'QB' },
    { position: 'RB', offsetX: 0, offsetY: SPACING.RB_DEPTH, group: 'backfield', label: 'RB' },
    { position: 'WR', offsetX: -SPACING.WR_SIDELINE, offsetY: 0, group: 'WR-cluster', label: 'WR1' },
    { position: 'WR', offsetX: -SPACING.WR_INSIDE, offsetY: 0, group: 'WR-cluster', label: 'WR2' },
    { position: 'WR', offsetX: SPACING.WR_INSIDE, offsetY: 0, group: 'WR-cluster', label: 'WR3' },
    { position: 'WR', offsetX: SPACING.WR_SIDELINE, offsetY: 0, group: 'WR-cluster', label: 'WR4' },
  ],
  { supportsMirror: true, packageType: 'drill-package' }
);

// Trips skelly (QB + RB + 3 WR + TE)
export const SKELLY_TRIPS = createFormation(
  'skelly-trips',
  'Trips Skelly',
  'offense',
  [
    { position: 'QB', offsetX: 0, offsetY: SPACING.SHOTGUN_DEPTH, group: 'backfield', label: 'QB' },
    { position: 'RB', offsetX: 0, offsetY: SPACING.RB_DEPTH, group: 'backfield', label: 'RB' },
    { position: 'WR', offsetX: -SPACING.WR_SIDELINE, offsetY: 0, group: 'WR-cluster', label: 'WR1' },
    { position: 'WR', offsetX: -SPACING.WR_TRIPS_STACK, offsetY: 0, group: 'WR-cluster', label: 'WR2' },
    { position: 'WR', offsetX: -SPACING.WR_TRIPS_STAGGER, offsetY: 0, group: 'WR-cluster', label: 'WR3' },
    { position: 'TE', offsetX: SPACING.TE_INLINE, offsetY: 0, group: 'TE-inline', label: 'TE' },
  ],
  { supportsMirror: true, hasStrongSide: true, strongSide: 'left', packageType: 'drill-package' }
);

// Doubles skelly (QB + RB + 4 WR)
export const SKELLY_DOUBLES = createFormation(
  'skelly-doubles',
  'Doubles Skelly',
  'offense',
  [
    { position: 'QB', offsetX: 0, offsetY: SPACING.SHOTGUN_DEPTH, group: 'backfield', label: 'QB' },
    { position: 'RB', offsetX: 0, offsetY: SPACING.RB_DEPTH, group: 'backfield', label: 'RB' },
    { position: 'WR', offsetX: -SPACING.WR_SIDELINE, offsetY: 0, group: 'WR-cluster', label: 'WR1' },
    { position: 'WR', offsetX: -SPACING.WR_INSIDE, offsetY: 0, group: 'WR-cluster', label: 'WR2' },
    { position: 'WR', offsetX: SPACING.WR_INSIDE, offsetY: 0, group: 'WR-cluster', label: 'WR3' },
    { position: 'WR', offsetX: SPACING.WR_SIDELINE, offsetY: 0, group: 'WR-cluster', label: 'WR4' },
  ],
  { supportsMirror: true, packageType: 'drill-package' }
);

/**
 * SKELLY / 7-on-7 DEFENSE (No DL)
 */

// Cover 2 shell (2 safeties + 2 corners + 3 LBs)
export const SKELLY_COVER_2 = createFormation(
  'skelly-cover-2',
  'Cover 2 Shell',
  'defense',
  [
    { position: 'CB', offsetX: -SPACING.CB_WIDTH, offsetY: 0, group: 'DB-tier', label: 'CB1' },
    { position: 'CB', offsetX: SPACING.CB_WIDTH, offsetY: 0, group: 'DB-tier', label: 'CB2' },
    { position: 'S', offsetX: -SPACING.S_WIDTH, offsetY: SPACING.S_DEPTH, group: 'DB-tier', label: 'FS' },
    { position: 'S', offsetX: SPACING.S_WIDTH, offsetY: SPACING.S_DEPTH, group: 'DB-tier', label: 'SS' },
    { position: 'LB', offsetX: -SPACING.LB_WIDTH, offsetY: SPACING.LB_DEPTH, group: 'LB-tier', label: 'WILL' },
    { position: 'LB', offsetX: 0, offsetY: SPACING.LB_DEPTH, group: 'LB-tier', label: 'MIKE' },
    { position: 'LB', offsetX: SPACING.LB_WIDTH, offsetY: SPACING.LB_DEPTH, group: 'LB-tier', label: 'SAM' },
  ],
  { supportsMirror: true, hasStrongSide: true, strongSide: 'right', packageType: 'drill-package' }
);

// Nickel shell (2 safeties + 3 corners + 2 LBs)
export const SKELLY_NICKEL_SHELL = createFormation(
  'skelly-nickel-shell',
  'Nickel Shell',
  'defense',
  [
    { position: 'CB', offsetX: -SPACING.CB_WIDTH, offsetY: 0, group: 'DB-tier', label: 'CB1' },
    { position: 'CB', offsetX: SPACING.CB_WIDTH, offsetY: 0, group: 'DB-tier', label: 'CB2' },
    { position: 'CB', offsetX: 0, offsetY: SPACING.LB_DEPTH * 0.8, group: 'DB-tier', label: 'NICKEL' },
    { position: 'S', offsetX: -SPACING.S_WIDTH, offsetY: SPACING.S_DEPTH, group: 'DB-tier', label: 'FS' },
    { position: 'S', offsetX: SPACING.S_WIDTH, offsetY: SPACING.S_DEPTH, group: 'DB-tier', label: 'SS' },
    { position: 'LB', offsetX: -SPACING.LB_WIDTH * 0.5, offsetY: SPACING.LB_DEPTH, group: 'LB-tier', label: 'MIKE' },
    { position: 'LB', offsetX: SPACING.LB_WIDTH * 0.5, offsetY: SPACING.LB_DEPTH, group: 'LB-tier', label: 'WILL' },
  ],
  { supportsMirror: true, hasStrongSide: true, strongSide: 'right', packageType: 'drill-package' }
);

/**
 * FRONT 7 ONLY (DL + LBs, no DBs)
 */

// Front 7 (4 DL + 3 LB)
export const FRONT_7_4_3 = createFormation(
  'front-7-4-3',
  'Front 7 (4-3)',
  'defense',
  [
    // DL
    { position: 'DE', offsetX: -SPACING.DL_GAP * 2.5, offsetY: 0, group: 'DL-front', label: 'LDE' },
    { position: 'DT', offsetX: -SPACING.DL_GAP, offsetY: 0, group: 'DL-front', label: 'DT1' },
    { position: 'DT', offsetX: SPACING.DL_GAP, offsetY: 0, group: 'DL-front', label: 'DT2' },
    { position: 'DE', offsetX: SPACING.DL_GAP * 2.5, offsetY: 0, group: 'DL-front', label: 'RDE' },
    // LBs
    { position: 'LB', offsetX: -SPACING.LB_WIDTH, offsetY: SPACING.LB_DEPTH, group: 'LB-tier', label: 'WILL' },
    { position: 'LB', offsetX: 0, offsetY: SPACING.LB_DEPTH, group: 'LB-tier', label: 'MIKE' },
    { position: 'LB', offsetX: SPACING.LB_WIDTH, offsetY: SPACING.LB_DEPTH, group: 'LB-tier', label: 'SAM' },
  ],
  { supportsMirror: true, hasStrongSide: true, strongSide: 'right', packageType: 'drill-package' }
);

/**
 * MICRO-PRESETS (2v2, 3v3, 4v4)
 */

// WR vs CB (one side)
export const MICRO_WR_VS_CB = createFormation(
  'micro-wr-vs-cb',
  'WR vs CB',
  'offense',
  [
    { position: 'WR', offsetX: -SPACING.WR_SIDELINE, offsetY: 0, group: 'WR-cluster', label: 'WR' },
  ],
  { supportsMirror: true, packageType: 'micro-preset' }
);

// WR/TE vs LB/S (2v2)
export const MICRO_2V2_WR_TE_VS_LB_S = createFormation(
  'micro-2v2-wr-te-vs-lb-s',
  'WR/TE vs LB/S (2v2)',
  'offense',
  [
    { position: 'WR', offsetX: -SPACING.WR_INSIDE, offsetY: 0, group: 'WR-cluster', label: 'WR' },
    { position: 'TE', offsetX: SPACING.TE_INLINE, offsetY: 0, group: 'TE-inline', label: 'TE' },
  ],
  { supportsMirror: true, hasStrongSide: true, strongSide: 'left', packageType: 'micro-preset' }
);

// Slot vs Nickel (1v1)
export const MICRO_SLOT_VS_NICKEL = createFormation(
  'micro-slot-vs-nickel',
  'Slot vs Nickel',
  'offense',
  [
    { position: 'WR', offsetX: -SPACING.WR_SLOT, offsetY: 0, group: 'WR-cluster', label: 'SLOT' },
  ],
  { supportsMirror: true, packageType: 'micro-preset' }
);

// Triangle fits (LB + Safety + CB)
export const MICRO_TRIANGLE_FITS = createFormation(
  'micro-triangle-fits',
  'Triangle Fits',
  'defense',
  [
    { position: 'LB', offsetX: 0, offsetY: SPACING.LB_DEPTH, group: 'LB-tier', label: 'LB' },
    { position: 'S', offsetX: SPACING.S_WIDTH, offsetY: SPACING.S_DEPTH, group: 'DB-tier', label: 'S' },
    { position: 'CB', offsetX: SPACING.CB_WIDTH, offsetY: 0, group: 'DB-tier', label: 'CB' },
  ],
  { supportsMirror: true, hasStrongSide: true, strongSide: 'right', packageType: 'micro-preset' }
);

// Export position-specific package groups
export const DL_PACKAGES = [DL_4_MAN, DL_3_MAN, DL_5_MAN_BEAR];
export const OL_PACKAGES = [OL_5_MAN, OL_6_MAN_JUMBO];
export const LB_PACKAGES = [LB_4_3_SHELL, LB_3_4_STACK, LB_2_BACKER_NICKEL];
export const DB_PACKAGES = [DB_CBS_ONLY, DB_SAFETIES_ONLY, DB_NICKEL_GROUP, DB_DIME_GROUP];
export const SKELLY_OFFENSE = [SKELLY_BASE, SKELLY_TRIPS, SKELLY_DOUBLES];
export const SKELLY_DEFENSE = [SKELLY_COVER_2, SKELLY_NICKEL_SHELL];
export const FRONT_7_PACKAGES = [FRONT_7_4_3];
export const MICRO_PRESETS = [MICRO_WR_VS_CB, MICRO_2V2_WR_TE_VS_LB_S, MICRO_SLOT_VS_NICKEL, MICRO_TRIANGLE_FITS];

export const POSITION_GROUPS = [
  ...DL_PACKAGES,
  ...OL_PACKAGES,
  ...LB_PACKAGES,
  ...DB_PACKAGES,
];

export const DRILL_PACKAGES = [
  ...SKELLY_OFFENSE,
  ...SKELLY_DEFENSE,
  ...FRONT_7_PACKAGES,
];

export const ALL_PACKAGES = [
  ...POSITION_GROUPS,
  ...DRILL_PACKAGES,
  ...MICRO_PRESETS,
];

// ==================== HELPER FUNCTIONS ====================

/**
 * Get a formation by ID (searches all formations and packages)
 * @param {string} id - Formation ID
 * @returns {Object|null} - Formation object or null
 */
export const getFormationById = (id) => {
  return [...ALL_FORMATIONS, ...ALL_PACKAGES].find(f => f.id === id) || null;
};

/**
 * Get mirrored/flipped version of a formation
 * @param {Object} formation - Original formation
 * @returns {Object} - Flipped formation
 */
export const getMirroredFormation = (formation) => {
  if (!formation.supportsMirror) {
    return formation; // Return original if mirroring not supported
  }
  
  return {
    ...formation,
    id: `${formation.id}-flipped`,
    name: `${formation.name} (Flipped)`,
    players: flipFormation(formation.players),
    isFlipped: true,
    originalId: formation.id,
  };
};

/**
 * Detect offensive strong side from existing players on field
 * Strong side is determined by:
 * 1. TE position (if present) - strong side is where TE is
 * 2. WR distribution - more receivers on one side
 * 3. RB/FB alignment - offset backfield indicates strong side
 * @param {Array} players - Existing players on field
 * @returns {string|null} - 'left', 'right', or null if cannot determine
 */
export const detectOffensiveStrongSide = (players) => {
  if (!players || players.length === 0) return null;

  // Filter for offensive players only
  const offensivePositions = ['QB', 'WR', 'RB', 'TE', 'OL', 'C', 'G', 'T', 'FB', 'HB'];
  const offensivePlayers = players.filter(p => 
    offensivePositions.includes(p.position?.toUpperCase())
  );

  if (offensivePlayers.length === 0) return null;

  // Method 1: Check for TE (Tight End) - strongest indicator
  const tePlayers = offensivePlayers.filter(p => 
    p.position?.toUpperCase() === 'TE'
  );
  
  if (tePlayers.length > 0) {
    // Find the average X position of TEs
    const avgTEX = tePlayers.reduce((sum, p) => {
      const x = p.anchor?.x || 0;
      return sum + x;
    }, 0) / tePlayers.length;
    
    // If TE is to the right of center (0.5), strong side is right
    return avgTEX > 0.5 ? 'right' : 'left';
  }

  // Method 2: Check WR distribution
  const wrPlayers = offensivePlayers.filter(p => 
    p.position?.toUpperCase() === 'WR'
  );
  
  if (wrPlayers.length >= 2) {
    // Calculate center of mass for WRs
    const avgWRX = wrPlayers.reduce((sum, p) => {
      const x = p.anchor?.x || 0;
      return sum + x;
    }, 0) / wrPlayers.length;
    
    // If WRs are weighted to one side
    if (avgWRX > 0.55) return 'right';
    if (avgWRX < 0.45) return 'left';
  }

  // Method 3: Check RB/FB alignment (offset backfield)
  const rbPlayers = offensivePlayers.filter(p => 
    ['RB', 'FB', 'HB'].includes(p.position?.toUpperCase())
  );
  
  if (rbPlayers.length > 0) {
    const avgRBX = rbPlayers.reduce((sum, p) => {
      const x = p.anchor?.x || 0;
      return sum + x;
    }, 0) / rbPlayers.length;
    
    // Significant offset indicates strong side
    if (avgRBX > 0.52) return 'right';
    if (avgRBX < 0.48) return 'left';
  }

  // Cannot determine - return null
  return null;
};

/**
 * Get formation with strong side orientation
 * @param {Object} formation - Base formation
 * @param {string} strongSide - 'left' or 'right'
 * @returns {Object} - Oriented formation
 */
export const getFormationWithStrongSide = (formation, strongSide) => {
  if (!formation.hasStrongSide) {
    return formation;
  }
  
  // If formation's default strong side doesn't match requested, flip it
  const currentStrongSide = formation.strongSide || 'right';
  if (currentStrongSide !== strongSide) {
    return getMirroredFormation(formation);
  }
  
  return formation;
};

/**
 * Check if formation placement would cause collisions
 * @param {Object} formation - Formation to check
 * @param {Object} centerPoint - { x, y } normalized center point
 * @param {Array} existingPlayers - Existing players on field
 * @param {Object} fieldGeometry - Field geometry utilities
 * @returns {Object} - { hasCollision: boolean, collisions: Array }
 */
export const checkFormationCollisions = (formation, centerPoint, existingPlayers, fieldGeometry) => {
  const collisions = [];
  const COLLISION_THRESHOLD = 0.015; // Minimum distance between players (normalized) - reduced for better placement
  const isDefense = formation.type === 'defense';
  
  formation.players.forEach((playerDef, index) => {
    const playerX = centerPoint.x + playerDef.offsetX;
    
    // Apply same Y-flipping logic as placement for defensive formations
    const playerY = isDefense 
      ? centerPoint.y - playerDef.offsetY  // Defense: flip Y
      : centerPoint.y + playerDef.offsetY; // Offense: normal Y
    
    // Check field boundaries
    if (playerX < 0 || playerX > 1 || playerY < 0 || playerY > 1) {
      collisions.push({
        playerIndex: index,
        reason: 'out_of_bounds',
        position: { x: playerX, y: playerY }
      });
    }
    
    // Check collision with existing players
    existingPlayers.forEach(existingPlayer => {
      const existingPos = existingPlayer.anchor || { x: 0, y: 0 };
      const distance = Math.sqrt(
        Math.pow(playerX - existingPos.x, 2) + Math.pow(playerY - existingPos.y, 2)
      );
      
      if (distance < COLLISION_THRESHOLD) {
        collisions.push({
          playerIndex: index,
          reason: 'overlap',
          existingPlayerId: existingPlayer.id,
          distance
        });
      }
    });
  });
  
  return {
    hasCollision: collisions.length > 0,
    collisions
  };
};

export default {
  // Offensive
  SHOTGUN_2X2,
  SHOTGUN_TRIPS_RIGHT,
  SHOTGUN_DOUBLES_TE,
  I_FORMATION,
  SINGLEBACK_ACE,
  SINGLEBACK_TRIPS_RIGHT,
  PISTOL,
  EMPTY_3X2,
  
  // Defensive
  DEFENSE_4_3,
  DEFENSE_3_4,
  DEFENSE_NICKEL,
  DEFENSE_DIME,
  DEFENSE_GOAL_LINE,
  
  // Groups
  OFFENSIVE_FORMATIONS,
  DEFENSIVE_FORMATIONS,
  ALL_FORMATIONS,
  
  // Position-Specific Packages
  POSITION_GROUPS,
  DRILL_PACKAGES,
  MICRO_PRESETS,
  ALL_PACKAGES,
  DL_PACKAGES,
  OL_PACKAGES,
  LB_PACKAGES,
  DB_PACKAGES,
  SKELLY_OFFENSE,
  SKELLY_DEFENSE,
  FRONT_7_PACKAGES,
  
  // Helpers
  getFormationById,
  getMirroredFormation,
  getFormationWithStrongSide,
  detectOffensiveStrongSide,
  checkFormationCollisions,
  flipFormation,
  SPACING,
};

