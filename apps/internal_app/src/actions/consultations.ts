'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isUuid } from '@/lib/n400/lead-prefill'
import {
  OPEN_STATUSES,
  isNoopUpdate,
  validateConsultationUpdate,
  type ConsultationRow,
} from '@/lib/n400/consultation'

const ACTIVE_LIMIT = 2000
const CLOSED_LIMIT = 500

const COLUMNS =
  'id, user_id, name, phone, preferred_time, topic, source_cta, status, outcome, outcome_note, note, created_at, updated_at'

// PostgREST filters that only decide what is fetched; the tab a row lands in
// is still decided by inboxTab() (single source of truth).
const OPEN_LIST = OPEN_STATUSES.join(',')
const ACTIVE_FILTER = `outcome.eq.follow_up,and(outcome.is.null,status.in.(${OPEN_LIST}))`
const CLOSED_FILTER = 'outcome.in.(won,lost),and(outcome.is.null,status.in.(no_show,cancelled))'

/**
 * Working set (open + follow-up, effectively uncapped) plus the 500 most
 * recently updated closed rows. The page partitions with inboxTab().
 */
export async function getConsultations(): Promise<{
  rows: ConsultationRow[]
  closedCapped: boolean
  convertedClientIds: Record<string, string>
}> {
  const supabase = await createClient()
  const [active, closed] = await Promise.all([
    supabase
      .from('n400_consultation_requests')
      .select(COLUMNS)
      .or(ACTIVE_FILTER)
      .order('created_at', { ascending: false })
      .limit(ACTIVE_LIMIT),
    supabase
      .from('n400_consultation_requests')
      .select(COLUMNS)
      .or(CLOSED_FILTER)
      .order('updated_at', { ascending: false })
      .limit(CLOSED_LIMIT),
  ])
  if (active.error) throw active.error
  if (closed.error) throw closed.error
  const closedRows = (closed.data ?? []) as unknown as ConsultationRow[]
  const byId = new Map<string, ConsultationRow>()
  for (const r of [...((active.data ?? []) as unknown as ConsultationRow[]), ...closedRows]) {
    byId.set(r.id, r)
  }
  const rows = [...byId.values()]

  const convertedClientIds: Record<string, string> = {}
  const userIds = [...new Set(rows.map((r) => r.user_id))]
  if (userIds.length > 0) {
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, source_lead_id')
      .in('source_lead_id', userIds)
    if (clientsError) throw clientsError
    for (const c of clients ?? []) {
      if (c.source_lead_id) convertedClientIds[c.source_lead_id as string] = c.id as string
    }
  }

  return { rows, closedCapped: closedRows.length === CLOSED_LIMIT, convertedClientIds }
}

const textOrNull = (v: FormDataEntryValue | null): string | null => {
  const s = typeof v === 'string' ? v.trim() : ''
  return s.length > 0 ? s : null
}

/**
 * Move one request along the pipeline. Only the five staff columns are sent;
 * the column grant (n400_40) would refuse anything else anyway.
 */
export async function updateConsultation(
  id: string,
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isUuid(id)) return { ok: false, error: 'Unknown request' }

  const checked = validateConsultationUpdate({
    status: String(formData.get('status') ?? ''),
    outcome: textOrNull(formData.get('outcome')),
  })
  if (!checked.ok) return checked

  const expected = String(formData.get('expected_updated_at') ?? '')
  const CONFLICT = 'Someone else updated this request — reload to see their changes'
  const next = {
    status: checked.value.status,
    outcome: checked.value.outcome,
    // An outcome note without an outcome is meaningless — drop it with the outcome.
    outcome_note: checked.value.outcome ? textOrNull(formData.get('outcome_note')) : null,
    note: textOrNull(formData.get('note')),
  }

  const supabase = await createClient()
  const { data: current, error: readError } = await supabase
    .from('n400_consultation_requests')
    .select('id, user_id, status, outcome, note, outcome_note, updated_at')
    .eq('id', id)
    .maybeSingle()
  if (readError) {
    console.error('[updateConsultation]', id, readError.message)
    return { ok: false, error: 'Could not save — try again' }
  }
  if (!current) return { ok: false, error: 'Request not found or not allowed' }
  if (current.updated_at !== expected) return { ok: false, error: CONFLICT }
  // Saving without edits must not reset the follow-up age.
  if (isNoopUpdate(current, next)) return { ok: true }

  const { data, error } = await supabase
    .from('n400_consultation_requests')
    .update({ ...next, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('updated_at', expected)
    .select('user_id')
    .maybeSingle()
  if (error) {
    console.error('[updateConsultation]', id, error.message)
    return { ok: false, error: 'Could not save — try again' }
  }
  if (!data) return { ok: false, error: CONFLICT }

  revalidatePath('/consultations')
  revalidatePath(`/leads/${data.user_id}`)
  return { ok: true }
}
