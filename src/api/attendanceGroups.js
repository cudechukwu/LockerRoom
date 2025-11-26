/**
 * Custom Attendance Groups API
 * Handles flexible, arbitrary group creation and management
 * Examples: "D-Line", "Traveling Squad", "Film Crew", "Captains", etc.
 */

/**
 * Get all attendance groups for a team
 * @param {Object} supabaseClient - Supabase client instance (from useSupabase() hook)
 * @param {string} teamId - Team ID
 * @returns {Promise<Object>} Groups list
 */
export async function getTeamAttendanceGroups(supabaseClient, teamId) {
  if (!supabaseClient) {
    throw new Error('Supabase client is required. Use useSupabase() hook and pass the client to this function.');
  }
  const supabase = supabaseClient;
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('attendance_groups')
      .select('*')
      .eq('team_id', teamId)
      .order('name', { ascending: true });

    if (error) throw error;

    return { data: data || [], error: null };
  } catch (error) {
    console.error('Error getting attendance groups:', error);
    return { data: null, error };
  }
}

/**
 * Get a single attendance group with its members
 * @param {string} groupId - Group ID
 * @returns {Promise<Object>} Group with members
 */
export async function getAttendanceGroup(supabaseClient, groupId) {
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get group details
    const { data: group, error: groupError } = await supabaseClient
      .from('attendance_groups')
      .select('*')
      .eq('id', groupId)
      .single();

    if (groupError) throw groupError;

    // Get group members
    const { data: members, error: membersError } = await supabaseClient
      .from('attendance_group_members')
      .select('user_id')
      .eq('group_id', groupId);

    if (membersError) throw membersError;

    // Get user profiles for members
    const userIds = members.map(m => m.user_id);
    let memberProfiles = [];
    
    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabaseClient
        .from('user_profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);

      if (!profilesError && profiles) {
        memberProfiles = profiles;
      }
    }

    return {
      data: {
        ...group,
        members: memberProfiles,
        memberCount: memberProfiles.length,
      },
      error: null,
    };
  } catch (error) {
    console.error('Error getting attendance group:', error);
    return { data: null, error };
  }
}

/**
 * Create a new attendance group
 * @param {string} teamId - Team ID
 * @param {Object} groupData - Group data
 * @param {string} groupData.name - Group name
 * @param {string} [groupData.description] - Optional description
 * @param {string} [groupData.color] - Optional color (hex code)
 * @returns {Promise<Object>} Created group
 */
export async function createAttendanceGroup(supabaseClient, teamId, groupData) {
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // TODO: Verify user has permission (coach/admin)

    const { data, error } = await supabaseClient
      .from('attendance_groups')
      .insert({
        team_id: teamId,
        name: groupData.name.trim(),
        description: groupData.description || null,
        color: groupData.color || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error creating attendance group:', error);
    return { data: null, error };
  }
}

/**
 * Update an attendance group
 * @param {string} groupId - Group ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated group
 */
export async function updateAttendanceGroup(supabaseClient, groupId, updates) {
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // TODO: Verify user has permission (coach/admin)

    const updateData = {};
    if (updates.name !== undefined) updateData.name = updates.name.trim();
    if (updates.description !== undefined) updateData.description = updates.description || null;
    if (updates.color !== undefined) updateData.color = updates.color || null;

    const { data, error } = await supabaseClient
      .from('attendance_groups')
      .update(updateData)
      .eq('id', groupId)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error updating attendance group:', error);
    return { data: null, error };
  }
}

/**
 * Delete an attendance group
 * @param {string} groupId - Group ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteAttendanceGroup(supabaseClient, groupId) {
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // TODO: Verify user has permission (coach/admin)

    const { error } = await supabaseClient
      .from('attendance_groups')
      .delete()
      .eq('id', groupId);

    if (error) throw error;

    return { data: { success: true }, error: null };
  } catch (error) {
    console.error('Error deleting attendance group:', error);
    return { data: null, error };
  }
}

/**
 * Get all members in a group
 * @param {string} groupId - Group ID
 * @returns {Promise<Object>} Members list with profiles
 */
export async function getGroupMembers(supabaseClient, groupId) {
  if (!supabaseClient) {
    throw new Error('Supabase client is required. Use useSupabase() hook and pass the client to this function.');
  }
  const supabase = supabaseClient;
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get group to get team_id
    const { data: group, error: groupError } = await supabase
      .from('attendance_groups')
      .select('team_id')
      .eq('id', groupId)
      .single();

    if (groupError) throw groupError;

    // Get group members
    const { data: members, error: membersError } = await supabase
      .from('attendance_group_members')
      .select('user_id, added_at')
      .eq('group_id', groupId);

    if (membersError) throw membersError;

    // Get user profiles
    const userIds = members.map(m => m.user_id);
    let memberProfiles = [];

    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);

      if (!profilesError && profiles) {
        // Merge member data with profiles
        memberProfiles = members.map(member => {
          const profile = profiles.find(p => p.user_id === member.user_id);
          return {
            ...member,
            ...profile,
            display_name: profile?.display_name || 'Unknown User',
          };
        });
      }
    }

    return { data: memberProfiles, error: null };
  } catch (error) {
    console.error('Error getting group members:', error);
    return { data: null, error };
  }
}

/**
 * Add a member to a group
 * @param {string} groupId - Group ID
 * @param {string} userId - User ID to add
 * @returns {Promise<Object>} Result
 */
