import { createClient } from '@/lib/supabase/server'

/**
 * True when the signed-in account's profile role is 'admin'. Server-only.
 *
 * Jobs are admin-only in v1 (the 2026-04-16 roles plan keeps staff out of
 * them), so pages that mention jobs use this to decide what to show staff.
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false

  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return data?.role === 'admin'
}
