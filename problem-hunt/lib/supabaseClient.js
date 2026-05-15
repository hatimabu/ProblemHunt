import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
const DEFAULT_SUPABASE_TIMEOUT_MS = 20000;
const parsedTimeoutMs = Number(import.meta.env.VITE_SUPABASE_TIMEOUT_MS);
const SUPABASE_TIMEOUT_MS = Number.isFinite(parsedTimeoutMs) && parsedTimeoutMs > 0
  ? parsedTimeoutMs
  : DEFAULT_SUPABASE_TIMEOUT_MS;

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

function createMissingConfigClient() {
  const notConfiguredError = () => new Error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  const emptySubscription = { unsubscribe: () => {} };

  const rejectConfigured = () => Promise.resolve({ data: null, error: notConfiguredError() });

  const chainable = {
    eq: function () { return this; },
    neq: function () { return this; },
    gt: function () { return this; },
    gte: function () { return this; },
    lt: function () { return this; },
    lte: function () { return this; },
    like: function () { return this; },
    ilike: function () { return this; },
    is: function () { return this; },
    in: function () { return this; },
    contains: function () { return this; },
    containedBy: function () { return this; },
    rangeLt: function () { return this; },
    rangeGt: function () { return this; },
    rangeGte: function () { return this; },
    rangeLte: function () { return this; },
    rangeAdjacent: function () { return this; },
    overlaps: function () { return this; },
    textSearch: function () { return this; },
    match: function () { return this; },
    not: function () { return this; },
    or: function () { return this; },
    filter: function () { return this; },
    order: function () { return this; },
    limit: function () { return this; },
    single: function () { return this; },
    maybeSingle: function () { return this; },
    csv: function () { return this; },
    then: function (onFulfilled) {
      return Promise.resolve({ data: null, error: notConfiguredError() }).then(onFulfilled);
    },
  };

  const from = () => ({
    select: function () { return chainable; },
    insert: function () { return chainable; },
    upsert: function () { return chainable; },
    update: function () { return chainable; },
    delete: function () { return chainable; },
    ...chainable,
  });

  const storageFrom = () => ({
    upload: rejectConfigured,
    download: rejectConfigured,
    getPublicUrl: () => ({ data: { publicUrl: '' } }),
    remove: rejectConfigured,
    list: rejectConfigured,
    createSignedUrl: rejectConfigured,
  });

  return {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      signInWithPassword: rejectConfigured,
      signInWithOAuth: rejectConfigured,
      signUp: rejectConfigured,
      signOut: () => Promise.resolve({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: emptySubscription } }),
      refreshSession: () => Promise.resolve({ data: { session: null }, error: null }),
      updateUser: rejectConfigured,
      linkIdentity: rejectConfigured,
      resend: rejectConfigured,
      resetPasswordForEmail: rejectConfigured,
    },
    from,
    storage: { from: storageFrom },
    functions: {
      invoke: rejectConfigured,
    },
    rpc: function () { return chainable; },
  };
}

const globalScope = globalThis;
if (!globalScope.__problemHuntSupabaseClient) {
  if (supabaseUrl && supabaseAnonKey) {
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
  } else {
    globalScope.__problemHuntSupabaseClient = createMissingConfigClient();
  }
}

export const supabase = globalScope.__problemHuntSupabaseClient;
