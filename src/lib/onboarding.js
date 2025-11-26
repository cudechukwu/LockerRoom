/**
 * Ensure a user_profiles row exists for the authenticated user.
 * Safe to call repeatedly thanks to upsert/onConflict.
 */
export async function ensureUserProfile(supabaseClient, user, displayName) {
  if (!user?.id) {
    console.warn('ensureUserProfile called without valid user');
    return;
  }

  const fallbackName =
    displayName ||
    user.user_metadata?.name ||
    (user.email ? user.email.split('@')[0] : 'New User');

  const profilePayload = {
    user_id: user.id,
    display_name: fallbackName,
    bio: '',
  };

  const { error } = await supabaseClient
    .from('user_profiles')
    .upsert(profilePayload, { onConflict: 'user_id' });

  if (error) {
    console.error('ensureUserProfile upsert failed:', error);
    throw error;
  }
}

/**
 * Ensure a team_member_profiles row exists for the given team/user combo.
 */
export async function ensureTeamMemberProfile(supabaseClient, teamId, userId, role = 'player') {
  if (!teamId || !userId) {
    console.warn('ensureTeamMemberProfile called without teamId/userId', { teamId, userId });
    return;
  }

  const profilePayload = {
    team_id: teamId,
    user_id: userId,
    role,
    jersey_number: null,
    position: null,
    is_complete: false,
  };

  const { error } = await supabaseClient
    .from('team_member_profiles')
    .upsert(profilePayload, { onConflict: 'team_id,user_id' });

  if (error) {
    console.error('ensureTeamMemberProfile upsert failed:', error);
    throw error;
  }
}

/**
 * Seed baseline profile data for onboarding flows.
 * Accepts either a team object or teamId string.
 */
export async function seedInitialData(supabaseClient, { user, team, teamId, role = 'player' }) {
  if (!user?.id) {
    throw new Error('seedInitialData requires a user with an id');
  }

  const resolvedTeamId = team?.id || teamId;

  await ensureUserProfile(supabaseClient, user);

  if (resolvedTeamId) {
    await ensureTeamMemberProfile(supabaseClient, resolvedTeamId, user.id, role);
  }
}

