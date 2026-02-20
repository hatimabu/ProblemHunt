import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
const SUPABASE_TIMEOUT_MS = 10000;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables not found. Auth features will not work. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.');
}

if (supabaseUrl && !/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(supabaseUrl)) {
  console.warn(`VITE_SUPABASE_URL does not look valid: ${supabaseUrl}`);
}

async function fetchWithTimeout(input, init = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SUPABASE_TIMEOUT_MS);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

const globalScope = globalThis;
if (!globalScope.__problemHuntSupabaseClient) {
  globalScope.__problemHuntSupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storageKey: 'problemhunt-auth',
      flowType: 'pkce',
    },
    global: {
      fetch: fetchWithTimeout,
      headers: {
        'x-app-name': 'problemhunt',
      },
    },
  });
}

export const supabase = globalScope.__problemHuntSupabaseClient;
