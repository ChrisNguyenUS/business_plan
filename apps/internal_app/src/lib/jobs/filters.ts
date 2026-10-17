import type { JobStatus } from './progress'
import type { JobServiceType } from './types'

/** Service types in the order the filter chips show them. */
export const JOB_SERVICE_TYPES: readonly JobServiceType[] = [
  'business',
  'tax',
  'insurance',
  'immigration',
  'ai',
]

export const SERVICE_LABELS: Record<JobServiceType, string> = {
  business: 'Business',
  tax: 'Tax',
  insurance: 'Insurance',
  immigration: 'Immigration',
  ai: 'AI',
}

export const JOB_STATUSES: readonly JobStatus[] = ['open', 'in_progress', 'complete']

export type JobFilters = { status?: JobStatus; service?: JobServiceType }

type RawParam = string | string[] | undefined

/**
 * Whitelist only: anything that is not exactly one known value (arrays,
 * unknown or empty strings) is dropped. Never throws.
 */
export function parseJobFilters(raw: { status?: RawParam; service?: RawParam }): JobFilters {
  const filters: JobFilters = {}
  const { status, service } = raw
  if (typeof status === 'string' && (JOB_STATUSES as readonly string[]).includes(status)) {
    filters.status = status as JobStatus
  }
  if (typeof service === 'string' && (JOB_SERVICE_TYPES as readonly string[]).includes(service)) {
    filters.service = service as JobServiceType
  }
  return filters
}

/** '/jobs' or '/jobs?service=…&status=…' (service first, only set keys). */
export function buildJobsHref(filters: JobFilters): string {
  const params = new URLSearchParams()
  if (filters.service) params.set('service', filters.service)
  if (filters.status) params.set('status', filters.status)
  const query = params.toString()
  return query ? `/jobs?${query}` : '/jobs'
}
