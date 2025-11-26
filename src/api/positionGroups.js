/**
 * Position Groups API
 * Handles position group assignments and filtering
 */

import { supabase } from '../lib/supabase';

/**
 * Get position groups for a team
 * @param {string} teamId - Team ID
 * @returns {Promise<Object>} Position groups
 */
export async function getTeamPositionGroups(teamId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('team_position_groups')
      .select(`
        *,
        user:user_id (
          id,
          display_name
        ),
        coach:assigned_coach_id (
          id,
          display_name
        )
      `)
      .eq('team_id', teamId)
      .order('position_category', { ascending: true })
      .order('position_group', { ascending: true });

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error getting position groups:', error);
    return { data: null, error };
  }
}

/**
 * Assign a player to a position group
 * @param {string} teamId - Team ID
 * @param {string} userId - User ID (player)
 * @param {Object} positionData - Position data
 * @param {string} positionData.position - Position (e.g., 'QB', 'RB')
 * @param {string} positionData.positionGroup - Position group (e.g., 'QB', 'OL')
 * @param {string} positionData.positionCategory - Category ('Offense', 'Defense', 'Special Teams')
 * @param {string} [positionData.assignedCoachId] - Assigned coach ID (optional)
 * @returns {Promise<Object>} Assignment result
 */
export async function assignPositionGroup(teamId, userId, positionData) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // TODO: Verify user has permission (coach/admin)

    const { data, error } = await supabase
      .from('team_position_groups')
      .upsert({
        team_id: teamId,
        user_id: userId,
        position: positionData.position,
        position_group: positionData.positionGroup,
        position_category: positionData.positionCategory,
        assigned_coach_id: positionData.assignedCoachId || null
      }, {
        onConflict: 'team_id,user_id,position_group'
      })
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error assigning position group:', error);
    return { data: null, error };
  }
}

/**
 * Remove a player from a position group
 * @param {string} positionGroupId - Position group assignment ID
 * @returns {Promise<Object>} Deletion result
 */
export async function removePositionGroup(positionGroupId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // TODO: Verify user has permission (coach/admin)

    const { error } = await supabase
      .from('team_position_groups')
      .delete()
      .eq('id', positionGroupId);

    if (error) throw error;

    return { data: { success: true }, error: null };
  } catch (error) {
    console.error('Error removing position group:', error);
    return { data: null, error };
  }
}

/**
 * Get position groups by category
 * @param {string} teamId - Team ID
 * @param {string} category - Category ('Offense', 'Defense', 'Special Teams')
 * @returns {Promise<Object>} Position groups
 */
export async function getPositionGroupsByCategory(teamId, category) {
  try {
    const { data, error } = await getTeamPositionGroups(teamId);
    
    if (error) throw error;

    const filtered = data.filter(pg => pg.position_category === category);
    
    return { data: filtered, error: null };
  } catch (error) {
    console.error('Error getting position groups by category:', error);
    return { data: null, error };
  }
}

