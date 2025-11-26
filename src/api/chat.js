// Chat API Endpoints
// Supabase-based chat system with real-time messaging
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { decode as atob } from 'base-64';

// Helper function to get channel icons
const getChannelIcon = (type, name) => {
  switch (type) {
    case 'team':
      return '#️⃣';
    case 'announcements':
      return '📢';
    case 'position':
      // Use position-specific icons based on name
      if (name.toLowerCase().includes('offense')) return '🏈';
      if (name.toLowerCase().includes('defense')) return '🛡️';
      if (name.toLowerCase().includes('special')) return '⚡';
      if (name.toLowerCase().includes('coach')) return '👨‍💼';
      if (name.toLowerCase().includes('trainer')) return '🏥';
      return '#️⃣';
    default:
      return '#️⃣';
  }
};

// =============================================
// CHANNEL ENDPOINTS
// =============================================

/**
 * Get all channels accessible to the current user
 * @param {string} teamId - Team ID
 * @returns {Promise<Array>} Array of channels
 */
export async function getChannels(teamId) {
  try {
    const { data, error } = await supabase
      .from('channels')
      .select(`
        id,
        name,
        description,
        type,
        is_private,
        is_announcements,
        image_url,
        visibility,
        created_at,
        updated_at,
        channel_members!inner(user_id)
      `)
      .eq('team_id', teamId)
      .eq('channel_members.user_id', (await supabase.auth.getUser()).data.user?.id)
      .order('created_at', { ascending: true });

    if (error) throw error;
    
    // Filter to only show team channels (exclude DMs)
    const filteredData = data?.filter(channel => {
      // Show all team channels (public channels)
      if (channel.type === 'team') {
        return true;
      }
      // Show position groups and other team-based channels
      if (channel.type === 'position' || channel.type === 'announcements') {
        return true;
      }
      // Exclude all DM types
      return false;
    });

    // Add additional fields needed for unified chat screen
    const enrichedData = filteredData?.map(channel => ({
      ...channel,
      icon: getChannelIcon(channel.type, channel.name),
      is_pinned: channel.type === 'team' || channel.is_announcements,
      member_count: 0, // Will be calculated separately if needed
      last_message: null, // Will be populated by separate query
      last_message_time: channel.updated_at,
      unread_count: 0 // Will be populated by separate query
    }));

    return { data: enrichedData, error: null };
  } catch (error) {
    console.error('Error fetching channels:', error);
    return { data: null, error };
  }
}

/**
 * Get direct messages (1-on-1 DMs and group DMs)
 * @param {string} teamId - Team ID
 * @returns {Promise<Array>} Array of direct message channels
 */
export async function getDirectMessages(teamId) {
  try {
    const currentUser = (await supabase.auth.getUser()).data.user;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('channels')
      .select(`
        id,
        name,
        description,
        type,
        is_private,
        is_announcements,
        image_url,
        visibility,
        created_at,
        updated_at,
        channel_members!inner(user_id)
      `)
      .eq('team_id', teamId)
      .eq('channel_members.user_id', currentUser.id)
      .order('created_at', { ascending: true });

    if (error) throw error;
    
    // Filter to only show direct messages (1-on-1 DMs and group DMs)
    const filteredData = data?.filter(channel => {
      // Show dm type (1-on-1 DMs)
      if (channel.type === 'dm') {
        return true;
      }
      // Show group_dm type (group DMs)
      if (channel.type === 'group_dm') {
        return true;
      }
      // Exclude team channels
      return false;
    });

    // For DMs, we need to get the other user's info
    const enrichedData = await Promise.all(
      filteredData?.map(async (channel) => {
        // Get the other user(s) in the DM
        const { data: members, error: membersError } = await supabase
          .from('channel_members')
          .select(`
            user_id,
            user_profiles!inner(
              display_name,
              avatar_url,
              email
            )
          `)
          .eq('channel_id', channel.id)
          .neq('user_id', currentUser.id);
          
        if (membersError) {
          console.log('❌ Error fetching members for channel', channel.id, ':', membersError);
        }

        const otherUser = members?.[0]?.user_profiles;
        
        console.log('🔍 DM Channel:', channel.id, 'Members:', members, 'Other User:', otherUser);

        return {
          ...channel,
          other_user_name: otherUser?.display_name || 'Unknown User',
          other_user_email: otherUser?.email,
          other_user_avatar: otherUser?.avatar_url,
          member_count: 0, // Will be calculated separately if needed
          last_message: null, // Will be populated by separate query
          last_message_time: channel.updated_at,
          unread_count: 0 // Will be populated by separate query
        };
      }) || []
    );

    // Filter out DMs with no messages or last_message_time older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const activeDMs = enrichedData.filter(channel => {
      // Keep channels with recent activity
      if (channel.last_message_time) {
        const lastMessageDate = new Date(channel.last_message_time);
        if (lastMessageDate >= thirtyDaysAgo) {
          return true;
        }
      }
      // Keep channels created in last 30 days even without messages
      if (channel.created_at) {
        const createdDate = new Date(channel.created_at);
        if (createdDate >= thirtyDaysAgo) {
          return true;
        }
      }
      return false;
    });

    return { data: activeDMs, error: null };
  } catch (error) {
    console.error('Error fetching direct messages:', error);
    return { data: null, error };
  }
}

/**
 * Get channel details
 * @param {string} channelId - Channel ID
 * @returns {Promise<Object>} Channel details
 */
