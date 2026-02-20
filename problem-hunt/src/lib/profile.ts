import { supabase } from '../../lib/supabaseClient';

const PROFILE_QUERY_TIMEOUT_MS = 10000;

type ProfileRow = {
  user_id?: string;
  username?: string | null;
  user_type?: string | null;
  full_name?: string | null;
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

// Fetches the profile for the given auth uid using user_id column.
// Returns null if the profile does not exist yet (DB trigger may not have run yet).
export async function getOrCreateProfile(userId: string): Promise<ProfileRow | null> {
  try {
    const { data, error } = await withTimeout(
      supabase
        .from('profiles')
        .select('user_id, username, user_type, full_name')
        .eq('user_id', userId)
        .maybeSingle(),
      PROFILE_QUERY_TIMEOUT_MS,
      'Profile lookup'
    );

    if (error) {
      if (isMissingRowError(error)) return null;
      throw error;
    }

    return data || null;
  } catch (error) {
    console.error('Profile fetch error:', error);
    return null;
  }
}
