'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentAdminId } from '@/lib/auth/is-admin'
import { isUuid } from '@/lib/jobs/validation'
import type { Result } from '@/lib/jobs/types'
import { approveRequest, deletionDeps, rejectRequest, submitRequest } from '@/lib/deletion/flow'
import {
  entityHref,
  parseDecisionNote,
  parseDeletionRequest,
  REQUEST_COLUMNS,
  type DeletionRequestRow,
  type EntityType,
} from '@/lib/deletion/requests'

// Thin boundary over lib/deletion/flow.ts. RLS (migration 018) decides who
// sees and changes what; the admin checks here only give readable errors.

export async function requestDeletion(input: {
  entityType: string
  entityId: string
  reason: string
}): Promise<Result<{ emailError: string | null }>> {
  const parsed = parseDeletionRequest(input)
  if (!parsed.ok) return parsed
  const result = await submitRequest(deletionDeps(await createClient()), parsed.value)
  if (result.ok) {
    revalidatePath(entityHref(parsed.value.entityType, parsed.value.entityId))
    revalidatePath('/deletion-requests')
  }
  return result
}

export async function approveDeletionRequest(
  id: string,
): Promise<Result<{ emailError: string | null }>> {
  if (!isUuid(id)) return { ok: false, error: 'Unknown request.' }
  const adminId = await getCurrentAdminId()
  if (!adminId) return { ok: false, error: 'Only an admin can approve requests.' }
  const result = await approveRequest(deletionDeps(await createClient()), id, adminId)
  if (!result.ok) {
    revalidatePath('/deletion-requests')
    return result
  }
  for (const path of result.value.paths) revalidatePath(path)
  return { ok: true, value: { emailError: result.value.emailError } }
}

export async function rejectDeletionRequest(
  id: string,
  note: string,
): Promise<Result<{ emailError: string | null }>> {
  if (!isUuid(id)) return { ok: false, error: 'Unknown request.' }
  const parsedNote = parseDecisionNote(note)
  if (!parsedNote.ok) return parsedNote
  const adminId = await getCurrentAdminId()
  if (!adminId) return { ok: false, error: 'Only an admin can reject requests.' }
  const result = await rejectRequest(deletionDeps(await createClient()), id, adminId, parsedNote.value)
  if (result.ok) revalidatePath('/deletion-requests')
  return result
}

async function namesFor(ids: (string | null)[]): Promise<Record<string, string>> {
  const unique = [...new Set(ids.filter((i): i is string => Boolean(i)))]
  if (unique.length === 0) return {}
  const supabase = await createClient()
  const { data, error } = await supabase.from('profiles').select('id, full_name, email').in('id', unique)
  if (error) throw error
  const names: Record<string, string> = {}
  for (const p of data ?? []) {
    names[p.id as string] = (p.full_name as string | null) || (p.email as string | null) || 'Unknown'
  }
  return names
}

/**
 * The pending request for one item, for the yellow banner. Staff only see
 * their own requests (RLS), so another staff member's request shows up as
 * "already pending" when they try to file a second one.
 */
export async function getPendingRequestFor(
  type: EntityType,
  id: string,
): Promise<{ requesterName: string; createdAt: string } | null> {
  if (!isUuid(id)) return null
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('deletion_requests')
    .select('requested_by, created_at')
    .eq('entity_type', type)
    .eq('entity_id', id)
    .eq('status', 'pending')
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const names = await namesFor([data.requested_by as string | null])
  return {
    requesterName: names[data.requested_by as string] ?? 'A staff member',
    createdAt: data.created_at as string,
  }
}

/** Admin: every pending request plus the 50 most recent decisions. Staff: their own (RLS). */
export async function getDeletionRequests(): Promise<{
  pending: DeletionRequestRow[]
  decided: DeletionRequestRow[]
  names: Record<string, string>
}> {
  const supabase = await createClient()
  const [pending, decided] = await Promise.all([
    supabase
      .from('deletion_requests')
      .select(REQUEST_COLUMNS)
      .eq('status', 'pending')
      .order('created_at', { ascending: true }),
    supabase
      .from('deletion_requests')
      .select(REQUEST_COLUMNS)
      .neq('status', 'pending')
      .order('decided_at', { ascending: false })
      .limit(50),
  ])
  if (pending.error) throw pending.error
  if (decided.error) throw decided.error
  const p = (pending.data ?? []) as unknown as DeletionRequestRow[]
  const d = (decided.data ?? []) as unknown as DeletionRequestRow[]
  const names = await namesFor([...p, ...d].flatMap((r) => [r.requested_by, r.decided_by]))
  return { pending: p, decided: d, names }
}

export async function getPendingDeletionCount(): Promise<number> {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from('deletion_requests')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')
  if (error) throw error
  return count ?? 0
}
