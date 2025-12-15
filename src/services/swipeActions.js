// src/services/swipeActions.js
import apiClient from './api/client';

export const likeUser = async (senderId, receiverId) => {
  try {
    const res = await apiClient.post('/swipe/like', { senderId, receiverId });
    return res;
  } catch (err) {
    console.error('Like Error:', err?.message || err);
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