export async function getChannel(supabaseClient, channelId) {
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    const { data, error } = await supabaseClient
      .from('channels')
      .select(`
        *,
        channel_members!inner(user_id)
      `)
      .eq('id', channelId)
      .eq('channel_members.user_id', user?.id)
      .single();

    if (error) throw error;
    
    // Get member count
    const { count } = await supabaseClient
      .from('channel_members')
      .select('*', { count: 'exact', head: true })
      .eq('channel_id', channelId);
    
    return { 
      data: {
        ...data,
        memberCount: count || 0
      }, 
      error: null 
    };
  } catch (error) {
    console.error('Error fetching channel:', error);
    return { data: null, error };
  }
}

/**
 * Create a new channel
 * @param {Object} supabaseClient - Supabase client
 * @param {Object} channelData - Channel data
 * @returns {Promise<Object>} Created channel
 */
export async function createChannel(supabaseClient, channelData) {
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Do not insert non-column helper fields like other_user_id into channels
    const { other_user_id, ...insertData } = channelData || {};

    const { data, error } = await supabaseClient
      .from('channels')
      .insert({
        ...insertData,
        created_by: user.id
      })
      .select()
      .single();

    if (error) throw error;

    // Add creator as channel member
    await supabaseClient
      .from('channel_members')
      .insert({
        channel_id: data.id,
        user_id: user.id,
        role: 'admin'
      });
    
    // ✅ For DMs: Also add the other user as a member
    if (insertData.type === 'dm' && other_user_id) {
      await supabaseClient
        .from('channel_members')
        .insert({
          channel_id: data.id,
          user_id: other_user_id,
          role: 'member'
        });
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error creating channel:', error);
    return { data: null, error };
  }
}

/**
 * Find existing 1:1 DM with a user, or create one if it doesn't exist
 * @param {string} teamId
 * @param {string} otherUserId
 * @param {string} otherUserName - Fallback name when creating
 * @returns {Promise<{data: any, error: any}>}
 */
export async function findOrCreateDirectMessage(supabaseClient, teamId, otherUserId, otherUserName = 'Direct Message') {
  try {
    const { data: { user: currentUser } } = await supabaseClient.auth.getUser();
    if (!currentUser) throw new Error('User not authenticated');

    // Preferred: atomic RPC to avoid race conditions
    const { data: rpcChannel, error: rpcError } = await supabaseClient.rpc(
      'get_or_create_dm',
      {
        p_team_id: teamId,
        p_user_a: currentUser.id,
        p_user_b: otherUserId,
        p_channel_name: otherUserName,
      }
    );

    if (!rpcError && rpcChannel) {
      // RPC now returns { channel: {...}, members: [...] }
      const normalized = rpcChannel.channel ? rpcChannel.channel : rpcChannel;
      return { data: normalized, error: null };
    }

    // Fallback (non-atomic) client-side check
    const { data: candidateChannels, error: findError } = await supabaseClient
      .from('channels')
      .select(`
        id,
        name,
        type,
        channel_members(user_id)
      `)
      .eq('team_id', teamId)
      .eq('type', 'dm')
      .in('channel_members.user_id', [currentUser.id, otherUserId]);

    if (findError) throw findError;

    const existing = (candidateChannels || []).find(ch => {
      const memberIds = (ch.channel_members || []).map(m => m.user_id);
      return memberIds.includes(currentUser.id) && memberIds.includes(otherUserId);
    });

    if (existing) return { data: existing, error: null };

    const { data: created, error: createError } = await createChannel(supabaseClient, {
      team_id: teamId,
      name: otherUserName,
      description: `Direct message with ${otherUserName}`,
      type: 'dm',
      is_private: true,
      other_user_id: otherUserId,
    });

    if (createError) throw createError;
    return { data: created, error: null };
  } catch (error) {
    console.error('Error in findOrCreateDirectMessage:', error);
    return { data: null, error };
  }
}

/**
 * Get channel members with full user profile data
 * @param {string} channelId - Channel ID
 * @param {string} teamId - Team ID (optional, for fetching team member data)
 * @returns {Promise<Array>} Array of channel members with profile info
 */
