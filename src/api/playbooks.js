// Playbooks API - Interactive animation data management
import { supabase } from '../lib/supabase';

/**
 * Get team playbooks with interactive animation data using optimized RPC function
 * This replaces multiple separate queries with a single database call
 * @param {string} teamId - Team ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Playbooks summary with animation data
 */
export const getTeamPlaybooks = async (teamId, userId, limit = 10, offset = 0) => {
  try {
    console.log('📘 getTeamPlaybooks called with:', { teamId, userId, limit, offset });
    
    // Validate inputs
    if (!teamId) {
      console.warn('No teamId provided');
      return { playbooks: [], recent_plays: [], count_summary: { total_playbooks: 0, total_plays: 0 }, categories: [] };
    }
    
    if (!userId) {
      console.warn('No userId provided');
      return { playbooks: [], recent_plays: [], count_summary: { total_playbooks: 0, total_plays: 0 }, categories: [] };
    }
    
    const { data, error } = await supabase.rpc('get_team_playbooks', {
      p_team_id: teamId,
      p_user_id: userId,
      p_limit: limit,
      p_offset: offset,
    });

    if (error) {
      console.error('RPC error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        teamId,
        userId
      });
      
      // If it's a "relation does not exist" error, return empty data
      if (error.code === '42P01') {
        console.warn('Tables not found, returning empty data');
        return { playbooks: [], recent_plays: [], count_summary: { total_playbooks: 0, total_plays: 0 }, categories: [] };
      }
      
      throw error;
    }

    // Handle Supabase RPC return shape normalization
    const summary = Array.isArray(data) ? data[0] : data || {
      playbooks: [],
      recent_plays: [],
      count_summary: { total_playbooks: 0, total_plays: 0, recent_plays_count: 0 },
      categories: []
    };

    console.log('✅ Team playbooks summary:', {
      playbooks: summary.playbooks?.length || 0,
      recent_plays: summary.recent_plays?.length || 0,
      total_playbooks: summary.count_summary?.total_playbooks || 0,
      total_plays: summary.count_summary?.total_plays || 0
    });

    return summary;
  } catch (error) {
    console.error('Error in getTeamPlaybooks:', error);
    // Return fallback data to prevent UI breaking
    return {
      playbooks: [],
      recent_plays: [],
      count_summary: { total_playbooks: 0, total_plays: 0, recent_plays_count: 0 },
      categories: [],
      error: error.message
    };
  }
};

/**
 * Get a specific play with full animation data
 * @param {string} playId - Play ID
 * @returns {Promise<Object>} Play with animation data
 */
export const getPlay = async (playId) => {
  try {
    console.log('🎬 getPlay called with playId:', playId);
    
    const { data, error } = await supabase
      .from('plays')
      .select(`
        id,
        name,
        description,
        animation_data,
        thumbnail_url,
        duration,
        difficulty,
        tags,
        created_by,
        created_at,
        updated_at,
        playbooks (
          id,
          name,
          category,
          color
        )
      `)
      .eq('id', playId)
      .single();

    if (error) throw error;

    console.log('✅ Play data retrieved:', {
      name: data.name,
      duration: data.duration,
      hasAnimationData: !!data.animation_data
    });

    return { data, error: null };
  } catch (error) {
    console.error('Error in getPlay:', error);
    return { data: null, error };
  }
};

/**
 * Create a new play with animation data
 * @param {string} playbookId - Playbook ID
 * @param {string} teamId - Team ID
 * @param {Object} playData - Play data including animation_data
 * @returns {Promise<Object>} Created play
 */
