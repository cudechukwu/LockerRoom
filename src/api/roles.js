/**
 * Team Member Roles API
 * Handles role assignments and permissions
 */

// Supabase client is now passed as a parameter to all functions

// Valid role types (must match database CHECK constraint)
const VALID_ROLES = [
  'head_coach',
  'assistant_coach',
  'position_coach',
  'team_admin',
  'student_manager',
  'athletic_trainer',
  'player'
];

// Valid permission keys (must match database default structure)
const VALID_PERMISSION_KEYS = [
  'can_view_attendance',
  'can_edit_attendance',
  'can_lock_checkins',
  'can_view_analytics',
  'can_view_flagged',
  'can_bulk_edit',
  'can_export_reports',
  'can_manage_settings'
];

/**
 * Get current authenticated user (cached for performance)
 * In production, consider using a global auth store
 */
let cachedUser = null;
let userCacheTime = 0;
const USER_CACHE_TTL = 60000; // 1 minute

async function getCurrentUser(supabaseClient) {
  const now = Date.now();
  if (cachedUser && (now - userCacheTime) < USER_CACHE_TTL) {
    return cachedUser;
  }
  
  const { data: { user }, error } = await supabaseClient.auth.getUser();
  if (error || !user) {
    throw { code: 'UNAUTHORIZED', message: 'User not authenticated' };
  }
  
  cachedUser = user;
  userCacheTime = now;
  return user;
}

/**
 * Check if current user has permission to manage roles
 * @param {Object} supabaseClient - Supabase client instance
 * @param {string} teamId - Team ID
 * @returns {Promise<boolean>} Whether user can manage roles
 */
async function canManageRoles(supabaseClient, teamId) {
  try {
    const user = await getCurrentUser(supabaseClient);
    const { data: role } = await getUserTeamRole(supabaseClient, teamId, user.id);
    
    if (!role || !role.role) return false;
    
    return role.role === 'head_coach' || role.role === 'team_admin';
  } catch (error) {
    return false;
  }
}

/**
 * Get user's role for a team
 * @param {Object} supabaseClient - Supabase client instance (from useSupabase() hook)
 * @param {string} teamId - Team ID
 * @param {string} [userId] - User ID (optional, defaults to current user)
 * @returns {Promise<Object>} Role information
 */
export async function getUserTeamRole(supabaseClient, teamId, userId = null) {
  if (!supabaseClient) {
    throw new Error('Supabase client is required. Use useSupabase() hook and pass the client to this function.');
  }
  const supabase = supabaseClient;
  
  try {
    const user = await getCurrentUser(supabase);
    const targetUserId = userId || user.id;

    // First check team_member_roles table (granular roles)
    const { data: roleData, error: roleError } = await supabase
      .from('team_member_roles')
      .select('*')
      .eq('team_id', teamId)
      .eq('user_id', targetUserId)
      .single();

    // If found in team_member_roles, return it
    if (roleData && !roleError) {
      return { data: roleData, error: null };
    }

    // Fallback: Check team_members table (basic roles)
    const { data: memberData, error: memberError } = await supabase
      .from('team_members')
      .select('role, is_admin')
      .eq('team_id', teamId)
      .eq('user_id', targetUserId)
      .single();

    if (memberData && !memberError) {
      // Map team_members role to team_member_roles format
      let mappedRole = 'player';
      
      if (memberData.is_admin) {
        mappedRole = 'team_admin';
      } else if (memberData.role === 'coach') {
        // Default coach role to 'assistant_coach' (can be upgraded later)
        mappedRole = 'assistant_coach';
      } else if (memberData.role === 'player') {
        mappedRole = 'player';
      }

      // Return in same format as team_member_roles
      const defaultPermissions = getDefaultPermissionsForRole(mappedRole);
      return {
        data: {
          role: mappedRole,
          permissions: defaultPermissions,
          team_id: teamId,
          user_id: targetUserId,
        },
        error: null,
      };
    }

    // Default to 'player' if no role found in either table
    const defaultPermissions = getDefaultPermissionsForRole('player');
    return { 
      data: { 
        role: 'player', 
        permissions: defaultPermissions,
        team_id: teamId,
        user_id: targetUserId
      }, 
      error: null 
    };
  } catch (error) {
    console.error('Error getting user team role:', error);
    return { data: null, error };
  }
}

/**
 * Assign a role to a user
 * @param {string} teamId - Team ID
 * @param {string} userId - User ID
 * @param {Object} roleData - Role data
 * @param {string} roleData.role - Role type
 * @param {string} [roleData.positionGroup] - Position group (for position coaches)
 * @param {Object} [roleData.permissions] - Custom permissions object
 * @returns {Promise<Object>} Assignment result
 */
