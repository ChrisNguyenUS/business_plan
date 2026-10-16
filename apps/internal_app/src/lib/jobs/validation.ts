import { STEP_STATUSES, type StepStatus } from './progress'
import type { Result } from './types'

export const MAX_FEE = 99_999_999.99 // jobs.fee is numeric(10,2)
export const MAX_NOTE_LENGTH = 5000

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TEMPLATE_KEY_RE = /^[a-z][a-z0-9_]{0,63}$/
const FEE_PLAIN_RE = /^\d+(\.\d{1,2})?$/
const FEE_GROUPED_RE = /^\d{1,3}(,\d{3})+(\.\d{1,2})?$/
const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/

/** FormData satisfies this, and so does a plain object with a get method. */
export interface FieldReader {
  get(name: string): FormDataEntryValue | null
}

export interface NewJobInput {
  clientId: string
  templateKey: string
  fee: number
  deadline: string | null
  notes: string | null
}

export interface StepPatch {
  status?: StepStatus
  client_note?: string | null
  internal_note?: string | null
}

/**
 * Guards ids that come from a URL or a form before they reach Postgres: a
 * malformed uuid makes PostgREST answer 22P02 and the page would crash.
 */
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}

/**
 * A dollar amount the way people type it: 1500, 1,500, $1,500.50. Blank is 0.
 * At most two decimals and exact thousands groups, so "1.500" (one thousand
 * five hundred in Vietnamese notation) is refused instead of silently
 * becoming $1.50.
 */
export function parseFee(raw: string): Result<number> {
  const text = raw.trim().replace(/^\$\s*/, '')
  if (text === '') return { ok: true, value: 0 }
  if (!FEE_PLAIN_RE.test(text) && !FEE_GROUPED_RE.test(text)) {
    return {
      ok: false,
      error: 'Fee must be a dollar amount with at most 2 decimals, for example 1500 or 1,500.50.',
    }
  }
  const value = Number(text.replace(/,/g, ''))
  if (value > MAX_FEE) return { ok: false, error: 'Fee is too large.' }
  return { ok: true, value }
}

/** A real calendar date as YYYY-MM-DD, or blank for no deadline. */
export function parseDeadline(raw: string): Result<string | null> {
  const text = raw.trim()
  if (text === '') return { ok: true, value: null }
  const match = DATE_ONLY_RE.exec(text)
  if (match) {
    const year = Number(match[1])
    const month = Number(match[2])
    const day = Number(match[3])
    const date = new Date(Date.UTC(year, month - 1, day))
    if (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    ) {
      return { ok: true, value: text }
    }
  }
  return { ok: false, error: 'Deadline must be a real date (YYYY-MM-DD).' }
}

function parseNote(raw: unknown, label: string): Result<string | null> {
  if (raw === null || raw === undefined) return { ok: true, value: null }
  if (typeof raw !== 'string') return { ok: false, error: `${label} must be text.` }
  const text = raw.trim()
  if (text === '') return { ok: true, value: null }
  if (text.length > MAX_NOTE_LENGTH) {
    return { ok: false, error: `${label} is too long (at most ${MAX_NOTE_LENGTH} characters).` }
  }
  return { ok: true, value: text }
}

export function parseNewJobInput(form: FieldReader): Result<NewJobInput> {
  const clientId = String(form.get('client_id') ?? '').trim()
  if (!isUuid(clientId)) return { ok: false, error: 'Choose a client.' }

  const templateKey = String(form.get('template_key') ?? '').trim()
  if (!TEMPLATE_KEY_RE.test(templateKey)) {
    return { ok: false, error: 'Choose a service template.' }
  }

  const fee = parseFee(String(form.get('fee') ?? ''))
  if (!fee.ok) return fee

  const deadline = parseDeadline(String(form.get('deadline') ?? ''))
  if (!deadline.ok) return deadline

  const notes = parseNote(String(form.get('notes') ?? ''), 'Notes')
  if (!notes.ok) return notes

  return {
    ok: true,
    value: {
      clientId,
      templateKey,
      fee: fee.value,
      deadline: deadline.value,
      notes: notes.value,
    },
  }
}

export function parseStepPatch(input: {
  status?: unknown
  client_note?: unknown
  internal_note?: unknown
}): Result<StepPatch> {
  const patch: StepPatch = {}

  if (input.status !== undefined) {
    if (
      typeof input.status !== 'string' ||
      !(STEP_STATUSES as readonly string[]).includes(input.status)
    ) {
      return { ok: false, error: 'Unknown step status.' }
    }
    patch.status = input.status as StepStatus
  }
  if (input.client_note !== undefined) {
    const note = parseNote(input.client_note, 'Client note')
    if (!note.ok) return note
    patch.client_note = note.value
  }
  if (input.internal_note !== undefined) {
    const note = parseNote(input.internal_note, 'Internal note')
    if (!note.ok) return note
    patch.internal_note = note.value
  }

  if (Object.keys(patch).length === 0) return { ok: false, error: 'Nothing to update.' }
  return { ok: true, value: patch }
}