export async function getChannelMembers(supabaseClient, channelId, teamId = null) {
  try {
    // Step 1: Get channel members (including their channel role)
    const { data: members, error: membersError } = await supabaseClient
      .from('channel_members')
      .select('user_id, role')
      .eq('channel_id', channelId);

    if (membersError) throw membersError;
    
    if (!members || members.length === 0) {
      return { data: [], error: null };
    }
    
    // Step 2: Get user IDs
    const userIds = members.map(m => m.user_id);
    
    // Step 3: Get user profiles
    const { data: userProfiles, error: profilesError } = await supabaseClient
      .from('user_profiles')
      .select('user_id, display_name, avatar_url, bio')
      .in('user_id', userIds);
    
    if (profilesError) {
      console.error('Error fetching user profiles:', profilesError);
      // Continue with user IDs but no profiles
    }
    
    // Step 4: Get team member info for these users (if teamId is provided)
    let teamMembers = null;
    let teamMemberProfiles = null;
    
    if (teamId) {
      const { data: teamMembersData, error: teamMembersError } = await supabaseClient
        .from('team_members')
        .select('user_id, role')
        .eq('team_id', teamId)
        .in('user_id', userIds);
      
      if (teamMembersError) {
        console.error('Error fetching team members:', teamMembersError);
      } else {
        teamMembers = teamMembersData;
      }
      
      // Get team member profiles for position info
      const { data: teamMemberProfilesData, error: teamProfilesError } = await supabaseClient
        .from('team_member_profiles')
        .select('user_id, position')
        .eq('team_id', teamId)
        .in('user_id', userIds);
      
      if (teamProfilesError) {
        console.error('Error fetching team member profiles:', teamProfilesError);
      } else {
        teamMemberProfiles = teamMemberProfilesData;
      }
    }
    
    // Transform the data to a more usable format
    const formattedMembers = members.map(member => {
      const profile = userProfiles?.find(up => up.user_id === member.user_id);
      const teamMember = teamMembers?.find(tm => tm.user_id === member.user_id);
      const teamProfile = teamMemberProfiles?.find(tp => tp.user_id === member.user_id);
      
      return {
        id: member.user_id,
        user_id: member.user_id,
        name: profile?.display_name || 'Unknown User',
        avatar: profile?.avatar_url,
        position: teamProfile?.position || null,
        role: teamMember?.role || 'member',
        teamRole: teamMember?.role || 'member',
        channelRole: member.role || 'member', // Channel-specific role (admin/moderator/member)
        bio: profile?.bio,
        isOnline: false, // Will be enhanced with presence data later
      };
    });

    return { data: formattedMembers, error: null };
  } catch (error) {
    console.error('Error fetching channel members:', error);
    return { data: null, error };
  }
}

// =============================================
// MESSAGE ENDPOINTS
// =============================================

const MESSAGE_SELECT_FIELDS = `
        id,
        content,
        message_type,
        is_edited,
        is_pinned,
        created_at,
        updated_at,
        sender_id,
        reply_to_message_id,
  parent_message_id,
  thread_reply_count,
  last_thread_reply_at,
  thread_last_reply_author_id,
        sender_profile:user_profiles!sender_id(
          display_name,
          avatar_url,
          user_id
        ),
        message_attachments(
          id,
          filename,
          file_type,
          file_size,
          s3_url,
          thumbnail_url
        ),
        reactions(
          emoji,
          user_id
        ),
        message_reads!left(
          id,
          user_id,
          read_at
        )
`;

const normalizeMessages = (messages = [], currentUserId) =>
  (messages || []).map((message) => {
    const isRead = message?.message_reads?.some((read) => read.user_id === currentUserId) || false;

    return {
      ...message,
      is_read: isRead,
      message_reads: undefined,
      message_attachments: message?.message_attachments || [],
      reactions: message?.reactions || [],
      thread_reply_count: message?.thread_reply_count ?? 0,
    };
  });

/**
 * Get messages for a channel with cursor-based pagination
 * @param {string} channelId - Channel ID
 * @param {Object} options - Pagination options
 * @returns {Promise<Object>} Messages and pagination info
 */
export async function getMessages(supabaseClient, channelId, options = {}) {
  try {
    const { limit = 50, after } = options;
    
    // Note: Tombstone filtering is temporarily disabled to simplify
    // The Supabase query builder has issues with complex NOT IN filters
    
    const { data: { user } } = await supabaseClient.auth.getUser();
    const currentUserId = user?.id;

    const { data, error } = await supabaseClient
      .from('messages')
      .select(MESSAGE_SELECT_FIELDS)
      .eq('channel_id', channelId)
      .is('parent_message_id', null) // Only fetch top-level messages (hide thread replies)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Reverse to get chronological order
    const messages = data?.reverse() || [];
    const messagesWithReadStatus = normalizeMessages(messages, currentUserId);

    return { 
      data: messagesWithReadStatus, 
      error: null,
      hasMore: messages.length === limit,
      nextCursor: messages.length > 0 ? messages[0].id : null
    };
  } catch (error) {
    console.error('Error fetching messages:', error);
    return { data: null, error };
  }
}

export async function getThreadMessages(parentMessageId) {
  try {
    if (!parentMessageId) {
      throw new Error('Parent message ID is required');
    }

    const { data: { user } } = await supabase.auth.getUser();
    const currentUserId = user?.id;

    if (!currentUserId) {
      throw new Error('User not authenticated');
    }

    const { data: parentRow, error: parentError } = await supabase
      .from('messages')
      .select(MESSAGE_SELECT_FIELDS)
      .eq('id', parentMessageId)
      .single();

    if (parentError) throw parentError;

    const { data: replyRows, error: repliesError } = await supabase
      .from('messages')
      .select(MESSAGE_SELECT_FIELDS)
      .eq('parent_message_id', parentMessageId)
      .order('created_at', { ascending: true });

    if (repliesError) throw repliesError;

    const parent = normalizeMessages([parentRow], currentUserId)[0];
    const replies = normalizeMessages(replyRows, currentUserId);

    return {
      data: {
        parent,
        replies,
      },
      error: null,
    };
  } catch (error) {
    console.error('Error fetching thread messages:', error);
    return { data: null, error };
  }
}

/**
 * Send a message to a channel
 * @param {string} channelId - Channel ID
 * @param {Object} messageData - Message data
 * @param {Array} attachments - Array of attachment objects with { uri, type, name }
 * @returns {Promise<Object>} Created message
 */
