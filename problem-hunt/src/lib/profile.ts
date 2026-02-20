import { supabase } from '../../lib/supabaseClient';

const PROFILE_QUERY_TIMEOUT_MS = 10000;

type ProfileRow = {
  id?: string;
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

function isMissingUserIdColumn(error: any): boolean {
  return error?.code === '42703' || /user_id/i.test(error?.message || '');
}

async function selectProfileByUserId(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await withTimeout(
    supabase.from('profiles').select('id, user_id, username, user_type, full_name').eq('user_id', userId).maybeSingle(),
    PROFILE_QUERY_TIMEOUT_MS,
    'Profile lookup (user_id)'
  );

  if (error) {
    if (isMissingRowError(error)) return null;
    throw error;
  }

  return data || null;
}

async function selectProfileById(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await withTimeout(
    supabase.from('profiles').select('id, user_id, username, user_type, full_name').eq('id', userId).maybeSingle(),
    PROFILE_QUERY_TIMEOUT_MS,
    'Profile lookup (id)'
  );

  if (error) {
    if (isMissingRowError(error)) return null;
    throw error;
  }

  return data || null;
}

export async function getOrCreateProfile(userId: string): Promise<ProfileRow | null> {
  let existingProfile: ProfileRow | null = null;

  try {
    existingProfile = await selectProfileByUserId(userId);
  } catch (error) {
    if (!isMissingUserIdColumn(error)) {
      throw error;
    }
  }

  if (!existingProfile) {
    existingProfile = await selectProfileById(userId);
  }

  if (existingProfile) {
    return existingProfile;
  }

  const defaultProfile = {
    id: userId,
    user_id: userId,
    username: `user_${userId.slice(0, 8)}`,
    full_name: '',
    user_type: 'problem_poster',
  };

  try {
    const { data, error } = await withTimeout(
      supabase.from('profiles').insert(defaultProfile).select('id, user_id, username, user_type, full_name').single(),
      PROFILE_QUERY_TIMEOUT_MS,
      'Profile insert'
    );
    if (error) throw error;
    return data;
  } catch (error) {
    if (isMissingUserIdColumn(error)) {
      const { data, error: fallbackError } = await withTimeout(
        supabase
          .from('profiles')
          .insert({
            id: userId,
            username: defaultProfile.username,
            full_name: defaultProfile.full_name,
            user_type: defaultProfile.user_type,
          })
          .select('id, username, user_type, full_name')
          .single(),
        PROFILE_QUERY_TIMEOUT_MS,
        'Profile insert fallback'
      );
      if (fallbackError) throw fallbackError;
      return data;
    }
    throw error;
  }
}
