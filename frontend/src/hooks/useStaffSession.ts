'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { clearToken, readToken, writeToken } from '@/lib/tokenStore';
import type { StaffAccount } from '@/lib/types';

/**
 * Staff session for the admin panel — intentionally separate from the member
 * kiosk session so a coach signing in never disturbs whoever is scanned in.
 */
export function useStaffSession() {
  const [admin, setAdmin] = useState<StaffAccount | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    const stored = readToken('staff');
    if (!stored) {
      setIsRestoring(false);
      return;
    }

    let cancelled = false;
    api
      .me(stored)
      .then((identity) => {
        if (cancelled) return;
        if (identity.role === 'staff') {
          setAdmin(identity.admin);
          setToken(stored);
        } else {
          clearToken('staff');
        }
      })
      .catch(() => clearToken('staff'))
      .finally(() => {
        if (!cancelled) setIsRestoring(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    const result = await api.staffLogin(username, password);
    writeToken('staff', result.token);
    setToken(result.token);
    setAdmin(result.admin);
    return result.admin;
  }, []);

  const signOut = useCallback(() => {
    clearToken('staff');
    setToken(null);
    setAdmin(null);
  }, []);

  return { admin, token, isRestoring, signIn, signOut };
}
