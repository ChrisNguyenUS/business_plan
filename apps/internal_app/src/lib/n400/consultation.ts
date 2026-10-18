// Consultation inbox rules (spec 2026-10-17-g4-consultation-inbox-design.md §4).
// Values mirror the CHECK constraints on n400_consultation_requests.

export const CONSULTATION_STATUSES = [
  'new',
  'contacted',
  'booked',
  'done',
  'no_show',
  'cancelled',
] as const
export type ConsultationStatus = (typeof CONSULTATION_STATUSES)[number]

export const CONSULTATION_OUTCOMES = ['won', 'lost', 'follow_up'] as const
export type ConsultationOutcome = (typeof CONSULTATION_OUTCOMES)[number]

export const STATUS_LABELS: Record<ConsultationStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  booked: 'Booked',
  done: 'Done',
  no_show: 'No show',
  cancelled: 'Cancelled',
}

export const OUTCOME_LABELS: Record<ConsultationOutcome, string> = {
  won: 'Won',
  lost: 'Lost',
  follow_up: 'Follow up',
}

const TOPIC_LABELS: Record<string, string> = {
  document_prep: 'Document prep',
  n400_review: 'N-400 review',
  interview_prep: 'Interview prep',
  writing: 'Writing',
  speaking: 'Speaking',
  other: 'Other',
}

export function topicLabel(topic: string | null): string {
  if (!topic) return '—'
  return TOPIC_LABELS[topic] ?? topic
}

export type InboxTab = 'open' | 'follow_up' | 'closed'
export const INBOX_TABS: readonly InboxTab[] = ['open', 'follow_up', 'closed']

export interface ConsultationRow {
  id: string
  user_id: string
  name: string | null
  phone: string | null
  preferred_time: string | null
  topic: string | null
  source_cta: string | null
  status: string
  outcome: string | null
  outcome_note: string | null
  note: string | null
  created_at: string
  updated_at: string
}

const isStatus = (v: string): v is ConsultationStatus =>
  (CONSULTATION_STATUSES as readonly string[]).includes(v)
const isOutcome = (v: string): v is ConsultationOutcome =>
  (CONSULTATION_OUTCOMES as readonly string[]).includes(v)

/**
 * Status says whether the call happened; outcome says whether it became
 * business. An outcome only exists once the call is done — moving status
 * away from done clears it rather than erroring.
 */
export function validateConsultationUpdate(input: {
  status: string
  outcome: string | null
}):
  | { ok: true; value: { status: ConsultationStatus; outcome: ConsultationOutcome | null } }
  | { ok: false; error: string } {
  if (!isStatus(input.status)) return { ok: false, error: 'Unknown status' }
  const raw = input.outcome && input.outcome.length > 0 ? input.outcome : null
  if (raw !== null && !isOutcome(raw)) return { ok: false, error: 'Unknown outcome' }
  return {
    ok: true,
    value: { status: input.status, outcome: input.status === 'done' ? raw : null },
  }
}

export const OPEN_STATUSES = ['new', 'contacted', 'booked', 'done'] as const

/** done-without-outcome stays open: the result still has to be recorded. */
export function inboxTab(row: { status: string; outcome: string | null }): InboxTab {
  if (row.outcome === 'follow_up') return 'follow_up'
  if (row.outcome === null && (OPEN_STATUSES as readonly string[]).includes(row.status)) {
    return 'open'
  }
  return 'closed'
}

const ts = (iso: string): number => {
  const n = Date.parse(iso)
  return Number.isNaN(n) ? 0 : n
}

export function sortForTab(rows: ConsultationRow[], tab: InboxTab): ConsultationRow[] {
  const copy = [...rows]
  if (tab === 'open') return copy.sort((x, y) => ts(y.created_at) - ts(x.created_at))
  if (tab === 'follow_up') return copy.sort((x, y) => ts(x.updated_at) - ts(y.updated_at))
  return copy.sort((x, y) => ts(y.updated_at) - ts(x.updated_at))
}

export function daysSince(iso: string, now: Date = new Date()): number {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return 0
  return Math.max(0, Math.floor((now.getTime() - t) / 86_400_000))
}

export function updatedAgoLabel(days: number): string {
  if (days <= 0) return 'updated today'
  return days === 1 ? 'updated 1 day ago' : `updated ${days} days ago`
}

/** Trim; empty becomes null — the same normalisation the update action applies. */
export function normalizeText(v: string | null | undefined): string | null {
  const s = (v ?? '').trim()
  return s.length > 0 ? s : null
}

interface EditableFields {
  status: string
  outcome: string | null
  note: string | null
  outcome_note: string | null
}

/** True when saving would change nothing (so updated_at / follow-up age must not move). */
export function isNoopUpdate(current: EditableFields, next: EditableFields): boolean {
  return (
    current.status === next.status &&
    (current.outcome ?? null) === (next.outcome ?? null) &&
    normalizeText(current.note) === normalizeText(next.note) &&
    normalizeText(current.outcome_note) === normalizeText(next.outcome_note)
  )
}

/** Default tab when filtering to one lead: first tab that has anything to show. */
export function firstTabWithRows(counts: Record<InboxTab, number>): InboxTab {
  return INBOX_TABS.find((t) => counts[t] > 0) ?? 'open'
}