export async function sendMessage(supabaseClient, channelId, messageData, attachments = []) {
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Create message first
    // Use ?? to ensure we pass null (not undefined) to Supabase RPC
    const parentMessageId = 
      messageData?.parent_message_id ?? 
      messageData?.reply_to_message_id ?? 
      null;
    
    console.log('📤 Calling send_channel_message RPC:', {
      channelId,
      hasContent: !!messageData.content,
      messageType: messageData.message_type,
      parentMessageId,
      isReply: !!parentMessageId,
    });
    
    const { data: rpcData, error: rpcError } = await supabaseClient.rpc(
      'send_channel_message',
      {
        p_channel_id: channelId,
        p_content: messageData.content ?? null,
        p_message_type: messageData.message_type || 'text',
        p_parent_message_id: parentMessageId ?? null, // Explicit null fallback
      }
    );

    if (rpcError) throw rpcError;

    // When the function returns plain row vs object, normalise the shape
    const messagePayload = rpcData?.message ?? rpcData;
    const parentPayload = rpcData?.parent ?? null;

    if (!messagePayload) {
      throw new Error('send_channel_message returned no message payload');
    }

    const message = { ...messagePayload };
    const teamId = message.team_id;

    // Upload attachments if any (using React Native compatible approach)
    if (attachments && attachments.length > 0) {
      const uploadedAttachments = await Promise.all(
        attachments.map(async (attachment) => {
          try {
            // Upload to Supabase Storage (same approach as avatar upload)
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
            const filePath = `${channelId}/${fileName}`; // Don't include bucket name - .from() handles that

            console.log('📥 Reading file as base64...');
            const base64 = await FileSystem.readAsStringAsync(attachment.uri, {
              encoding: 'base64',
            });

            console.log('📦 Converting base64 to ArrayBuffer...');
            const arrayBuffer = decode(base64);

            // Upload ArrayBuffer (React Native compatible)
            console.log('⬆️ Uploading to Supabase Storage...');
            const { data: uploadData, error: uploadError } = await supabaseClient.storage
              .from('message-attachments')
              .upload(filePath, arrayBuffer, {
                contentType: 'image/jpeg',
                cacheControl: '3600',
                upsert: false
              });

            if (uploadError) {
              console.error(`❌ Upload failed:`, uploadError);
              return null;
            }

            // Get public URL
            const { data: urlData } = supabaseClient.storage
              .from('message-attachments')
              .getPublicUrl(filePath);

            console.log(`✅ Uploaded ${fileName} successfully`);
            console.log(`📸 File path: ${filePath}`);
            console.log(`🔗 Public URL: ${urlData.publicUrl}`);

            // Get file size from ArrayBuffer
            const fileSize = arrayBuffer.byteLength;

            // Create attachment record in database
            const { data: attachmentRecord, error: attachmentError } = await supabaseClient
              .from('message_attachments')
              .insert({
                message_id: message.id,
                team_id: teamId,
                filename: attachment.name || fileName,
                file_type: 'image/jpeg',
                file_size: fileSize, // Use calculated file size
                s3_key: filePath, // Just the relative path - getPublicUrl adds bucket name
                s3_url: urlData.publicUrl,
                thumbnail_url: urlData.publicUrl
              })
              .select()
              .single();

            if (attachmentError) {
              console.error('❌ Error creating attachment record:', attachmentError);
              return null;
            }

            return attachmentRecord;
          } catch (err) {
            console.error('Error processing attachment:', err);
            return null;
          }
        })
      );

      // Filter out failed uploads
      const successfulAttachments = uploadedAttachments.filter(a => a !== null);
      console.log('✅ Uploaded attachments:', successfulAttachments.length);

      if (successfulAttachments.length > 0) {
        const normalized = successfulAttachments.map(att => ({
          id: att.id,
          filename: att.filename,
          file_type: att.file_type,
          file_size: att.file_size,
          s3_url: att.s3_url,
          thumbnail_url: att.thumbnail_url,
        }));
        message.attachments = normalized;
        message.message_attachments = normalized;
      }
    }

    message.reactions = message.reactions || [];
    message.thread_reply_count = message.thread_reply_count ?? 0;
    message.message_attachments = message.message_attachments || message.attachments || [];

    if (parentPayload) {
      parentPayload.reactions = parentPayload.reactions || [];
      parentPayload.thread_reply_count = parentPayload.thread_reply_count ?? 0;
      parentPayload.message_attachments = parentPayload.message_attachments || parentPayload.attachments || [];
    }

    return {
      data: message,
      parent: parentPayload,
      error: null,
    };
  } catch (error) {
    console.error('Error sending message:', error);
    return { data: null, error };
  }
}

/**
 * Edit a message (within 15-minute window)
 * @param {string} messageId - Message ID
 * @param {string} newContent - New message content
 * @returns {Promise<Object>} Updated message
 */
export async function editMessage(messageId, newContent) {
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('User not authenticated');

    // Get original message
    const { data: originalMessage, error: fetchError } = await supabase
      .from('messages')
      .select('*')
      .eq('id', messageId)
      .single();

    if (fetchError) throw fetchError;

    // Check if user owns the message
    if (originalMessage.sender_id !== user.id) {
      throw new Error('PERMISSION_DENIED');
    }

    // Check 15-minute edit window
    const editWindow = new Date(originalMessage.created_at);
    editWindow.setMinutes(editWindow.getMinutes() + 15);
    
    if (new Date() > editWindow) {
      throw new Error('EDIT_WINDOW_EXPIRED');
    }

    // Save edit history
    await supabase
      .from('message_edits')
      .insert({
        message_id: messageId,
        old_content: originalMessage.content,
        edited_by: user.id
      });

    // Update message
    const { data, error } = await supabase
      .from('messages')
      .update({
        content: newContent,
        is_edited: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', messageId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error editing message:', error);
    return { data: null, error };
  }
}