export const createPlay = async (playbookId, teamId, playData) => {
  try {
    console.log('🎬 createPlay called with:', { playbookId, teamId, playData });
    
    const { data, error } = await supabase
      .from('plays')
      .insert({
        playbook_id: playbookId,
        team_id: teamId,
        name: playData.name,
        description: playData.description,
        animation_data: playData.animation_data,
        thumbnail_url: playData.thumbnail_url,
        duration: playData.duration,
        difficulty: playData.difficulty || 'beginner',
        tags: playData.tags || [],
        is_public: playData.is_public || false,
        created_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Play created:', data.name);
    return { data, error: null };
  } catch (error) {
    console.error('Error in createPlay:', error);
    return { data: null, error };
  }
};

/**
 * Share a play with a shareable token
 * @param {string} playId - Play ID
 * @param {Object} shareOptions - Share options
 * @returns {Promise<Object>} Share token and details
 */
export const sharePlay = async (playId, shareOptions = {}) => {
  try {
    console.log('🔗 sharePlay called with:', { playId, shareOptions });
    
    const shareToken = `play_${playId}_${Date.now()}`;
    const expiresAt = shareOptions.expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    const { data, error } = await supabase
      .from('play_shares')
      .insert({
        play_id: playId,
        shared_by: (await supabase.auth.getUser()).data.user?.id,
        shared_with: shareOptions.shared_with || null,
        share_token: shareToken,
        expires_at: expiresAt
      })
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Play shared with token:', shareToken);
    return { data: { ...data, share_token: shareToken }, error: null };
  } catch (error) {
    console.error('Error in sharePlay:', error);
    return { data: null, error };
  }
};

/**
 * Get a shared play by token
 * @param {string} shareToken - Share token
 * @returns {Promise<Object>} Shared play data
 */
export const getSharedPlay = async (shareToken) => {
  try {
    console.log('🔗 getSharedPlay called with token:', shareToken);
    
    const { data, error } = await supabase
      .from('play_shares')
      .select(`
        id,
        share_token,
        expires_at,
        created_at,
        plays (
          id,
          name,
          description,
          animation_data,
          thumbnail_url,
          duration,
          difficulty,
          tags,
          playbooks (
            id,
            name,
            category,
            color
          )
        )
      `)
      .eq('share_token', shareToken)
      .or(`expires_at.gt.${new Date().toISOString()},expires_at.is.null`)
      .single();

    if (error) throw error;

    console.log('✅ Shared play retrieved:', data.plays?.name);
    return { data, error: null };
  } catch (error) {
    console.error('Error in getSharedPlay:', error);
    return { data: null, error };
  }
};

/**
 * Create a new playbook
 * @param {string} teamId - Team ID
 * @param {string} userId - User ID
 * @param {Object} playbookData - Playbook data
 * @returns {Promise<Object>} Created playbook
 */
export const createPlaybook = async (teamId, userId, playbookData) => {
  try {
    console.log('📘 createPlaybook called with:', { teamId, userId, playbookData });
    
    const { data, error } = await supabase
      .from('playbooks')
      .insert({
        team_id: teamId,
        name: playbookData.name,
        description: playbookData.description,
        category: playbookData.category,
        subcategory: playbookData.subcategory,
        icon: playbookData.icon || 'football',
        color: playbookData.color || '#666666',
        scope: playbookData.scope || 'personal',
        visibility: playbookData.visibility || 'private',
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ createPlaybook failed:', error.message);
    throw error;
  }
};

/**
 * Share a playbook
 * @param {string} playbookId - Playbook ID
 * @param {string} userId - User ID
 * @param {Object} shareOptions - Sharing options
 * @returns {Promise<Object>} Share data
 */
export const sharePlaybook = async (playbookId, userId, shareOptions) => {
  try {
    console.log('📤 sharePlaybook called with:', { playbookId, userId, shareOptions });
    
    const shareToken = generateShareToken();
    const expiresAt = shareOptions.expiresInDays 
      ? new Date(Date.now() + shareOptions.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const { data, error } = await supabase
      .from('playbook_shares')
      .insert({
        playbook_id: playbookId,
        shared_by: userId,
        shared_with: shareOptions.sharedWith || null,
        share_token: shareToken,
        share_scope: shareOptions.scope || 'view',
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (error) throw error;
    return { ...data, shareUrl: `${window.location.origin}/playbook/${shareToken}` };
  } catch (error) {
    console.error('❌ sharePlaybook failed:', error.message);
    throw error;
  }
};

/**
 * Generate a secure share token
 * @returns {string} Share token
 */
const generateShareToken = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `pb_${result}`;
};
