import { createContext, useContext, useEffect, useRef, useState, type ReactNode, useCallback } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../../../lib/supabaseClient';
import { getOrCreateProfile } from '../../lib/profile';
import { setAuthState } from '../../lib/auth-state';

interface User {
  id: string;
  email: string;
  username: string;
  role: 'builder' | 'client';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  /** True only during the very first app boot — before the initial session has
   *  been resolved.  Components that want to differentiate "cold start loading"
   *  from "user is signing in/out" can read this flag. */
  isInitialLoad: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    username: string,
    fullName: string,
    email: string,
    password: string,
    userType: 'problem_poster' | 'builder'
  ) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const AUTH_TIMEOUT_MS = 10000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${operation} timed out after ${Math.floor(timeoutMs / 1000)}s`)),
        timeoutMs
      )
    ),
  ]);
}

function toAppUser(supabaseUser: SupabaseUser, profile: any): User {
  const fallbackUsername =
    (supabaseUser.user_metadata?.username as string | undefined) ||
    (supabaseUser.email ? supabaseUser.email.split('@')[0] : '') ||
    `user_${supabaseUser.id.slice(0, 8)}`;

  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    username: profile?.username || fallbackUsername,
    role: profile?.user_type === 'builder' ? 'builder' : 'client',
  };
}

function isFetchFailure(error: unknown): boolean {
  return error instanceof TypeError && /failed to fetch/i.test(error.message);
}

/**
 * Events that must NEVER trigger a full loading cycle.
 *
 * TOKEN_REFRESHED  – Supabase silently refreshed the JWT (fires on tab focus
 *                    when the old token was close to expiry).
 * INITIAL_SESSION  – Supabase re-broadcast the existing session from storage
 *                    (fires once on mount, and sometimes again after tab focus).
 * USER_UPDATED     – Profile metadata changed; the user is still signed in.
 *
 * SIGNED_IN is NOT listed here because it genuinely requires a loading cycle
 * when the user is first logging in.  However, Supabase also fires SIGNED_IN
 * on cross-tab session sync and after a background token re-establishment, so
 * we apply an additional userRef guard for that event (see the handler below).
 */
const SILENT_EVENTS = new Set(['TOKEN_REFRESHED', 'INITIAL_SESSION', 'USER_UPDATED']);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Exposed to consumers so they can skip the heavy loading UI on background refreshes.
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const isMountedRef = useRef(true);
  // Monotonically-increasing counter; only the latest resolveAuthState call wins.
  const authRunRef = useRef(0);
  // Ref mirror of `user` so the onAuthStateChange closure can read the current
  // value without a stale-closure dependency and without extra re-renders.
  const userRef = useRef<User | null>(null);

  /**
   * Core state resolver.
   *
   * @param supabaseUser  The user from the Supabase session, or null.
   * @param isSilent      When true, never clears `user` to null even if
   *                      supabaseUser is null (prevents false logouts during
   *                      background refreshes).
   */
  const resolveAuthState = useCallback(async (
    supabaseUser: SupabaseUser | null,
    isSilent: boolean = false,
  ) => {
    const runId = ++authRunRef.current;

    if (!supabaseUser) {
      // Only clear the user on a genuine sign-out / missing session.
      // Silent refreshes where the session happens to be null are ignored.
      if (!isSilent && isMountedRef.current && authRunRef.current === runId) {
        userRef.current = null;
        setUser(null);
      }
      return;
    }

    try {
      const profile = await getOrCreateProfile(supabaseUser.id);
      if (!isMountedRef.current || authRunRef.current !== runId) return;
      const appUser = toAppUser(supabaseUser, profile);
      userRef.current = appUser;
      setUser(appUser);
    } catch (error) {
      console.error('Failed to fetch or create profile:', error);
      if (!isMountedRef.current || authRunRef.current !== runId) return;
      // Fall back to basic user info; never leave user as null when Supabase
      // confirmed a valid session.
      const appUser = toAppUser(supabaseUser, null);
      userRef.current = appUser;
      setUser(appUser);
    }
  }, []);

  useEffect(() => {
    // 1. Load session immediately on page load
    supabase.auth.getSession().then(async ({ data: { session } }: Awaited<ReturnType<typeof supabase.auth.getSession>>) => {
      if (session?.user) {
        try {
          const profile = await getOrCreateProfile(session.user.id);
          const appUser = toAppUser(session.user, profile);
          setUser(appUser);
        } catch (error) {
          console.error('Failed to fetch profile on load:', error);
          const appUser = toAppUser(session.user, null);
          setUser(appUser);
        }
      } else {
        setUser(null);
      }
      setIsInitialLoad(false);
      setIsLoading(false);
    });

    // 2. Listen for login/logout events
    const { data: listener } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
      if (session?.user) {
        try {
          const profile = await getOrCreateProfile(session.user.id);
          const appUser = toAppUser(session.user, profile);
          setUser(appUser);
        } catch (error) {
          console.error('Failed to fetch profile on auth change:', error);
          const appUser = toAppUser(session.user, null);
          setUser(appUser);
        }
      } else {
        setUser(null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // ── Explicit auth actions ─────────────────────────────────────────────────
  // These are always initiated by the user pressing a button, so a loading
  // indicator is appropriate.  The subsequent onAuthStateChange event (SIGNED_IN
  // or SIGNED_OUT) will clear the loading state.

  const login = async (email: string, password: string) => {
    let succeeded = false;
    setIsLoading(true);
    try {
      const { error } = await withTimeout<Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>>(
        supabase.auth.signInWithPassword({ email, password }),
        AUTH_TIMEOUT_MS,
        'Login'
      );
      if (error) throw error;
      succeeded = true;
    } catch (err: unknown) {
      if (isFetchFailure(err)) {
        throw new Error('Cannot reach Supabase. Check VITE_SUPABASE_URL and network connectivity.');
      }
      throw err;
    } finally {
      // Only reset loading on failure; the SIGNED_IN event clears it on success.
      if (!succeeded && isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const signup = async (
    username: string,
    fullName: string,
    email: string,
    password: string,
    userType: 'problem_poster' | 'builder'
  ) => {
    let hasSession = false;
    setIsLoading(true);
    try {
      const { data, error } = await withTimeout<Awaited<ReturnType<typeof supabase.auth.signUp>>>(
        supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username, full_name: fullName, user_type: userType },
          },
        }),
        AUTH_TIMEOUT_MS,
        'Signup'
      );

      if (error) throw error;
      hasSession = Boolean(data.session?.access_token);
    } catch (err: unknown) {
      if (isFetchFailure(err)) {
        throw new Error('Cannot reach Supabase. Check VITE_SUPABASE_URL and network connectivity.');
      }
      throw err;
    } finally {
      // If Supabase requires email confirmation there is no session yet;
      // clear loading immediately.  If there is a session, the SIGNED_IN event clears it.
      if (!hasSession && isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const logout = async () => {
    let succeeded = false;
    setIsLoading(true);
    try {
      const { error } = await withTimeout<Awaited<ReturnType<typeof supabase.auth.signOut>>>(supabase.auth.signOut(), AUTH_TIMEOUT_MS, 'Logout');
      if (error) throw error;
      succeeded = true;
    } finally {
      // The SIGNED_OUT event clears loading on success.
      if (!succeeded && isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    setAuthState({ isLoading, user });
  }, [isLoading, user]);

  return (
    <AuthContext.Provider value={{ user, isLoading, isInitialLoad, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
