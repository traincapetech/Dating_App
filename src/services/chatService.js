// src/services/chatService.js
import apiClient from './api/client';

/**
 * Fetch messages for a match
 * @param {string} matchId - The match ID
 * @param {string} userId - Current user ID for access validation
 */
export const fetchMessages = async (matchId, userId) => {
  if (!matchId) return [];

  try {
    const res = await apiClient.get(`/chat/${matchId}`, {
      headers: {'x-user-id': userId},
    });
    return res?.messages || res || [];
  } catch (err) {
    console.log('❌ fetchMessages error:', err?.message);
    // Return empty array for non-critical errors, throw for access denied
    if (err?.status === 403) {
      throw err;
    }
    return [];
  }
};

/**
 * Send a message
 * @param {object} params - Message parameters
 */
export const sendMessageApi = async ({
  matchId,
  senderId,
  receiverId,
  text,
  mediaUrl,
  mediaType,
}) => {
  const res = await apiClient.post('/chat', {
    matchId,
    senderId,
    receiverId,
    text: text || null,
    mediaUrl: mediaUrl || null,
    mediaType: mediaType || null,
  });
  return res?.message || res;
};

/**
 * Mark messages as seen
 * @param {string} matchId - The match ID
 * @param {string} userId - Current user ID
 */
export const markMessagesAsSeen = async (matchId, userId) => {
  try {
    await apiClient.post(`/chat/${matchId}/seen`, {userId});
  } catch (err) {
    console.log('❌ markMessagesAsSeen error:', err?.message);
  }
};

/**
 * Fetch matches for a user
 * @param {string} userId - User ID
 */
export const fetchMatches = async userId => {
  if (!userId) return {matches: []};

  try {
    const res = await apiClient.get(`/match/${userId}`);
    return res || {matches: []};
  } catch (err) {
    console.log('❌ fetchMatches error:', err?.message);
    return {matches: []};
  }
};

/**
 * Get last messages for multiple matches (for chat list preview)
 * @param {string[]} matchIds - Array of match IDs
 * @param {string} userId - Current user ID
 */
export const fetchLastMessages = async (matchIds, userId) => {
  if (!matchIds || matchIds.length === 0) return [];

  try {
    const res = await apiClient.post(
      '/chat/last-messages',
      {matchIds},
      {
        headers: {'x-user-id': userId},
      },
    );
    return res?.lastMessages || [];
  } catch (err) {
    console.log('❌ fetchLastMessages error:', err?.message);
    return [];
  }
};

/**
 * Get the number of conversations that have unread messages (used for Chat tab badge).
 * Counts unique conversations, NOT individual messages.
 * Example: 3 senders with 5+3+1 messages each → count = 3
 * @param {string} userId - Current user ID
 */
export const getUnreadConversationsCount = async userId => {
  if (!userId) return 0;
  try {
    const res = await apiClient.get(`/chat/unread-conversations/${userId}`);
    return res?.count ?? 0;
  } catch (err) {
    console.log('❌ getUnreadConversationsCount error:', err?.message);
    return 0;
  }
};

/**
 * Upload media for chat
 * @param {string} imageBase64 - Base64 encoded image
 * @param {string} userId - User ID
 * @param {string} matchId - Match ID
 */
export const uploadChatMedia = async (imageBase64, userId, matchId) => {
  const res = await apiClient.post('/media/chat', {
    image: imageBase64,
    userId,
    matchId,
  });
  return res;
};

/**
 * Block a user
 * @param {string} blockerId - User doing the blocking
 * @param {string} blockedId - User being blocked
 * @param {string} reason - Optional reason
 */
export const blockUser = async (blockerId, blockedId, reason = null) => {
  const res = await apiClient.post('/users/block', {
    blockerId,
    blockedId,
    reason,
  });
  return res;
};

/**
 * Unblock a user
 * @param {string} blockerId - User doing the unblocking
 * @param {string} blockedId - User being unblocked
 */
export const unblockUser = async (blockerId, blockedId) => {
  const res = await apiClient.post('/users/unblock', {
    blockerId,
    blockedId,
  });
  return res;
};

/**
 * Report a user
 * @param {object} params - Report parameters
 */
export const reportUser = async ({
  reporterId,
  reportedId,
  matchId,
  reason,
  description,
}) => {
  const res = await apiClient.post('/users/report', {
    reporterId,
    reportedId,
    matchId,
    reason,
    description,
  });
  return res;
};

/**
 * Block and report a user
 * @param {object} params - Block and report parameters
 */
export const blockAndReportUser = async ({
  blockerId,
  blockedId,
  matchId,
  reason,
  description,
}) => {
  const res = await apiClient.post('/users/block-and-report', {
    blockerId,
    blockedId,
    matchId,
    reason,
    description,
  });
  return res;
};

/**
 * Check if blocked
 * @param {string} userId - Current user ID
 * @param {string} otherUserId - Other user ID
 */
export const checkIfBlocked = async (userId, otherUserId) => {
  try {
    const res = await apiClient.get(`/users/check/${userId}/${otherUserId}`);
    return res;
  } catch (err) {
    console.log('❌ checkIfBlocked error:', err?.message);
    return {isBlocked: false};
  }
};

/**
 * Unmatch with a user
 * @param {string} matchId - The match ID
 * @param {string} userId - Current user ID
 */
export const unmatchUser = async (matchId, userId) => {
  try {
    const res = await apiClient.post(`/match/${matchId}/unmatch`, {userId});
    return res;
  } catch (err) {
    console.log('❌ unmatchUser error:', err?.message);
    throw err;
  }
};

/**
 * Delete a message
 * @param {string} messageId - The message ID to delete
 * @param {string} userId - Current user ID
 */
export const deleteMessageApi = async (messageId, userId) => {
  try {
    const res = await apiClient.delete(`/chat/${messageId}`, {
      data: {userId}, // Pass userId in body for ownership check
    });
    return res;
  } catch (err) {
    console.log('❌ deleteMessageApi error:', err?.message);
    throw err;
  }
};

/**
 * Fetch expired matches for "Previous Interactions"
 * @param {string} userId - User ID
 */
export const fetchPreviousInteractions = async userId => {
  if (!userId) return {matches: []};

  try {
    const res = await apiClient.get(`/match/${userId}/previous`);
    return res || {matches: []};
  } catch (err) {
    console.log('❌ fetchPreviousInteractions error:', err?.message);
    return {matches: []};
  }
};

export default {
  fetchMessages,
  sendMessageApi,
  markMessagesAsSeen,
  fetchMatches,
  fetchPreviousInteractions,
  fetchLastMessages,
  uploadChatMedia,
  blockUser,
  unblockUser,
  reportUser,
  blockAndReportUser,
  checkIfBlocked,
  unmatchUser,
  deleteMessageApi,
  getUnreadConversationsCount,
};