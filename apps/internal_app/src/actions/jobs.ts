'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  createJobFromTemplateRpc,
  findClientBrief,
  findJob,
  listJobTemplates,
  listJobs,
  updateStep,
} from '@/lib/jobs/jobs-db'
import { isUuid, parseNewJobInput, parseStepPatch } from '@/lib/jobs/validation'
import type {
  ClientBrief,
  JobDetail,
  JobListRow,
  JobStepRow,
  JobTemplateSummary,
  Result,
} from '@/lib/jobs/types'

// Thin Next.js boundary over src/lib/jobs/jobs-db.ts: build the Supabase
// client, validate, call, revalidate. Access is decided by RLS (admin-only).

export async function getJobs(): Promise<JobListRow[]> {
  return listJobs(await createClient())
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
