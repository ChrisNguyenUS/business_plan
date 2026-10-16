import { formatDate } from '@/lib/utils'

describe('formatDate', () => {
  // Date-only strings such as a job deadline must never go through new Date():
  // '2026-10-20' parses as UTC midnight and shows as Oct 19 in US time zones.
  it('formats a date-only string by splitting it, with no time zone shift', () => {
    expect(formatDate('2026-10-20')).toBe('10/20/2026')
    expect(formatDate('2026-01-01')).toBe('01/01/2026')
    expect(formatDate('2026-12-31')).toBe('12/31/2026')
  })

  it('returns an empty string for a missing date', () => {
    expect(formatDate(null)).toBe('')
    expect(formatDate(undefined)).toBe('')
    expect(formatDate('')).toBe('')
  })
})
