import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { setAuthState } from "../../lib/auth-state";

interface User {
  id: string;
  email: string;
  username: string;
  role: "builder" | "client";
}

interface AuthContextType {
  user: User | null;
  session: { access_token: string } | null;
  accessToken: string | null;
  isLoading: boolean;
  isInitialLoad: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithToken: (token: string, apiUser: any) => void;
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

const TOKEN_KEY = "problemhunt-token";
const USER_KEY = "problemhunt-user";

function saveSession(token: string, user: User) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function loadSession(): { token: string; user: User } | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const userStr = localStorage.getItem(USER_KEY);
    if (token && userStr) {
      return { token, user: JSON.parse(userStr) };
    }
  } catch {}
  return null;
}

function apiUserToAppUser(apiUser: any): User {
  return {
    id: apiUser.id,
    email: apiUser.email,
    username: apiUser.username,
    role: apiUser.user_type === "builder" ? "builder" : "client",
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const isMountedRef = useRef(true);

  const session = accessToken ? { access_token: accessToken } : null;

  useEffect(() => {
    isMountedRef.current = true;

    const stored = loadSession();
    if (stored) {
      fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${stored.token}` },
      })
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            const appUser = apiUserToAppUser(data.user);
            if (isMountedRef.current) {
              setUser(appUser);
              setAccessToken(stored.token);
              saveSession(stored.token, appUser);
            }
          } else {
            clearSession();
          }
        })
        .catch(() => {
          if (stored) {
            setUser(stored.user);
            setAccessToken(stored.token);
          }
        })
        .finally(() => {
          if (isMountedRef.current) {
            setIsLoading(false);
            setIsInitialLoad(false);
          }
        });
    } else {
      setIsLoading(false);
      setIsInitialLoad(false);
    }

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setAuthState({ isLoading, user });
  }, [isLoading, user]);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      const appUser = apiUserToAppUser(data.user);
      saveSession(data.access_token, appUser);
      if (isMountedRef.current) {
        setUser(appUser);
        setAccessToken(data.access_token);
      }
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, []);

  const signup = useCallback(
    async (
      username: string,
      fullName: string,
      email: string,
      password: string,
      userType: "problem_poster" | "builder"
    ) => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            username,
            full_name: fullName,
            user_type: userType,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Signup failed");
        const appUser = apiUserToAppUser(data.user);
        saveSession(data.access_token, appUser);
        if (isMountedRef.current) {
          setUser(appUser);
          setAccessToken(data.access_token);
        }
      } finally {
        if (isMountedRef.current) setIsLoading(false);
      }
    },
    []
  );

  const loginWithToken = useCallback((token: string, apiUser: any) => {
    const appUser = apiUserToAppUser(apiUser);
    saveSession(token, appUser);
    if (isMountedRef.current) {
      setUser(appUser);
      setAccessToken(token);
    }
  }, []);

  const logout = useCallback(async () => {
    clearSession();
    if (isMountedRef.current) {
      setUser(null);
      setAccessToken(null);
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
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
