import {apiClient} from '../api/client';
import {getAccessToken} from '../storage/tokenStorage';

async function getAuthHeaders() {
  const token = await getAccessToken();
  return token ? {token} : {};
}

/**
 * Create a boost for the current user
 * @param {number} duration - Duration in minutes (default: 30)
 * @returns {Promise<object>} Boost object
 */
export async function createBoost(duration = 30) {
  const headers = await getAuthHeaders();
  return apiClient.post('/boost/create', {duration}, headers);
}

/**
 * Get boost status for a user
 * @param {string} userId - User ID (optional, uses current user if not provided)
 * @returns {Promise<object>} Boost status
 */
export async function getBoostStatus(userId = null) {
  const headers = await getAuthHeaders();
  const path = userId ? `/boost/status/${userId}` : '/boost/status';
  return apiClient.get(path, headers);
}

/**
 * Get boost history for a user
 * @param {string} userId - User ID (optional, uses current user if not provided)
 * @param {number} limit - Number of boosts to return
 * @returns {Promise<array>} Array of boost objects
 */
export async function getBoostHistory(userId = null, limit = 10) {
  const headers = await getAuthHeaders();
  const path = userId ? `/boost/history/${userId}` : '/boost/history';
  return apiClient.get(path, {...headers, params: {limit}});
}