export async function addMemberToGroup(groupId, userId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get group to get team_id
    const { data: group, error: groupError } = await supabase
      .from('attendance_groups')
      .select('team_id')
      .eq('id', groupId)
      .single();

    if (groupError) throw groupError;

    // TODO: Verify user has permission (coach/admin)

    const { data, error } = await supabase
      .from('attendance_group_members')
      .insert({
        group_id: groupId,
        user_id: userId,
        team_id: group.team_id,
        added_by: user.id,
      })
      .select()
      .single();

    if (error) {
      // Handle unique constraint violation (already a member)
      if (error.code === '23505') {
        return { data: { alreadyMember: true }, error: null };
      }
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error adding member to group:', error);
    return { data: null, error };
  }
}

/**
 * Remove a member from a group
 * @param {string} groupId - Group ID
 * @param {string} userId - User ID to remove
 * @returns {Promise<Object>} Result
 */
export async function removeMemberFromGroup(groupId, userId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // TODO: Verify user has permission (coach/admin)

    const { error } = await supabase
      .from('attendance_group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId);

    if (error) throw error;

    return { data: { success: true }, error: null };
  } catch (error) {
    console.error('Error removing member from group:', error);
    return { data: null, error };
  }
}

/**
 * Bulk add members to a group
 * @param {string} groupId - Group ID
 * @param {string[]} userIds - Array of user IDs to add
 * @returns {Promise<Object>} Result
 */
export async function bulkAddMembersToGroup(supabaseClient, groupId, userIds) {
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get group to get team_id
    const { data: group, error: groupError } = await supabaseClient
      .from('attendance_groups')
      .select('team_id')
      .eq('id', groupId)
      .single();

    if (groupError) throw groupError;

    // TODO: Verify user has permission (coach/admin)

    // Prepare insert data
    const membersToAdd = userIds.map(userId => ({
      group_id: groupId,
      user_id: userId,
      team_id: group.team_id,
      added_by: user.id,
    }));

    const { data, error } = await supabaseClient
      .from('attendance_group_members')
      .upsert(membersToAdd, {
        onConflict: 'group_id,user_id',
        ignoreDuplicates: false,
      })
      .select();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error bulk adding members to group:', error);
    return { data: null, error };
  }
}

/**
 * Bulk remove members from a group
 * @param {string} groupId - Group ID
 * @param {string[]} userIds - Array of user IDs to remove
 * @returns {Promise<Object>} Result
 */
export async function bulkRemoveMembersFromGroup(supabaseClient, groupId, userIds) {
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // TODO: Verify user has permission (coach/admin)

    const { error } = await supabaseClient
      .from('attendance_group_members')
      .delete()
      .eq('group_id', groupId)
      .in('user_id', userIds);

    if (error) throw error;

    return { data: { success: true }, error: null };
  } catch (error) {
    console.error('Error bulk removing members from group:', error);
    return { data: null, error };
  }
}

/**
 * Get all attendance groups a user belongs to
 * @param {string} teamId - Team ID
 * @param {string} [userId] - User ID (optional, defaults to current user)
 * @returns {Promise<Object>} Groups list
 */
export async function getUserAttendanceGroups(supabaseClient, teamId, userId = null) {
  if (!supabaseClient) {
    throw new Error('Supabase client is required. Use useSupabase() hook and pass the client to this function.');
  }
  const supabase = supabaseClient;
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const targetUserId = userId || user.id;

    // Get all group memberships for this user
    const { data: memberships, error: membershipsError } = await supabase
      .from('attendance_group_members')
      .select('group_id')
      .eq('team_id', teamId)
      .eq('user_id', targetUserId);

    if (membershipsError) throw membershipsError;

    if (!memberships || memberships.length === 0) {
      return { data: [], error: null };
    }

    // Get group details
    const groupIds = memberships.map(m => m.group_id);
    const { data: groups, error: groupsError } = await supabase
      .from('attendance_groups')
      .select('*')
      .in('id', groupIds)
      .order('name', { ascending: true });

    if (groupsError) throw groupsError;

    return { data: groups || [], error: null };
  } catch (error) {
    console.error('Error getting user attendance groups:', error);
    return { data: null, error };
  }
}

/**
 * Check if a user is in a specific group
 * @param {string} userId - User ID
 * @param {string} groupId - Group ID
 * @returns {Promise<boolean>} True if user is in group
 */
export async function isUserInGroup(supabaseClient, userId, groupId) {
  if (!supabaseClient) {
    throw new Error('Supabase client is required. Use useSupabase() hook and pass the client to this function.');
  }
  const supabase = supabaseClient;
  
  try {
    const { data, error } = await supabase
      .from('attendance_group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      throw error;
    }

    return { data: !!data, error: null };
  } catch (error) {
    console.error('Error checking user group membership:', error);
    return { data: false, error };
  }
}

/**
 * Check if a user is in any of the specified groups
 * @param {string} userId - User ID
 * @param {string[]} groupIds - Array of group IDs
 * @returns {Promise<boolean>} True if user is in at least one group
 */
export async function isUserInAnyGroup(supabaseClient, userId, groupIds) {
  if (!supabaseClient) {
    throw new Error('Supabase client is required. Use useSupabase() hook and pass the client to this function.');
  }
  const supabase = supabaseClient;
  
  try {
    if (!groupIds || groupIds.length === 0) {
      return { data: false, error: null };
    }

    const { data, error } = await supabase
      .from('attendance_group_members')
      .select('id')
      .eq('user_id', userId)
      .in('group_id', groupIds)
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return { data: !!data, error: null };
  } catch (error) {
    console.error('Error checking user group membership:', error);
    return { data: false, error };
  }
}

