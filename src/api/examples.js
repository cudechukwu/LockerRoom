// API Usage Examples
// Examples of how to use the chat API functions

import {
  getChannels,
  getMessages,
  sendMessage,
  subscribeToMessages,
  uploadFile,
  sendPriorityAlert,
  globalSearch
} from './index.js';

// =============================================
// BASIC CHAT EXAMPLES
// =============================================

/**
 * Example: Get all channels for a team
 */
export async function exampleGetChannels() {
  const teamId = 'your-team-id';
  
  const { data: channels, error } = await getChannels(teamId);
  
  if (error) {
    console.error('Error fetching channels:', error);
    return;
  }
  
  console.log('Available channels:', channels);
}

/**
 * Example: Get messages from a channel with pagination
 */
export async function exampleGetMessages() {
  const channelId = 'your-channel-id';
  
  // Get first 20 messages
  const { data: messages, error, hasMore, nextCursor } = await getMessages(channelId, {
    limit: 20
  });
  
  if (error) {
    console.error('Error fetching messages:', error);
    return;
  }
  
  console.log('Messages:', messages);
  console.log('Has more messages:', hasMore);
  console.log('Next cursor:', nextCursor);
  
  // Get next page if there are more messages
  if (hasMore) {
    const { data: nextMessages } = await getMessages(channelId, {
      limit: 20,
      after: nextCursor
    });
    
    console.log('Next page messages:', nextMessages);
  }
}

/**
 * Example: Send a message
 */
export async function exampleSendMessage() {
  const channelId = 'your-channel-id';
  
  const { data: message, error } = await sendMessage(channelId, {
    content: 'Hello team! Practice at 3 PM today.',
    message_type: 'text'
  });
  
  if (error) {
    console.error('Error sending message:', error);
    return;
  }
  
  console.log('Message sent:', message);
}

/**
 * Example: Subscribe to real-time messages
 */
export function exampleSubscribeToMessages() {
  const channelId = 'your-channel-id';
  
  const subscription = subscribeToMessages(channelId, (payload) => {
    console.log('New message received:', payload);
    
    // Handle different event types
    switch (payload.eventType) {
      case 'INSERT':
        console.log('New message:', payload.new);
        break;
      case 'UPDATE':
        console.log('Message updated:', payload.new);
        break;
      default:
        console.log('Unknown event:', payload);
    }
  });
  
  // Later, unsubscribe
  // unsubscribe(subscription);
  
  return subscription;
}

// =============================================
// FILE UPLOAD EXAMPLES
// =============================================

/**
 * Example: Upload a file to a message
 */
export async function exampleUploadFile() {
  const teamId = 'your-team-id';
  const channelId = 'your-channel-id';
  const messageId = 'your-message-id';
  
  // Get file from input
  const fileInput = document.getElementById('file-input');
  const file = fileInput.files[0];
  
  if (!file) {
    console.error('No file selected');
    return;
  }
  
  // Upload with progress tracking
  const { data: attachment, error } = await uploadFile(
    teamId,
    channelId,
    messageId,
    file,
    (progress) => {
      console.log(`Upload progress: ${progress}%`);
    }
  );
  
  if (error) {
    console.error('Error uploading file:', error);
    return;
  }
  
  console.log('File uploaded:', attachment);
}

// =============================================
// PRIORITY ALERTS EXAMPLES
// =============================================

/**
 * Example: Send a priority alert
 */
export async function exampleSendPriorityAlert() {
  const teamId = 'your-team-id';
  const channelId = 'your-channel-id';
  
  const { data: alert, error } = await sendPriorityAlert({
    teamId,
    channelId,
    scope: 'team',
    body: 'Practice cancelled due to weather. Check back for updates.',
    reason: 'Weather conditions'
  });
  
  if (error) {
    console.error('Error sending priority alert:', error);
    return;
  }
  
  console.log('Priority alert sent:', alert);
}

/**
 * Example: Send priority alert to specific users
 */
