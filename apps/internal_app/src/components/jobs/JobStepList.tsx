'use client'

import { useState, useTransition } from 'react'
import { emailStepUpdate, updateJobStep } from '@/actions/jobs'
import { emailKindFor } from '@/lib/jobs/email'
import {
  STEP_OWNER_LABELS,
  STEP_STATUSES,
  STEP_STATUS_LABELS,
  type StepStatus,
} from '@/lib/jobs/progress'
import type { JobStepRow } from '@/lib/jobs/types'

const STATUS_DOT: Record<StepStatus, string> = {
  todo: 'bg-slate-300',
  in_progress: 'bg-blue-500',
  waiting_client: 'bg-amber-500',
  done: 'bg-green-500',
  skipped: 'bg-slate-200',
}

const OWNER_STYLE: Record<JobStepRow['owner'], string> = {
  manna: 'bg-[rgba(58,175,185,0.1)] text-[#006970]',
  client: 'bg-amber-50 text-amber-700',
  third_party: 'bg-slate-100 text-slate-600',
}

type Message = { kind: 'ok' | 'error'; text: string } | null

function StepRow({ step, clientEmail }: { step: JobStepRow; clientEmail: string | null }) {
  const [status, setStatus] = useState<StepStatus>(step.status)
  const [clientNote, setClientNote] = useState(step.client_note ?? '')
  const [internalNote, setInternalNote] = useState(step.internal_note ?? '')
  // What the database holds now; the dot and the Save button compare against it.
  const [saved, setSaved] = useState({
    status: step.status,
    clientNote: step.client_note ?? '',
    internalNote: step.internal_note ?? '',
  })
  const [message, setMessage] = useState<Message>(null)
  const [pending, startTransition] = useTransition()

  const dirty =
    status !== saved.status ||
    clientNote !== saved.clientNote ||
    internalNote !== saved.internalNote

  // Offer the email only when the step is moving to a status the client cares about.
  const canEmail =
    step.client_visible && emailKindFor(status) !== null && status !== saved.status

  function save(emailClient: boolean) {
    setMessage(null)
    startTransition(async () => {
      const result = await updateJobStep(step.id, {
        status,
        client_note: clientNote,
        internal_note: internalNote,
      })
      if (!result.ok) {
        setMessage({ kind: 'error', text: result.error })
        return
      }
      setSaved({ status, clientNote, internalNote })
      if (!emailClient) {
        setMessage({ kind: 'ok', text: 'Saved' })
        return
      }
      // The step is saved either way; only the email can still fail.
      const mail = await emailStepUpdate(step.id)
      setMessage(
        mail.ok
          ? { kind: 'ok', text: `Saved and emailed ${mail.value.to}` }
          : { kind: 'error', text: `Saved. Email not sent: ${mail.error}` }
      )
    })
  }

  return (
    <li className="py-5 first:pt-0 last:pb-0">
      <div className="flex items-start gap-4">
        <span
          className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_DOT[saved.status]}`}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">
                {step.position}. {step.title_en}{' '}
                <span
                  className={`align-middle text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${OWNER_STYLE[step.owner]}`}
                >
                  {STEP_OWNER_LABELS[step.owner].en}
                </span>
              </p>
              <p className="text-xs text-slate-400">{step.title_vi}</p>
              {step.description_en && (
                <p className="mt-1 text-xs text-slate-500">{step.description_en}</p>
              )}
              {step.description_vi && (
                <p className="text-xs text-slate-400">{step.description_vi}</p>
              )}
            </div>
            <select
              aria-label={`Status of step ${step.position}`}
              value={status}
              onChange={(e) => setStatus(e.target.value as StepStatus)}
              disabled={pending}
              className="rounded-lg border border-[#bcc9ca]/60 bg-white px-3 py-1.5 text-sm text-slate-700"
            >
              {STEP_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STEP_STATUS_LABELS[s].en}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Client note (shown to the client in the portal)
              </span>
              <textarea
                value={clientNote}
                onChange={(e) => setClientNote(e.target.value)}
                rows={2}
                disabled={pending}
                className="w-full rounded-lg border border-[#bcc9ca]/60 px-3 py-2 text-sm text-slate-700"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Internal note (staff only)
              </span>
              <textarea
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
                rows={2}
                disabled={pending}
                className="w-full rounded-lg border border-[#bcc9ca]/60 px-3 py-2 text-sm text-slate-700"
              />
            </label>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => save(false)}
              disabled={!dirty || pending}
              className="rounded-lg px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
              style={{ backgroundColor: '#3AAFB9' }}
            >
              {pending ? 'Saving…' : 'Save'}
            </button>
            {canEmail && (
              <button
                type="button"
                onClick={() => save(true)}
                disabled={!clientEmail || pending}
                className="rounded-lg border border-[#3AAFB9] px-4 py-1.5 text-sm font-semibold text-[#006970] disabled:opacity-40"
              >
                Save &amp; email
              </button>
            )}
            {canEmail && (
              <span className="text-xs text-slate-500">
                {clientEmail
                  ? `Save & email will write to ${clientEmail}`
                  : 'This client has no email on file, so it cannot be emailed.'}
              </span>
            )}
            {message && (
              <span
                role="status"
                className={`text-xs font-semibold ${
                  message.kind === 'ok' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {message.text}
              </span>
            )}
          </div>
        </div>
      </div>
    </li>
  )
}

export default function JobStepList({
  steps,
  clientEmail,
}: {
  steps: JobStepRow[]
  clientEmail: string | null
}) {
  return (
    <ul className="divide-y divide-[#ebeef3]">
      {steps.map((step) => (
        <StepRow key={step.id} step={step} clientEmail={clientEmail} />
      ))}
    </ul>
  )
}
