// Search API
// Handles search functionality for messages, channels, and files

import { supabase } from '../lib/supabase.js';

// =============================================
// GLOBAL SEARCH
// =============================================

/**
 * Global search across messages, channels, and files
 * @param {string} teamId - Team ID
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Promise<Object>} Search results
 */
export async function globalSearch(teamId, query, options = {}) {
  try {
    const { limit = 20, offset = 0, filters = {} } = options;
    
    if (!query || query.trim().length === 0) {
      return { data: { messages: [], channels: [], files: [] }, error: null };
    }

    const searchTerm = query.trim();
    const results = {
      messages: [],
      channels: [],
      files: []
    };

    // Search messages
    if (!filters.excludeMessages) {
      const { data: messages, error: messagesError } = await searchMessages(
        teamId, 
        searchTerm, 
        { limit: Math.floor(limit / 3), offset }
      );
      
      if (!messagesError) {
        results.messages = messages.data || [];
      }
    }

    // Search channels
    if (!filters.excludeChannels) {
      const { data: channels, error: channelsError } = await searchChannels(
        teamId, 
        searchTerm, 
        { limit: Math.floor(limit / 3), offset }
      );
      
      if (!channelsError) {
        results.channels = channels.data || [];
      }
    }

    // Search files
    if (!filters.excludeFiles) {
      const { data: files, error: filesError } = await searchFiles(
        teamId, 
        searchTerm, 
        { limit: Math.floor(limit / 3), offset }
      );
      
      if (!filesError) {
        results.files = files.data || [];
      }
    }

    return { data: results, error: null };
  } catch (error) {
    console.error('Error in global search:', error);
    return { data: null, error };
  }
}

// =============================================
// MESSAGE SEARCH
// =============================================

/**
 * Search messages within a team
 * @param {string} teamId - Team ID
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Promise<Object>} Search results
 */