export async function exampleSendTargetedAlert() {
  const teamId = 'your-team-id';
  const targetUsers = ['user-id-1', 'user-id-2', 'user-id-3'];
  
  const { data: alert, error } = await sendPriorityAlert({
    teamId,
    scope: 'custom',
    targetUsers,
    body: 'Quarterbacks: Film session moved to 4 PM.',
    reason: 'Schedule change'
  });
  
  if (error) {
    console.error('Error sending targeted alert:', error);
    return;
  }
  
  console.log('Targeted alert sent:', alert);
}

// =============================================
// SEARCH EXAMPLES
// =============================================

/**
 * Example: Global search
 */
export async function exampleGlobalSearch() {
  const teamId = 'your-team-id';
  const query = 'practice schedule';
  
  const { data: results, error } = await globalSearch(teamId, query, {
    limit: 10
  });
  
  if (error) {
    console.error('Error searching:', error);
    return;
  }
  
  console.log('Search results:', results);
  console.log('Messages found:', results.messages.length);
  console.log('Channels found:', results.channels.length);
  console.log('Files found:', results.files.length);
}

/**
 * Example: Search messages with filters
 */
export async function exampleSearchMessages() {
  const teamId = 'your-team-id';
  const query = 'film session';
  
  const { data: messages, error } = await searchMessages(teamId, query, {
    limit: 20,
    hasFile: true,
    dateFrom: '2024-01-01',
    dateTo: '2024-12-31'
  });
  
  if (error) {
    console.error('Error searching messages:', error);
    return;
  }
  
  console.log('Filtered messages:', messages);
}

// =============================================
// COMPLETE CHAT FLOW EXAMPLE
// =============================================

/**
 * Example: Complete chat flow - join channel, send message, upload file
 */
export async function exampleCompleteChatFlow() {
  const teamId = 'your-team-id';
  const channelId = 'your-channel-id';
  
  try {
    // 1. Get channels
    console.log('Getting channels...');
    const { data: channels } = await getChannels(teamId);
    console.log('Available channels:', channels);
    
    // 2. Get recent messages
    console.log('Getting recent messages...');
    const { data: messages } = await getMessages(channelId, { limit: 10 });
    console.log('Recent messages:', messages);
    
    // 3. Send a message
    console.log('Sending message...');
    const { data: newMessage } = await sendMessage(channelId, {
      content: 'Hey team! How is everyone doing?',
      message_type: 'text'
    });
    console.log('Message sent:', newMessage);
    
    // 4. Subscribe to new messages
    console.log('Subscribing to messages...');
    const subscription = subscribeToMessages(channelId, (payload) => {
      console.log('Real-time message:', payload);
    });
    
    // 5. Search for something
    console.log('Searching for messages...');
    const { data: searchResults } = await globalSearch(teamId, 'team meeting');
    console.log('Search results:', searchResults);
    
    // 6. Clean up subscription
    setTimeout(() => {
      unsubscribe(subscription);
      console.log('Unsubscribed from messages');
    }, 30000); // Unsubscribe after 30 seconds
    
  } catch (error) {
    console.error('Error in chat flow:', error);
  }
}

// =============================================
// ERROR HANDLING EXAMPLES
// =============================================

/**
 * Example: Proper error handling
 */
export async function exampleErrorHandling() {
  const channelId = 'invalid-channel-id';
  
  const { data, error } = await getMessages(channelId);
  
  if (error) {
    // Handle specific error types
    switch (error.message) {
      case 'PERMISSION_DENIED':
        console.error('You do not have permission to access this channel');
        break;
      case 'CHANNEL_NOT_FOUND':
        console.error('Channel does not exist');
        break;
      case 'NETWORK_ERROR':
        console.error('Network connection failed. Please try again.');
        break;
      default:
        console.error('Unexpected error:', error.message);
    }
    return;
  }
  
  console.log('Messages loaded successfully:', data);
}