/**
 * Soft delete a message
 * @param {string} messageId - Message ID
 * @param {string} reason - Delete reason
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteMessage(messageId, reason = 'sender') {
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('User not authenticated');

    // Get message details
    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('*')
      .eq('id', messageId)
      .single();

    if (fetchError) throw fetchError;

    // Check permissions
    const isOwner = message.sender_id === user.id;
    const isWithinEditWindow = new Date() <= new Date(new Date(message.created_at).getTime() + 15 * 60 * 1000);

    if (!isOwner && !isWithinEditWindow) {
      // Check if user is moderator/admin
      const { data: channelMember } = await supabase
        .from('channel_members')
        .select('role')
        .eq('channel_id', message.channel_id)
        .eq('user_id', user.id)
        .single();

      if (!channelMember || !['admin', 'moderator'].includes(channelMember.role)) {
        throw new Error('PERMISSION_DENIED');
      }
      reason = 'moderator';
    }

    // Create tombstone
    const tombstoneText = reason === 'sender' 
      ? 'Message deleted by sender'
      : reason === 'moderator'
      ? 'Removed by moderator'
      : 'Message deleted';

    await supabase
      .from('message_tombstones')
      .insert({
        message_id: messageId,
        deleted_by: user.id,
        delete_reason: reason,
        tombstone_text: tombstoneText
      });

    // Clean up attachments from storage and database
    const { data: attachments } = await supabase
      .from('message_attachments')
      .select('s3_key')
      .eq('message_id', messageId);

    if (attachments && attachments.length > 0) {
      // Delete files from storage
      const s3Keys = attachments.map(att => att.s3_key);
      await supabase.storage
        .from('message-attachments')
        .remove(s3Keys);

      // Delete attachment records from database
      await supabase
        .from('message_attachments')
        .delete()
        .eq('message_id', messageId);
    }

    return { data: { success: true }, error: null };
  } catch (error) {
    console.error('Error deleting message:', error);
    return { data: null, error };
  }
}

// =============================================
// REACTION ENDPOINTS
// =============================================

/**
 * Toggle a reaction on a message (add if doesn't exist, remove if exists)
 * @param {string} messageId - Message ID
 * @param {string} emoji - Emoji to toggle
 * @returns {Promise<Object>} Reaction result
 */
export async function toggleReaction(messageId, emoji) {
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('User not authenticated');

    const row = { message_id: messageId, user_id: user.id, emoji };

    // Check if reaction exists
    const { data: existing } = await supabase
      .from('reactions')
      .select('*')
      .match(row)
      .maybeSingle();

    if (existing) {
      // Remove if exists
      await supabase.from('reactions').delete().match(row);
      return { data: { action: 'removed', success: true }, error: null };
    } else {
      // Add if doesn't exist
      const { data, error } = await supabase
        .from('reactions')
        .upsert(row, { onConflict: 'message_id,user_id,emoji' })
        .select()
        .maybeSingle();

      if (error) throw error;
      
      // Get count for this emoji
      const { count } = await supabase
        .from('reactions')
        .select('*', { count: 'exact', head: true })
        .eq('message_id', messageId)
        .eq('emoji', emoji);

      return { data: { ...data, action: 'added', count: count || 0 }, error: null };
    }
  } catch (error) {
    console.error('Error toggling reaction:', error);
    return { data: null, error };
  }
}

/**
 * Add a reaction to a message (legacy - use toggleReaction instead)
 * @param {string} messageId - Message ID
 * @param {string} emoji - Emoji to add
 * @returns {Promise<Object>} Reaction result
 */
export async function addReaction(messageId, emoji) {
  return toggleReaction(messageId, emoji);
}

/**
 * Remove a reaction from a message
 * @param {string} messageId - Message ID
 * @param {string} emoji - Emoji to remove
 * @returns {Promise<Object>} Removal result
 */
export async function removeReaction(messageId, emoji) {
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .eq('emoji', emoji);

    if (error) throw error;
    return { data: { success: true }, error: null };
  } catch (error) {
    console.error('Error removing reaction:', error);
    return { data: null, error };
  }
}

// =============================================
// READ RECEIPTS
// =============================================

/**
 * Mark a message as read
 * @param {string} messageId - Message ID
 * @returns {Promise<Object>} Read receipt result
 */
export async function markMessageAsRead(supabaseClient, messageId) {
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Use upsert for idempotent read marking
    const { data, error } = await supabaseClient
      .from('message_reads')
      .upsert(
        { 
          message_id: messageId, 
          user_id: user.id, 
          read_at: new Date().toISOString() 
        },
        { 
          onConflict: 'message_id,user_id',
          ignoreDuplicates: true
        }
      )
      .select()
      .maybeSingle();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error marking message as read:', error);
    return { data: null, error };
  }
}

/**
 * Get unread counts for a set of channels for the current user
 * @param {string[]} channelIds - Array of channel IDs
 * @returns {Promise<Record<string, number>>} Map of channelId -> unreadCount
 */
