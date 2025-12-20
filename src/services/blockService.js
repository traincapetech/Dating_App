import {apiClient} from './api/client';

export async function getBlockedUsers(userId) {
  const response = await apiClient.get(`/users/blocked/${userId}`);
  return response.blockedUsers || [];
}

export async function blockUser(blockerId, blockedId, reason) {
  return await apiClient.post('/users/block', {
    blockerId,
    blockedId,
    reason,
  });
}

export async function unblockUser(blockerId, blockedId) {
  return await apiClient.post('/users/unblock', {
    blockerId,
    blockedId,
  });
}

