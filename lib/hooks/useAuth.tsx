"use client";

import {
  createContext, useContext, useEffect, useState, type ReactNode,
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

function getStorageKey(): string {
  const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0];
  return `sb-${ref}-auth-token`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,        setUser]        = useState<User | null>(null);
  const [profile,     setProfile]     = useState<UserProfile | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(getStorageKey());
    if (stored) {
      try {
        const session = JSON.parse(stored) as {
          access_token: string; refresh_token: string;
          expires_at: number; user: User;
        };
        const now = Math.floor(Date.now() / 1000);
        if (session.expires_at > now && session.user) {
          setUser(session.user);
          setAccessToken(session.access_token);
          getUserProfile(session.user.id).then((p) => {
            setProfile(p);
            setLoading(false);
          });
          return;
        }
      } catch { /* invalid session */ }
    }
    setLoading(false);
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
    const expiresAt = data.expires_at ?? Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600);
    localStorage.setItem(getStorageKey(), JSON.stringify({
      access_token:  data.access_token,
      refresh_token: data.refresh_token,
      expires_in:    data.expires_in,
      expires_at:    expiresAt,
      token_type:    data.token_type,
      user:          data.user,
    }));
  }

  async function signOut() {
    localStorage.removeItem(getStorageKey());
    setUser(null);
    setProfile(null);
    setAccessToken(null);
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
