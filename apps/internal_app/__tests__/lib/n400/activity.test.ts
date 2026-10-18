import { dayKey, groupTimeline, summarizeActivity } from '@/lib/n400/activity'
import type { TimelineRow } from '@/lib/n400/leads-shape'

let seq = 0
function ev(
  event_type: TimelineRow['event_type'],
  created_at: string,
  payload: Record<string, unknown> = {},
): TimelineRow {
  seq += 1
  return { id: `e${seq}`, event_type, payload, created_at }
}

const practice = (at: string, score: number) =>
  ev('practice_completed', at, { attempt_id: 'a', score, total: 1, passed: null })

describe('dayKey', () => {
  it('buckets by Central time, not UTC', () => {
    // 03:00 UTC on Oct 16 is still the evening of Oct 15 in Texas.
    expect(dayKey('2026-10-16T03:00:00Z')).toBe('2026-10-15')
    expect(dayKey('2026-10-16T12:00:00Z')).toBe('2026-10-16')
  })
})

describe('groupTimeline', () => {
  it('collapses a run of practice questions into one item with its tally', () => {
    // Newest first, the way getLeadTimeline returns rows.
    const days = groupTimeline([
      practice('2026-10-15T10:05:00Z', 1),
      practice('2026-10-15T10:04:00Z', 0),
      practice('2026-10-15T10:03:00Z', 1),
    ])
    expect(days).toHaveLength(1)
    expect(days[0].items).toHaveLength(1)
    expect(days[0].items[0]).toMatchObject({
      kind: 'practice',
      count: 3,
      correct: 2,
      startAt: '2026-10-15T10:03:00Z',
      endAt: '2026-10-15T10:05:00Z',
    })
  })

  it('breaks a practice run at any other event so the order stays true', () => {
    const days = groupTimeline([
      practice('2026-10-15T10:06:00Z', 1),
      ev('cta_shown', '2026-10-15T10:05:00Z', { cta_id: 's6_speaking_help' }),
      practice('2026-10-15T10:04:00Z', 1),
      practice('2026-10-15T10:03:00Z', 1),
    ])
    expect(days[0].items.map((i) => i.kind)).toEqual(['practice', 'event', 'practice'])
    expect(days[0].items[2]).toMatchObject({ kind: 'practice', count: 2 })
  })

  it('starts a new day group, and a new run, at a day boundary', () => {
    const days = groupTimeline([
      practice('2026-10-15T15:00:00Z', 1),
      practice('2026-10-14T15:00:00Z', 1),
      ev('account_created', '2026-10-10T16:30:00Z'),
    ])
    expect(days.map((d) => d.day)).toEqual(['2026-10-15', '2026-10-14', '2026-10-10'])
    expect(days[0].items[0]).toMatchObject({ kind: 'practice', count: 1 })
    expect(days[1].items[0]).toMatchObject({ kind: 'practice', count: 1 })
  })

  it('returns nothing for no events', () => {
    expect(groupTimeline([])).toEqual([])
  })
})

describe('summarizeActivity', () => {
  const now = new Date('2026-10-17T18:00:00Z')

  it('counts questions, accuracy, mocks and active days', () => {
    const s = summarizeActivity(
      [
        ev('mock_completed', '2026-10-16T15:00:00Z', { score: 18, total: 20, passed: true }),
        ev('mock_completed', '2026-10-16T14:00:00Z', { score: 9, total: 20, passed: false }),
        practice('2026-10-15T10:05:00Z', 1),
        practice('2026-10-15T10:04:00Z', 0),
        ev('cta_shown', '2026-10-15T10:00:00Z'),
        ev('account_created', '2026-10-10T16:30:00Z'),
      ],
      now,
    )
    expect(s.practiced).toBe(2)
    expect(s.practiceCorrect).toBe(1)
    expect(s.accuracyPct).toBe(50)
    expect(s.mocksTaken).toBe(2)
    expect(s.mocksPassed).toBe(1)
    // Only learning days count; signing up or seeing a CTA is not studying.
    expect(s.activeDays).toBe(2)
    expect(s.lastActiveAt).toBe('2026-10-16T15:00:00Z')
  })

  it('has a null accuracy and no last-active date for a lead who never practiced', () => {
    const s = summarizeActivity([ev('account_created', '2026-10-10T16:30:00Z')], now)
    expect(s.practiced).toBe(0)
    expect(s.accuracyPct).toBeNull()
    expect(s.lastActiveAt).toBeNull()
    expect(s.activeDays).toBe(0)
  })

  it('builds 30 daily buckets ending today, oldest first', () => {
    const s = summarizeActivity(
      [
        practice('2026-10-17T15:00:00Z', 1),
        practice('2026-10-17T14:00:00Z', 1),
        ev('mock_completed', '2026-10-16T15:00:00Z', { score: 18, total: 20, passed: true }),
        // Outside the window: kept in totals, not in the chart.
        practice('2026-08-01T15:00:00Z', 1),
      ],
      now,
    )
    expect(s.daily).toHaveLength(30)
    expect(s.daily[29]).toEqual({ day: '2026-10-17', questions: 2 })
    // A mock counts every question it asked.
    expect(s.daily[28]).toEqual({ day: '2026-10-16', questions: 20 })
    expect(s.daily[0].day).toBe('2026-09-18')
    expect(s.practiced).toBe(3)
    // activeDays is scoped to the same 30-day window as the chart.
    expect(s.activeDays).toBe(2)
  })
})
