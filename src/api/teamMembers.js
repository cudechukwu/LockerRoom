import { supabase } from '../lib/supabase';
import { uploadChannelImage } from '../utils/imageUpload';

// Fetch team members from the database
export const fetchTeamMembers = async (supabaseClient, teamId, query = '') => {
  if (!supabaseClient) {
    throw new Error('Supabase client is required. Use useSupabase() hook and pass the client to this function.');
  }
  const supabase = supabaseClient;
  
  try {
    console.log('🔍 fetchTeamMembers called with teamId:', teamId);
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // First, get the team members with their user information
    const { data: teamMembers, error: teamError } = await supabase
      .from('team_members')
      .select(`
        id,
        role,
        user_id,
        joined_at
      `)
      .eq('team_id', teamId)
      .neq('user_id', user.id); // Exclude current user

    console.log('📊 Raw team members data:', teamMembers);
    console.log('❌ Any errors:', teamError);

    if (teamError) {
      console.error('Error fetching team members:', teamError);
      throw teamError;
    }

    if (!teamMembers || teamMembers.length === 0) {
      console.log('⚠️ No team members found for teamId:', teamId);
      return [];
    }

    const userIds = teamMembers.map(member => member.user_id);

    let profileMap = new Map();
    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('Error fetching user profile names:', profilesError);
      } else if (profiles) {
        profileMap = new Map(profiles.map(profile => [profile.user_id, profile]));
      }
    }

    const members = teamMembers.map(teamMember => {
      const profile = profileMap.get(teamMember.user_id) || {};
      const displayName = profile.display_name && profile.display_name.trim().length > 0
        ? profile.display_name.trim()
        : null;

      const fallbackName = `User ${teamMember.user_id.slice(0, 8)}`;
      const normalizedName = displayName || fallbackName;

      const normalizedHandle = displayName
        ? `@${displayName.replace(/\s+/g, '').toLowerCase()}`
        : `@user_${teamMember.user_id.slice(0, 8)}`;

      return {
      id: teamMember.user_id,
        name: normalizedName,
        handle: normalizedHandle,
        role: teamMember.role || 'Member',
      position: null,
        avatarUrl: profile.avatar_url || null,
      isActive: true,
      };
    });

    console.log('✅ Processed members:', members);

    // Apply search filter if provided
    if (query) {
      const searchTerm = query.toLowerCase();
      return members.filter(member => 
        member.name.toLowerCase().includes(searchTerm) ||
        member.handle.toLowerCase().includes(searchTerm) ||
        member.role.toLowerCase().includes(searchTerm)
      );
    }

    return members;
  } catch (error) {
    console.error('Error in fetchTeamMembers:', error);
    throw error;
  }
};

