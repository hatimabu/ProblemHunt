function nowIso() {
  return new Date().toISOString();
}

function logAuth(event, details = {}) {
  console.info('[auth-trace]', {
    event,
    timestamp: nowIso(),
    ...details
  });
}

export function createRefreshCoordinator(refreshOperation) {
  let inFlightRefresh = null;

  return async function runRefresh(reason = 'unknown') {
    if (inFlightRefresh) {
      logAuth('token_refresh_wait', { reason });
      return inFlightRefresh;
    }

    const requestId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `req_${Math.random().toString(36).slice(2, 10)}`;

    inFlightRefresh = (async () => {
      logAuth('token_refresh_start', { requestId, reason });
      try {
        const result = await refreshOperation({ requestId, reason });
        logAuth('token_refresh_success', { requestId, reason });
        return result;
      } catch (error) {
        const message =
          typeof error === 'string' ? error : error?.message || 'unknown error';
        logAuth('token_refresh_failure', {
          requestId,
          reason,
          error: message
        });
        throw error;
      } finally {
        inFlightRefresh = null;
      }
    })();

    return inFlightRefresh;
  };
}

export async function persistSessionTokens(session, client) {
  if (!session?.access_token || !session?.refresh_token) {
    return;
  }

  const { error } = await client.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token
  });

  if (error) {
    throw error;
  }
}
