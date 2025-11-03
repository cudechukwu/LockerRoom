// Chat API Index
// Central export for all chat-related API functions

// Chat API
export {
  getChannels,
  getChannel,
  createChannel,
  getChannelMembers,
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  toggleReaction,
  addReaction,
  removeReaction,
  markMessageAsRead,
  getLatestMessage,
  muteChannel,
  unmuteChannel,
  subscribeToMessages,
  subscribeToChannelMembers,
  unsubscribe
} from './chat.js';

// Upload API
export {
  getSignedUploadUrl,
  uploadFileToS3,
  completeFileUpload,
  uploadFileInChunks,
  uploadFile,
  getSignedDownloadUrl,
  deleteFile,
  getChannelMedia
} from './upload.js';

// Alerts API
export {
  sendPriorityAlert,
  getPriorityAlerts,
  getPriorityAlert,
  sendNotificationOverride,
  validatePriorityAlert,
  getAlertTemplates,
  applyAlertTemplate
} from './alerts.js';

// Search API
export {
  globalSearch,
  searchMessages,
  searchChannelMessages,
  searchChannels,
  searchFiles,
  searchUsers,
  getSearchSuggestions,
  saveSearchHistory,
  getSearchHistory
} from './search.js';

// Team Members API
export {
  fetchTeamMembers,
  createChannel,
  createGroup,
  getTeamInfo,
  getUnreadMessageCount,
  getPriorityAlertsCount,
  getTotalNotificationCount,
  updateTeamInfo,
  uploadTeamLogo,
  isTeamAdmin
} from './teamMembers.js';

// Calling API
export {
  createCallSession,
  getCallSession,
  updateCallStatus,
  joinCall,
  endCall,
  rejectCall,
  updateParticipantState,
  getAgoraToken,
  trackCallMetrics,
  updateCallMetrics,
  getActiveCalls,
  getCallHistory,
  getMissedCalls
} from './calling.js';
