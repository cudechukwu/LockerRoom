import { supabase } from '../lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { decode as atob } from 'base-64';

// =============================================
// USER PROFILES API
// =============================================

/**
 * Get user profile by user ID
 */
export const getUserProfile = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return { data: null, error };
  }
};

/**
 * Create or update user profile
 */
export const upsertUserProfile = async (profileData) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert(profileData, { 
        onConflict: 'user_id',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error upserting user profile:', error);
    return { data: null, error };
  }
};

// =============================================
// TEAM MEMBER PROFILES API
// =============================================

/**
 * Get team member profile
 */
export const getTeamMemberProfile = async (teamId, userId) => {
  try {
    // First get the team member profile
    const { data: teamProfile, error: teamError } = await supabase
      .from('team_member_profiles')
      .select('*')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .single();

    if (teamError && teamError.code !== 'PGRST116') {
      throw teamError;
    }

    if (!teamProfile) {
      return { data: null, error: null };
    }

    // Get the user profile
    const { data: userProfile, error: userError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (userError && userError.code !== 'PGRST116') {
      throw userError;
    }

    // Get team member role
    const { data: teamMember, error: memberError } = await supabase
      .from('team_members')
      .select('user_id, role, is_admin')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .single();

    if (memberError && memberError.code !== 'PGRST116') {
      // Not critical - role might not exist
      console.log('Team member role not found, will infer from profile');
    }

    // Combine the profiles
    const combinedProfile = {
      ...teamProfile,
      user_profiles: userProfile || { display_name: 'Unknown User', avatar_url: null, bio: null },
      team_members: teamMember || { role: 'player', is_admin: false }
    };

    return { data: combinedProfile, error: null };
  } catch (error) {
    console.error('Error fetching team member profile:', error);
    return { data: null, error };
  }
};

/**
 * Get all team member profiles for a team
 */
export const getTeamMemberProfiles = async (teamId) => {
  try {
    // Get current user to exclude them from results
    const { data: { user } } = await supabase.auth.getUser();
    const currentUserId = user?.id;

    // Get team member profiles
    const { data: teamProfiles, error: teamError } = await supabase
      .from('team_member_profiles')
      .select('*')
      .eq('team_id', teamId)
      .neq('user_id', currentUserId) // Exclude current user
      .order('jersey_number', { nullsLast: true });

    if (teamError) throw teamError;

    if (!teamProfiles || teamProfiles.length === 0) {
      return { data: [], error: null };
    }

    // Get user profiles for all users
    const userIds = teamProfiles.map(p => p.user_id);
    const { data: userProfiles, error: userError } = await supabase
      .from('user_profiles')
      .select('*')
      .in('user_id', userIds);

    if (userError) throw userError;

    // Get team member roles
    const { data: teamMembers, error: membersError } = await supabase
      .from('team_members')
      .select('user_id, role, is_admin')
      .eq('team_id', teamId)
      .in('user_id', userIds);

    if (membersError) throw membersError;

    // Combine the data and filter out current user
    const combinedProfiles = teamProfiles
      .filter(teamProfile => teamProfile.user_id !== currentUserId) // Double check - exclude current user
      .map(teamProfile => {
        const userProfile = userProfiles?.find(up => up.user_id === teamProfile.user_id);
        const teamMember = teamMembers?.find(tm => tm.user_id === teamProfile.user_id);
        
        return {
          ...teamProfile,
          user_profiles: userProfile || { display_name: 'Unknown User', avatar_url: null, bio: null },
          team_members: teamMember || { role: 'player', is_admin: false }
        };
      });

    return { data: combinedProfiles, error: null };
  } catch (error) {
    console.error('Error fetching team member profiles:', error);
    return { data: null, error };
  }
};

/**
 * Create or update team member profile
 */
export const upsertTeamMemberProfile = async (teamId, userId, profileData) => {
  try {
    const profileWithIds = {
      ...profileData,
      team_id: teamId,
      user_id: userId
    };

    const { data, error } = await supabase
      .from('team_member_profiles')
      .upsert(profileWithIds, { 
        onConflict: 'team_id,user_id',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error upserting team member profile:', error);
    return { data: null, error };
  }
};

/**
 * Delete team member profile
 */
export const deleteTeamMemberProfile = async (teamId, userId) => {
  try {
    const { error } = await supabase
      .from('team_member_profiles')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId);

    if (error) throw error;
    return { data: true, error: null };
  } catch (error) {
    console.error('Error deleting team member profile:', error);
    return { data: null, error };
  }
};

// =============================================
// PLAYER STATS API
// =============================================

/**
 * Get player stats for a season
 */
export const getPlayerStats = async (teamId, userId, season = '2024-2025') => {
  try {
    const { data, error } = await supabase
      .from('player_stats')
      .select('*')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .eq('season', season)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error fetching player stats:', error);
    return { data: null, error };
  }
};

/**
 * Create or update player stats
 */
export const upsertPlayerStats = async (teamId, userId, season, statsData) => {
  try {
    const statsWithIds = {
      ...statsData,
      team_id: teamId,
      user_id: userId,
      season
    };

    const { data, error } = await supabase
      .from('player_stats')
      .upsert(statsWithIds, { 
        onConflict: 'team_id,user_id,season',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error upserting player stats:', error);
    return { data: null, error };
  }
};

// =============================================
// AVATAR UPLOAD API
// =============================================

// Removed ensureAvatarsBucket function - we'll try upload directly

/**
 * Upload avatar to Supabase Storage
 */
export const uploadAvatar = async (userId, file) => {
  try {
    // Create file path: avatars/{userId}/avatar.{extension}
    const fileExt = file.name.split('.').pop();
    const fileName = `avatar.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    console.log('Uploading avatar to path:', filePath);
    console.log('File details:', {
      uri: file.uri,
      name: file.name,
      type: file.type
    });

    // Read file as base64 and convert to FormData
    console.log('Reading file as base64...');
    const base64 = await FileSystem.readAsStringAsync(file.uri, {
      encoding: 'base64',
    });

    console.log('Converting base64 to binary...');
    const byteArray = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

    // Upload binary data (React Native compatible)
    console.log('Uploading binary data to Supabase Storage...');
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, byteArray, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type
      });

    if (uploadError) {
      console.error('Upload error details:', uploadError);
      throw uploadError;
    }

    console.log('Upload successful:', uploadData);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    console.log('Generated avatar URL:', urlData.publicUrl);
    console.log('File path:', filePath);

    return { 
      data: { 
        path: filePath, 
        url: urlData.publicUrl 
      }, 
      error: null 
    };
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return { data: null, error };
  }
};

/**
 * Test if avatar URL is accessible
 */
export const testAvatarUrl = async (avatarUrl) => {
  try {
    const response = await fetch(avatarUrl, { method: 'HEAD' });
    console.log('Avatar URL test result:', {
      url: avatarUrl,
      status: response.status,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });
    return { data: response.ok, error: null };
  } catch (error) {
    console.error('Avatar URL test failed:', error);
    return { data: false, error };
  }
};

/**
 * Delete avatar from Supabase Storage
 */
export const deleteAvatar = async (userId) => {
  try {
    const { error } = await supabase.storage
      .from('avatars')
      .remove([`${userId}/avatar.jpg`, `${userId}/avatar.png`, `${userId}/avatar.jpeg`]);

    if (error) throw error;
    return { data: true, error: null };
  } catch (error) {
    console.error('Error deleting avatar:', error);
    return { data: null, error };
  }
};

// =============================================
// PROFILE COMPLETION HELPERS
// =============================================

/**
 * Check if a profile is complete based on role
 */
export const checkProfileCompletion = (profile, role) => {
  if (!profile) return false;

  const requiredFields = {
    player: ['jersey_number', 'position', 'class_year'],
    coach: ['staff_title', 'department'],
    trainer: ['staff_title'],
    admin: ['staff_title', 'department']
  };

  const fields = requiredFields[role] || [];
  return fields.every(field => profile[field] && profile[field].toString().trim() !== '');
};

/**
 * Get profile fields visible to current user based on role
 */
export const getVisibleFields = (viewerRole, targetRole) => {
  const fieldVisibility = {
    // Players viewing players
    'player-player': [
      'display_name', 'avatar_url', 'jersey_number', 'position', 
      'class_year', 'hometown', 'major'
    ],
    // Players viewing staff
    'player-staff': [
      'display_name', 'avatar_url', 'staff_title', 'department'
    ],
    // Staff viewing anyone
    'staff-any': [
      'display_name', 'avatar_url', 'jersey_number', 'position', 
      'class_year', 'height_cm', 'weight_kg', 'hometown', 'high_school', 
      'major', 'staff_title', 'department', 'years_experience', 
      'certifications', 'specialties', 'contact_email'
    ]
  };

  if (viewerRole === 'player') {
    return fieldVisibility[`player-${targetRole === 'player' ? 'player' : 'staff'}`] || [];
  } else {
    return fieldVisibility['staff-any'] || [];
  }
};
