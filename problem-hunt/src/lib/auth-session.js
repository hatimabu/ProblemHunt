import { supabase } from '../../lib/supabaseClient';
import { createRefreshCoordinator, persistSessionTokens } from './refresh-utils';

const AUTH_REDIRECT_PATH = '/auth';
const REFRESH_SKEW_SECONDS = 30;
const AUTH_SYNC_STORAGE_KEY = 'problemhunt-auth-sync';

let authBroadcastChannel = null;

if (typeof BroadcastChannel !== 'undefined') {
  authBroadcastChannel = new BroadcastChannel('problemhunt-auth-events');
}

function nowIso() {
  return new Date().toISOString();
}

function randomId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `req_${Math.random().toString(36).slice(2, 10)}`;
}

function logAuth(event, details = {}) {
  console.info('[auth-trace]', {
    event,
    timestamp: nowIso(),
    ...details
  });
}

function readTokenPayload(accessToken) {
  if (!accessToken) return null;
  const parts = accessToken.split('.');
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function shouldRefreshSession(session) {
  if (!session?.access_token) return false;
  const payload = readTokenPayload(session.access_token);
  if (!payload?.exp) return false;
  const expiresInSeconds = payload.exp - Math.floor(Date.now() / 1000);
  return expiresInSeconds <= REFRESH_SKEW_SECONDS;
}

function extractErrorText(error) {
  if (!error) return '';
  if (typeof error === 'string') return error;
  if (typeof error.message === 'string') return error.message;
  return '';
}

function isTokenRevokedError(error) {
  const message = extractErrorText(error).toLowerCase();
  return (
    message.includes('token_revoked') ||
    message.includes('refresh token not found') ||
    message.includes('invalid refresh token') ||
    message.includes('invalid grant') ||
    message.includes('session_not_found')
  );
}

function publishTokenUpdate(meta = {}) {
  const payload = {
    type: 'TOKENS_UPDATED',
    timestamp: nowIso(),
    ...meta
  };

  if (authBroadcastChannel) {
    authBroadcastChannel.postMessage(payload);
  }

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(AUTH_SYNC_STORAGE_KEY, JSON.stringify(payload));
  }
}

export async function persistAuthSession(session, source = 'unknown', client = supabase) {
  if (!session?.access_token || !session?.refresh_token) {
    return;
  }

  await persistSessionTokens(session, client);

  publishTokenUpdate({ source });
  logAuth('token_persisted', { source });
}

export async function handleTerminalAuthFailure(reason, error) {
  logAuth('auth_terminal_failure', {
    reason,
    error: extractErrorText(error)
  });

  try {
    await supabase.auth.signOut();
  } catch (signOutError) {
    logAuth('auth_signout_failure', { error: extractErrorText(signOutError) });
  }

  if (typeof window !== 'undefined') {
    window.location.assign(AUTH_REDIRECT_PATH);
  }

  throw error instanceof Error ? error : new Error('Authentication failed');
}

const runSingleFlightRefresh = createRefreshCoordinator(async ({ requestId, reason }) => {
  const { data, error } = await supabase.auth.refreshSession();

  if (error || !data?.session) {
    throw error || new Error('No session returned from refresh');
  }

  await persistAuthSession(data.session, `refresh:${reason}:${requestId}`);
  return data.session;
});

export async function refreshAccessToken(reason = 'unknown') {
  try {
    const session = await runSingleFlightRefresh(reason);
    return session.access_token;
  } catch (error) {
    if (isTokenRevokedError(error)) {
      await handleTerminalAuthFailure('token_revoked', error);
    }
    throw error;
  }
}

export async function getValidAccessToken(options = {}) {
  const {
    requestId = randomId(),
    reason = 'api_call',
    forceRefresh = false
  } = options;

  const {
    data: { session },
    error
  } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  if (!session?.access_token) {
    return null;
  }

  if (!forceRefresh && !shouldRefreshSession(session)) {
    return session.access_token;
  }

  logAuth('token_refresh_needed', { requestId, reason });
  return refreshAccessToken(reason);
}

export function createRequestId(prefix = 'req') {
  return `${prefix}_${randomId()}`;
}

export function isAuthStatus(status) {
  return status === 401 || status === 403;
}
