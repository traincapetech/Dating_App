/**
 * profileService.js (frontend)
 * ─────────────────────────────────────────────────────────────────────────────
 * UNIFIED client. All profile writes use updateProfile → PATCH /profile.
 * Legacy per-section functions removed completely.
 */
import {Platform} from 'react-native';
import {apiClient} from '../api/client';
import {getAccessToken} from '../storage/tokenStorage';
import {API_BASE_URL} from '../../config/api';

async function getAuthHeaders() {
  const token = await getAccessToken();
  return token ? {token} : {};
}

/**
 * updateProfile — The ONLY function for all profile writes.
 * @param {object} payload — partial nested profile object, e.g.:
 *   { basicInfo: { firstName: 'John' } }
 *   { lifestyle: { drink: 'Yes' } }
 *   { basicInfo: {...}, personalDetails: {...} }  ← multi-section at once
 */
export async function updateProfile(payload) {
  const headers = await getAuthHeaders();
  // Strip userId from payload — backend reads it from JWT
  const {userId: _removed, ...body} = payload;
  return apiClient.patch('/profile', body, headers);
}

// ── Media ─────────────────────────────────────────────────────────────────

export async function uploadProfileImage(userId, imageData, fileName) {
  const token = await getAccessToken();
  const form = new FormData();
  form.append('userId', userId);

  let uploadMethod = 'FORM_DATA';

  if (imageData && imageData.uri) {
    // 📸 Handle asset object from react-native-image-picker
    const fileUri =
      Platform.OS === 'android' && !imageData.uri.startsWith('content://') && !imageData.uri.startsWith('file://')
        ? `file://${imageData.uri}`
        : imageData.uri;
    
    const mimeType = imageData.type || 'image/jpeg';
    const name = fileName || imageData.fileName || `photo_${Date.now()}.jpg`;
    
    console.log(`[ProfileService] Uploading image via FormData: ${name} (${mimeType})`);
    form.append('image', {
      uri: fileUri,
      type: mimeType,
      name: name,
    });
  } else if (
    typeof imageData === 'string' &&
    (imageData.startsWith('file://') || imageData.startsWith('/') || imageData.startsWith('content://'))
  ) {
    // 📁 Handle raw file path string
    uploadMethod = 'FORM_DATA';
    form.append('image', {
      uri: imageData,
      type: 'image/jpeg',
      name: fileName || `photo_${Date.now()}.jpg`,
    });
  } else if (typeof imageData === 'string' && imageData.startsWith('data:')) {
    // 🧬 Handle base64 data URI
    uploadMethod = 'BASE64';
    console.log('[ProfileService] Uploading image via Base64/JSON');
    return apiClient.post(
      '/profile/upload-image',
      {
        userId,
        imageUri: imageData,
        fileName: fileName || `photo_${Date.now()}.jpg`,
        contentType: 'image/jpeg',
      },
      token ? {token} : {},
    );
  } else {
    throw new Error(
      'Invalid image data. Expected asset object with uri, a file:// URI string, or a base64 data URI.',
    );
  }

  // Use raw fetch for FormData to avoid apiClient's JSON stringification
  const url = `${API_BASE_URL}/profile/upload-image`;
  console.log(`[ProfileService] Fetching: POST ${url}`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        ...(token ? {Authorization: `Bearer ${token}`, token} : {}),
      },
      body: form,
    });

    const text = await response.text();
    let data;
    try {
      data = text && text !== 'undefined' ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    if (!response.ok) {
      console.error(`[ProfileService] Upload failed with status ${response.status}`);
      const msg = data?.message || data?.error || text || 'Image upload failed';
      const err = new Error(msg);
      err.status = response.status;
      throw err;
    }

    console.log('[ProfileService] Upload successful');
    return data;
  } catch (error) {
    console.error('[ProfileService] Network/Fetch error during upload:', error);
    // If it's the specific "Network request failed", add more context
    if (error.message === 'Network request failed') {
      const enhancedError = new Error(`Network request failed. Please check if the server is running at ${API_BASE_URL} and reachable from this device.`);
      enhancedError.originalError = error;
      throw enhancedError;
    }
    throw error;
  }
}

export async function uploadMultipleImages(userId, images) {
  const uploadPromises = images
    .filter(img => img && (img.uri || img.base64))
    .map((img, index) => {
      const imageData = img.base64 || img.asset || img.uri;
      return uploadProfileImage(userId, imageData, img.fileName || `image_${index}.jpg`);
    });
  return Promise.all(uploadPromises);
}

export async function deleteImage(userId, imageUrl) {
  const headers = await getAuthHeaders();
  return apiClient.post('/profile/delete-image', {userId, imageUrl}, headers);
}

// ── Profile reads ──────────────────────────────────────────────────────────

export async function getProfile(userId) {
  const headers = await getAuthHeaders();
  return apiClient.get(`/profile/${userId}`, headers);
}

export async function getDiscoverProfiles(excludeUserId = null, options = {}) {
  const headers = await getAuthHeaders();
  const params = {};

  if (excludeUserId) params.excludeUserId = excludeUserId;
  if (options.useMatching !== undefined)
    params.useMatching = options.useMatching ? 'true' : 'false';
  if (options.minScore !== undefined) params.minScore = options.minScore;
  if (options.maxDistance !== undefined && options.maxDistance !== null)
    params.maxDistance = options.maxDistance;
  if (options.sortBy) params.sortBy = options.sortBy;
  if (options.limit !== undefined && options.limit !== null)
    params.limit = options.limit;

  if (options.filters) {
    const f = options.filters;
    if (f.educationLevel) params.educationLevel = f.educationLevel;
    if (f.minHeight != null) params.minHeight = f.minHeight;
    if (f.maxHeight != null) params.maxHeight = f.maxHeight;
    if (f.drink) params.drink = f.drink;
    if (f.smokeTobacco) params.smokeTobacco = f.smokeTobacco;
    if (f.smokeWeed) params.smokeWeed = f.smokeWeed;
    if (f.religiousBeliefs) params.religiousBeliefs = f.religiousBeliefs;
    if (f.politicalBeliefs) params.politicalBeliefs = f.politicalBeliefs;
  }

  const queryString = new URLSearchParams(params).toString();
  const path = `/profile/discover${queryString ? `?${queryString}` : ''}`;
  return apiClient.get(path, headers);
}

// ── Account / Status ───────────────────────────────────────────────────────

export async function pauseProfile(isPaused) {
  const headers = await getAuthHeaders();
  return apiClient.post('/profile/pause', {isPaused}, headers);
}

export async function updateOnlineStatus(showOnlineStatus) {
  const headers = await getAuthHeaders();
  return apiClient.put('/profile/settings/online-status', {showOnlineStatus}, headers);
}

export async function deleteUser(userId) {
  const headers = await getAuthHeaders();
  return apiClient.delete(`/auth/user/${userId}`, headers);
}

export async function deleteProfile(userId) {
  const headers = await getAuthHeaders();
  return apiClient.delete(`/profile/${userId}`, headers);
}

export async function getProfileInteractions(userId) {
  const headers = await getAuthHeaders();
  return apiClient.get(`/profile/${userId}/interactions`, headers);
}

// ── Media order update (kept as convenience wrapper) ───────────────────────
export async function updateMedia(media) {
  return updateProfile({media});
}

// ── Legacy alias — kept so no existing import breaks if missed in sweep ───
export const updateProfileApi = updateProfile;