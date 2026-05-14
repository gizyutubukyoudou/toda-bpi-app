"use client";

import {
  createContext, useContext, useEffect, useState, useRef, type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { getUserProfile } from "@/lib/db";
import type { UserProfile } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  accessToken: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface StoredSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in?: number;
  token_type?: string;
  user: User;
}

function getStorageKey(): string {
  const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0];
  return `sb-${ref}-auth-token`;
}

// リフレッシュトークンでアクセストークンを更新
async function refreshSession(refreshToken: string): Promise<StoredSession | null> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json() as {
      access_token?: string; refresh_token?: string;
      expires_in?: number; expires_at?: number;
      token_type?: string; user?: User;
    };
    if (!data.access_token || !data.refresh_token || !data.user) return null;
    return {
      access_token:  data.access_token,
      refresh_token: data.refresh_token,
      expires_at:    data.expires_at ?? Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600),
      expires_in:    data.expires_in,
      token_type:    data.token_type,
      user:          data.user,
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,        setUser]        = useState<User | null>(null);
  const [profile,     setProfile]     = useState<UserProfile | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // トークン期限切れ5分前に自動リフレッシュをスケジュール
  function scheduleRefresh(session: StoredSession) {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    const now = Math.floor(Date.now() / 1000);
    const msUntilRefresh = Math.max(0, (session.expires_at - now - 300)) * 1000;
    refreshTimerRef.current = setTimeout(async () => {
      const next = await refreshSession(session.refresh_token);
      if (next) {
        localStorage.setItem(getStorageKey(), JSON.stringify(next));
        setAccessToken(next.access_token);
        setUser(next.user);
        scheduleRefresh(next);
      } else {
        clearSession();
      }
    }, msUntilRefresh);
  }

  function clearSession() {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    localStorage.removeItem(getStorageKey());
    setUser(null);
    setProfile(null);
    setAccessToken(null);
  }

  useEffect(() => {
    (async () => {
      const stored = localStorage.getItem(getStorageKey());
      if (!stored) { setLoading(false); return; }

      try {
        const session = JSON.parse(stored) as StoredSession;
        const now = Math.floor(Date.now() / 1000);

        let active = session;

        // 期限切れ、または5分以内に切れる場合はリフレッシュ
        if (session.expires_at <= now + 300) {
          const next = await refreshSession(session.refresh_token);
          if (!next) { setLoading(false); return; }
          localStorage.setItem(getStorageKey(), JSON.stringify(next));
          active = next;
        }

        setUser(active.user);
        setAccessToken(active.access_token);
        scheduleRefresh(active);
        const p = await getUserProfile(active.user.id);
        setProfile(p);
      } catch { /* localStorageの内容が不正な場合 */ }

      setLoading(false);
    })();

    return () => { if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signIn(email: string, password: string) {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify({ email, password }),
      }
    );
    const data = await res.json() as {
      access_token?: string; refresh_token?: string;
      expires_in?: number; expires_at?: number;
      token_type?: string; user?: User;
      error?: string; error_description?: string;
    };
    if (!res.ok || data.error) {
      throw new Error(data.error_description ?? data.error ?? "Login failed");
    }
    const session: StoredSession = {
      access_token:  data.access_token!,
      refresh_token: data.refresh_token!,
      expires_at:    data.expires_at ?? Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600),
      expires_in:    data.expires_in,
      token_type:    data.token_type,
      user:          data.user!,
    };
    localStorage.setItem(getStorageKey(), JSON.stringify(session));
    setUser(session.user);
    setAccessToken(session.access_token);
    scheduleRefresh(session);
    const p = await getUserProfile(session.user.id);
    setProfile(p);
  }

  async function signOut() {
    // サーバー側でリフレッシュトークンを無効化（全デバイス対象）
    if (accessToken) {
      fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/logout?scope=global`,
        {
          method: "POST",
          headers: {
            "apikey":        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            "Authorization": `Bearer ${accessToken}`,
          },
        }
      ).catch(() => {});
    }
    clearSession();
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, accessToken, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
