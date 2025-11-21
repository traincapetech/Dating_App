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
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error = new Error(data?.message || 'Something went wrong');
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