// Create a new channel
export const createChannel = async (teamId, channelData) => {
  try {
    // Upload image if provided
    let imageUrl = null;
    if (channelData.image) {
      imageUrl = await uploadChannelImage(channelData.image, 'temp', 'channel');
    }

    const { data, error } = await supabase
      .from('channels')
      .insert({
        team_id: teamId,
        name: channelData.name,
        description: channelData.description || '',
        type: channelData.type === 'channel' ? 'team' : 'group_dm',
        is_private: channelData.type === 'group',
        visibility: channelData.type === 'channel' ? 'discoverable' : 'hidden',
        image_url: imageUrl,
        created_by: channelData.created_by,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating channel:', error);
      throw error;
    }

    // Update image filename with actual channel ID if image was uploaded
    if (imageUrl && !imageUrl.includes('defaults/')) {
      const newImageUrl = await uploadChannelImage(channelData.image, data.id, 'channel');
      await supabase
        .from('channels')
        .update({ image_url: newImageUrl })
        .eq('id', data.id);
    }

    // Add channel members (including creator)
    const channelMembers = [
      // Add creator as admin
      {
        channel_id: data.id,
        user_id: channelData.created_by,
        role: 'admin',
        added_by: channelData.created_by,
      },
      // Add selected members
      ...(channelData.members || []).map(member => ({
        channel_id: data.id,
        user_id: member.id,
        role: 'member',
        added_by: channelData.created_by,
      }))
    ];

    const { error: membersError } = await supabase
      .from('channel_members')
      .insert(channelMembers);

    if (membersError) {
      console.error('Error adding channel members:', membersError);
      throw membersError;
    }

    return data;
  } catch (error) {
    console.error('Error in createChannel:', error);
    throw error;
  }
};

// Create a new group (private channel)
export const createGroup = async (teamId, groupData) => {
  try {
    // Upload image if provided
    let imageUrl = null;
    if (groupData.image) {
      imageUrl = await uploadChannelImage(groupData.image, 'temp', 'group');
    }

    // Determine if this is a 1-on-1 DM or group DM
    const isDirectMessage = groupData.members && groupData.members.length === 1;
    const channelType = isDirectMessage ? 'dm' : 'group_dm';
    
    const { data, error } = await supabase
      .from('channels')
      .insert({
        team_id: teamId,
        name: groupData.name || generateGroupName(groupData.members),
        description: '',
        type: channelType,
        is_private: true,
        visibility: 'hidden',
        image_url: imageUrl,
        created_by: groupData.created_by,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating group:', error);
      throw error;
    }

    // Update image filename with actual channel ID if image was uploaded
    if (imageUrl && !imageUrl.includes('defaults/')) {
      const newImageUrl = await uploadChannelImage(groupData.image, data.id, 'group');
      await supabase
        .from('channels')
        .update({ image_url: newImageUrl })
        .eq('id', data.id);
    }

    // Add group members (including creator)
    const groupMembers = [
      // Add creator as admin
      {
        channel_id: data.id,
        user_id: groupData.created_by,
        role: 'admin',
        added_by: groupData.created_by,
      },
      // Add selected members
      ...(groupData.members || []).map(member => ({
        channel_id: data.id,
        user_id: member.id,
        role: 'member',
        added_by: groupData.created_by,
      }))
    ];

    const { error: membersError } = await supabase
      .from('channel_members')
      .insert(groupMembers);

    if (membersError) {
      console.error('Error adding group members:', membersError);
      throw membersError;
    }

    return data;
  } catch (error) {
    console.error('Error in createGroup:', error);
    throw error;
  }
};

// Helper function to generate group name from members
const generateGroupName = (members) => {
  if (members.length <= 2) {
    return members.map(m => m.name).join(', ');
  } else {
    const firstTwo = members.slice(0, 2).map(m => m.name).join(', ');
    return `${firstTwo}, +${members.length - 2}`;
  }
};

// =============================================
// HOME SCREEN API FUNCTIONS
// =============================================

// Get team information (name, logo, colors)
export const getTeamInfo = async (supabaseClient, teamId) => {
  if (!supabaseClient) {
    throw new Error('Supabase client is required. Use useSupabase() hook and pass the client to this function.');
  }
  const supabase = supabaseClient;
  
  try {
    console.log('🏠 getTeamInfo called with teamId:', teamId);
    
    const { data, error } = await supabase
      .from('teams')
      .select('id, name, logo_url, primary_color, secondary_color, school')
      .eq('id', teamId)
      .single();

    if (error) {
      console.error('Error fetching team info:', error);
      throw error;
    }

    console.log('✅ Team info loaded:', data);
    return data;
  } catch (error) {
    console.error('Error in getTeamInfo:', error);
    throw error;
  }
};

// Get unread message count for team
export const getUnreadMessageCount = async (teamId) => {
  try {
    console.log('🔔 getUnreadMessageCount called with teamId:', teamId);
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get all channels the user has access to
    const { data: channels, error: channelsError } = await supabase
      .from('channels')
      .select('id')
      .eq('team_id', teamId);

    if (channelsError) {
      console.error('Error fetching channels:', channelsError);
      throw channelsError;
    }

    if (!channels || channels.length === 0) {
      return 0;
    }

    const channelIds = channels.map(channel => channel.id);

    // Count unread messages (messages after last read)
    // First get all read message IDs for this user
    const { data: readMessages, error: readError } = await supabase
      .from('message_reads')
      .select('message_id')
      .eq('user_id', user.id);

    if (readError) {
      console.error('Error fetching read messages:', readError);
      throw readError;
    }

    const readMessageIds = readMessages ? readMessages.map(r => r.message_id) : [];

    // Get unread messages (exclude own messages and read messages)
    let query = supabase
      .from('messages')
      .select('id')
      .in('channel_id', channelIds)
      .not('sender_id', 'eq', user.id); // Exclude own messages

    // Only add the read messages filter if there are read messages to exclude
    if (readMessageIds.length > 0) {
      query = query.filter('id', 'not.in', `(${readMessageIds.join(',')})`);
    }

    const { data: unreadMessages, error: messagesError } = await query;

    if (messagesError) {
      console.error('Error fetching unread messages:', messagesError);
      throw messagesError;
    }

    const unreadCount = unreadMessages ? unreadMessages.length : 0;
    console.log('✅ Unread message count:', unreadCount);
    return unreadCount;
  } catch (error) {
    console.error('Error in getUnreadMessageCount:', error);
    // Return 0 on error to prevent UI breaking
    return 0;
  }
};

// Get priority alerts count
export const getPriorityAlertsCount = async (teamId) => {
  try {
    console.log('🚨 getPriorityAlertsCount called with teamId:', teamId);
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Count priority alerts for the team
    const { data: alerts, error } = await supabase
      .from('priority_alerts')
      .select('id')
      .eq('team_id', teamId)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

    if (error) {
      console.error('Error fetching priority alerts:', error);
      throw error;
    }

    const alertsCount = alerts ? alerts.length : 0;
    console.log('✅ Priority alerts count:', alertsCount);
    return alertsCount;
  } catch (error) {
    console.error('Error in getPriorityAlertsCount:', error);
    // Return 0 on error to prevent UI breaking
    return 0;
  }
};

// Get total notification count (unread messages + priority alerts)
export const getTotalNotificationCount = async (teamId) => {
  try {
    console.log('📊 getTotalNotificationCount called with teamId:', teamId);
    
    const [unreadCount, alertsCount] = await Promise.all([
      getUnreadMessageCount(teamId),
      getPriorityAlertsCount(teamId)
    ]);

    const totalCount = unreadCount + alertsCount;
    console.log('✅ Total notification count:', totalCount);
    return totalCount;
  } catch (error) {
    console.error('Error in getTotalNotificationCount:', error);
    return 0;
  }
};

// =============================================
// TEAM MANAGEMENT API FUNCTIONS
// =============================================

// Update team information (admin only)
export const updateTeamInfo = async (teamId, updates) => {
  try {
    console.log('🔧 updateTeamInfo called with teamId:', teamId, 'updates:', updates);
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Check if user is admin of this team
    const { data: teamMember } = await supabase
      .from('team_members')
      .select('is_admin')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single();

    if (!teamMember || !teamMember.is_admin) {
      throw new Error('Only team admins can update team information');
    }

    // Update team
    const { data, error } = await supabase
      .from('teams')
      .update(updates)
      .eq('id', teamId)
      .select()
      .single();

    if (error) {
      console.error('Error updating team info:', error);
      throw error;
    }

    console.log('✅ Team info updated:', data);
    return data;
  } catch (error) {
    console.error('Error in updateTeamInfo:', error);
    throw error;
  }
};

// Upload team logo
export const uploadTeamLogo = async (teamId, imageUri) => {
  try {
    console.log('📸 uploadTeamLogo called with teamId:', teamId);
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Check if user is admin or coach of this team
    const { data: teamMember } = await supabase
      .from('team_members')
      .select('is_admin, role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single();

    console.log('Team member check:', {
      userId: user.id,
      teamId,
      teamMember,
      isAdmin: teamMember?.is_admin,
      role: teamMember?.role,
      canUpload: teamMember && (teamMember.is_admin || ['coach', 'trainer'].includes(teamMember.role))
    });

    if (!teamMember || (!teamMember.is_admin && !['coach', 'trainer'].includes(teamMember.role))) {
      throw new Error('Only team admins and coaches can upload team logos');
    }

    // Import FileSystem for React Native
    const FileSystem = require('expo-file-system/legacy');

    // Create filename with user ID folder structure (same as avatars)
    const fileExt = imageUri.split('.').pop() || 'jpg';
    const fileName = `team-${teamId}-logo.${fileExt}`;
    const filePath = `${user.id}/${fileName}`; // Use user ID folder for RLS compliance
    
    console.log('Upload details:', {
      teamId,
      fileName,
      filePath,
      bucket: 'avatars'
    });

    console.log('Reading file as base64...');
    console.log('Image URI:', imageUri);
    console.log('URI type:', typeof imageUri);
    console.log('URI starts with file://', imageUri.startsWith('file://'));
    console.log('URI starts with http://', imageUri.startsWith('http://'));
    
    // Check if this is a URL (shouldn't happen, but just in case)
    if (imageUri.startsWith('http')) {
      console.error('ERROR: Received URL instead of local file path:', imageUri);
      throw new Error('Invalid file path - received URL instead of local file');
    }
    
    // Read file as base64 (same as profile upload)
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: 'base64',
    });
    
    console.log('Base64 length:', base64.length);
    
    // Convert base64 to Uint8Array for upload
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    
    console.log('ByteArray created, size:', byteArray.length, 'type: image/jpeg');

    // Upload to Supabase storage using avatars bucket (we know this works)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars') // Use avatars bucket (we know this works)
      .upload(filePath, byteArray, {
        cacheControl: '3600',
        upsert: true,
        contentType: `image/${fileExt}`
      });

    if (uploadError) {
      console.error('Error uploading team logo:', uploadError);
      throw uploadError;
    }

    console.log('Upload successful:', uploadData);

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    console.log('Generated team logo URL:', publicUrl);

    // Update team with new logo URL
    const { data: teamData, error: updateError } = await supabase
      .from('teams')
      .update({ logo_url: publicUrl })
      .eq('id', teamId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating team logo URL:', updateError);
      throw updateError;
    }

    console.log('✅ Team logo uploaded:', publicUrl);
    return teamData;
  } catch (error) {
    console.error('Error in uploadTeamLogo:', error);
    throw error;
  }
};

// Check if user is team admin
export const isTeamAdmin = async (supabaseClient, teamId) => {
  if (!supabaseClient) {
    throw new Error('Supabase client is required. Use useSupabase() hook and pass the client to this function.');
  }
  const supabase = supabaseClient;
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Check if user is team admin
    const { data: teamMember } = await supabase
      .from('team_members')
      .select('is_admin, role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single();

    // Check if user is team creator
    const { data: team } = await supabase
      .from('teams')
      .select('created_by')
      .eq('id', teamId)
      .single();

    // User is admin if: is_admin is true OR they created the team
    const isAdmin = teamMember?.is_admin || team?.created_by === user.id;
    
    console.log('Admin check:', {
      userId: user.id,
      teamId,
      isAdmin: teamMember?.is_admin,
      isCreator: team?.created_by === user.id,
      role: teamMember?.role,
      finalResult: isAdmin
    });

    return isAdmin;
  } catch (error) {
    console.error('Error checking team admin status:', error);
    return false;
  }
};