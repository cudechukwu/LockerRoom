/**
 * Centralized query keys for consistent invalidation
 * This makes it easier to invalidate specific queries when data changes
 */
export const queryKeys = {
  authTeam: () => ['authTeam'],
  currentUser: () => ['currentUser'],
  teamInfo: (teamId) => ['teamInfo', teamId],
  notifications: (teamId, userId) => ['notificationSummary', teamId, userId],
  nextEvent: (teamId) => ['nextEvent', teamId],
  profile: (userId) => ['profile', userId],
  channels: (teamId) => ['channels', teamId],
  directMessages: (teamId) => ['directMessages', teamId],
  teamConversations: (teamId, userId) => ['teamConversations', teamId, userId],
  threadMessages: (parentMessageId) => ['threadMessages', parentMessageId],
  channelDetails: (channelId) => ['channelDetails', channelId],
  // Playbook system keys
  playbooks: (teamId) => ['playbooks', teamId],
  play: (playId) => ['play', playId],
  sharedPlay: (shareToken) => ['sharedPlay', shareToken],
  // Profile system keys
  userProfile: (userId) => ['userProfile', userId],
  teamMemberProfile: (teamId, userId) => ['teamMemberProfile', teamId, userId],
  teamAdminStatus: (teamId, userId) => ['teamAdminStatus', teamId, userId],
  playerStats: (teamId, userId) => ['playerStats', teamId, userId],
  // Calendar system keys
  calendarEvents: (teamId, view, date) => ['calendarEvents', teamId, view, date],
  upcomingEvents: (teamId) => ['upcomingEvents', teamId],
  teamColors: (teamId) => ['teamColors', teamId],
  userTeamMembership: (userId) => ['userTeamMembership', userId],
  // Calling system keys
  callSession: (callSessionId) => ['callSession', callSessionId],
  activeCalls: (teamId) => ['activeCalls', teamId],
  callHistory: (teamId) => ['callHistory', teamId],
};
