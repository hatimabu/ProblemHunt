import { supabase } from '../../../lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';

/**
 * Get the current session with timeout handling to prevent AbortErrors
 * @param timeoutMs - Timeout in milliseconds (default: 8000ms)
 * @returns Session data or null if timeout/error occurs
 */
export async function getSessionWithTimeout(timeoutMs: number = 8000): Promise<{
  session: Session | null;
  error: Error | null;
}> {
  try {
    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Session retrieval timeout')), timeoutMs);
    });

    // Race between getSession and timeout
    const { data: { session }, error } = await Promise.race([
      supabase.auth.getSession(),
      timeoutPromise
    ]).catch((err) => {
      // Handle AbortError and timeout errors gracefully
      if (err.name === 'AbortError') {
        console.warn('Session retrieval aborted, returning null session');
        return { data: { session: null }, error: null };
      }
      if (err.message === 'Session retrieval timeout') {
        console.warn('Session retrieval timed out, returning null session');
        return { data: { session: null }, error: null };
      }
      throw err;
    });

    if (error) {
      console.error('Error getting session:', error);
      return { session: null, error };
    }

    return { session, error: null };
  } catch (error) {
    console.error('Unexpected error in getSessionWithTimeout:', error);
    return { 
      session: null, 
      error: error instanceof Error ? error : new Error('Unknown error') 
    };
  }
}

/**
 * Set session with timeout handling
 * @param accessToken - Access token from auth provider
 * @param refreshToken - Refresh token from auth provider
 * @param timeoutMs - Timeout in milliseconds (default: 8000ms)
 * @returns Session data or null if timeout/error occurs
 */
export async function setSessionWithTimeout(
  accessToken: string, 
  refreshToken: string,
  timeoutMs: number = 8000
): Promise<{
  session: Session | null;
  error: Error | null;
}> {
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Session set timeout')), timeoutMs);
    });

    const { data: { session }, error } = await Promise.race([
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }),
      timeoutPromise
    ]).catch((err) => {
      if (err.name === 'AbortError') {
        console.warn('Session set aborted');
        return { data: { session: null }, error: err };
      }
      if (err.message === 'Session set timeout') {
        console.warn('Session set timed out');
        return { data: { session: null }, error: err };
      }
      throw err;
    });

    if (error) {
      console.error('Error setting session:', error);
      return { session: null, error };
    }

    return { session, error: null };
  } catch (error) {
    console.error('Unexpected error in setSessionWithTimeout:', error);
    return { 
      session: null, 
      error: error instanceof Error ? error : new Error('Unknown error') 
    };
  }
}

/**
 * Check if user is authenticated with timeout protection
 * @returns Boolean indicating if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const { session } = await getSessionWithTimeout();
  return !!session?.user;
}

/**
 * Get access token with timeout protection
 * @returns Access token or null
 */
export async function getAccessToken(): Promise<string | null> {
  const { session } = await getSessionWithTimeout();
  return session?.access_token || null;
}
