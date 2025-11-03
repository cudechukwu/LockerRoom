// Priority Alerts API
// Handles emergency notifications and priority alerts

import { supabase } from '../lib/supabase.js';

// =============================================
// RATE LIMITING
// =============================================

const RATE_LIMITS = {
  perHour: 2,
  perDay: 6
};

/**
 * Check rate limits for priority alerts
 * @param {string} teamId - Team ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Rate limit check result
 */
async function checkRateLimit(teamId, userId) {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Check hourly limit
    const { data: hourlyAlerts, error: hourlyError } = await supabase
      .from('priority_alerts')
      .select('id')
      .eq('team_id', teamId)
      .eq('sender_id', userId)
      .gte('created_at', oneHourAgo.toISOString());

    if (hourlyError) throw hourlyError;

    if (hourlyAlerts.length >= RATE_LIMITS.perHour) {
      return {
        allowed: false,
        reason: 'HOURLY_LIMIT_EXCEEDED',
        message: `Maximum ${RATE_LIMITS.perHour} priority alerts per hour`
      };
    }

    // Check daily limit
    const { data: dailyAlerts, error: dailyError } = await supabase
      .from('priority_alerts')
      .select('id')
      .eq('team_id', teamId)
      .eq('sender_id', userId)
      .gte('created_at', oneDayAgo.toISOString());

    if (dailyError) throw dailyError;

    if (dailyAlerts.length >= RATE_LIMITS.perDay) {
      return {
        allowed: false,
        reason: 'DAILY_LIMIT_EXCEEDED',
        message: `Maximum ${RATE_LIMITS.perDay} priority alerts per day`
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Error checking rate limit:', error);
    return { allowed: false, reason: 'ERROR', message: 'Failed to check rate limits' };
  }
}

// =============================================
// PRIORITY ALERT FUNCTIONS
// =============================================

/**
 * Send a priority alert
 * @param {Object} alertData - Alert data
 * @returns {Promise<Object>} Alert result
 */
export async function sendPriorityAlert(alertData) {
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('User not authenticated');

    const { channelId, teamId, scope, targetUsers, body, reason } = alertData;

    // Validate required fields
    if (!body || !reason) {
      throw new Error('Body and reason are required for priority alerts');
    }

    // Check user permissions (admin or coach)
    const { data: teamMember, error: memberError } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single();

    if (memberError) throw memberError;

    if (!['admin', 'coach'].includes(teamMember.role)) {
      throw new Error('PERMISSION_DENIED');
    }

    // Check rate limits
    const rateLimitCheck = await checkRateLimit(teamId, user.id);
    if (!rateLimitCheck.allowed) {
      throw new Error(rateLimitCheck.reason);
    }

    // Create priority alert record
    const { data: alert, error: alertError } = await supabase
      .from('priority_alerts')
      .insert({
        channel_id: channelId,
        team_id: teamId,
        sender_id: user.id,
        scope,
        target_users: targetUsers,
        body,
        reason
      })
      .select()
      .single();

    if (alertError) throw alertError;

    // Create announcement message in announcements channel
    const { data: announcementsChannel, error: channelError } = await supabase
      .from('channels')
      .select('id')
      .eq('team_id', teamId)
      .eq('is_announcements', true)
      .single();

    if (!channelError && announcementsChannel) {
      // Create pinned announcement message
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          channel_id: announcementsChannel.id,
          team_id: teamId,
          sender_id: user.id,
          content: `🚨 PRIORITY ALERT: ${body}`,
          message_type: 'priority_alert',
          is_pinned: true
        });

      if (messageError) {
        console.error('Error creating announcement message:', messageError);
      }
    }

    return { data: alert, error: null };
  } catch (error) {
    console.error('Error sending priority alert:', error);
    return { data: null, error };
  }
}

/**
 * Get priority alerts for a team
 * @param {string} teamId - Team ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Priority alerts
 */
export async function getPriorityAlerts(teamId, options = {}) {
  try {
    const { limit = 20, offset = 0 } = options;

    const { data, error } = await supabase
      .from('priority_alerts')
      .select(`
        id,
        channel_id,
        scope,
        body,
        reason,
        created_at,
        channels(
          name
        )
      `)
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching priority alerts:', error);
    return { data: null, error };
  }
}

/**
 * Get priority alert details
 * @param {string} alertId - Alert ID
 * @returns {Promise<Object>} Alert details
 */
