// src/services/swipeActions.js
import apiClient from './api/client';

export const likeUser = async (senderId, receiverId, isPremium = false) => {
  try {
    const res = await apiClient.post('/swipe/like', { senderId, receiverId, isPremium });
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
    const res = await apiClient.post('/swipe/pass', { userId, passedUserId });
    return res;
  } catch (err) {
    console.error('Pass Error:', err?.message || err);
    throw err;
  }
};

export const getLikesReceived = async (userId, isPremium = false) => {
  try {
    const res = await apiClient.get(`/swipe/likes/${userId}?isPremium=${isPremium}`);
    return res;
  } catch (err) {
    console.error('Get Likes Error:', err?.message || err);
    return { success: false, count: 0, likes: [] };
  }
};

export const getLikesCount = async (userId) => {
  try {
    const res = await apiClient.get(`/swipe/likes-count/${userId}`);
    return res;
  } catch (err) {
    console.error('Get Likes Count Error:', err?.message || err);
    return { success: false, count: 0 };
  }
};

export const getDailyLikeInfo = async (userId, isPremium = false) => {
  try {
    const res = await apiClient.get(`/swipe/daily-likes/${userId}?isPremium=${isPremium}`);
    return res;
  } catch (err) {
    console.error('Get Daily Like Info Error:', err?.message || err);
    return { success: false, count: 0, limit: 50, remaining: 50 };
  }
};

