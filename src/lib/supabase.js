// ⚠️ DEPRECATED: This file is no longer used for creating the client
// The Supabase client is now created in SupabaseProvider after session hydration
// This prevents auth.uid() = NULL issues in RLS policies
// 
// For React components/hooks, use:
// import { useSupabase } from '../providers/SupabaseProvider';
// const supabase = useSupabase();
//
// For non-React code (API functions), accept supabase as a parameter:
// export async function myFunction(supabaseClient, ...) {
//   const supabase = supabaseClient;
//   ...
// }

// Legacy export for backward compatibility (will be null until provider mounts)
// DO NOT USE THIS - it will be null and cause errors
// Use useSupabase() hook or pass supabase as parameter instead
export const supabase = null;

// Database table names
export const TABLES = {
  TEAMS: 'teams',
  TEAM_MEMBERS: 'team_members',
  TEAM_INVITES: 'team_invites',
  TEAM_JOIN_CODES: 'team_join_codes',
};

// Storage bucket names
export const STORAGE_BUCKETS = {
  TEAM_LOGOS: 'team-logos',
};
