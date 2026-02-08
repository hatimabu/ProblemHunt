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
  signup: (username: string, fullName: string, email: string, password: string, userType: 'problem_poster' | 'builder') => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check active session with timeout handling
    const initializeAuth = async () => {
      try {
        // Create a timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Session timeout')), 10000); // 10 second timeout
        });

        // Race between getSession and timeout
        const { data: { session }, error } = await Promise.race([
          supabase.auth.getSession(),
          timeoutPromise
        ]).catch((err) => {
          // Handle AbortError and timeout errors gracefully
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
        // Don't block the app if session retrieval fails
        setUser(null);
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes (including token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
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
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (supabaseUser: SupabaseUser) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('username, user_type')
        .eq('id', supabaseUser.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        // Profile doesn't exist or can't be fetched
        // Clear the session and force re-authentication
        await supabase.auth.signOut();
        setUser(null);
        throw new Error('Profile not found. Please sign up again.');
      }

      setUser({
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        username: profile?.username || '',
        role: profile?.user_type === 'builder' ? 'builder' : 'client',
      });
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      // Always set user to null if profile fetch fails
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        await fetchUserProfile(data.user);
      }
    } catch (error) {
      console.error('Login error:', error);
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
      // First check if username is available
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .single();

      if (existingProfile) {
        throw new Error('Username already taken');
      }

      // Sign up with Supabase Auth and pass metadata
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

      if (data.user) {
        // Create profile in database immediately
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            username: username,
            full_name: fullName,
            user_type: userType,
            bio: '',
            reputation_score: 0
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
          // If profile creation fails, delete the auth user
          await supabase.auth.signOut();
          throw new Error('Failed to create user profile. Please try again.');
        }

        // Now fetch the profile we just created
        await fetchUserProfile(data.user);
      }
    } catch (error) {
      console.error('Signup error:', error);
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
