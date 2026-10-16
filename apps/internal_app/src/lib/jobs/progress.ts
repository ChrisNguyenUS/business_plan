/**
 * Pure progress logic for templated jobs. No Supabase, no React.
 *
 * deriveJobStatus MUST mirror the job_steps_sync_job() trigger in
 * supabase/migrations/010_job_templates_and_steps.sql. Change both together.
 */

export const STEP_STATUSES = ['todo', 'in_progress', 'waiting_client', 'done', 'skipped'] as const
export type StepStatus = (typeof STEP_STATUSES)[number]

export const STEP_OWNERS = ['manna', 'client', 'third_party'] as const
export type StepOwner = (typeof STEP_OWNERS)[number]

export type JobStatus = 'open' | 'in_progress' | 'complete'

export interface ProgressStep {
  status: StepStatus
}

export interface Progress {
  done: number
  total: number
  percent: number
}

/**
 * The status a job follows from its steps, or null when it has none: a job
 * without steps keeps the status someone set by hand.
 */
export function deriveJobStatus(steps: ReadonlyArray<ProgressStep>): JobStatus | null {
  if (steps.length === 0) return null
  if (steps.every((s) => s.status === 'done' || s.status === 'skipped')) return 'complete'
  if (
    steps.some(
      (s) => s.status === 'in_progress' || s.status === 'waiting_client' || s.status === 'done'
    )
  ) {
    return 'in_progress'
  }
  return 'open'
}

/**
 * Done steps over the steps that are not skipped. floor, not round, so 199 of
 * 200 never shows 100% while a step is left; 100% means the job is complete.
 */
export function deriveProgress(steps: ReadonlyArray<ProgressStep>): Progress {
  if (steps.length === 0) return { done: 0, total: 0, percent: 0 }
  const total = steps.filter((s) => s.status !== 'skipped').length
  const done = steps.filter((s) => s.status === 'done').length
  // Every step skipped: nothing is left to do, which is what 'complete' means.
  if (total === 0) return { done: 0, total: 0, percent: 100 }
  return { done, total, percent: Math.floor((done / total) * 100) }
}

/** "3/8", or a dash for a job without steps, so it never reads "0/0". */
export function formatProgressLabel(progress: Progress, stepCount: number): string {
  if (stepCount === 0) return '—'
  if (progress.total === 0) return 'All skipped'
  return `${progress.done}/${progress.total}`
}

export const STEP_STATUS_LABELS: Record<StepStatus, { en: string; vi: string }> = {
  todo: { en: 'To do', vi: 'Chưa làm' },
  in_progress: { en: 'In progress', vi: 'Đang làm' },
  waiting_client: { en: 'Waiting on client', vi: 'Chờ khách' },
  done: { en: 'Done', vi: 'Xong' },
  skipped: { en: 'Skipped', vi: 'Bỏ qua' },
}

export const STEP_OWNER_LABELS: Record<StepOwner, { en: string; vi: string }> = {
  manna: { en: 'Manna', vi: 'Manna' },
  client: { en: 'Client', vi: 'Khách' },
  third_party: { en: 'Third party', vi: 'Bên thứ ba' },
}
