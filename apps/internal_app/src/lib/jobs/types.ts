import type { JobStatus, StepOwner, StepStatus } from './progress'

/** Outcome of an operation that can fail on user input or at the database. */
export type Result<T> = { ok: true; value: T } | { ok: false; error: string }

export type JobServiceType = 'immigration' | 'tax' | 'insurance' | 'ai' | 'business'

export interface ClientBrief {
  id: string
  first_name: string
  last_name: string
}

export interface JobTemplateSummary {
  key: string
  service_type: JobServiceType
  title_en: string
  title_vi: string
  description_en: string | null
  description_vi: string | null
  step_count: number
}

export interface JobStepRow {
  id: string
  job_id: string
  position: number
  title_en: string
  title_vi: string
  description_en: string | null
  description_vi: string | null
  owner: StepOwner
  client_visible: boolean
  status: StepStatus
  client_note: string | null
  internal_note: string | null
  started_at: string | null
  completed_at: string | null
  updated_at: string
}

export interface JobListRow {
  id: string
  service_type: JobServiceType
  description: string
  status: JobStatus
  fee: number
  deadline: string | null
  template_key: string | null
  updated_at: string
  client: ClientBrief | null
  steps: Array<{ status: StepStatus }>
}

export interface JobDetail {
  id: string
  service_type: JobServiceType
  description: string
  status: JobStatus
  fee: number
  deadline: string | null
  notes: string | null
  template_key: string | null
  created_at: string
  updated_at: string
  client: ClientBrief | null
  steps: JobStepRow[]
}
