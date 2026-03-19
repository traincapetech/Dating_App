import apiClient from './api/client';

/**
 * DETERMINISTIC HASHING: Ensures photoId is consistent across all screens
 */
const generatePhotoId = (photoUrl) => {
  if (!photoUrl) return null;
  // Simple string hashing for consistent photoId if backend doesn't provide one
  let hash = 0;
  for (let i = 0; i < photoUrl.length; i++) {
    const char = photoUrl.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `photo_${Math.abs(hash).toString(36)}`;
};

export const photoSocialService = {
  /**
   * Atomic Like Toggle
   */
  toggleLike: async (targetUserId, photoUrl) => {
    const photoId = generatePhotoId(photoUrl);
    return apiClient.post('/photo-social/like', {
      targetUserId,
      photoUrl,
      photoId
    });
  },

  /**
   * Add Social Comment (Rate Limited)
   */
  addComment: async (targetUserId, photoUrl, text) => {
    const photoId = generatePhotoId(photoUrl);
    return apiClient.post('/photo-social/comment', {
      targetUserId,
      photoUrl,
      photoId,
      text
    });
  },

  /**
   * Fetch Paginated Details (Cursor-based)
   */
  getPhotoDetails: async (photoUrl, cursor = null) => {
    const photoId = generatePhotoId(photoUrl);
    const path = `/photo-social/details/${photoId}${cursor ? `?cursor=${cursor}` : ''}`;
    return apiClient.get(path);
  },

  /**
   * Batch Fetch Profile Stats
   */
  getProfileStats: async (userId) => {
    return apiClient.get(`/photo-social/user/${userId}/stats`);
  },

  // Export hashing utility for consistent ID generation across screens
  generatePhotoId
};

export default photoSocialService;
