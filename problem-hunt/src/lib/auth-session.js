const TOKEN_KEY = 'problemhunt-token';

function randomId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `req_${Math.random().toString(36).slice(2, 10)}`;
}

export async function handleTerminalAuthFailure(reason, error) {
  localStorage.removeItem(TOKEN_KEY);
  if (typeof window !== 'undefined') {
    window.location.assign('/auth');
  }
  throw error instanceof Error ? error : new Error('Authentication failed');
}

export async function refreshAccessToken(reason = 'unknown') {
  return localStorage.getItem(TOKEN_KEY);
}

export async function getValidAccessToken(options = {}) {
  return localStorage.getItem(TOKEN_KEY);
}

export function createRequestId(prefix = 'req') {
  return `${prefix}_${randomId()}`;
}

export function isAuthStatus(status) {
  return status === 401 || status === 403;
}
