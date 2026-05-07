import { createClient } from "@supabase/supabase-js";

function getStoredAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0];
    const stored = localStorage.getItem(`sb-${ref}-auth-token`);
    return stored ? (JSON.parse(stored) as { access_token?: string }).access_token ?? null : null;
  } catch {
    return null;
  }
}

export function getSupabaseClient() {
  const token = getStoredAccessToken();
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
      auth: {
        persistSession:     false,
        autoRefreshToken:   false,
        detectSessionInUrl: false,
      },
    }
  );
}
