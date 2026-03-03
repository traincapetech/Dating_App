import apiClient from './api/client';

/**
 * Fetch all streaks for a user
 * @param {string} userId - Current user ID
 */
export const fetchUserStreaks = async userId => {
  if (!userId) return [];
  try {
    const res = await apiClient.get(`/streak/user?userId=${userId}`);
    return res?.streaks || [];
  } catch (err) {
    console.warn('❌ fetchUserStreaks silently failed:', err?.message);
    return [];
  }
};

/**
 * Fetch a specific streak between two users
 * @param {string} userId - Current user ID
 * @param {string} partnerId - Partner user ID
 */
export const getStreakForPair = async (userId, partnerId) => {
  if (!userId || !partnerId) return null;
  try {
    const res = await apiClient.get(
      `/streak/pair?userId=${userId}&partnerId=${partnerId}`,
    );
    return res?.streak || null;
  } catch (err) {
    console.warn('❌ getStreakForPair silently failed:', err?.message);
    return null;
  }
};

/**
 * Get the leaderboard for streaks
 */
export const getStreakLeaderboard = async () => {
  try {
    const res = await apiClient.get('/streak/leaderboard');
    return res?.leaderboard || [];
  } catch (err) {
    console.warn('❌ getStreakLeaderboard silently failed:', err?.message);
    return [];
  }
};

export default {
  fetchUserStreaks,
  getStreakForPair,
  getStreakLeaderboard,
};
