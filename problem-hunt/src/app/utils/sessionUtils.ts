const TOKEN_KEY = 'problemhunt-token';

export async function getSessionWithTimeout(timeoutMs: number = 8000): Promise<{
  session: { access_token: string } | null;
  error: Error | null;
}> {
  const token = localStorage.getItem(TOKEN_KEY);
  return {
    session: token ? { access_token: token } : null,
    error: null,
  };
}

export async function setSessionWithTimeout(
  accessToken: string,
  refreshToken: string,
  timeoutMs: number = 8000
): Promise<{
  session: { access_token: string } | null;
  error: Error | null;
}> {
  return { session: { access_token: accessToken }, error: null };
}

export async function isAuthenticated(): Promise<boolean> {
  return !!localStorage.getItem(TOKEN_KEY);
}

export async function getAccessToken(): Promise<string | null> {
  return localStorage.getItem(TOKEN_KEY);
}
