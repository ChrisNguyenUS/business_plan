// Pure aggregation for the lead detail dashboard: KPI totals, a 30-day chart,
// and a day-grouped timeline. No I/O — the page fetches rows, this shapes them.

import type { TimelineRow } from '@/lib/n400/leads-shape'

/** Leads are worked from Texas; bucketing by UTC would split one evening's
 *  study session across two days. */
export const LEAD_TIME_ZONE = 'America/Chicago'

export const CHART_DAYS = 30

const DAY_FORMAT = new Intl.DateTimeFormat('en-CA', {
  timeZone: LEAD_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** 'YYYY-MM-DD' of an instant in LEAD_TIME_ZONE. */
export function dayKey(value: string | Date): string {
  return DAY_FORMAT.format(typeof value === 'string' ? new Date(value) : value)
}

function shiftDay(key: string, delta: number): string {
  const d = new Date(`${key}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

function num(payload: Record<string, unknown>, key: string): number {
  const v = payload?.[key]
  return typeof v === 'number' ? v : 0
}

const isLearning = (e: TimelineRow) =>
  e.event_type === 'practice_completed' || e.event_type === 'mock_completed'

/** Questions an event put in front of the learner: 1 per practice row, the
 *  whole test for a mock. */
function questionsIn(e: TimelineRow): number {
  if (e.event_type === 'practice_completed') return 1
  if (e.event_type === 'mock_completed') return num(e.payload, 'total')
  return 0
}

export interface ActivitySummary {
  practiced: number
  practiceCorrect: number
  /** null when nothing has been practiced — 0% would read as "all wrong". */
  accuracyPct: number | null
  mocksTaken: number
  mocksPassed: number
  /** Distinct study days inside the chart window. */
  activeDays: number
  lastActiveAt: string | null
  /** CHART_DAYS buckets ending today, oldest first. */
  daily: { day: string; questions: number }[]
}

export function summarizeActivity(events: TimelineRow[], now: Date = new Date()): ActivitySummary {
  const today = dayKey(now)
  const daily = Array.from({ length: CHART_DAYS }, (_, i) => ({
    day: shiftDay(today, i - (CHART_DAYS - 1)),
    questions: 0,
  }))
  const byDay = new Map(daily.map((b) => [b.day, b]))

  let practiced = 0
  let practiceCorrect = 0
  let mocksTaken = 0
  let mocksPassed = 0
  let lastActiveAt: string | null = null
  const activeDays = new Set<string>()

  for (const e of events) {
    if (!isLearning(e)) continue
    if (e.event_type === 'practice_completed') {
      practiced += 1
      if (num(e.payload, 'score') > 0) practiceCorrect += 1
    } else {
      mocksTaken += 1
      if (e.payload?.['passed'] === true) mocksPassed += 1
    }
    if (lastActiveAt === null || e.created_at > lastActiveAt) lastActiveAt = e.created_at

    const bucket = byDay.get(dayKey(e.created_at))
    if (bucket) {
      bucket.questions += questionsIn(e)
      activeDays.add(bucket.day)
    }
  }

  return {
    practiced,
    practiceCorrect,
    accuracyPct: practiced > 0 ? Math.round((practiceCorrect / practiced) * 100) : null,
    mocksTaken,
    mocksPassed,
    activeDays: activeDays.size,
    lastActiveAt,
    daily,
  }
}

export type ActivityItem =
  | {
      kind: 'practice'
      id: string
      count: number
      correct: number
      startAt: string
      endAt: string
    }
  | { kind: 'event'; event: TimelineRow }

export interface ActivityDay {
  day: string
  items: ActivityItem[]
}

/**
 * Group newest-first rows by day, collapsing each unbroken run of practice
 * questions into one item. Any other event ends the run, so the item order
 * still tells the true story (practice → CTA shown → more practice).
 */
export function groupTimeline(events: TimelineRow[]): ActivityDay[] {
  const days: ActivityDay[] = []
  for (const e of events) {
    const key = dayKey(e.created_at)
    let day = days[days.length - 1]
    if (!day || day.day !== key) {
      day = { day: key, items: [] }
      days.push(day)
    }

    if (e.event_type !== 'practice_completed') {
      day.items.push({ kind: 'event', event: e })
      continue
    }

    const correct = num(e.payload, 'score') > 0 ? 1 : 0
    const last = day.items[day.items.length - 1]
    if (last?.kind === 'practice') {
      last.count += 1
      last.correct += correct
      // Rows arrive newest first, so each one is earlier than the run so far.
      last.startAt = e.created_at
    } else {
      day.items.push({
        kind: 'practice',
        id: e.id,
        count: 1,
        correct,
        startAt: e.created_at,
        endAt: e.created_at,
      })
    }
  }
  return days
}
