import {API_BASE_URL} from '../../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const defaultHeaders = {
  'Content-Type': 'application/json',
};

// Singleton promise to prevent multiple concurrent refresh requests
let refreshPromise = null;

async function getStoredTokens() {
  const [accessToken, refreshToken] = await Promise.all([
    AsyncStorage.getItem('@pryvo/token'),
    AsyncStorage.getItem('@pryvo/refresh'),
  ]);
  return {accessToken, refreshToken};
}

async function storeNewTokens(tokens) {
  const ops = [];
  if (tokens?.accessToken) {
    ops.push(AsyncStorage.setItem('@pryvo/token', tokens.accessToken));
  }
  if (tokens?.refreshToken) {
    ops.push(AsyncStorage.setItem('@pryvo/refresh', tokens.refreshToken));
  }
  await Promise.all(ops);
}

async function doRefresh() {
  const {refreshToken} = await getStoredTokens();
  if (!refreshToken) {
    // If we have no refresh token to begin with, the session is corrupted
    // Clear access token so the app knows it must re-authenticate
    await AsyncStorage.multiRemove([
      '@pryvo/token',
      '@pryvo/refresh',
      '@pryvo_user',
    ]);
    throw new Error('No refresh token available');
  }

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({refreshToken}),
  });

  if (!response.ok) {
    // Refresh failed – clear all tokens so the user is sent to login
    await AsyncStorage.multiRemove([
      '@pryvo/token',
      '@pryvo/refresh',
      '@pryvo_user',
    ]);
    throw new Error('Session expired. Please sign in again.');
  }

  const data = await response.json();
  if (data?.tokens) {
    await storeNewTokens(data.tokens);
    // Also update stored user data if returned
    if (data?.user) {
      await AsyncStorage.setItem('@pryvo_user', JSON.stringify(data.user));
    }
    return data.tokens.accessToken;
  }
  throw new Error('Refresh response missing tokens');
}

async function refreshTokensOnce() {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function request(
  path,
  {method = 'GET', body, data: reqData, headers = {}, token} = {},
  isRetry = false,
) {
  const finalBody = body || reqData;
  const finalHeaders = {...defaultHeaders, ...headers};

  // Attach auth token — prefer explicitly passed token, then stored token
  let authToken = token;
  if (!authToken) {
    authToken = await AsyncStorage.getItem('@pryvo/token');
  }
  if (authToken) {
    finalHeaders.Authorization = `Bearer ${authToken}`;
    // Also set legacy 'token' header for compatibility with older middleware paths
    finalHeaders.token = authToken;
  }

  let response;
  try {
    console.log(`[API Request] ${method} ${path}`);
    const url = `${API_BASE_URL}${path}`;
    response = await fetch(url, {
      method,
      headers: finalHeaders,
      body: finalBody ? JSON.stringify(finalBody) : undefined,
    });
    console.log(`[API Response] ${method} ${path} -> ${response.status}`);
  } catch (networkError) {
    console.error('[API Client] Network error:', networkError);
    const originalMessage =
      typeof networkError?.message === 'string' ? networkError.message : '';
    const errorMessage = originalMessage
      ? `Network error: ${originalMessage}`
      : 'Network error. Please check your internet connection and try again.';
    const error = new Error(errorMessage);
    error.isNetworkError = true;
    error.status = 0;
    error.method = method;
    error.path = path;
    error.baseUrl = API_BASE_URL;
    error.originalError = networkError;
    throw error;
  }

  // Auto-refresh on 401 (once per request, not on retry to avoid loops)
  const isAuthRoute = path.includes('/auth/login') || path.includes('/auth/signup') || path.includes('/auth/refresh');
  if (response.status === 401 && !isRetry && !isAuthRoute) {
    try {
      console.log('[API Client] Got 401 – attempting token refresh...');
      const newAccessToken = await refreshTokensOnce();
      console.log('[API Client] Token refreshed – retrying original request');
      // Retry original call with the fresh token
      return request(
        path,
        {method, body, data: reqData, headers, token: newAccessToken},
        true, // mark as retry so we don't loop
      );
    } catch (refreshErr) {
      console.error('[API Client] Token refresh failed:', refreshErr);
      // Refresh failed — fall through to throw the 401 error below
    }
  }

  const text = await response.text();
  let data = null;

  // Check if response is HTML (usually means server error or endpoint not found)
  if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
    console.error(
      '[API Client] Server returned HTML instead of JSON. Endpoint might not exist.',
    );
    const error = new Error(
      'Server error. The requested endpoint may not be available.',
    );
    error.status = response.status;
    error.isHtmlResponse = true;
    throw error;
  }

  try {
    data = text && text !== 'undefined' ? JSON.parse(text) : null;
  } catch (parseError) {
    console.warn('[API Client] Failed to parse response as JSON:', parseError);
    console.warn('[API Client] Response text:', text.substring(0, 200));
  }

  if (!response.ok) {
    let errorMessage = 'Something went wrong';

    if (data) {
      errorMessage =
        data.message ||
        data.error ||
        data.Message ||
        data.Error ||
        errorMessage;

      if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
        const firstError = data.errors[0];
        errorMessage =
          firstError.message ||
          `${firstError.path}: ${firstError.message}` ||
          errorMessage;
      }
    } else if (text) {
      errorMessage = text;
    }

    if (response.status === 400) {
      if (!data?.message && !data?.error) {
        errorMessage = 'Invalid request. Please check your input.';
      }
    } else if (response.status === 401) {
      errorMessage = 'Authentication failed. Please sign in again.';
    } else if (response.status === 404) {
      errorMessage = 'Resource not found.';
    } else if (response.status === 409) {
      errorMessage = data?.message || 'Conflict. This resource already exists.';
    } else if (
      response.status === 413 ||
      errorMessage.includes('entity too large') ||
      errorMessage.includes('too large')
    ) {
      errorMessage =
        'Image is too large. Please try a smaller image or reduce quality.';
    } else if (response.status >= 500) {
      errorMessage = 'Server error. Please try again later.';
    }

    const error = new Error(errorMessage);
    error.status = response.status;
    error.data = data;
    error.responseText = text;
    throw error;
  }

  return data;
}

export const apiClient = {
  get: (path, options) => request(path, {...options, method: 'GET'}),
  post: (path, body, options = {}) =>
    request(path, {...options, method: 'POST', body}),
  put: (path, body, options = {}) =>
    request(path, {...options, method: 'PUT', body}),
  patch: (path, body, options = {}) =>
    request(path, {...options, method: 'PATCH', body}),
  delete: (path, options) => request(path, {...options, method: 'DELETE'}),
};

export default apiClient;