export async function getUnreadCountsForChannels(channelIds) {
  try {
    if (!channelIds || channelIds.length === 0) return {};

    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('User not authenticated');

    // Fetch read receipts for this user (message_ids)
    const { data: readRows, error: readError } = await supabase
      .from('message_reads')
      .select('message_id')
      .eq('user_id', user.id);

    if (readError) throw readError;
    const readMessageIds = new Set((readRows || []).map(r => r.message_id));

    // For MVP, fetch recent messages for each channel in parallel and count client-side
    const perChannelPromises = channelIds.map(async (channelId) => {
      const { data: messages, error } = await supabase
        .from('messages')
        .select('id, sender_id')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false })
        .limit(200); // cap for performance

      if (error) return [channelId, 0];

      const unread = (messages || []).filter(m => m.sender_id !== user.id && !readMessageIds.has(m.id)).length;
      return [channelId, unread];
    });

    const results = await Promise.all(perChannelPromises);
    return Object.fromEntries(results);
  } catch (error) {
    console.error('Error in getUnreadCountsForChannels:', error);
    return {};
  }
}

/**
 * Get unread count for a single channel
 * @param {string} channelId
 * @returns {Promise<number>}
 */
export async function getUnreadCountForChannel(channelId) {
  const res = await getUnreadCountsForChannels([channelId]);
  return res[channelId] || 0;
}

/**
 * Get the latest message for a channel (for scroll management)
 * @param {string} channelId - Channel ID
 * @returns {Promise<Object>} Latest message with id and created_at
 */
export async function getLatestMessage(channelId) {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('id, created_at')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching latest message:', error);
    return { data: null, error };
  }
}

// =============================================
// CHANNEL MUTING
// =============================================

/**
 * Mute a channel
 * @param {string} channelId - Channel ID
 * @param {number} durationHours - Duration in hours (0 = until unmuted)
 * @returns {Promise<Object>} Mute result
 */
export async function muteChannel(supabaseClient, channelId, durationHours = 24) {
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const untilTs = durationHours === 0 
      ? new Date('2099-12-31').toISOString() // Far future for "until unmuted"
      : new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabaseClient
      .from('mutes')
      .upsert({
        user_id: user.id,
        channel_id: channelId,
        until_ts: untilTs
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error muting channel:', error);
    return { data: null, error };
  }
}

/**
 * Upload channel image to Supabase Storage
 * @param {string} channelId - Channel ID
 * @param {Object} file - File object with uri, name, type
 * @returns {Promise<Object>} Upload result with URL
 */
export async function uploadChannelImage(supabaseClient, channelId, file) {
  try {
    // Create UNIQUE file path: channel-images/{channelId}/{timestamp}_{filename}
    const fileExt = file.name.split('.').pop();
    const timestamp = Date.now();
    const fileName = `image_${timestamp}.${fileExt}`;
    const filePath = `${channelId}/${fileName}`;

    console.log('Uploading channel image to path:', filePath);
    console.log('File details:', {
      uri: file.uri,
      name: file.name,
      type: file.type
    });

    // Read file as base64 (using the legacy API that works)
    const base64 = await FileSystem.readAsStringAsync(file.uri, {
      encoding: 'base64',
    });

    console.log('Converting base64 to binary...');
    // Convert base64 to binary (Uint8Array for React Native compatibility)
    const byteArray = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

    console.log('Uploading binary data to Supabase Storage...');
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('channel-images')
      .upload(filePath, byteArray, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type
      });

    if (uploadError) throw uploadError;

    console.log('Upload successful:', uploadData);

    // Get public URL
    const { data: urlData } = supabaseClient.storage
      .from('channel-images')
      .getPublicUrl(filePath);

    console.log('Generated channel image URL:', urlData.publicUrl);
    console.log('File path:', filePath);

    return { 
      data: { 
        path: filePath, 
        url: urlData.publicUrl 
      }, 
      error: null 
    };
  } catch (error) {
    console.error('Error uploading channel image:', error);
    return { data: null, error };
  }
}

/**
 * Update channel image
 * @param {string} channelId - Channel ID
 * @param {string} imageUrl - New image URL
 * @returns {Promise<Object>} Update result
 */
export async function updateChannelImage(supabaseClient, channelId, imageUrl) {
  try {
    const { error } = await supabaseClient
      .from('channels')
      .update({ image_url: imageUrl })
      .eq('id', channelId);

    if (error) throw error;
    return { data: { success: true }, error: null };
  } catch (error) {
    console.error('Error updating channel image:', error);
    return { data: null, error };
  }
}

/**
 * Check if current user is admin of a channel
 * @param {string} channelId - Channel ID
 * @returns {Promise<boolean>} True if user is admin
 */
