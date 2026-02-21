import { createContext, useContext, useEffect, useRef, useState, type ReactNode, useCallback } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../../../lib/supabaseClient';
import { getOrCreateProfile } from '../../lib/profile';

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
    isMountedRef.current = true;

    /**
     * Step 1 — eagerly resolve the session that is already stored in the
     * browser (localStorage / cookie).  This is the only code path that is
     * allowed to keep isLoading=true for an extended period.
     */
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await withTimeout(
          supabase.auth.getSession(),
          AUTH_TIMEOUT_MS,
          'Session retrieval'
        );

        if (error) {
          console.error('Error getting session:', error);
          if (isMountedRef.current) setUser(null);
          return;
        }

        await resolveAuthState(session?.user ?? null);
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (isMountedRef.current) setUser(null);
      } finally {
        if (isMountedRef.current) {
          // First boot is done — drop the initial-load flag first so that any
          // subsequent auth event never re-enables it.
          setIsInitialLoad(false);
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    /**
     * Step 2 — subscribe to subsequent auth events.
     *
     * Loading-screen decision matrix
     * ─────────────────────────────────────────────────────────────────────────
     * Event              userRef.current   Action
     * ─────────────────────────────────────────────────────────────────────────
     * TOKEN_REFRESHED    non-null          → early return (token-only refresh)
     * TOKEN_REFRESHED    null              → silent resolveAuthState
     * INITIAL_SESSION    any               → silent resolveAuthState
     * USER_UPDATED       any               → silent resolveAuthState
     * SIGNED_IN          non-null          → silent resolveAuthState
     *                                        (cross-tab sync / re-establishment)
     * SIGNED_IN          null              → full loading cycle (first login)
     * SIGNED_OUT         any               → full loading cycle (logout)
     * ─────────────────────────────────────────────────────────────────────────
     */
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMountedRef.current) return;

        // ── Fully silent events ───────────────────────────────────────────────
        if (SILENT_EVENTS.has(event)) {
          // TOKEN_REFRESHED only updates the JWT; if the user object is already
          // populated there is no need to re-fetch the profile at all.
          if (event === 'TOKEN_REFRESHED' && userRef.current !== null) return;

          await resolveAuthState(session?.user ?? null, /* isSilent */ true);
          return;
        }

        // ── SIGNED_IN with an existing user ───────────────────────────────────
        // Supabase fires SIGNED_IN not only on an explicit login, but also when:
        //   • the user switches back to a tab and the SDK re-establishes the
        //     session after a background refresh,
        //   • another tab completes a login (cross-tab storage event).
        // In those cases the user is already authenticated; showing the loading
        // screen would cause a jarring flicker.  We update state silently instead.
        if (event === 'SIGNED_IN' && userRef.current !== null) {
          await resolveAuthState(session?.user ?? null, /* isSilent */ true);
          return;
        }

        // ── SIGNED_IN (first login) and SIGNED_OUT ────────────────────────────
        // These are genuine auth transitions that warrant a loading indicator.
        setIsLoading(true);
        await resolveAuthState(session?.user ?? null, /* isSilent */ false);
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    );

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [resolveAuthState]);

  // ── Explicit auth actions ─────────────────────────────────────────────────
  // These are always initiated by the user pressing a button, so a loading
  // indicator is appropriate.  The subsequent onAuthStateChange event (SIGNED_IN
  // or SIGNED_OUT) will clear the loading state.

  const login = async (email: string, password: string) => {
    let succeeded = false;
    setIsLoading(true);
    try {
      const { error } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        AUTH_TIMEOUT_MS,
        'Login'
      );
      if (error) throw error;
      succeeded = true;
    } catch (error) {
      if (isFetchFailure(error)) {
        throw new Error('Cannot reach Supabase. Check VITE_SUPABASE_URL and network connectivity.');
      }
      throw error;
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
      const { data, error } = await withTimeout(
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
    } catch (error) {
      if (isFetchFailure(error)) {
        throw new Error('Cannot reach Supabase. Check VITE_SUPABASE_URL and network connectivity.');
      }
      throw error;
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
      const { error } = await withTimeout(supabase.auth.signOut(), AUTH_TIMEOUT_MS, 'Logout');
      if (error) throw error;
      succeeded = true;
    } finally {
      // The SIGNED_OUT event clears loading on success.
      if (!succeeded && isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

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
