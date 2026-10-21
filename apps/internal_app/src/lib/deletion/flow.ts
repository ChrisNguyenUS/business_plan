import type { SupabaseClient } from '@supabase/supabase-js'
import type { Result } from '@/lib/jobs/types'
import { sendWithResend, type SendEmail } from '@/lib/jobs/mailer'
import { clientDeleteBlocker } from '@/lib/clients/delete-guard'
import { ADMIN_INBOX, buildDecisionEmail, buildRequestEmail } from './email'
import { performDeletion } from './perform'
import {
  REQUEST_COLUMNS,
  type DeletionRequestRow,
  type EntityType,
  type NewDeletionRequest,
} from './requests'

// Lifecycle of a deletion_requests row (migration 018). Takes its client and
// mailer as arguments so tests can pass fakes; actions pass deletionDeps().

export interface FlowDeps {
  supabase: SupabaseClient
  send: SendEmail
  siteUrl?: string
}

export function deletionDeps(supabase: SupabaseClient): FlowDeps {
  return { supabase, send: sendWithResend, siteUrl: process.env.NEXT_PUBLIC_SITE_URL }
}

const GONE = 'That item no longer exists.'
const HANDLED = 'This request was already handled.'

function fullName(p: { first_name?: string | null; last_name?: string | null } | null): string {
  return [p?.first_name, p?.last_name].filter(Boolean).join(' ')
}

/** The name the request keeps after the item is gone, read as the requester sees it. */
async function lookupEntityLabel(
  supabase: SupabaseClient,
  type: EntityType,
  id: string,
): Promise<Result<string>> {
  if (type === 'case') {
    const { data, error } = await supabase
      .from('cases')
      .select('id, primary_client:clients!cases_primary_client_id_fkey(first_name, last_name)')
      .eq('id', id)
      .maybeSingle()
    if (error) return { ok: false, error: error.message }
    if (!data) return { ok: false, error: GONE }
    // Many-to-one embed: an object at runtime, though the generated type says array.
    const name = fullName(
      data.primary_client as unknown as { first_name: string; last_name: string } | null,
    )
    const code = `MOS-${id.split('-')[0].toUpperCase()}`
    return { ok: true, value: (name ? `${code} (${name})` : code).slice(0, 200) }
  }
  if (type === 'client') {
    const { data, error } = await supabase
      .from('clients')
      .select('first_name, last_name')
      .eq('id', id)
      .maybeSingle()
    if (error) return { ok: false, error: error.message }
    if (!data) return { ok: false, error: GONE }
    return { ok: true, value: (fullName(data) || 'Unnamed client').slice(0, 200) }
  }
  const { data, error } = await supabase
    .from('n400_leads_view')
    .select('full_name, email')
    .eq('role', 'client')
    .eq('user_id', id)
    .maybeSingle()
  if (error) return { ok: false, error: error.message }
  if (!data) return { ok: false, error: GONE }
  const label = (data.full_name as string | null) || (data.email as string | null) || 'Unnamed lead'
  return { ok: true, value: label.slice(0, 200) }
}

async function profileOf(
  supabase: SupabaseClient,
  id: string,
): Promise<{ name: string; email: string | null }> {
  const { data } = await supabase.from('profiles').select('full_name, email').eq('id', id).maybeSingle()
  const email = (data?.email as string | null | undefined) ?? null
  return { name: (data?.full_name as string | null | undefined) || email || 'A staff member', email }
}

/** Tell the requester what was decided. Returns the email error, never throws. */
async function notifyRequester(deps: FlowDeps, row: DeletionRequestRow): Promise<string | null> {
  if (!row.requested_by) return null
  const { email } = await profileOf(deps.supabase, row.requested_by)
  if (!email) return 'The requester has no email address.'
  const sent = await deps.send({ to: email, ...buildDecisionEmail(row, deps.siteUrl) })
  if (!sent.ok) {
    console.error('[deletion-requests] decision email failed', sent.error)
    return sent.error
  }
  return null
}