export async function assignRole(supabaseClient, teamId, userId, roleData) {
  if (!supabaseClient) {
    throw new Error('Supabase client is required. Use useSupabase() hook and pass the client to this function.');
  }
  const supabase = supabaseClient;
  
  try {
    const user = await getCurrentUser(supabase);

    // Verify user has permission (head coach/admin only)
    const hasPermission = await canManageRoles(supabase, teamId);
    if (!hasPermission) {
      throw { code: 'PERMISSION_DENIED', message: 'Only head coaches and team admins can assign roles' };
    }

    // Validate and sanitize role
    if (!roleData || !roleData.role) {
      throw { code: 'INVALID_INPUT', message: 'Role is required' };
    }

    if (!VALID_ROLES.includes(roleData.role)) {
      throw { 
        code: 'INVALID_ROLE', 
        message: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` 
      };
    }

    // Get existing role to preserve custom permissions if updating
    const { data: existingRole } = await getUserTeamRole(supabase, teamId, userId);
    
    // Set default permissions based on role
    const defaultPermissions = getDefaultPermissionsForRole(roleData.role);
    
    // Merge permissions: preserve existing custom permissions if role hasn't changed,
    // otherwise use defaults and merge any provided custom permissions
    let finalPermissions = defaultPermissions;
    
    if (existingRole && existingRole.role === roleData.role && existingRole.permissions) {
      // Role unchanged: merge existing permissions with any new ones
      finalPermissions = {
        ...defaultPermissions,
        ...sanitizePermissions(existingRole.permissions),
        ...sanitizePermissions(roleData.permissions || {})
      };
    } else if (roleData.permissions) {
      // Role changed or new: use defaults and merge provided permissions
      finalPermissions = {
        ...defaultPermissions,
        ...sanitizePermissions(roleData.permissions)
      };
    }

    const { data, error } = await supabase
      .from('team_member_roles')
      .upsert({
        team_id: teamId,
        user_id: userId,
        role: roleData.role,
        position_group: roleData.positionGroup || null,
        permissions: finalPermissions
      }, {
        onConflict: 'team_id,user_id'
      })
      .select()
      .single();

    if (error) {
      // Handle CHECK constraint violation for invalid role
      if (error.code === '23514') {
        throw { code: 'INVALID_ROLE', message: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` };
      }
      // Handle .single() when no rows returned (shouldn't happen with upsert, but handle it)
      if (error.code === 'PGRST116') {
        throw { code: 'ROLE_NOT_FOUND', message: 'Role assignment failed' };
      }
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error assigning role:', error);
    return { data: null, error };
  }
}

/**
 * Update role permissions
 * @param {string} roleId - Role ID
 * @param {Object} permissions - Updated permissions
 * @returns {Promise<Object>} Update result
 */
export async function updateRolePermissions(supabaseClient, roleId, permissions) {
  if (!supabaseClient) {
    throw new Error('Supabase client is required. Use useSupabase() hook and pass the client to this function.');
  }
  const supabase = supabaseClient;
  
  try {
    const user = await getCurrentUser(supabase);

    // Get existing role to verify team_id and permissions
    const { data: existingRole, error: fetchError } = await supabase
      .from('team_member_roles')
      .select('team_id, permissions, role')
      .eq('id', roleId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        throw { code: 'ROLE_NOT_FOUND', message: 'Role not found' };
      }
      throw fetchError;
    }

    // Verify user has permission (head coach/admin only)
    const hasPermission = await canManageRoles(supabase, existingRole.team_id);
    if (!hasPermission) {
      throw { code: 'PERMISSION_DENIED', message: 'Only head coaches and team admins can update permissions' };
    }

    // Validate and sanitize permissions
    const sanitizedPermissions = sanitizePermissions(permissions);
    
    // Merge with existing permissions to preserve any custom keys (if needed)
    const finalPermissions = {
      ...sanitizePermissions(existingRole.permissions || {}),
      ...sanitizedPermissions
    };

    const { data, error } = await supabase
      .from('team_member_roles')
      .update({ permissions: finalPermissions })
      .eq('id', roleId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw { code: 'ROLE_NOT_FOUND', message: 'Role not found after update' };
      }
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error updating role permissions:', error);
    return { data: null, error };
  }
}

/**
 * Remove a role
 * @param {string} roleId - Role ID
 * @returns {Promise<Object>} Deletion result
 */