export async function isChannelAdmin(supabaseClient, channelId) {
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabaseClient
      .from('channel_members')
      .select('role')
      .eq('channel_id', channelId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;
    return data?.role === 'admin';
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Update a user's role in a channel
 * @param {string} channelId - Channel ID
 * @param {string} userId - User ID to update
 * @param {string} newRole - New role ('admin', 'moderator', 'member')
 * @returns {Promise<Object>} Update result
 */
export async function updateChannelMemberRole(supabaseClient, channelId, userId, newRole) {
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Verify current user is admin
    const { data: memberData, error: memberError } = await supabaseClient
      .from('channel_members')
      .select('role')
      .eq('channel_id', channelId)
      .eq('user_id', user.id)
      .single();

    if (memberError) throw memberError;
    if (memberData.role !== 'admin') {
      throw new Error('Only admins can change member roles');
    }

    // Update the member's role
    const { error: updateError } = await supabaseClient
      .from('channel_members')
      .update({ role: newRole })
      .eq('channel_id', channelId)
      .eq('user_id', userId);

    if (updateError) throw updateError;
    return { data: { success: true }, error: null };
  } catch (error) {
    console.error('Error updating member role:', error);
    return { data: null, error };
  }
}

/**
 * Check if a channel is muted for the current user
 * @param {string} channelId - Channel ID
 * @returns {Promise<boolean>} True if muted
 */
export async function isChannelMuted(supabaseClient, channelId) {
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabaseClient
      .from('mutes')
      .select('until_ts')
      .eq('user_id', user.id)
      .eq('channel_id', channelId)
      .maybeSingle();

    if (error) throw error;
    
    if (!data) return false;
    
    // Check if mute has expired
    const muteExpiry = new Date(data.until_ts);
    const now = new Date();
    if (muteExpiry > now) {
      return true; // Still muted
    }
    
    // Mute expired, delete it
    await supabaseClient
      .from('mutes')
      .delete()
      .eq('user_id', user.id)
      .eq('channel_id', channelId);
    
    return false;
  } catch (error) {
    console.error('Error checking mute status:', error);
    return false;
  }
}

/**
 * Unmute a channel
 * @param {string} channelId - Channel ID
 * @returns {Promise<Object>} Unmute result
 */
export async function unmuteChannel(supabaseClient, channelId) {
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabaseClient
      .from('mutes')
      .delete()
      .eq('user_id', user.id)
      .eq('channel_id', channelId);

    if (error) throw error;
    return { data: { success: true }, error: null };
  } catch (error) {
    console.error('Error unmuting channel:', error);
    return { data: null, error };
  }
}

// =============================================
// CONVERSATION INFO & ANALYTICS
// =============================================

/**
 * Get shared media for a conversation
 * @param {string} channelId - Channel ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Media files
 */
export async function getSharedMedia(supabaseClient, channelId, options = {}) {
  try {
    const { limit = 6, offset = 0 } = options;

    // First get messages with attachments in this channel
    const { data: messages, error: messagesError } = await supabaseClient
      .from('messages')
      .select(`
        id,
        channel_id,
        created_at,
        message_attachments(
          id,
          filename,
          file_type,
          file_size,
          s3_url,
          thumbnail_url,
          created_at
        )
      `)
      .eq('channel_id', channelId)
      .order('created_at', { ascending: false })
      .limit(50); // Get more messages to have enough media items

    if (messagesError) throw messagesError;

    // Flatten attachments from messages and filter for images
    const allAttachments = [];
    if (messages) {
      for (const message of messages) {
        if (message.message_attachments && Array.isArray(message.message_attachments)) {
          for (const attachment of message.message_attachments) {
            if (attachment.file_type?.startsWith('image/')) {
              allAttachments.push(attachment);
            }
          }
        }
      }
    }

    // Return the requested slice
    const slicedAttachments = allAttachments.slice(offset, offset + limit);

    return { data: slicedAttachments, error: null };
  } catch (error) {
    console.error('Error fetching shared media:', error);
    return { data: [], error };
  }
}

/**
 * Get channels that both current user and another user are members of
 * @param {string} teamId - Team ID
 * @param {string} otherUserId - Other user ID
 * @returns {Promise<Object>} Shared channels
 */
export async function getSharedChannels(teamId, otherUserId) {
  try {
    const currentUser = (await supabase.auth.getUser()).data.user;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // Get channels where both users are members (excluding DMs)
    const { data, error } = await supabase
      .from('channels')
      .select(`
        id,
        name,
        description,
        type,
        image_url,
        is_announcements,
        channel_members!inner(user_id)
      `)
      .eq('team_id', teamId)
      .in('channel_members.user_id', [currentUser.id, otherUserId])
      .neq('type', 'dm')
      .neq('type', 'group_dm')
      .order('name', { ascending: true });

    if (error) throw error;

    // Filter to only channels where BOTH users are members
    const sharedChannels = (data || []).filter(channel => {
      const memberIds = (channel.channel_members || []).map(m => m.user_id);
      return memberIds.includes(currentUser.id) && memberIds.includes(otherUserId);
    });

    // Remove channel_members from response (was only used for filtering)
    const cleanedChannels = sharedChannels.map(({ channel_members, ...channel }) => channel);

    return { data: cleanedChannels, error: null };
  } catch (error) {
    console.error('Error fetching shared channels:', error);
    return { data: [], error };
  }
}

/**
 * Get pinned messages for a conversation
 * @param {string} channelId - Channel ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Pinned messages
 */
