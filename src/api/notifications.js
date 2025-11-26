import { supabase } from '../lib/supabase';

/**
 * Optimized notification counting using single RPC call
 * Replaces getTotalNotificationCount, getUnreadMessageCount, and getPriorityAlertsCount
 * with a single database query for better performance
 */
export const getTeamNotificationSummary = async (supabaseClient, teamId) => {
  if (!supabaseClient) {
    throw new Error('Supabase client is required. Use useSupabase() hook and pass the client to this function.');
  }
  const supabase = supabaseClient;
  
  try {
    console.log('📊 getTeamNotificationSummary called with teamId:', teamId);
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Call the optimized RPC function
    const { data, error } = await supabase.rpc('get_team_notification_summary', {
      p_team_id: teamId,
      p_user_id: user.id
    });

    if (error) {
      console.error('Error calling get_team_notification_summary:', error);
      throw error;
    }

    // The RPC returns a single object in an array
    const summary = data?.[0] || { unread_messages: 0, priority_alerts: 0, total_notifications: 0 };
    console.log('✅ Team notification summary:', summary);
    return summary;
  } catch (error) {
    console.error('Error in getTeamNotificationSummary:', error);
    // Return fallback data
    return {
      unread_messages: 0,
      priority_alerts: 0,
      total_notifications: 0
    };
  }
};
