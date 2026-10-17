'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  createJobFromTemplateRpc,
  findClientBrief,
  findJob,
  listJobTemplates,
  listJobs,
  listNotifications,
  updateStep,
} from '@/lib/jobs/jobs-db'
import { sendWithResend } from '@/lib/jobs/mailer'
import { sendStepEmail } from '@/lib/jobs/notify'
import { parseJobFilters, type JobFilters } from '@/lib/jobs/filters'
import { isUuid, parseNewJobInput, parseStepPatch } from '@/lib/jobs/validation'
import type {
  ClientBrief,
  JobDetail,
  JobListRow,
  JobStepRow,
  JobTemplateSummary,
  NotificationRow,
  Result,
} from '@/lib/jobs/types'

// Thin Next.js boundary over src/lib/jobs/jobs-db.ts: build the Supabase
// client, validate, call, revalidate. Access is decided by RLS (admin-only).

export async function getJobs(filters: JobFilters = {}): Promise<JobListRow[]> {
  // Re-validate: a server action can be called with anything.
  return listJobs(await createClient(), { filters: parseJobFilters(filters) })
}

export async function getJobsForClient(clientId: string): Promise<JobListRow[]> {
  if (!isUuid(clientId)) return []
  return listJobs(await createClient(), { clientId })
}

/** null for an unknown or malformed id, so the page can call notFound(). */
export async function getJob(id: string): Promise<JobDetail | null> {
  if (!isUuid(id)) return null
  return findJob(await createClient(), id)
}

export async function getJobTemplates(): Promise<JobTemplateSummary[]> {
  return listJobTemplates(await createClient())
}

export async function getClientBrief(id: string): Promise<ClientBrief | null> {
  if (!isUuid(id)) return null
  return findClientBrief(await createClient(), id)
}

export async function createJobFromTemplate(formData: FormData): Promise<Result<{ id: string }>> {
  const parsed = parseNewJobInput(formData)
  if (!parsed.ok) return parsed

  const result = await createJobFromTemplateRpc(await createClient(), parsed.value)
  if (result.ok) {
    revalidatePath('/jobs')
    revalidatePath(`/clients/${parsed.value.clientId}`)
  }
  return result
}

export async function updateJobStep(
  stepId: string,
  patch: { status?: unknown; client_note?: unknown; internal_note?: unknown }
): Promise<Result<JobStepRow>> {
  if (!isUuid(stepId)) return { ok: false, error: 'Unknown step.' }
  const parsed = parseStepPatch(patch)
  if (!parsed.ok) return parsed

  const result = await updateStep(await createClient(), stepId, parsed.value)
  if (result.ok) {
    revalidatePath(`/jobs/${result.value.job_id}`)
    revalidatePath('/jobs')
  }
  return result
}

export async function getJobNotifications(jobId: string): Promise<NotificationRow[]> {
  if (!isUuid(jobId)) return []
  return listNotifications(await createClient(), jobId)
}

/**
 * Emails the client about a step that is already saved. It reads the step
 * again from the database, so it never sends what the browser only thinks it
 * saved; RLS makes that read (and so the send) admin-only.
 */
export async function emailStepUpdate(stepId: string): Promise<Result<{ to: string }>> {
  if (!isUuid(stepId)) return { ok: false, error: 'Unknown step.' }
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  const result = await sendStepEmail(supabase, sendWithResend, stepId, data.user?.id ?? null)
  // The send log changed whether or not the email went out.
  revalidatePath('/jobs/[id]', 'page')
  return result
}
