import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';

const SupabaseContext = createContext(null);

export function SupabaseProvider({ children }) {
  const [supabase, setSupabase] = useState(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    async function init() {
      const url = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://cpzpwfiaclicrsxpcmmi.supabase.co';
      const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwenB3ZmlhY2xpY3JzeHBjbW1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MzkzNDQsImV4cCI6MjA3MjIxNTM0NH0.Oa-yH0a-GEgHdXErT-5v7uQhgm9Hho1A_F3PrO0HaoU';

      const client = createClient(url, anon, {
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
        auth: {
          storage: AsyncStorage,
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      });

      // 🔥 CRITICAL: WAIT for session to hydrate BEFORE accepting any requests
      // This ensures the client has the JWT token before any RLS policies are evaluated
      const { data: { session }, error: sessionError } = await client.auth.getSession();
      
      if (sessionError) {
        console.error('❌ Error getting session during provider init:', sessionError);
      }
      
      if (session?.user) {
        console.log('✅ SupabaseProvider: Session hydrated successfully', {
          userId: session.user.id,
          hasAccessToken: !!session.access_token,
          expiresAt: session.expires_at,
        });
      } else {
        console.log('ℹ️ SupabaseProvider: No active session (user not logged in)');
      }

      setSupabase(client);
      setIsHydrated(true);
      
      // Set global client for non-React code (legacy support)
      globalSupabaseClient = client;
    }

    init();
  }, []);

  // Don't render children until Supabase client is hydrated with session
  // This prevents any requests from being made before auth.uid() is available
  if (!isHydrated || !supabase) {
    return null; // You can add a splash screen here if needed
  }

  return (
    <SupabaseContext.Provider value={supabase}>
      {children}
    </SupabaseContext.Provider>
  );
}

// Export a function to get the client synchronously (for non-React code)
// This should only be used after the provider is mounted
let globalSupabaseClient = null;

export function getSupabaseClient() {
  if (!globalSupabaseClient) {
    throw new Error('Supabase client not available. Make sure SupabaseProvider is mounted and hydrated.');
  }
  return globalSupabaseClient;
}

// Update global client when provider mounts
SupabaseProvider.setGlobalClient = (client) => {
  globalSupabaseClient = client;
};

export function useSupabase() {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('useSupabase must be used within SupabaseProvider');
  }
  return context;
}

