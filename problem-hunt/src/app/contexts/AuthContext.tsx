import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import {
  createRequestId,
  handleTerminalAuthFailure,
  persistAuthSession,
  refreshAccessToken
} from '../../lib/auth-session';

interface User {
  id: string;
  email: string;
  username: string;
  role: 'builder' | 'client';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
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

function isFetchFailure(error: unknown): boolean {
  return error instanceof TypeError && /failed to fetch/i.test(error.message);
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string
): Promise<T> {
  let timerId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timerId = setTimeout(
      () =>
        reject(
          new Error(
            `${operation} timed out after ${Math.floor(timeoutMs / 1000)}s`
          )
        ),
      timeoutMs
    );
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timerId) {
      clearTimeout(timerId);
    }
  });
}

function networkHintMessage(): string {
  return 'Cannot reach Supabase. Check VITE_SUPABASE_URL, your network/firewall, or a temporary Supabase outage.';
}

function isAuthProfileError(error: { code?: string; status?: number; message?: string } | null): boolean {
  if (!error) return false;
  if (error.status === 401 || error.status === 403) return true;
  const message = (error.message || '').toLowerCase();
  return message.includes('jwt') || message.includes('token') || message.includes('auth');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isMountedRef = useRef(true);
  const loadingCountRef = useRef(0);
  const currentAuthUserIdRef = useRef<string | null>(null);
  const profileFetchInFlightRef = useRef<Map<string, Promise<void>>>(new Map());

  const beginLoading = useCallback(() => {
    loadingCountRef.current += 1;
    setIsLoading(true);
  }, []);

  const endLoading = useCallback(() => {
    loadingCountRef.current = Math.max(loadingCountRef.current - 1, 0);
    if (loadingCountRef.current === 0 && isMountedRef.current) {
      setIsLoading(false);
    }
  }, []);

  const fetchUserProfile = useCallback(async (
    supabaseUser: SupabaseUser,
    isSignup: boolean = false
  ) => {
    const existingRequest = profileFetchInFlightRef.current.get(supabaseUser.id);
    if (existingRequest) {
      return existingRequest;
    }

    const requestPromise = (async () => {
      const requestId = createRequestId('profile');
      const startedAt = new Date().toISOString();

      console.info('[auth-trace]', {
        event: 'profile_fetch_start',
        requestId,
        timestamp: startedAt,
        userId: supabaseUser.id
      });

      let authRetryAttempted = false;

      while (true) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('username, user_type')
          .eq('id', supabaseUser.id)
          .single();

        if (!error) {
          if (currentAuthUserIdRef.current !== supabaseUser.id || !isMountedRef.current) {
            return;
          }

          setUser({
            id: supabaseUser.id,
            email: supabaseUser.email || '',
            username: profile?.username || '',
            role: profile?.user_type === 'builder' ? 'builder' : 'client',
          });

          console.info('[auth-trace]', {
            event: 'profile_fetch_success',
            requestId,
            timestamp: new Date().toISOString(),
            startedAt,
            userId: supabaseUser.id
          });
          return;
        }

        if (isAuthProfileError(error) && !authRetryAttempted) {
          authRetryAttempted = true;
          try {
            await refreshAccessToken('profile_fetch_retry');
            continue;
          } catch (refreshError) {
            await handleTerminalAuthFailure('profile_refresh_failed', refreshError);
          }
        }

        console.error('Error fetching profile:', error);
        console.error('User ID:', supabaseUser.id);

        if (!isSignup) {
          console.error('This usually means the profile record is missing from the profiles table');
          await supabase.auth.signOut();
        }

        throw new Error(
          isSignup
            ? (error.message || 'Unable to fetch profile after signup')
            : 'Profile not found in database. Your account exists but the profile is missing. Please contact support or try signing up with a different email.'
        );
      }
    })();

    profileFetchInFlightRef.current.set(supabaseUser.id, requestPromise);
    try {
      await requestPromise;
    } catch (error) {
      if (!isSignup && currentAuthUserIdRef.current === supabaseUser.id && isMountedRef.current) {
        setUser(null);
      }
      throw error;
    } finally {
      profileFetchInFlightRef.current.delete(supabaseUser.id);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    const initializeAuth = async () => {
      beginLoading();
      try {
        let timedOut = false;
        const { data: { session }, error } = await withTimeout(
          supabase.auth.getSession(),
          10000,
          'Session retrieval'
        ).catch((err) => {
          if (err.name === 'AbortError' || /timed out/i.test(err.message || '')) {
            console.warn('Session retrieval timed out, using auth state listener');
            timedOut = true;
            return { data: { session: null }, error: null };
          }
          throw err;
        });

        if (timedOut) {
          // Don't reset state — the onAuthStateChange listener owns the session from here.
          // If the listener hasn't set a user yet (genuinely no session), leave user as null
          // (initial state). Do not call setUser(null) to avoid clobbering a concurrent
          // profile fetch already started by the listener.
          return;
        }

        if (error) {
          console.error('Error getting session:', error);
          currentAuthUserIdRef.current = null;
          setUser(null);
          return;
        }

        if (session?.user) {
          currentAuthUserIdRef.current = session.user.id;
          await fetchUserProfile(session.user);
        } else {
          currentAuthUserIdRef.current = null;
          setUser(null);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        currentAuthUserIdRef.current = null;
        setUser(null);
      } finally {
        endLoading();
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        if (!isMountedRef.current) {
          return;
        }

        if (event === 'SIGNED_OUT' || !session?.user) {
          currentAuthUserIdRef.current = null;
          setUser(null);
          loadingCountRef.current = 0;
          setIsLoading(false);
          return;
        }

        currentAuthUserIdRef.current = session.user.id;

        if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed successfully');
          return;
        }

        beginLoading();
        try {
          await fetchUserProfile(session.user);
        } catch (profileError) {
          console.error('Auth state profile fetch error:', profileError);
        } finally {
          endLoading();
        }
      }
    );

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [beginLoading, endLoading, fetchUserProfile]);

  const login = async (email: string, password: string) => {
    beginLoading();
    try {
      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        15000,
        'Login request'
      );

      if (error) throw error;

      if (data.session?.access_token && data.session?.refresh_token) {
        await persistAuthSession(data.session, 'login');
      }

      if (data.user) {
        currentAuthUserIdRef.current = data.user.id;
        await withTimeout(fetchUserProfile(data.user), 10000, 'Profile load');
      } else {
        currentAuthUserIdRef.current = null;
        setUser(null);
      }
    } catch (error) {
      console.error('Login error:', error);
      if (isFetchFailure(error)) {
        throw new Error(networkHintMessage());
      }
      throw error;
    } finally {
      endLoading();
    }
  };

  const signup = async (
    username: string,
    fullName: string,
    email: string,
    password: string,
    userType: 'problem_poster' | 'builder'
  ) => {
    beginLoading();
    try {
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      if (username.length < 3 || username.length > 30) {
        throw new Error('Username must be 3-30 characters long');
      }

      const { data, error } = await withTimeout(
        supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username,
              full_name: fullName,
              user_type: userType,
            },
          },
        }),
        20000,
        'Signup request'
      );

      if (error) throw error;

      if (data.user) {
        currentAuthUserIdRef.current = data.user.id;
        await new Promise((resolve) => setTimeout(resolve, 1500));

        const fetchAttempts = 3;
        let lastError: unknown;

        for (let i = 0; i < fetchAttempts; i++) {
          try {
            await withTimeout(
              fetchUserProfile(data.user, true),
              10000,
              `Profile fetch attempt ${i + 1}`
            );
            return;
          } catch (fetchError) {
            lastError = fetchError;
            console.error(
              `Profile fetch attempt ${i + 1}/${fetchAttempts} failed:`,
              fetchError
            );
            if (i < fetchAttempts - 1) {
              await new Promise((resolve) => setTimeout(resolve, 500));
            }
          }
        }

        if (lastError) {
          throw lastError;
        }
      }
    } catch (error) {
      console.error('Signup error:', error);
      if (isFetchFailure(error)) {
        throw new Error(networkHintMessage());
      }
      throw error;
    } finally {
      endLoading();
    }
  };

  const logout = async () => {
    beginLoading();
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      currentAuthUserIdRef.current = null;
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    } finally {
      endLoading();
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
