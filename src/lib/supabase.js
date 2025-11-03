import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
