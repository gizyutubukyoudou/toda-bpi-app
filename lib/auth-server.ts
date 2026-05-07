import { createClient } from "@supabase/supabase-js";

interface ServerProfile {
  id: string;
  role: string;
  work_site_name: string;
  display_name: string;
  email: string;
  company: string;
}

/**
 * Verify a user JWT by querying the profiles table via PostgREST.
 * PostgREST validates the JWT signature, so this avoids admin.auth.getUser()
 * which hangs with the new Supabase Gateway (Sb-Gateway-Version: 1).
 */
export async function verifyTokenAndGetProfile(token: string): Promise<ServerProfile | null> {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    }
  );
  const { data } = await client
    .from("profiles")
    .select("id, role, work_site_name, display_name, email, company")
    .single();
  return data as ServerProfile | null;
}
