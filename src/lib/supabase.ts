import { createClient } from "@supabase/supabase-js";
import {
  createBrowserClient as createBrowserClientSSR,
  createServerClient as createServerClientSSR,
} from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Placeholder values keep client construction cheap even before env vars are
// set; supabase-js performs no network I/O at construction time, so this only
// fails (per-request) when the app is genuinely misconfigured.
const fallbackUrl = "https://placeholder.supabase.co";
const fallbackAnonKey = "placeholder-anon-key";

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function createBrowserClient(): SupabaseClient<Database> {
  return createBrowserClientSSR<Database>(
    supabaseUrl ?? fallbackUrl,
    supabaseAnonKey ?? fallbackAnonKey,
  );
}

export async function createServerSupabase(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies();

  return createServerClientSSR<Database>(
    supabaseUrl ?? fallbackUrl,
    supabaseAnonKey ?? fallbackAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component where cookies cannot be written;
            // the Supabase middleware/proxy refreshes the session instead.
          }
        },
      },
    },
  );
}

export const supabaseAdmin: SupabaseClient<Database> | null =
  typeof window === "undefined" && isSupabaseConfigured() && supabaseServiceRoleKey
    ? createClient<Database>(supabaseUrl ?? fallbackUrl, supabaseServiceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;