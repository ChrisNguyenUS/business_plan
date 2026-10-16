import type { SupabaseClient } from '@supabase/supabase-js'
import type { NewJobInput, StepPatch } from './validation'
import type {
  ClientBrief,
  JobDetail,
  JobListRow,
  JobStepRow,
  JobTemplateSummary,
  Result,
} from './types'

/**
 * Database access for jobs. Every function takes the Supabase client as an
 * argument, so the Next.js server actions stay thin and this file can be
 * tested with a stand-in client.
 */
export type Db = Pick<SupabaseClient, 'from' | 'rpc'>

export const JOBS_LIST_LIMIT = 50

const STEP_COLUMNS =
  'id, job_id, position, title_en, title_vi, description_en, description_vi, owner, client_visible, status, client_note, internal_note, started_at, completed_at, updated_at'

const JOB_LIST_COLUMNS =
  'id, service_type, description, status, fee, deadline, template_key, updated_at, client:clients(id, first_name, last_name), steps:job_steps(status)'

const JOB_DETAIL_COLUMNS = `id, service_type, description, status, fee, deadline, notes, template_key, created_at, updated_at, client:clients(id, first_name, last_name), steps:job_steps(${STEP_COLUMNS})`

/** PostgREST may return numeric columns as numbers or strings; the UI wants a number. */
function withNumericFee<T extends { fee: unknown }>(row: T): Omit<T, 'fee'> & { fee: number } {
  return { ...row, fee: Number(row.fee) }
}

/** Most recently touched first. Pass clientId to see one client's jobs. */
export async function listJobs(
  db: Db,
  opts: { clientId?: string; limit?: number } = {}
): Promise<JobListRow[]> {
  let query = db
    .from('jobs')
    .select(JOB_LIST_COLUMNS)
    .order('updated_at', { ascending: false })
    .limit(opts.limit ?? JOBS_LIST_LIMIT)
  if (opts.clientId) query = query.eq('client_id', opts.clientId)

  const { data, error } = await query
  // Throw rather than return []: an RLS-filtered result and a genuinely empty
  // list look the same, and that ambiguity is what makes this hard to debug.
  if (error) throw error
  return ((data ?? []) as unknown as Array<JobListRow & { fee: unknown }>).map(
    (row) => withNumericFee(row) as JobListRow
  )
}

/** One job with its steps in order, or null when the id does not exist or RLS hides it. */
export async function findJob(db: Db, id: string): Promise<JobDetail | null> {
  const { data, error } = await db
    .from('jobs')
    .select(JOB_DETAIL_COLUMNS)
    .eq('id', id)
    .order('position', { referencedTable: 'job_steps', ascending: true })
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return withNumericFee(data as unknown as JobDetail & { fee: unknown }) as JobDetail
}

type TemplateRow = Omit<JobTemplateSummary, 'step_count'> & {
  steps: Array<{ count: number }> | null
}

/** PostgREST returns an embedded count as [{ count: n }]. */
export function toJobTemplateSummary(row: TemplateRow): JobTemplateSummary {
  const { steps, ...rest } = row
  return { ...rest, step_count: steps?.[0]?.count ?? 0 }
}

export async function listJobTemplates(db: Db): Promise<JobTemplateSummary[]> {
  const { data, error } = await db
    .from('job_templates')
    .select(
      'key, service_type, title_en, title_vi, description_en, description_vi, steps:job_template_steps(count)'
    )
    .eq('active', true)
    .order('title_en', { ascending: true })
  if (error) throw error
  return ((data ?? []) as unknown as TemplateRow[]).map(toJobTemplateSummary)
}

export async function findClientBrief(db: Db, id: string): Promise<ClientBrief | null> {
  const { data, error } = await db
    .from('clients')
    .select('id, first_name, last_name')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return (data as ClientBrief | null) ?? null
}

/** Creates the job and copies the template's steps in one transaction (a SQL function). */
export async function createJobFromTemplateRpc(
  db: Db,
  input: NewJobInput
): Promise<Result<{ id: string }>> {
  const { data, error } = await db.rpc('create_job_from_template', {
    p_client_id: input.clientId,
    p_template_key: input.templateKey,
    p_fee: input.fee,
    p_deadline: input.deadline,
    p_notes: input.notes,
  })
  if (error) {
    if (error.code === 'P0002') {
      return { ok: false, error: 'That service template is not available.' }
    }
    return { ok: false, error: `Could not create the job: ${error.message}` }
  }
  return { ok: true, value: { id: data as string } }
}

export async function updateStep(
  db: Db,
  stepId: string,
  patch: StepPatch
): Promise<Result<JobStepRow>> {
  const { data, error } = await db
    .from('job_steps')
    .update(patch)
    .eq('id', stepId)
    .select(STEP_COLUMNS)
    .single()
  if (error) {
    // PGRST116: no row came back, because the step is gone or RLS hides it.
    if (error.code === 'PGRST116') {
      return { ok: false, error: 'That step no longer exists, or you do not have access to it.' }
    }
    return { ok: false, error: `Could not save the step: ${error.message}` }
  }
  return { ok: true, value: data as unknown as JobStepRow }
}
