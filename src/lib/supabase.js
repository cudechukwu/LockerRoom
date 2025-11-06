import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://cpzpwfiaclicrsxpcmmi.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwenB3ZmlhY2xpY3JzeHBjbW1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MzkzNDQsImV4cCI6MjA3MjIxNTM0NH0.Oa-yH0a-GEgHdXErT-5v7uQhgm9Hho1A_F3PrO0HaoU';

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
