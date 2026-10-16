import {
  JOB_SERVICE_TYPES,
  SERVICE_LABELS,
  buildJobsHref,
  parseJobFilters,
} from '@/lib/jobs/filters'

describe('parseJobFilters', () => {
  it('accepts valid status and service', () => {
    expect(parseJobFilters({ status: 'open', service: 'business' })).toEqual({
      status: 'open',
      service: 'business',
    })
    expect(parseJobFilters({ status: 'in_progress' })).toEqual({ status: 'in_progress' })
    expect(parseJobFilters({ service: 'ai' })).toEqual({ service: 'ai' })
  })

  it('returns no filters for empty input', () => {
    expect(parseJobFilters({})).toEqual({})
  })

  it('drops unknown values', () => {
    expect(parseJobFilters({ status: 'archived', service: 'legal' })).toEqual({})
  })

  it('ignores array input', () => {
    expect(parseJobFilters({ status: ['open', 'complete'], service: ['tax'] })).toEqual({})
  })

  it('ignores empty strings', () => {
    expect(parseJobFilters({ status: '', service: '' })).toEqual({})
  })

  it('drops injection-looking strings', () => {
    expect(parseJobFilters({ status: "open'; --", service: 'tax) or (1=1' })).toEqual({})
  })

  it('keeps a valid key when the other is invalid', () => {
    expect(parseJobFilters({ status: 'nope', service: 'tax' })).toEqual({ service: 'tax' })
  })
})

describe('buildJobsHref', () => {
  it('is /jobs with no filters', () => {
    expect(buildJobsHref({})).toBe('/jobs')
  })

  it('uses a stable key order, service first', () => {
    expect(buildJobsHref({ status: 'open', service: 'business' })).toBe(
      '/jobs?service=business&status=open'
    )
  })

  it('sets only the keys that are present', () => {
    expect(buildJobsHref({ status: 'complete' })).toBe('/jobs?status=complete')
    expect(buildJobsHref({ service: 'tax' })).toBe('/jobs?service=tax')
  })

  it('round trips through parseJobFilters', () => {
    const filters = { service: 'insurance', status: 'in_progress' } as const
    const query = Object.fromEntries(new URL(buildJobsHref(filters), 'http://x').searchParams)
    expect(parseJobFilters(query)).toEqual(filters)
  })
})

describe('constants', () => {
  it('lists service types in display order with a label each', () => {
    expect(JOB_SERVICE_TYPES).toEqual(['business', 'tax', 'insurance', 'immigration', 'ai'])
    expect(JOB_SERVICE_TYPES.map((s) => SERVICE_LABELS[s])).toEqual([
      'Business',
      'Tax',
      'Insurance',
      'Immigration',
      'AI',
    ])
  })
})
