import {
  OPEN_STATUSES,
  daysSince,
  firstTabWithRows,
  inboxTab,
  isNoopUpdate,
  updatedAgoLabel,
  sortForTab,
  topicLabel,
  validateConsultationUpdate,
  type ConsultationRow,
} from '@/lib/n400/consultation'

describe('validateConsultationUpdate', () => {
  it('accepts an outcome only when the consultation is done', () => {
    expect(validateConsultationUpdate({ status: 'done', outcome: 'won' })).toEqual({
      ok: true,
      value: { status: 'done', outcome: 'won' },
    })
  })

  it('clears the outcome when status is not done (moving back from done)', () => {
    expect(validateConsultationUpdate({ status: 'contacted', outcome: 'won' })).toEqual({
      ok: true,
      value: { status: 'contacted', outcome: null },
    })
  })

  it('treats an empty outcome as none', () => {
    expect(validateConsultationUpdate({ status: 'done', outcome: '' })).toEqual({
      ok: true,
      value: { status: 'done', outcome: null },
    })
  })

  it('rejects an unknown status or outcome', () => {
    expect(validateConsultationUpdate({ status: 'archived', outcome: null })).toEqual({
      ok: false,
      error: 'Unknown status',
    })
    expect(validateConsultationUpdate({ status: 'done', outcome: 'maybe' })).toEqual({
      ok: false,
      error: 'Unknown outcome',
    })
  })
})

describe('inboxTab', () => {
  it('puts work still to do in open — including done without an outcome', () => {
    expect(inboxTab({ status: 'new', outcome: null })).toBe('open')
    expect(inboxTab({ status: 'contacted', outcome: null })).toBe('open')
    expect(inboxTab({ status: 'booked', outcome: null })).toBe('open')
    expect(inboxTab({ status: 'done', outcome: null })).toBe('open')
  })

  it('separates follow-ups from closed', () => {
    expect(inboxTab({ status: 'done', outcome: 'follow_up' })).toBe('follow_up')
    expect(inboxTab({ status: 'done', outcome: 'won' })).toBe('closed')
    expect(inboxTab({ status: 'done', outcome: 'lost' })).toBe('closed')
    expect(inboxTab({ status: 'no_show', outcome: null })).toBe('closed')
    expect(inboxTab({ status: 'cancelled', outcome: null })).toBe('closed')
  })
})

describe('sortForTab', () => {
  const row = (id: string, created_at: string, updated_at: string): ConsultationRow => ({
    id, user_id: 'u', name: null, phone: null, preferred_time: null, topic: null, source_cta: null,
    status: 'new', outcome: null, outcome_note: null, note: null, created_at, updated_at,
  })
  const a = row('a', '2026-10-01T00:00:00Z', '2026-10-10T00:00:00Z')
  const b = row('b', '2026-10-05T00:00:00Z', '2026-10-06T00:00:00Z')

  it('open: newest request first', () => {
    expect(sortForTab([a, b], 'open').map((r) => r.id)).toEqual(['b', 'a'])
  })
  it('follow_up: longest untouched first', () => {
    expect(sortForTab([a, b], 'follow_up').map((r) => r.id)).toEqual(['b', 'a'])
  })
  it('closed: most recently closed first', () => {
    expect(sortForTab([b, a], 'closed').map((r) => r.id)).toEqual(['a', 'b'])
  })
})

describe('daysSince / topicLabel', () => {
  it('counts whole days and never goes negative', () => {
    const now = new Date('2026-10-17T12:00:00Z')
    expect(daysSince('2026-10-14T13:00:00Z', now)).toBe(2)
    expect(daysSince('2026-10-18T00:00:00Z', now)).toBe(0)
  })
  it('labels known topics and passes through unknown ones', () => {
    expect(topicLabel('document_prep')).toBe('Document prep')
    expect(topicLabel('mystery')).toBe('mystery')
    expect(topicLabel(null)).toBe('—')
  })
})

describe('F3 isNoopUpdate', () => {
  const cur = { status: 'done', outcome: 'won', note: 'hi', outcome_note: null }
  it('is true for identical values', () => {
    expect(isNoopUpdate(cur, { ...cur })).toBe(true)
  })
  it('treats whitespace-only note as null', () => {
    expect(isNoopUpdate({ ...cur, note: null }, { ...cur, note: '   ' })).toBe(true)
    expect(isNoopUpdate({ ...cur, note: ' hi ' }, cur)).toBe(true)
  })
  it('is false when any field differs', () => {
    expect(isNoopUpdate(cur, { ...cur, status: 'booked' })).toBe(false)
    expect(isNoopUpdate(cur, { ...cur, outcome: 'lost' })).toBe(false)
    expect(isNoopUpdate(cur, { ...cur, note: 'bye' })).toBe(false)
    expect(isNoopUpdate(cur, { ...cur, outcome_note: 'x' })).toBe(false)
  })
})

describe('F6 updatedAgoLabel', () => {
  it('uses natural wording', () => {
    expect(updatedAgoLabel(0)).toBe('updated today')
    expect(updatedAgoLabel(1)).toBe('updated 1 day ago')
    expect(updatedAgoLabel(5)).toBe('updated 5 days ago')
  })
})

describe('F7 firstTabWithRows', () => {
  it('picks the first non-empty tab in order, defaulting to open', () => {
    expect(firstTabWithRows({ open: 0, follow_up: 2, closed: 1 })).toBe('follow_up')
    expect(firstTabWithRows({ open: 0, follow_up: 0, closed: 3 })).toBe('closed')
    expect(firstTabWithRows({ open: 1, follow_up: 1, closed: 1 })).toBe('open')
    expect(firstTabWithRows({ open: 0, follow_up: 0, closed: 0 })).toBe('open')
  })
})

describe('F8 hygiene', () => {
  it('exports OPEN_STATUSES', () => {
    expect([...OPEN_STATUSES]).toEqual(['new', 'contacted', 'booked', 'done'])
  })
  it('daysSince is 0 for an unparseable timestamp', () => {
    expect(daysSince('not-a-date')).toBe(0)
  })
  it('sortForTab compares instants, not strings', () => {
    const mk = (id: string, created_at: string): ConsultationRow =>
      ({ id, created_at, updated_at: created_at }) as ConsultationRow
    // lexically "…+00:00" > "…Z" mis-orders the same-format check; instants must win
    const a = mk('a', '2026-10-17T10:00:00+02:00') // 08:00Z
    const b = mk('b', '2026-10-17T09:00:00Z')
    expect(sortForTab([a, b], 'open').map((r) => r.id)).toEqual(['b', 'a'])
  })
})
