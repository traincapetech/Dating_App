import {apiClient} from '../api/client';
import {getAccessToken} from '../storage/tokenStorage';
import {API_BASE_URL} from '../../config/api';

async function getAuthHeaders() {
  const token = await getAccessToken();
  return token ? {token} : {};
}

export async function getDiscoverProfiles(excludeUserId = null, options = {}) {
  const headers = await getAuthHeaders();
  const params = {};

  if (excludeUserId) {
    params.excludeUserId = excludeUserId;
  }

  // Add matching options
  if (options.useMatching !== undefined) {
    params.useMatching = options.useMatching ? 'true' : 'false';
  }
  if (options.minScore !== undefined) {
    params.minScore = options.minScore;
  }
  if (options.maxDistance !== undefined && options.maxDistance !== null) {
    params.maxDistance = options.maxDistance;
  }
  if (options.sortBy) {
    params.sortBy = options.sortBy;
  }
  if (options.limit !== undefined && options.limit !== null) {
    params.limit = options.limit;
  }

  // Send live GPS so the backend always filters from the real current position
  if (options.latitude !== undefined && options.longitude !== undefined) {
    params.lat = options.latitude;
    params.lng = options.longitude;
  }

  // Add advanced filters (premium feature)
  if (options.filters) {
    const filters = options.filters;
    if (filters.educationLevel) {
      params.educationLevel = filters.educationLevel;
    }
    if (filters.minHeight !== null && filters.minHeight !== undefined) {
      params.minHeight = filters.minHeight;
    }
    if (filters.maxHeight !== null && filters.maxHeight !== undefined) {
      params.maxHeight = filters.maxHeight;
    }
    if (filters.drink) {
      params.drink = filters.drink;
    }
    if (filters.smokeTobacco) {
      params.smokeTobacco = filters.smokeTobacco;
    }
    if (filters.smokeWeed) {
      params.smokeWeed = filters.smokeWeed;
    }
    if (filters.religiousBeliefs) {
      params.religiousBeliefs = filters.religiousBeliefs;
    }
    if (filters.politicalBeliefs) {
      params.politicalBeliefs = filters.politicalBeliefs;
    }
  }

  const queryString = new URLSearchParams(params).toString();
  const path = `/profile/discover${queryString ? `?${queryString}` : ''}`;
  return apiClient.get(path, headers);
}

// Re-built uploadProfileImage using FormData for high-res images
export async function uploadProfileImage(userId, imageData, fileName) {
  const headers = await getAuthHeaders();
  const formData = new FormData();
  formData.append('userId', userId);

  let fileUri = null;
  let fileType = 'image/jpeg';
  let finalFileName = fileName || `photo_${Date.now()}.jpg`;

  if (typeof imageData === 'string') {
    if (imageData.startsWith('file://') || imageData.startsWith('/')) {
      fileUri = imageData;
    } else if (imageData.startsWith('data:')) {
      fileUri = imageData;
      // Extract mimetype if possible
      const match = imageData.match(/^data:(image\/\w+);base64,/);
      if (match) fileType = match[1];
    } else {
      fileUri = `data:image/jpeg;base64,${imageData}`;
    }
  } else if (imageData && imageData.uri) {
    fileUri = imageData.uri;
    fileType = imageData.type || 'image/jpeg';
    finalFileName = imageData.fileName || finalFileName;
  } else if (imageData && imageData.base64) {
    fileUri = `data:${imageData.type || 'image/jpeg'};base64,${imageData.base64}`;
    fileType = imageData.type || 'image/jpeg';
  }

  formData.append('image', {
    uri: fileUri,
    type: fileType,
    name: finalFileName,
  });

  const response = await fetch(`${API_BASE_URL}/profile/upload-image`, {
    method: 'POST',
    headers: {
      ...headers,
    },
    body: formData,
  });

  return response.json();
}

export async function uploadMultipleImages(userId, images) {
  const uploadPromises = images
    .filter(img => img && (img.uri || img.base64 || img.asset))
    .map((img, index) => {
      const imageData = img.asset || img.base64 || img.uri;
      return uploadProfileImage(
        userId,
        imageData,
        img.fileName || `image_${index}.jpg`,
      );
    });

  return Promise.all(uploadPromises);
}

export async function deleteUser(userId) {
  const headers = await getAuthHeaders();
  return apiClient.delete(`/auth/user/${userId}`, headers);
}

export async function deleteProfile(userId) {
  const headers = await getAuthHeaders();
  return apiClient.delete(`/profile/${userId}`, headers);
}

export async function saveBasicInfo(basicInfo) {
  const headers = await getAuthHeaders();
  return apiClient.post('/profile/basic-info', basicInfo, headers);
}

export async function savePersonalDetails(personalDetails) {
  const headers = await getAuthHeaders();
  return apiClient.post('/profile/personal-details', personalDetails, headers);
}

export async function saveDatingPreferences(datingPreferences) {
  const headers = await getAuthHeaders();
  return apiClient.post(
    '/profile/dating-preferences',
    datingPreferences,
    headers,
  );
}

export async function saveLifestyle(lifestyle) {
  const headers = await getAuthHeaders();
  return apiClient.post('/profile/lifestyle', lifestyle, headers);
}

export async function saveProfilePrompts(profilePrompts) {
  const headers = await getAuthHeaders();
  return apiClient.post('/profile/profile-prompts', profilePrompts, headers);
}

export async function updateMedia(media) {
  const headers = await getAuthHeaders();
  return apiClient.post('/profile/media', media, headers);
}

export async function getProfile(userId) {
  const headers = await getAuthHeaders();
  return apiClient.get(`/profile/${userId}`, headers);
}

export async function updateProfileApi(payload) {
  const headers = await getAuthHeaders();
  return apiClient.put('/profile/update', payload, headers);
}

export async function pauseProfile(isPaused) {
  const headers = await getAuthHeaders();
  return apiClient.post('/profile/pause', {isPaused}, headers);
}

export async function updateOnlineStatus(showOnlineStatus) {
  const headers = await getAuthHeaders();
  return apiClient.put(
    '/profile/settings/online-status',
    {showOnlineStatus},
    headers,
  );
}

export async function getProfileInteractions(userId) {
  const headers = await getAuthHeaders();
  return apiClient.get(`/profile/${userId}/interactions`, headers);
}
