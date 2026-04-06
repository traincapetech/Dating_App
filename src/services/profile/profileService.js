import {apiClient} from '../api/client';
import {getAccessToken} from '../storage/tokenStorage';

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
  const headers = await getAuthHeaders();

  // imageData can be:
  // 1. Base64 string (from react-native-image-picker with includeBase64: true)
  // 2. Asset object with base64 property
  // 3. Image URI (fallback)
  let imageUri;

  if (typeof imageData === 'string') {
    if (imageData.startsWith('data:')) {
      // Already a data URI
      imageUri = imageData;
    } else if (imageData.startsWith('file://') || imageData.startsWith('/')) {
      // Local file URI - for React Native, we need base64
      // This should not happen if includeBase64: true is set
      throw new Error(
        'Image URI provided but base64 is required. Please ensure includeBase64: true in image picker.',
      );
    } else {
      // Assume it's base64 without data URI prefix
      imageUri = `data:image/jpeg;base64,${imageData}`;
    }
  } else if (imageData && imageData.base64) {
    // From react-native-image-picker with includeBase64: true
    // Check if base64 already has data URI prefix
    if (
      typeof imageData.base64 === 'string' &&
      imageData.base64.startsWith('data:')
    ) {
      imageUri = imageData.base64;
    } else {
      imageUri = `data:${imageData.type || 'image/jpeg'};base64,${
        imageData.base64
      }`;
    }
  } else if (imageData && imageData.uri) {
    // Fallback: if no base64, try to use URI (server will need to handle)
    // This is not ideal but works as fallback
    imageUri = imageData.uri;
    console.warn(
      'Uploading image URI without base64. Server may not be able to process it.',
    );
  } else {
    throw new Error(
      'Invalid image data format. Expected base64 string or asset object with base64 property.',
    );
  }

  const result = await apiClient.post(
    '/profile/upload-image',
    {
      userId,
      imageUri,
      fileName: fileName || `image_${Date.now()}.jpg`,
      contentType: 'image/jpeg',
    },
    headers,
  );

  return result;
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
