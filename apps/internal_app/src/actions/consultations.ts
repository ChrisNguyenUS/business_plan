'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isUuid } from '@/lib/n400/lead-prefill'
import { validateConsultationUpdate, type ConsultationRow } from '@/lib/n400/consultation'

const INBOX_LIMIT = 500

const COLUMNS =
  'id, user_id, name, phone, preferred_time, topic, source_cta, status, outcome, outcome_note, note, created_at, updated_at'

/**
 * The most recent requests across every tab — the page partitions them with
 * inboxTab(), so the tab rules live in one (tested) place, not in SQL too.
 */
export async function getConsultations(): Promise<{
  rows: ConsultationRow[]
  capped: boolean
  convertedClientIds: Record<string, string>
}> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('n400_consultation_requests')
    .select(COLUMNS)
    .order('created_at', { ascending: false })
    .limit(INBOX_LIMIT)
  if (error) throw error
  const rows = (data ?? []) as unknown as ConsultationRow[]

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

  return { rows, capped: rows.length === INBOX_LIMIT, convertedClientIds }
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

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('n400_consultation_requests')
    .update({
      status: checked.value.status,
      outcome: checked.value.outcome,
      // An outcome note without an outcome is meaningless — drop it with the outcome.
      outcome_note: checked.value.outcome ? textOrNull(formData.get('outcome_note')) : null,
      note: textOrNull(formData.get('note')),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('user_id')
    .maybeSingle()
  if (error) return { ok: false, error: 'Could not save — try again' }
  if (!data) return { ok: false, error: 'Request not found or not allowed' }

  revalidatePath('/consultations')
  revalidatePath(`/leads/${data.user_id}`)
  return { ok: true }
}
