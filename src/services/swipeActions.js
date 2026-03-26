// src/services/swipeActions.js
import apiClient from './api/client';

/**
 * Like a user with optional specific content (photo or prompt)
 * @param {string} senderId - Current user ID
 * @param {string} receiverId - User being liked
 * @param {boolean} isPremium - Whether sender is premium
 * @param {object} likedContent - Optional: { type: 'photo'|'prompt', photoIndex, photoUrl, promptId, promptQuestion, promptAnswer, comment }
 */
export const likeUser = async (
  senderId,
  receiverId,
  isPremium = false,
  likedContent = null,
) => {
  try {
    const payload = {senderId, receiverId, isPremium};
    if (likedContent) {
      payload.likedContent = likedContent;
    }
    console.log('[SwipeActions] Sending like:', payload);
    const res = await apiClient.post('/swipe/like', payload);
    console.log('[SwipeActions] Like response:', res);
    return res;
  } catch (err) {
    console.error('Like Error:', err?.message || err);
    // Preserve the error response for limit checking
    if (err?.response) {
      err.limitReached = err.response.status === 429;
      err.message = err.response.data?.message || err.message;
    }
    throw err;
  }
};

export const passUser = async (userId, passedUserId) => {
  try {
    const res = await apiClient.post('/swipe/pass', {userId, passedUserId});
    return res;
  } catch (err) {
    console.error('Pass Error:', err?.message || err);
    throw err;
  }
};

export const sendComment = async (senderId, receiverId, options) => {
  try {
    const payload = {
      senderId,
      receiverId,
      comment: options.text,
      targetContent: {
        type: options.targetType || 'profile',
        photoUrl: options.photoUrl
      }
    };
    const res = await apiClient.post('/comments', payload);
    return res;
  } catch (err) {
    console.error('Send Comment Error:', err?.message || err);
    throw err;
  }
};

export const resetPasses = async userId => {
  try {
    const res = await apiClient.post('/swipe/reset-passes', {userId});
    return res;
  } catch (err) {
    console.error('Reset Passes Error:', err?.message || err);
    throw err;
  }
};

export const getLikesReceived = async (userId, isPremium = false) => {
  try {
    const res = await apiClient.get(
      `/swipe/likes/${userId}?isPremium=${isPremium}`,
    );
    return res;
  } catch (err) {
    console.error('Get Likes Error:', err?.message || err);
    return {success: false, count: 0, likes: []};
  }
};

export const getLikesCount = async userId => {
  try {
    const res = await apiClient.get(`/swipe/likes-count/${userId}`);
    return res;
  } catch (err) {
    console.error('Get Likes Count Error:', err?.message || err);
    return {success: false, count: 0};
  }
};

export const getDailyLikeInfo = async (userId, isPremium = false) => {
  try {
    const res = await apiClient.get(
      `/swipe/daily-likes/${userId}?isPremium=${isPremium}`,
    );
    return res;
  } catch (err) {
    console.error('Get Daily Like Info Error:', err?.message || err);
    return {success: false, count: 0, limit: 50, remaining: 50};
  }
};

/**
 * Undo last swipe (premium only)
 * @param {string} userId - Current user ID
 */
export const undoLastSwipe = async userId => {
  try {
    const res = await apiClient.post('/swipe/undo', {userId});
    return res;
  } catch (err) {
    console.error('Undo Swipe Error:', err?.message || err);
    // Preserve error info for premium check
    if (err?.response) {
      err.requiresPremium = err.response.data?.requiresPremium || false;
      err.message = err.response.data?.message || err.message;
    }
    throw err;
  }
};

/**
 * Get undo status (can user undo and what would be undone)
 * @param {string} userId - Current user ID
 */
export const getUndoStatus = async userId => {
  try {
    const res = await apiClient.get(`/swipe/undo-status/${userId}`);
    return res;
  } catch (err) {
    console.error('Undo Status Error:', err?.message || err);
    return {success: false, canUndo: false};
  }
};

/**
 * Check if current user has already liked another user
 * @param {string} viewerId - Current user ID
 * @param {string} targetId - User being checked
 */
export const checkLikedStatus = async (viewerId, targetId) => {
  try {
    const res = await apiClient.get(`/swipe/liked-status/${viewerId}/${targetId}`);
    return res;
  } catch (err) {
    console.error('Check Liked Status Error:', err?.message || err);
    return { success: false, liked: false };
  }
};

export const rejectLike = async (userId, likerId) => {
  try {
    const res = await apiClient.post('/swipe/likes/reject', {userId, likerId});
    return res;
  } catch (err) {
    console.error('Reject Like Error:', err?.message || err);
    return {success: false, message: 'Failed to reject match request'};
  }
};
