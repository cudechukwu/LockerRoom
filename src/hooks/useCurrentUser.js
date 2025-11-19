import React from 'react';
import { AppBootstrapContext } from '../contexts/AppBootstrapContext';

/**
 * Centralized hook to get current authenticated user
 * Single source of truth for user data - improves cache coherence
 * @returns {Object} React Query result with user data
 */
export function useCurrentUser() {
  const { user } = React.useContext(AppBootstrapContext);

  return {
    data: user ?? null,
    isLoading: false,
    isError: !user,
    error: user ? null : new Error('NO_USER'),
    refetch: async () => ({ data: user ?? null }),
  };
}

