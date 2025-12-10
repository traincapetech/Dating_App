import {API_BASE_URL} from '../../config/api';

const defaultHeaders = {
  'Content-Type': 'application/json',
};

async function request(path, {method = 'GET', body, headers = {}, token} = {}) {
  const finalHeaders = {...defaultHeaders, ...headers};
  if (token) {
    finalHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: finalHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let data = null;
  
  try {
    data = text ? JSON.parse(text) : null;
  } catch (parseError) {
    // If response is not JSON, use the text as message
    console.warn('[API Client] Failed to parse response as JSON:', parseError);
  }

  if (!response.ok) {
    // Handle specific error cases
    let errorMessage = data?.message || data?.error || 'Something went wrong';
    
    if (response.status === 413 || errorMessage.includes('entity too large') || errorMessage.includes('too large')) {
      errorMessage = 'Image is too large. Please try a smaller image or reduce quality.';
    } else if (response.status === 401) {
      errorMessage = 'Authentication failed. Please sign in again.';
    } else if (response.status >= 500) {
      errorMessage = 'Server error. Please try again later.';
    }
    
    const error = new Error(errorMessage);
    error.status = response.status;
    error.data = data;
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

