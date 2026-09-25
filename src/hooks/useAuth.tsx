import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { login as apiLogin, logout as apiLogout, me as apiMe } from '../api/auth';
import { disconnectEcho, getEcho } from '../realtime/echo';
import type { User } from '../types/api';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  refreshUser: () => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const userId = user?.id;
  const shouldRefreshTemporaryPermissions = user?.roles?.some((role) => role.name === 'asesor') ?? false;

  const refreshUser = useCallback(async (): Promise<User> => {
    const res = await apiMe();
    setUser(res.data);
    return res.data;
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('access_token');

    if (!token) {
      setIsLoading(false);
      return;
    }

    apiMe()
      .then((res) => setUser(res.data))
      .catch(() => localStorage.removeItem('access_token'))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!userId || !shouldRefreshTemporaryPermissions) return;

    const interval = window.setInterval(() => {
      refreshUser().catch(() => undefined);
    }, 30_000);

    return () => window.clearInterval(interval);
  }, [refreshUser, shouldRefreshTemporaryPermissions, userId]);

  useEffect(() => {
    if (userId) {
      getEcho().private(`App.Models.User.${userId}`);
    } else {
      disconnectEcho();
    }
  }, [userId]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      refreshUser,
      async login(email: string, password: string) {
        const res = await apiLogin(email, password);
        localStorage.setItem('access_token', res.data.access_token);
        setUser(res.data.user);
      },
      async logout() {
        try {
          await apiLogout();
        } finally {
          localStorage.removeItem('access_token');
          setUser(null);
        }
      },
    }),
    [user, isLoading, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
