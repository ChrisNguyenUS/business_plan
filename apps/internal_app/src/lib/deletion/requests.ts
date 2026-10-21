import { isUuid } from '@/lib/jobs/validation'
import type { Result } from '@/lib/jobs/types'

// Rows of deletion_requests (migration 018). Pure: no Supabase here.

export const ENTITY_TYPES = ['case', 'client', 'lead'] as const
export type EntityType = (typeof ENTITY_TYPES)[number]
export type RequestStatus = 'pending' | 'approved' | 'rejected'

export interface DeletionRequestRow {
  id: string
  entity_type: EntityType
  entity_id: string
  entity_label: string
  reason: string
  status: RequestStatus
  requested_by: string | null
  decided_by: string | null
  decided_at: string | null
  decision_note: string | null
  created_at: string
}

export const REQUEST_COLUMNS =
  'id, entity_type, entity_id, entity_label, reason, status, requested_by, decided_by, decided_at, decision_note, created_at'

const TEXT_MAX = 500

export interface NewDeletionRequest {
  entityType: EntityType
  entityId: string
  reason: string
}

export function parseDeletionRequest(input: {
  entityType?: unknown
  entityId?: unknown
  reason?: unknown
}): Result<NewDeletionRequest> {
  if (!ENTITY_TYPES.includes(input.entityType as EntityType)) {
    return { ok: false, error: 'Unknown item type.' }
  }
  if (!isUuid(input.entityId)) return { ok: false, error: 'Unknown item.' }
  const reason = typeof input.reason === 'string' ? input.reason.trim() : ''
  if (!reason) return { ok: false, error: 'Say why this should be deleted.' }
  if (reason.length > TEXT_MAX) {
    return { ok: false, error: `Keep the reason under ${TEXT_MAX} characters.` }
  }
  return {
    ok: true,
    value: { entityType: input.entityType as EntityType, entityId: input.entityId, reason },
  }
}

/** Optional note an admin adds when deciding. Blank means no note. */
export function parseDecisionNote(note: unknown): Result<string | null> {
  const value = typeof note === 'string' ? note.trim() : ''
  if (!value) return { ok: true, value: null }
  if (value.length > TEXT_MAX) {
    return { ok: false, error: `Keep the note under ${TEXT_MAX} characters.` }
  }
  return { ok: true, value }
}

const ACTION_LABELS: Record<EntityType, string> = {
  case: 'Delete case',
  client: 'Delete client',
  // A lead is a live N400Ready account: approving hides it, never deletes it.
  lead: 'Hide lead',
}

export function actionLabel(type: EntityType): string {
  return ACTION_LABELS[type]
}

export function entityHref(type: EntityType, id: string): string {
  return type === 'case' ? `/cases/${id}` : type === 'client' ? `/clients/${id}` : `/leads/${id}`
}
