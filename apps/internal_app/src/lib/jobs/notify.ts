import { findJob, findStepJobId, insertNotification, type Db } from './jobs-db'
import { emailKindFor, renderProgressEmail } from './email'
import type { SendEmail } from './mailer'
import { deriveProgress, formatProgressLabel } from './progress'
import type { Result } from './types'

// A deliberately loose check: it only has to catch a typo before a send,
// the provider is the real judge.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const GONE = 'That step no longer exists, or you do not have access to it.'

/**
 * Emails the client about one step, using what the database holds now (not
 * what the browser thinks it saved). Reading the step first is also the
 * gate: RLS hides it from anyone who is not an admin, so they cannot send.
 */
export async function sendStepEmail(
  db: Db,
  send: SendEmail,
  stepId: string,
  userId: string | null
): Promise<Result<{ to: string }>> {
  const jobId = await findStepJobId(db, stepId)
  if (!jobId) return { ok: false, error: GONE }
  const job = await findJob(db, jobId)
  const step = job?.steps.find((s) => s.id === stepId)
  if (!job || !step) return { ok: false, error: GONE }

  if (!step.client_visible) return { ok: false, error: 'This step is not visible to the client.' }
  const kind = emailKindFor(step.status)
  if (!kind) {
    return { ok: false, error: 'Only a step that is done or waiting on the client can be emailed.' }
  }
  const to = job.client?.email?.trim() ?? ''
  if (!to) return { ok: false, error: 'This client has no email address on file.' }
  if (!EMAIL_RE.test(to)) return { ok: false, error: 'The client email address looks invalid.' }

  const email = renderProgressEmail({
    kind,
    clientName: `${job.client?.first_name ?? ''} ${job.client?.last_name ?? ''}`.trim(),
    serviceEn: job.description,
    serviceVi: job.template?.title_vi ?? job.description,
    progressLabel: formatProgressLabel(deriveProgress(job.steps), job.steps.length),
    stepTitleEn: step.title_en,
    stepTitleVi: step.title_vi,
    stepDescriptionEn: step.description_en,
    stepDescriptionVi: step.description_vi,
    note: step.client_note,
  })

  const sent = await send({ to, ...email })

  // Best-effort log: the email has already left (or failed) either way.
  const logged = await insertNotification(db, {
    jobId,
    stepId,
    kind,
    toEmail: to,
    status: sent.ok ? 'sent' : 'failed',
    error: sent.ok ? null : sent.error,
    createdBy: userId,
  })
  if (!logged.ok) console.error('Could not log the progress email:', logged.error)

  if (!sent.ok) return { ok: false, error: `The email could not be sent: ${sent.error}` }
  return { ok: true, value: { to } }
}