export async function getPriorityAlert(alertId) {
  try {
    const { data, error } = await supabase
      .from('priority_alerts')
      .select(`
        *,
        channels(
          name,
          type
        )
      `)
      .eq('id', alertId)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching priority alert:', error);
    return { data: null, error };
  }
}

// =============================================
// NOTIFICATION OVERRIDE FUNCTIONS
// =============================================

/**
 * Send push notification override (bypasses mute settings)
 * @param {string} teamId - Team ID
 * @param {Object} notificationData - Notification data
 * @returns {Promise<Object>} Notification result
 */
export async function sendNotificationOverride(teamId, notificationData) {
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('User not authenticated');

    const { title, body, targetUsers, channelId } = notificationData;

    // Check user permissions (admin or coach)
    const { data: teamMember, error: memberError } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single();

    if (memberError) throw memberError;

    if (!['admin', 'coach'].includes(teamMember.role)) {
      throw new Error('PERMISSION_DENIED');
    }

    // Get device tokens for target users
    const { data: deviceTokens, error: tokensError } = await supabase
      .from('device_tokens')
      .select('token, platform, user_id')
      .eq('team_id', teamId)
      .eq('is_active', true)
      .in('user_id', targetUsers);

    if (tokensError) throw tokensError;

    // Send push notifications
    const { data, error } = await supabase.functions.invoke('send-push-notifications', {
      body: {
        tokens: deviceTokens,
        title,
        body,
        data: {
          type: 'priority_alert',
          teamId,
          channelId
        }
      }
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error sending notification override:', error);
    return { data: null, error };
  }
}

// =============================================
// ALERT VALIDATION
// =============================================

/**
 * Validate priority alert data
 * @param {Object} alertData - Alert data to validate
 * @returns {Object} Validation result
 */
export function validatePriorityAlert(alertData) {
  const errors = [];

  if (!alertData.body || alertData.body.trim().length === 0) {
    errors.push('Alert body is required');
  }

  if (!alertData.reason || alertData.reason.trim().length === 0) {
    errors.push('Alert reason is required');
  }

  if (!alertData.scope || !['team', 'position', 'custom'].includes(alertData.scope)) {
    errors.push('Valid scope is required (team, position, or custom)');
  }

  if (alertData.scope === 'custom' && (!alertData.targetUsers || alertData.targetUsers.length === 0)) {
    errors.push('Target users are required for custom scope alerts');
  }

  if (alertData.body && alertData.body.length > 500) {
    errors.push('Alert body must be 500 characters or less');
  }

  if (alertData.reason && alertData.reason.length > 200) {
    errors.push('Alert reason must be 200 characters or less');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// =============================================
// ALERT TEMPLATES
// =============================================

/**
 * Get common alert templates
 * @returns {Array} Alert templates
 */
export function getAlertTemplates() {
  return [
    {
      id: 'practice_cancelled',
      title: 'Practice Cancelled',
      body: 'Practice has been cancelled due to weather. Check back for updates.',
      reason: 'Weather conditions'
    },
    {
      id: 'meeting_urgent',
      title: 'Urgent Team Meeting',
      body: 'Mandatory team meeting in 30 minutes. All players required to attend.',
      reason: 'Team coordination'
    },
    {
      id: 'equipment_issue',
      title: 'Equipment Issue',
      body: 'Equipment room will be closed for maintenance. Plan accordingly.',
      reason: 'Facility maintenance'
    },
    {
      id: 'game_schedule',
      title: 'Game Schedule Change',
      body: 'Game time has been changed. Check updated schedule.',
      reason: 'Schedule update'
    },
    {
      id: 'safety_alert',
      title: 'Safety Alert',
      body: 'Important safety information. Please read carefully.',
      reason: 'Safety protocol'
    }
  ];
}

/**
 * Apply alert template
 * @param {string} templateId - Template ID
 * @param {Object} customizations - Custom data to apply
 * @returns {Object} Alert data
 */
export function applyAlertTemplate(templateId, customizations = {}) {
  const templates = getAlertTemplates();
  const template = templates.find(t => t.id === templateId);
  
  if (!template) {
    throw new Error('Template not found');
  }

  return {
    body: customizations.body || template.body,
    reason: customizations.reason || template.reason,
    ...customizations
  };
}
