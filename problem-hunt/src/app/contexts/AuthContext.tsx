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
      setTimeout(() => reject(new Error(`${operation} timed out after ${Math.floor(timeoutMs / 1000)}s`)), timeoutMs)
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isMountedRef = useRef(true);
  const authRunRef = useRef(0);

  const resolveAuthState = useCallback(async (supabaseUser: SupabaseUser | null) => {
    const runId = ++authRunRef.current;

    if (!supabaseUser) {
      if (isMountedRef.current && authRunRef.current === runId) {
        setUser(null);
      }
      return;
    }

    try {
      const profile = await getOrCreateProfile(supabaseUser.id);
      if (!isMountedRef.current || authRunRef.current !== runId) return;
      setUser(toAppUser(supabaseUser, profile));
    } catch (error) {
      console.error('Failed to fetch or create profile:', error);
      if (!isMountedRef.current || authRunRef.current !== runId) return;
      setUser(toAppUser(supabaseUser, null));
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    const initializeAuth = async () => {
      setIsLoading(true);
      try {
        const { data: { session }, error } = await withTimeout(
          supabase.auth.getSession(),
          AUTH_TIMEOUT_MS,
          'Session retrieval'
        );

        if (error) {
          console.error('Error getting session:', error);
          setUser(null);
          return;
        }

        await resolveAuthState(session?.user ?? null);
      } catch (error) {
        console.error('Error initializing auth:', error);
        setUser(null);
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!isMountedRef.current) return;
        setIsLoading(true);
        await resolveAuthState(session?.user ?? null);
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
            data: {
              username,
              full_name: fullName,
              user_type: userType,
            },
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
      if (!succeeded && isMountedRef.current) {
        setIsLoading(false);
      }
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
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
