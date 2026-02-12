import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import type { User as SupabaseUser } from '@supabase/supabase-js';

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
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(
      () =>
        reject(
          new Error(
            `${operation} timed out after ${Math.floor(timeoutMs / 1000)}s`
          )
        ),
      timeoutMs
    );
  });
  return Promise.race([promise, timeoutPromise]);
}

function networkHintMessage(): string {
  return 'Cannot reach Supabase. Check VITE_SUPABASE_URL, your network/firewall, or a temporary Supabase outage.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Session timeout')), 10000);
        });

        const { data: { session }, error } = await Promise.race([
          supabase.auth.getSession(),
          timeoutPromise
        ]).catch((err) => {
          if (err.name === 'AbortError' || err.message === 'Session timeout') {
            console.warn('Session retrieval timed out, using auth state listener');
            return { data: { session: null }, error: null };
          }
          throw err;
        });

        if (error) {
          console.error('Error getting session:', error);
          setUser(null);
          setIsLoading(false);
          return;
        }

        if (session?.user) {
          await fetchUserProfile(session.user);
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        setUser(null);
        setIsLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);

        if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed successfully');
        }

        if (event === 'SIGNED_OUT') {
          setUser(null);
          setIsLoading(false);
          return;
        }

        if (session?.user) {
          await fetchUserProfile(session.user);
        } else {
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (
    supabaseUser: SupabaseUser,
    isSignup: boolean = false
  ) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('username, user_type')
        .eq('id', supabaseUser.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        console.error('User ID:', supabaseUser.id);

        if (isSignup) {
          throw error;
        } else {
          console.error('This usually means the profile record is missing from the profiles table');
          await supabase.auth.signOut();
          setUser(null);
          throw new Error(
            'Profile not found in database. Your account exists but the profile is missing. Please contact support or try signing up with a different email.'
          );
        }
      }

      setUser({
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        username: profile?.username || '',
        role: profile?.user_type === 'builder' ? 'builder' : 'client',
      });
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      if (isSignup) {
        throw error;
      }
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        15000,
        'Login request'
      );

      if (error) throw error;

      if (data.user) {
        await withTimeout(fetchUserProfile(data.user), 10000, 'Profile load');
      }
    } catch (error) {
      console.error('Login error:', error);
      if (isFetchFailure(error)) {
        throw new Error(networkHintMessage());
      }
      throw error;
    }
  };

  const signup = async (
    username: string,
    fullName: string,
    email: string,
    password: string,
    userType: 'problem_poster' | 'builder'
  ) => {
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
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
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
