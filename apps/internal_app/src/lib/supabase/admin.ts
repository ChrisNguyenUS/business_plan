import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Service-role client — bypasses RLS. Server-only by construction: the key is
 * not NEXT_PUBLIC_, so it never reaches a browser bundle. Only the Sales-Ready
 * cron uses it; everything a person does goes through the cookie client.
 */
export function createAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}