export async function submitRequest(
  deps: FlowDeps,
  input: NewDeletionRequest,
): Promise<Result<{ emailError: string | null }>> {
  const { supabase } = deps
  const label = await lookupEntityLabel(supabase, input.entityType, input.entityId)
  if (!label.ok) return label

  if (input.entityType === 'client') {
    // Staff cannot read jobs (admin-only), so jobs are only checked at Approve.
    const cases = await supabase
      .from('cases')
      .select('id', { count: 'exact', head: true })
      .or(`primary_client_id.eq.${input.entityId},secondary_client_id.eq.${input.entityId}`)
    if (cases.error) return { ok: false, error: cases.error.message }
    const blocker = clientDeleteBlocker({ cases: cases.count ?? 0, jobs: 0 })
    if (blocker) return { ok: false, error: blocker }
  }
  if (input.entityType === 'lead') {
    const hidden = await supabase
      .from('hidden_leads')
      .select('user_id')
      .eq('user_id', input.entityId)
      .maybeSingle()
    if (hidden.error) return { ok: false, error: hidden.error.message }
    if (hidden.data) return { ok: false, error: 'This lead is already hidden.' }
  }

  const { data, error } = await supabase
    .from('deletion_requests')
    .insert({
      entity_type: input.entityType,
      entity_id: input.entityId,
      entity_label: label.value,
      reason: input.reason,
    })
    .select(REQUEST_COLUMNS)
    .single()
  if (error) {
    if (error.code === '23505') return { ok: false, error: 'A request for this is already pending.' }
    return { ok: false, error: error.message }
  }
  const row = data as unknown as DeletionRequestRow

  const requester = row.requested_by
    ? await profileOf(supabase, row.requested_by)
    : { name: 'A staff member', email: null }
  const sent = await deps.send({ to: ADMIN_INBOX, ...buildRequestEmail(row, requester.name, deps.siteUrl) })
  if (!sent.ok) console.error('[deletion-requests] request email failed', sent.error)
  return { ok: true, value: { emailError: sent.ok ? null : sent.error } }
}

export async function approveRequest(
  deps: FlowDeps,
  requestId: string,
  adminId: string,
): Promise<Result<{ paths: string[]; emailError: string | null }>> {
  const { supabase } = deps
  // Claim first (only while still pending) so two admins cannot both run it.
  const claim = await supabase
    .from('deletion_requests')
    .update({ status: 'approved', decided_by: adminId, decided_at: new Date().toISOString() })
    .eq('id', requestId)
    .eq('status', 'pending')
    .select(REQUEST_COLUMNS)
  if (claim.error) return { ok: false, error: claim.error.message }
  const row = ((claim.data ?? []) as unknown as DeletionRequestRow[])[0]
  if (!row) return { ok: false, error: HANDLED }

  const done = await performDeletion(supabase, row.entity_type, row.entity_id)
  if (!done.ok) {
    const back = await supabase
      .from('deletion_requests')
      .update({ status: 'pending', decided_by: null, decided_at: null })
      .eq('id', requestId)
    if (back.error) {
      console.error('[deletion-requests] un-claim failed', back.error.message)
      // The history row now says approved for something that still exists.
      return {
        ok: false,
        error: `${done.error} The request could not be reset to pending and now shows as approved although nothing was deleted; ask for it to be filed again.`,
      }
    }
    return done
  }

  const emailError = await notifyRequester(deps, row)
  return { ok: true, value: { paths: [...done.value, '/deletion-requests'], emailError } }
}

export async function rejectRequest(
  deps: FlowDeps,
  requestId: string,
  adminId: string,
  note: string | null,
): Promise<Result<{ emailError: string | null }>> {
  const { data, error } = await deps.supabase
    .from('deletion_requests')
    .update({
      status: 'rejected',
      decided_by: adminId,
      decided_at: new Date().toISOString(),
      decision_note: note,
    })
    .eq('id', requestId)
    .eq('status', 'pending')
    .select(REQUEST_COLUMNS)
  if (error) return { ok: false, error: error.message }
  const row = ((data ?? []) as unknown as DeletionRequestRow[])[0]
  if (!row) return { ok: false, error: HANDLED }
  return { ok: true, value: { emailError: await notifyRequester(deps, row) } }
}

/**
 * After an admin deleted or hid an item directly: close any pending staff
 * request for it as approved and tell the requester. The deletion already
 * happened, so this only logs on failure.
 */
export async function closePendingFor(
  deps: FlowDeps,
  type: EntityType,
  entityId: string,
  adminId: string,
): Promise<void> {
  const { data, error } = await deps.supabase
    .from('deletion_requests')
    .update({ status: 'approved', decided_by: adminId, decided_at: new Date().toISOString() })
    .eq('entity_type', type)
    .eq('entity_id', entityId)
    .eq('status', 'pending')
    .select(REQUEST_COLUMNS)
  if (error) {
    console.error('[deletion-requests] close pending failed', error.message)
    return
  }
  for (const row of (data ?? []) as unknown as DeletionRequestRow[]) {
    await notifyRequester(deps, row)
  }
}
