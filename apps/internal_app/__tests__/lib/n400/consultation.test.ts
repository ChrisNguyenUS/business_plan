import {
  daysSince,
  inboxTab,
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
