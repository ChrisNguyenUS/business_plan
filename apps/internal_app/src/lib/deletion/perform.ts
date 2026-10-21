import type { SupabaseClient } from '@supabase/supabase-js'
import type { Result } from '@/lib/jobs/types'
import { clientDeleteBlocker } from '@/lib/clients/delete-guard'
import type { EntityType } from './requests'

// The three destructive operations. The admin's own Delete/Hide buttons and
// Approve on a staff request both run these, so the rules cannot drift.
// Each returns the paths to revalidate. RLS (009, 017) is the real gate.

/** Cascades case_forms, documents, status_history; jobs/payments/expenses keep their row. */
export async function deleteCaseRow(supabase: SupabaseClient, id: string): Promise<Result<string[]>> {
  const { data, error } = await supabase
    .from('cases')
    .delete()
    .eq('id', id)
    .select('primary_client_id, secondary_client_id')
  if (error) return { ok: false, error: error.message }
  const rows = (data ?? []) as { primary_client_id: string | null; secondary_client_id: string | null }[]
  // RLS filters a refused delete to zero rows instead of raising.
  if (rows.length === 0) return { ok: false, error: 'Case not found or not deletable.' }
  const clientIds = [rows[0].primary_client_id, rows[0].secondary_client_id].filter(
    (c): c is string => Boolean(c),
  )
  return { ok: true, value: ['/cases', `/cases/${id}`, ...clientIds.map((c) => `/clients/${c}`)] }
}

/** Blocked while the client has cases or jobs (owner decision 2026-10-20). */
export async function deleteClientRow(supabase: SupabaseClient, id: string): Promise<Result<string[]>> {
  const [cases, jobs] = await Promise.all([
    supabase
      .from('cases')
      .select('id', { count: 'exact', head: true })
      .or(`primary_client_id.eq.${id},secondary_client_id.eq.${id}`),
    supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('client_id', id),
  ])
  if (cases.error) return { ok: false, error: cases.error.message }
  if (jobs.error) return { ok: false, error: jobs.error.message }
  const blocker = clientDeleteBlocker({ cases: cases.count ?? 0, jobs: jobs.count ?? 0 })
  if (blocker) return { ok: false, error: blocker }

  // A spouse link is only a pointer, and its FK would block the delete.
  const unlink = await supabase.from('clients').update({ spouse_id: null }).eq('spouse_id', id)
  if (unlink.error) return { ok: false, error: unlink.error.message }

  const { data, error } = await supabase.from('clients').delete().eq('id', id).select('source_lead_id')
  if (error) return { ok: false, error: error.message }
  const rows = (data ?? []) as { source_lead_id: string | null }[]
  if (rows.length === 0) return { ok: false, error: 'Client not found or not deletable.' }

  const leadId = rows[0].source_lead_id
  return {
    ok: true,
    value: ['/clients', `/clients/${id}`, ...(leadId ? ['/leads', `/leads/${leadId}`] : [])],
  }
}

/** A lead is a live N400Ready account: "delete" means hide (migration 017). */
export async function hideLeadRow(supabase: SupabaseClient, userId: string): Promise<Result<string[]>> {
  const { error } = await supabase.from('hidden_leads').insert({ user_id: userId })
  // 23505: already hidden (double click, two tabs) — the outcome is the same.
  if (error && error.code !== '23505') return { ok: false, error: error.message }
  return { ok: true, value: ['/leads', `/leads/${userId}`] }
}

export function performDeletion(
  supabase: SupabaseClient,
  type: EntityType,
  id: string,
): Promise<Result<string[]>> {
  if (type === 'case') return deleteCaseRow(supabase, id)
  if (type === 'client') return deleteClientRow(supabase, id)
  return hideLeadRow(supabase, id)
}
