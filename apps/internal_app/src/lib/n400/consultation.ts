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

/** done-without-outcome stays open: the result still has to be recorded. */
export function inboxTab(row: { status: string; outcome: string | null }): InboxTab {
  if (row.outcome === 'follow_up') return 'follow_up'
  if (row.outcome === null && ['new', 'contacted', 'booked', 'done'].includes(row.status)) {
    return 'open'
  }
  return 'closed'
}

export function sortForTab(rows: ConsultationRow[], tab: InboxTab): ConsultationRow[] {
  const copy = [...rows]
  if (tab === 'open') return copy.sort((x, y) => y.created_at.localeCompare(x.created_at))
  if (tab === 'follow_up') return copy.sort((x, y) => x.updated_at.localeCompare(y.updated_at))
  return copy.sort((x, y) => y.updated_at.localeCompare(x.updated_at))
}

export function daysSince(iso: string, now: Date = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000))
}