export async function getPinnedMessages(supabaseClient, channelId, options = {}) {
  try {
    const { limit = 3 } = options;

    const { data, error } = await supabaseClient
      .from('messages')
      .select(`
        id,
        content,
        sender_id,
        is_pinned,
        created_at,
        updated_at,
        sender_profile:user_profiles!sender_id(
          display_name,
          avatar_url
        )
      `)
      .eq('channel_id', channelId)
      .eq('is_pinned', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    console.error('Error fetching pinned messages:', error);
    return { data: [], error };
  }
}

/**
 * Get conversation statistics
 * @param {string} channelId - Channel ID
 * @returns {Promise<Object>} Conversation stats
 */
export async function getConversationStats(supabaseClient, channelId) {
  try {
    // Batch all queries in parallel for better performance
    const [
      { count: totalMessages, error: messagesError },
      { count: pinnedCount, error: pinnedError },
      { data: lastMessage, error: lastMessageError }
    ] = await Promise.all([
      supabaseClient
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('channel_id', channelId),
      supabaseClient
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('channel_id', channelId)
        .eq('is_pinned', true),
      supabaseClient
        .from('messages')
        .select('created_at')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    ]);

    if (messagesError) throw messagesError;
    if (pinnedError) throw pinnedError;
    // lastMessageError can be ignored if no messages exist

    // Get media count (count messages with image attachments)
    let imageCount = 0;
    const { data: messagesWithMedia, error: mediaError } = await supabaseClient
      .from('messages')
      .select('id, message_attachments(file_type)')
      .eq('channel_id', channelId);

    if (!mediaError && messagesWithMedia) {
      imageCount = messagesWithMedia.filter(msg => 
        msg.message_attachments?.some?.(att => 
          att.file_type?.startsWith('image/')
        )
      ).length;
    }

    const stats = {
      totalMessages: totalMessages || 0,
      pinnedMessages: pinnedCount || 0,
      mediaFiles: imageCount,
      lastActivity: lastMessage?.created_at || null
    };

    return { data: stats, error: null };
  } catch (error) {
    console.error('Error fetching conversation stats:', error);
    return { 
      data: {
        totalMessages: 0,
        pinnedMessages: 0,
        mediaFiles: 0,
        lastActivity: null
      }, 
      error 
    };
  }
}

/**
 * Unpin a message
 * @param {string} messageId - Message ID
 * @returns {Promise<Object>} Result
 */
export async function unpinMessage(messageId) {
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('messages')
      .update({ is_pinned: false })
      .eq('id', messageId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error unpinning message:', error);
    return { data: null, error };
  }
}

/**
 * Pin a message
 * @param {string} messageId - Message ID
 * @returns {Promise<Object>} Result
 */
export async function pinMessage(messageId) {
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('messages')
      .update({ is_pinned: true })
      .eq('id', messageId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error pinning message:', error);
    return { data: null, error };
  }
}

/**
 * Get conversation overview (batched - fetches stats, media, pinned messages in parallel)
 * @param {string} channelId - Channel ID
 * @returns {Promise<Object>} All conversation overview data
 */
export async function getConversationOverview(supabaseClient, channelId) {
  try {
    // Fetch all data in parallel
    const [stats, media, pinned] = await Promise.all([
      getConversationStats(supabaseClient, channelId),
      getSharedMedia(supabaseClient, channelId, { limit: 6 }),
      getPinnedMessages(supabaseClient, channelId, { limit: 3 })
    ]);

    return {
      data: {
        stats: stats.data || { totalMessages: 0, pinnedMessages: 0, mediaFiles: 0, lastActivity: null },
        media: media.data || [],
        pinned: pinned.data || []
      },
      error: null
    };
  } catch (error) {
    console.error('Error fetching conversation overview:', error);
    return {
      data: {
        stats: { totalMessages: 0, pinnedMessages: 0, mediaFiles: 0, lastActivity: null },
        media: [],
        pinned: []
      },
      error
    };
  }
}

// =============================================
// REAL-TIME SUBSCRIPTIONS
// =============================================

/**
 * Subscribe to channel messages and attachments
 * @param {string} channelId - Channel ID
 * @param {Function} callback - Callback function for new messages/attachments
 * @returns {Object} Subscription object
 */
export function subscribeToMessages(supabaseClient, channelId, callback) {
  return supabaseClient
    .channel(`messages:${channelId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `channel_id=eq.${channelId}`
    }, (payload) => callback({ type: 'INSERT', ...payload }))
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'messages',
      filter: `channel_id=eq.${channelId}`
    }, (payload) => callback({ type: 'UPDATE', ...payload }))
    .on('postgres_changes', {
      event: 'DELETE',
      schema: 'public',
      table: 'messages',
      filter: `channel_id=eq.${channelId}`
    }, (payload) => callback({ type: 'DELETE', ...payload }))
    // Subscribe to attachment inserts to update messages in real-time
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'message_attachments'
    }, (payload) => {
      // Find the message and update it with attachments
      callback({ type: 'ATTACHMENT_ADDED', attachment: payload.new });
    })
    // Subscribe to reactions - ADDED
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'reactions'
    }, (payload) => {
      // Filter by channel_id if present in payload
      callback({ type: 'REACTION_ADD', new: payload.new });
    })
    // Subscribe to reactions - REMOVE
    .on('postgres_changes', {
      event: 'DELETE',
      schema: 'public',
      table: 'reactions'
    }, (payload) => {
      callback({ type: 'REACTION_REMOVE', old: payload.old });
    })
    .subscribe();
}

/**
 * Subscribe to channel member changes
 * @param {string} channelId - Channel ID
 * @param {Function} callback - Callback function for member changes
 * @returns {Object} Subscription object
 */
export function subscribeToChannelMembers(supabaseClient, channelId, callback) {
  return supabaseClient
    .channel(`channel_members:${channelId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'channel_members',
      filter: `channel_id=eq.${channelId}`
    }, callback)
    .subscribe();
}

/**
 * Unsubscribe from a channel
 * @param {Object} subscription - Subscription object
 */
export function unsubscribe(supabaseClient, subscription) {
  return supabaseClient.removeChannel(subscription);
}