export async function removeRole(supabaseClient, roleId) {
  if (!supabaseClient) {
    throw new Error('Supabase client is required. Use useSupabase() hook and pass the client to this function.');
  }
  const supabase = supabaseClient;
  
  try {
    const user = await getCurrentUser(supabase);

    // Get existing role to verify team_id
    const { data: existingRole, error: fetchError } = await supabase
      .from('team_member_roles')
      .select('team_id, user_id, role')
      .eq('id', roleId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        throw { code: 'ROLE_NOT_FOUND', message: 'Role not found' };
      }
      throw fetchError;
    }

    // Verify user has permission (head coach/admin only)
    const hasPermission = await canManageRoles(supabase, existingRole.team_id);
    if (!hasPermission) {
      throw { code: 'PERMISSION_DENIED', message: 'Only head coaches and team admins can remove roles' };
    }

    // Additional safety: verify team_id matches (RLS will also enforce this)
    const { error } = await supabase
      .from('team_member_roles')
      .delete()
      .eq('id', roleId)
      .eq('team_id', existingRole.team_id); // Explicit team_id check

    if (error) throw error;

    return { data: { success: true }, error: null };
  } catch (error) {
    console.error('Error removing role:', error);
    return { data: null, error };
  }
}

/**
 * Sanitize permissions object to only include valid keys
 * @param {Object} permissions - Permissions object
 * @returns {Object} Sanitized permissions
 */
function sanitizePermissions(permissions) {
  if (!permissions || typeof permissions !== 'object') {
    return {};
  }

  const sanitized = {};
  for (const key of VALID_PERMISSION_KEYS) {
    if (key in permissions) {
      // CRITICAL FIX: Convert string booleans to actual booleans
      const value = permissions[key];
      if (typeof value === 'string') {
        sanitized[key] = value === 'true' || value === '1';
      } else {
        sanitized[key] = !!value; // Convert to boolean
      }
    }
  }
  return sanitized;
}

/**
 * Get default permissions for a role
 * @param {string} role - Role type
 * @returns {Object} Default permissions
 */
function getDefaultPermissionsForRole(role) {
  const permissions = {
    can_view_attendance: false,
    can_edit_attendance: false,
    can_lock_checkins: false,
    can_view_analytics: false,
    can_view_flagged: false,
    can_bulk_edit: false,
    can_export_reports: false,
    can_manage_settings: false
  };

  switch (role) {
    case 'head_coach':
    case 'team_admin':
      return {
        ...permissions,
        can_view_attendance: true,
        can_edit_attendance: true,
        can_lock_checkins: true,
        can_view_analytics: true,
        can_view_flagged: true,
        can_bulk_edit: true,
        can_export_reports: true,
        can_manage_settings: true
      };
    
    case 'assistant_coach':
      return {
        ...permissions,
        can_view_attendance: true,
        can_edit_attendance: true,
        can_lock_checkins: true,
        can_view_analytics: true,
        can_view_flagged: true,
        can_bulk_edit: true,
        can_export_reports: true,
        can_manage_settings: false
      };
    
    case 'position_coach':
      return {
        ...permissions,
        can_view_attendance: true,
        can_edit_attendance: true,
        can_lock_checkins: false,
        can_view_analytics: true,
        can_view_flagged: true,
        can_bulk_edit: true,
        can_export_reports: true,
        can_manage_settings: false
      };
    
    case 'student_manager':
      return {
        ...permissions,
        can_view_attendance: true,
        can_edit_attendance: false,
        can_lock_checkins: false,
        can_view_analytics: false,
        can_view_flagged: false,
        can_bulk_edit: false,
        can_export_reports: true,
        can_manage_settings: false
      };
    
    case 'athletic_trainer':
      return {
        ...permissions,
        can_view_attendance: true,
        can_edit_attendance: false,
        can_lock_checkins: false,
        can_view_analytics: false,
        can_view_flagged: false,
        can_bulk_edit: false,
        can_export_reports: false,
        can_manage_settings: false
      };
    
    default: // player
      return permissions;
  }
}

/**
 * Check if user has a specific permission
 * @param {string} teamId - Team ID
 * @param {string} userId - User ID
 * @param {string} permission - Permission name
 * @returns {Promise<boolean>} Whether user has permission
 */
export async function hasPermission(supabaseClient, teamId, userId, permission) {
  if (!supabaseClient) {
    throw new Error('Supabase client is required. Use useSupabase() hook and pass the client to this function.');
  }
  
  try {
    const { data: role, error } = await getUserTeamRole(supabaseClient, teamId, userId);
    
    if (error || !role) return false;

    // Head coach and team admin have all permissions
    if (role.role === 'head_coach' || role.role === 'team_admin') {
      return true;
    }

    // Validate permission key
    if (!VALID_PERMISSION_KEYS.includes(permission)) {
      console.warn(`Invalid permission key: ${permission}`);
      return false;
    }

    // Check specific permission
    // CRITICAL FIX: Handle both boolean and string boolean values
    if (role.permissions && permission in role.permissions) {
      const value = role.permissions[permission];
      // Convert string booleans to actual booleans
      if (typeof value === 'string') {
        return value === 'true' || value === '1';
      }
      return !!value; // Convert to boolean
    }

    return false;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}

