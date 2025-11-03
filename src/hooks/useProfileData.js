import React, { useEffect } from 'react';
import { useQueries } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dataCache, CACHE_KEYS } from '../utils/dataCache';
import { useAuthTeam } from './useAuthTeam';
import { queryKeys } from './queryKeys';
import { 
  getTeamMemberProfile, 
  getPlayerStats,
  getUserProfile 
} from '../api/profiles';
import { getTeamInfo, isTeamAdmin } from '../api/teamMembers';

/**
 * Unified Profile Data Hook - Hybrid Architecture
 * 
 * Combines:
 * - Engineer's parallel useQueries() structure
 * - SWR-style persistent caching (AsyncStorage + dataCache)
 * - HomeScreen's proven patterns
 * 
 * Provides instant render from cache + background refresh
 */
export const useProfileData = () => {
  const { data: ids, isLoading: idsLoading, error: idsError } = useAuthTeam();
  const teamId = ids?.teamId;
  const userId = ids?.userId;
  const cacheKey = CACHE_KEYS.PROFILE_DATA(userId);

  // Check persistent + memory cache before query
  const getCachedProfile = async () => {
    const inMemory = dataCache.get(cacheKey);
    if (inMemory) return inMemory;
    const stored = await AsyncStorage.getItem(cacheKey);
    return stored ? JSON.parse(stored) : null;
  };

  // Parallel queries with individualized TTLs and enabled flags
  const queries = useQueries({
    queries: [
      {
        queryKey: queryKeys.teamInfo(teamId),
        queryFn: () => getTeamInfo(teamId),
        enabled: !!teamId,
        staleTime: 5 * 60 * 1000, // 5 minutes - team info changes rarely
      },
      {
        queryKey: queryKeys.userProfile(userId),
        queryFn: () => getUserProfile(userId),
        enabled: !!userId,
        staleTime: 10 * 60 * 1000, // 10 minutes - profile changes rarely
      },
      {
        queryKey: queryKeys.teamMemberProfile(teamId, userId),
        queryFn: () => getTeamMemberProfile(teamId, userId),
        enabled: !!teamId && !!userId,
        staleTime: 5 * 60 * 1000, // 5 minutes - moderate changes
      },
      {
        queryKey: queryKeys.teamAdminStatus(teamId, userId),
        queryFn: () => isTeamAdmin(teamId),
        enabled: !!teamId && !!userId,
        staleTime: 10 * 60 * 1000, // 10 minutes - admin status rarely changes
      },
      {
        queryKey: queryKeys.playerStats(teamId, userId),
        queryFn: () => getPlayerStats(teamId, userId),
        enabled: !!teamId && !!userId,
        staleTime: 5 * 60 * 1000, // 5 minutes - stats change moderately
      },
    ],
  });

  const [teamInfoQ, userProfileQ, teamMemberProfileQ, adminStatusQ, playerStatsQ] = queries;

  // Loading state: only show loading if we have no cached data
  const isLoading = idsLoading || queries.some(q => q?.isLoading && !q?.data);
  
  // Fetching state: for background refresh indicators
  const isFetching = queries.some(q => q?.isFetching);
  
  // Error handling
  const error = idsError || queries.find(q => q?.error)?.error;

  // Merge and process profile data (engineer's composition pattern)
  const profileData = React.useMemo(() => {
    const userProfile = userProfileQ?.data?.data;
    const teamMemberProfile = teamMemberProfileQ?.data?.data; // ✅ FIXED: unwrap the .data layer
    
    if (!teamMemberProfile) {
      console.log('❌ No team member profile found');
      return null;
    }
    
    const combined = {
      ...teamMemberProfile,
      user_profiles: userProfile || { 
        display_name: 'Unknown User', 
        avatar_url: null, 
        bio: null 
      },
      isTeamAdmin: adminStatusQ?.data ?? false,
      playerStats: playerStatsQ?.data ?? null,
    };
    
    // Debug logging (can be removed in production)
    if (__DEV__) {
      console.log('✅ Combined profile data:', {
        displayName: combined.user_profiles?.display_name,
        jerseyNumber: combined.jersey_number,
        position: combined.position,
        classYear: combined.class_year,
        major: combined.major,
        height: combined.height_cm,
        weight: combined.weight_kg,
        hometown: combined.hometown,
      });
    }
    
    return combined;
  }, [
    userProfileQ?.data,
    teamMemberProfileQ?.data,
    adminStatusQ?.data,
    playerStatsQ?.data,
  ]);

  // Memoized consolidated data object to prevent unnecessary re-renders
  const data = React.useMemo(() => ({
    teamId,
    userId,
    teamInfo: teamInfoQ?.data ?? null,
    profile: profileData,
    userRole: teamMemberProfileQ?.data?.role || 'player',
    isTeamAdmin: adminStatusQ?.data ?? false,
    playerStats: playerStatsQ?.data ?? null,
  }), [
    teamId, 
    userId, 
    teamInfoQ?.data, 
    profileData, 
    teamMemberProfileQ?.data?.role,
    adminStatusQ?.data,
    playerStatsQ?.data
  ]);

  // Persist to cache for SWR experience (your persistence layer)
  useEffect(() => {
    if (profileData && userId) {
      const cacheKey = CACHE_KEYS.PROFILE_DATA(userId);
      dataCache.set(cacheKey, profileData, 10 * 60 * 1000); // 10 minutes
      AsyncStorage.setItem(cacheKey, JSON.stringify(profileData));
    }
  }, [profileData, userId]);

  return { 
    data, 
    isLoading, 
    isFetching, 
    error,
    // Individual query states for debugging
    queries: {
      teamInfo: teamInfoQ,
      userProfile: userProfileQ,
      teamMemberProfile: teamMemberProfileQ,
      adminStatus: adminStatusQ,
      playerStats: playerStatsQ,
    }
  };
};
