import {API_BASE_URL} from '../../config/api';

const defaultHeaders = {
  'Content-Type': 'application/json',
};

async function request(path, {method = 'GET', body, headers = {}, token} = {}) {
  const finalHeaders = {...defaultHeaders, ...headers};
  if (token) {
    finalHeaders.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: finalHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (networkError) {
    // Handle network errors (connection refused, timeout, etc.)
    console.error('[API Client] Network error:', networkError);
    const error = new Error('Network error. Please check your internet connection and try again.');
    error.isNetworkError = true;
    error.originalError = networkError;
    throw error;
  }

  const text = await response.text();
  let data = null;
  
  // Check if response is HTML (usually means server error or endpoint not found)
  if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
    console.error('[API Client] Server returned HTML instead of JSON. Endpoint might not exist.');
    const error = new Error('Server error. The requested endpoint may not be available.');
    error.status = response.status;
    error.isHtmlResponse = true;
    throw error;
  }
  
  try {
    data = text ? JSON.parse(text) : null;
  } catch (parseError) {
    // If response is not JSON, use the text as message
    console.warn('[API Client] Failed to parse response as JSON:', parseError);
    console.warn('[API Client] Response text:', text.substring(0, 200));
  }

  if (!response.ok) {
    // Handle specific error cases
    let errorMessage = 'Something went wrong';
    
    // Try to extract error message from various possible formats
    if (data) {
      errorMessage = data.message || data.error || data.Message || data.Error || errorMessage;
      
      // Handle validation errors
      if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
        const firstError = data.errors[0];
        errorMessage = firstError.message || `${firstError.path}: ${firstError.message}` || errorMessage;
      }
    } else if (text) {
      // If not JSON, use the text as error message
      errorMessage = text;
    }
    
    // Provide more specific messages based on status code
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
    } else if (response.status === 413 || errorMessage.includes('entity too large') || errorMessage.includes('too large')) {
      errorMessage = 'Image is too large. Please try a smaller image or reduce quality.';
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

