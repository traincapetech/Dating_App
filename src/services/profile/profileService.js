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

export async function uploadProfileImage(userId, imageData, fileName) {
  const token = await getAccessToken();

  // Build multipart FormData — works reliably on all Android/iOS versions
  // without needing base64 encoding (which can be unreliable on some devices).
  const form = new FormData();
  form.append('userId', userId);

  if (imageData && imageData.uri) {
    // Asset object from react-native-image-picker (preferred path)
    const fileUri = imageData.uri;
    const mimeType = imageData.type || 'image/jpeg';
    const name = fileName || imageData.fileName || `photo_${Date.now()}.jpg`;

    form.append('image', {
      uri: fileUri,
      type: mimeType,
      name,
    });
  } else if (typeof imageData === 'string' && (imageData.startsWith('file://') || imageData.startsWith('/'))) {
    // Raw file URI string
    form.append('image', {
      uri: imageData,
      type: 'image/jpeg',
      name: fileName || `photo_${Date.now()}.jpg`,
    });
  } else if (typeof imageData === 'string' && imageData.startsWith('data:')) {
    // Base64 data URI — convert to buffer approach via JSON fallback
    const result = await apiClient.post(
      '/profile/upload-image',
      {userId, imageUri: imageData, fileName: fileName || `photo_${Date.now()}.jpg`, contentType: 'image/jpeg'},
      token ? {token} : {},
    );
    return result;
  } else {
    throw new Error('Invalid image data. Expected asset object with uri, a file:// URI string, or a base64 data URI.');
  }

  // Send as multipart/form-data (React Native fetch handles this natively)
  const response = await fetch(`${API_BASE_URL}/profile/upload-image`, {
    method: 'POST',
    headers: {
      // DO NOT set Content-Type here — fetch sets it automatically with boundary for FormData
      ...(token ? {Authorization: `Bearer ${token}`, token} : {}),
    },
    body: form,
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }

  if (!response.ok) {
    const msg = data?.message || data?.error || text || 'Image upload failed';
    const err = new Error(msg);
    err.status = response.status;
    throw err;
  }

  return data;
}

export async function uploadMultipleImages(userId, images) {
  const uploadPromises = images
    .filter(img => img && (img.uri || img.base64))
    .map((img, index) => {
      // Prefer base64 if available, otherwise use URI
      const imageData = img.base64 || img.asset || img.uri;
      return uploadProfileImage(
        userId,
        imageData,
        img.fileName || `image_${index}.jpg`,
      );
    });

  return Promise.all(uploadPromises);
}

export async function deleteImage(userId, imageUrl) {
  const headers = await getAuthHeaders();
  return apiClient.post('/profile/delete-image', { userId, imageUrl }, headers);
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