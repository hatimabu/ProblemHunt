import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  AuthChangeEvent,
  User as SupabaseUser,
  Session,
} from "@supabase/supabase-js";
import { supabase } from "../../../lib/supabaseClient";
import { getOrCreateProfile } from "../../lib/profile";
import { setAuthState } from "../../lib/auth-state";

interface User {
  id: string;
  email: string;
  username: string;
  role: "builder" | "client";
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  accessToken: string | null;
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
    userType: "problem_poster" | "builder"
  ) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_TIMEOUT_MS = 15000;

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(
              `${operation} timed out after ${Math.floor(timeoutMs / 1000)}s`
            )
          ),
        timeoutMs
      )
    ),
  ]);
}

function toAppUser(supabaseUser: SupabaseUser, profile: any): User {
  const fallbackUsername =
    (supabaseUser.user_metadata?.username as string | undefined) ||
    (supabaseUser.email ? supabaseUser.email.split("@")[0] : "") ||
    `user_${supabaseUser.id.slice(0, 8)}`;

  return {
    id: supabaseUser.id,
    email: supabaseUser.email || "",
    username: profile?.username || fallbackUsername,
    role: profile?.user_type === "builder" ? "builder" : "client",
  };
}

function isFetchFailure(error: unknown): boolean {
  return error instanceof TypeError && /failed to fetch/i.test(error.message);
}

function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && /timed out/i.test(error.message);
}

function isTransientAuthError(error: unknown): boolean {
  return isTimeoutError(error) || isFetchFailure(error);
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
const SILENT_EVENTS = new Set([
  "TOKEN_REFRESHED",
  "INITIAL_SESSION",
  "USER_UPDATED",
]);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const accessToken = session?.access_token ?? null;

  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const isMountedRef = useRef(true);
  const authRunRef = useRef(0);
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
      const log = isTransientAuthError(error) ? console.warn : console.error;
      log('Failed to fetch or create profile:', error);
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
     * browser (localStorage / cookie).
     */
    const initializeAuth = async () => {
      try {
        const {
          data: { session: initialSession },
          error,
        } = await withTimeout<Awaited<ReturnType<typeof supabase.auth.getSession>>>(
          supabase.auth.getSession(),
          AUTH_TIMEOUT_MS,
          "Session retrieval"
        );

        if (error) {
          const log = isTransientAuthError(error) ? console.warn : console.error;
          log("Error getting session:", error);
          if (isMountedRef.current) {
            setSession(null);
            setUser(null);
          }
          return;
        }

        if (isMountedRef.current) {
          setSession(initialSession ?? null);
        }

        await resolveAuthState(initialSession?.user ?? null);
      } catch (error) {
        const log = isTransientAuthError(error) ? console.warn : console.error;
        log("Error initializing auth:", error);
        if (isMountedRef.current) {
          setSession(null);
          setUser(null);
        }
      } finally {
        if (isMountedRef.current) {
          setIsInitialLoad(false);
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    /**
     * Step 2 — subscribe to subsequent auth events.
     */
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, newSession: Session | null) => {
      if (!isMountedRef.current) return;

      // Always keep session in sync
      setSession(newSession ?? null);

      // ── Fully silent events ───────────────────────────────────────────────
      if (SILENT_EVENTS.has(event)) {
        // TOKEN_REFRESHED only updates the JWT; if the user object is already
        // populated there is no need to re-fetch the profile at all.
        if (event === "TOKEN_REFRESHED" && userRef.current !== null) return;

        await resolveAuthState(newSession?.user ?? null, /* isSilent */ true);
        return;
      }

      // SIGNED_IN
      if (event === "SIGNED_IN") {
        // If we already have a user, treat as silent (cross-tab sync).
        if (userRef.current) {
          await resolveAuthState(newSession?.user ?? null, true);
          return;
        }

        // First real login — show loading while we resolve profile.
        setIsLoading(true);
        await resolveAuthState(newSession?.user ?? null, false);
        if (isMountedRef.current) setIsLoading(false);
        return;
      }

      // SIGNED_OUT
      if (event === "SIGNED_OUT") {
        setIsLoading(true);
        await resolveAuthState(null, false);
        if (isMountedRef.current) setIsLoading(false);
        return;
      }
    });

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [resolveAuthState]);

  useEffect(() => {
    setAuthState({
      isLoading,
      user,
    });
  }, [isLoading, user]);

  // ── Explicit auth actions ─────────────────────────────────────────────────
  // These are always initiated by the user pressing a button, so a loading
  // indicator is appropriate. Resolve the local user state before returning so
  // protected routes do not redirect during the SIGNED_IN event race window.

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      if (data.session?.user) {
        setSession(data.session);
        await resolveAuthState(data.session.user, false);
      }

      if (isMountedRef.current) {
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Login error:", error);
      if (isMountedRef.current) {
        setIsLoading(false);
      }
      throw error;
    }
  }, [resolveAuthState]);

  const signup = useCallback(async (
    username: string,
    fullName: string,
    email: string,
    password: string,
    userType: 'problem_poster' | 'builder'
  ) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            full_name: fullName,
            user_type: userType,
          },
        },
      });
      if (error) throw error;
      if (!data.user) throw new Error('Signup failed: No user data returned');

      if (data.session?.user) {
        setSession(data.session);
        await resolveAuthState(data.session.user, false);
      }

      if (isMountedRef.current) {
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Signup error:", error);
      if (isMountedRef.current) {
        setIsLoading(false);
      }
      throw error;
    }
  }, [resolveAuthState]);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      if (isMountedRef.current) {
        userRef.current = null;
        setSession(null);
        setUser(null);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Logout error:", error);
      if (isMountedRef.current) {
        setIsLoading(false);
      }
      throw error;
    }
  }, []);

  const value: AuthContextType = {
    user,
    session,
    accessToken,
    isLoading,
    isInitialLoad,
    login,
    signup,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
