import { supabase } from '../../lib/supabaseClient';

const PROFILE_QUERY_TIMEOUT_MS = 15000;

type ProfileRow = {
  user_id?: string;
  username?: string | null;
  user_type?: string | null;
  full_name?: string | null;
};

type ProfileQueryResult = {
  data: ProfileRow | null;
  error: { code?: string; message?: string } | null;
};

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${Math.floor(timeoutMs / 1000)}s`)), timeoutMs)
    ),
  ]);
}

function isMissingRowError(error: any): boolean {
  return error?.code === 'PGRST116' || /no rows/i.test(error?.message || '');
}

function isTransientProfileError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return /timed out/i.test(error.message) || /failed to fetch/i.test(error.message);
}

// Fetches the profile for the given auth uid using user_id column.
// If no profile exists (trigger may not have run yet), inserts a minimal row.
// Never throws — returns null on any unrecoverable error.
export async function getOrCreateProfile(userId: string): Promise<ProfileRow | null> {
  // 1. Try to fetch existing profile
  try {
    const { data, error } = await withTimeout(
      supabase
        .from('profiles')
        .select('user_id, username, user_type, full_name')
        .eq('user_id', userId)
        .maybeSingle() as Promise<ProfileQueryResult>,
      PROFILE_QUERY_TIMEOUT_MS,
      'Profile lookup'
    );

    if (error) {
      if (!isMissingRowError(error)) {
        const log = isTransientProfileError(error) ? console.warn : console.error;
        log('Profile fetch error:', error);
        return null;
      }
    }

    if (data) return data;
  } catch (error) {
    const log = isTransientProfileError(error) ? console.warn : console.error;
    log('Profile fetch error:', error);
    return null;
  }

  // 2. No profile found — insert a minimal row (fallback for when trigger hasn't run yet)
  try {
    const { data, error } = await withTimeout(
      supabase
        .from('profiles')
        .insert({
          user_id: userId,
          username: `user_${userId.slice(0, 8)}`,
        })
        .select('user_id, username, user_type, full_name')
        .single() as Promise<ProfileQueryResult>,
      PROFILE_QUERY_TIMEOUT_MS,
      'Profile insert'
    );

    if (error) {
      const log = isTransientProfileError(error) ? console.warn : console.error;
      log('Profile insert error:', error);
      return null;
    }

    return data;
  } catch (error) {
    const log = isTransientProfileError(error) ? console.warn : console.error;
    log('Profile insert error:', error);
    return null;
  }
}