export async function searchMessages(teamId, query, options = {}) {
  try {
    const { 
      limit = 50, 
      offset = 0, 
      channelId = null,
      senderId = null,
      dateFrom = null,
      dateTo = null,
      hasFile = null,
      hasLink = null
    } = options;

    let searchQuery = supabase
      .from('messages')
      .select(`
        id,
        content,
        message_type,
        is_edited,
        is_pinned,
        created_at,
        sender_id,
        channel_id,
        channels!inner(
          name,
          type
        ),
        message_attachments(
          id,
          filename,
          file_type
        )
      `)
      .eq('team_id', teamId)
      .textSearch('content', query, { type: 'websearch' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (channelId) {
      searchQuery = searchQuery.eq('channel_id', channelId);
    }

    if (senderId) {
      searchQuery = searchQuery.eq('sender_id', senderId);
    }

    if (dateFrom) {
      searchQuery = searchQuery.gte('created_at', dateFrom);
    }

    if (dateTo) {
      searchQuery = searchQuery.lte('created_at', dateTo);
    }

    if (hasFile === true) {
      searchQuery = searchQuery.not('message_attachments', 'is', null);
    } else if (hasFile === false) {
      searchQuery = searchQuery.is('message_attachments', null);
    }

    if (hasLink === true) {
      searchQuery = searchQuery.like('content', '%http%');
    }

    const { data, error } = await searchQuery;

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error searching messages:', error);
    return { data: null, error };
  }
}

/**
 * Search messages within a specific channel
 * @param {string} channelId - Channel ID
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Promise<Object>} Search results
 */
export async function searchChannelMessages(channelId, query, options = {}) {
  try {
    const { 
      limit = 50, 
      offset = 0,
      senderId = null,
      dateFrom = null,
      dateTo = null,
      hasFile = null,
      hasLink = null
    } = options;

    let searchQuery = supabase
      .from('messages')
      .select(`
        id,
        content,
        message_type,
        is_edited,
        is_pinned,
        created_at,
        sender_id,
        message_attachments(
          id,
          filename,
          file_type
        )
      `)
      .eq('channel_id', channelId)
      .textSearch('content', query, { type: 'websearch' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (senderId) {
      searchQuery = searchQuery.eq('sender_id', senderId);
    }

    if (dateFrom) {
      searchQuery = searchQuery.gte('created_at', dateFrom);
    }

    if (dateTo) {
      searchQuery = searchQuery.lte('created_at', dateTo);
    }

    if (hasFile === true) {
      searchQuery = searchQuery.not('message_attachments', 'is', null);
    } else if (hasFile === false) {
      searchQuery = searchQuery.is('message_attachments', null);
    }

    if (hasLink === true) {
      searchQuery = searchQuery.like('content', '%http%');
    }

    const { data, error } = await searchQuery;

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error searching channel messages:', error);
    return { data: null, error };
  }
}

// =============================================
// CHANNEL SEARCH
// =============================================

/**
 * Search channels within a team
 * @param {string} teamId - Team ID
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Promise<Object>} Search results
 */
export async function searchChannels(teamId, query, options = {}) {
  try {
    const { limit = 20, offset = 0, type = null } = options;

    let searchQuery = supabase
      .from('channels')
      .select(`
        id,
        name,
        description,
        type,
        is_private,
        is_announcements,
        created_at,
        channel_members!inner(user_id)
      `)
      .eq('team_id', teamId)
      .eq('channel_members.user_id', (await supabase.auth.getUser()).data.user?.id)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1);

    if (type) {
      searchQuery = searchQuery.eq('type', type);
    }

    const { data, error } = await searchQuery;

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error searching channels:', error);
    return { data: null, error };
  }
}

// =============================================
// FILE SEARCH
// =============================================

/**
 * Search files within a team
 * @param {string} teamId - Team ID
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Promise<Object>} Search results
 */
export async function searchFiles(teamId, query, options = {}) {
  try {
    const { 
      limit = 20, 
      offset = 0, 
      fileType = null,
      channelId = null
    } = options;

    let searchQuery = supabase
      .from('message_attachments')
      .select(`
        id,
        filename,
        file_type,
        file_size,
        created_at,
        messages!inner(
          id,
          content,
          sender_id,
          channel_id,
          channels!inner(
            name,
            type
          )
        )
      `)
      .eq('team_id', teamId)
      .is('deleted_at', null)
      .ilike('filename', `%${query}%`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (fileType) {
      searchQuery = searchQuery.eq('file_type', fileType);
    }

    if (channelId) {
      searchQuery = searchQuery.eq('messages.channel_id', channelId);
    }

    const { data, error } = await searchQuery;

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error searching files:', error);
    return { data: null, error };
  }
}

// =============================================
// USER SEARCH
// =============================================

/**
 * Search team members
 * @param {string} teamId - Team ID
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Promise<Object>} Search results
 */
export async function searchUsers(teamId, query, options = {}) {
  try {
    const { limit = 20, offset = 0, role = null } = options;

    // This would typically search in a users table
    // For now, we'll search team members and assume user data is available
    let searchQuery = supabase
      .from('team_members')
      .select(`
        user_id,
        role,
        position,
        joined_at
      `)
      .eq('team_id', teamId)
      .order('joined_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (role) {
      searchQuery = searchQuery.eq('role', role);
    }

    // Note: In a real implementation, you'd join with a users table
    // to get names, emails, etc. This is a simplified version.

    const { data, error } = await searchQuery;

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error searching users:', error);
    return { data: null, error };
  }
}

// =============================================
// SEARCH SUGGESTIONS
// =============================================

/**
 * Get search suggestions based on query
 * @param {string} teamId - Team ID
 * @param {string} query - Partial query
 * @returns {Promise<Object>} Search suggestions
 */
export async function getSearchSuggestions(teamId, query) {
  try {
    if (!query || query.length < 2) {
      return { data: [], error: null };
    }

    const suggestions = [];

    // Get channel name suggestions
    const { data: channels } = await supabase
      .from('channels')
      .select('name, type')
      .eq('team_id', teamId)
      .ilike('name', `%${query}%`)
      .limit(5);

    if (channels) {
      channels.forEach(channel => {
        suggestions.push({
          type: 'channel',
          text: `#${channel.name}`,
          description: `${channel.type} channel`
        });
      });
    }

    // Get common search terms (could be cached or stored)
    const commonTerms = [
      'has:file',
      'has:link',
      'from:me',
      'before:',
      'after:',
      'in:'
    ];

    commonTerms.forEach(term => {
      if (term.toLowerCase().includes(query.toLowerCase())) {
        suggestions.push({
          type: 'filter',
          text: term,
          description: 'Search filter'
        });
      }
    });

    return { data: suggestions, error: null };
  } catch (error) {
    console.error('Error getting search suggestions:', error);
    return { data: null, error };
  }
}

// =============================================
// SEARCH HISTORY
// =============================================

/**
 * Save search query to history
 * @param {string} teamId - Team ID
 * @param {string} query - Search query
 * @returns {Promise<Object>} Save result
 */
export async function saveSearchHistory(teamId, query) {
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('User not authenticated');

    // This would typically save to a search_history table
    // For now, we'll use localStorage or a simple in-memory cache
    const searchHistory = JSON.parse(localStorage.getItem('search_history') || '[]');
    
    // Add new query to beginning
    searchHistory.unshift({
      query,
      teamId,
      timestamp: new Date().toISOString()
    });

    // Keep only last 20 searches
    const trimmedHistory = searchHistory.slice(0, 20);
    localStorage.setItem('search_history', JSON.stringify(trimmedHistory));

    return { data: { success: true }, error: null };
  } catch (error) {
    console.error('Error saving search history:', error);
    return { data: null, error };
  }
}

/**
 * Get search history
 * @param {string} teamId - Team ID
 * @returns {Promise<Object>} Search history
 */
export async function getSearchHistory(teamId) {
  try {
    const searchHistory = JSON.parse(localStorage.getItem('search_history') || '[]');
    
    // Filter by team and return recent searches
    const teamHistory = searchHistory
      .filter(item => item.teamId === teamId)
      .slice(0, 10);

    return { data: teamHistory, error: null };
  } catch (error) {
    console.error('Error getting search history:', error);
    return { data: null, error };
  }
}
