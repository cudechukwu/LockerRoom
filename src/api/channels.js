// Channels API - Optimized conversation summary
import { supabase } from '../lib/supabase';

/**
 * Get team conversation summary using optimized RPC function
 * This replaces multiple separate queries for channels, DMs, and unread counts
 * @param {string} teamId - Team ID
 * @returns {Promise<Object>} Conversation summary with channels, DMs, and unread counts
 */
export const getTeamConversationSummary = async (supabaseClient, teamId) => {
  if (!supabaseClient) {
    throw new Error('Supabase client is required. Use useSupabase() hook and pass the client to this function.');
  }
  const supabase = supabaseClient;
  
  try {
    console.log('📊 getTeamConversationSummary called with teamId:', teamId);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase.rpc('get_team_conversation_summary', {
      p_team_id: teamId,
      p_user_id: user.id,
    });

    if (error) {
      console.error('RPC error:', error.message || error.details || error);
      throw error;
    }

    // Handle Supabase RPC return shape normalization
    const summary = Array.isArray(data) ? data[0] : data || {
      channels: [],
      dms: [],
      allConversations: [],
      totalUnread: 0,
      teamInfo: null
    };

    console.log('✅ Team conversation summary:', {
      channels: summary.channels?.length || 0,
      dms: summary.dms?.length || 0,
      totalUnread: summary.totalUnread || 0,
      hasTeamInfo: !!summary.teamInfo
    });

    return summary;
  } catch (error) {
    console.error('Error in getTeamConversationSummary:', error);
    // Return fallback data to prevent UI breaking
    return {
      channels: [],
      dms: [],
      allConversations: [],
      totalUnread: 0,
      teamInfo: null,
      error: error.message
    };
  }
};
