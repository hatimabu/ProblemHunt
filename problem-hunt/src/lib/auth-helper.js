import { buildApiUrl } from './api-config';
import { waitForAuthReady } from './auth-state';

const TOKEN_KEY = 'problemhunt-token';

export function getStoredToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function getAccessToken() {
  return getStoredToken();
}

export async function getCurrentUser() {
  const token = getStoredToken();
  if (!token) return null;
  try {
    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user || null;
  } catch {
    return null;
  }
}

export async function authenticatedFetch(endpoint, options = {}) {
  const fullUrl = buildApiUrl(endpoint);

  try {
    await waitForAuthReady();
  } catch {
    // proceed anyway — let the API return 401
  }

  const token = getStoredToken();

  const headers = new Headers(options.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const fetchOptions = { ...options, headers };

  if (fetchOptions.body && typeof fetchOptions.body === 'object' && !(fetchOptions.body instanceof FormData)) {
    fetchOptions.body = JSON.stringify(fetchOptions.body);
  }

  return fetch(fullUrl, fetchOptions);
}

export async function handleResponse(response) {
  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const body = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const errorMessage = (isJson && body.error) || body || response.statusText;
    const error = new Error(`API Error ${response.status}: ${errorMessage}`);
    error.status = response.status;
    error.body = body;
    throw error;
  }

  return body;
}

export default { getAccessToken, getCurrentUser, authenticatedFetch, handleResponse };
