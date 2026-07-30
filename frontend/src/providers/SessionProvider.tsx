'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { clearToken, readToken, writeToken } from '@/lib/tokenStore';
import type { User } from '@/lib/types';

interface SessionContextValue {
  /** The scanned-in member, or `null` at the scan screen. */
  user: User | null;
  token: string | null;
  /** True until the stored token has been checked on first paint. */
  isRestoring: boolean;
  /** "Scan" a card: a typed name plus that member's PIN. Throws ApiError on either being wrong. */
  scanIn: (name: string, pin: string) => Promise<User>;
  scanOut: () => void;
  /** Replaces the cached member after a profile edit. */
  setUser: (user: User) => void;
  /** Re-fetches the member from the API. */
  refreshUser: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUserState] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  // Restore a session across page navigations / refreshes.
  useEffect(() => {
    const stored = readToken('member');
    if (!stored) {
      setIsRestoring(false);
      return;
    }

    let cancelled = false;
    api
      .me(stored)
      .then((identity) => {
        if (cancelled) return;
        if (identity.role === 'member') {
          setUserState(identity.user);
          setToken(stored);
        } else {
          clearToken('member');
        }
      })
      .catch(() => {
        // Expired or invalid — drop it and fall back to the scan screen.
        clearToken('member');
      })
      .finally(() => {
        if (!cancelled) setIsRestoring(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const scanIn = useCallback(async (name: string, pin: string) => {
    const result = await api.scan(name, pin);
    writeToken('member', result.token);
    setToken(result.token);
    setUserState(result.user);
    return result.user;
  }, []);

  const scanOut = useCallback(() => {
    clearToken('member');
    setToken(null);
    setUserState(null);
    router.push('/');
  }, [router]);

  const refreshUser = useCallback(async () => {
    if (!token || !user) return;
    try {
      const { user: fresh } = await api.getUser(user.id, token);
      setUserState(fresh);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) scanOut();
    }
  }, [token, user, scanOut]);

  const value = useMemo<SessionContextValue>(
    () => ({ user, token, isRestoring, scanIn, scanOut, setUser: setUserState, refreshUser }),
    [user, token, isRestoring, scanIn, scanOut, refreshUser],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used inside <SessionProvider>');
  return context;
}

/**
 * Session for pages that cannot render without a member. Redirects to the scan
 * screen once restoration finishes and no member is present.
 */
export function useRequireSession(): { user: User | null; token: string | null; isRestoring: boolean } {
  const { user, token, isRestoring } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isRestoring && !user) router.replace('/');
  }, [isRestoring, user, router]);

  return { user, token, isRestoring };
}
