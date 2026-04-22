import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Browser client (used in client components)
// Automatically handles cookie-based sessions for SSR compatibility
export const supabase: SupabaseClient = supabaseUrl
  ? createBrowserClient(supabaseUrl, supabaseAnonKey)
  : (null as unknown as SupabaseClient);

// Server client (used in API routes with elevated privileges)
export function createServerSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
