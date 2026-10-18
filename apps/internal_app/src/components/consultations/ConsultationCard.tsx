'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { updateConsultation } from '@/actions/consultations'
import {
  CONSULTATION_OUTCOMES,
  CONSULTATION_STATUSES,
  OUTCOME_LABELS,
  STATUS_LABELS,
  daysSince,
  updatedAgoLabel,
  topicLabel,
  type ConsultationOutcome,
  type ConsultationRow,
  type ConsultationStatus,
} from '@/lib/n400/consultation'

const fieldClass =
  'w-full px-3 py-2 bg-[#f7f9ff] border border-[#bcc9ca]/30 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 disabled:opacity-50'

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-US', {
    timeZone: 'America/Chicago',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function ConsultationCard({
  row,
  clientId,
  showAge,
}: {
  row: ConsultationRow
  /** Set when this lead has already been converted. */
  clientId: string | null
  /** Follow-up tab: show how long the request has gone untouched. */
  showAge: boolean
}) {
  const router = useRouter()
  const [status, setStatus] = useState(row.status)
  const [outcome, setOutcome] = useState(row.outcome ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!saved) return
    const t = setTimeout(() => setSaved(false), 2000)
    return () => clearTimeout(t)
  }, [saved])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSaved(false)
    const result = await updateConsultation(row.id, new FormData(e.currentTarget))
    setSaving(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setSaved(true)
    router.refresh()
  }

  const isDone = status === 'done'
  const needsOutcome = row.status === 'done' && !row.outcome

  return (
    <form
      onSubmit={handleSubmit}
      onChange={() => setSaved(false)}
      className="bg-white rounded-xl p-5 space-y-4"
      style={{ boxShadow: '0 12px 32px -4px rgba(0, 105, 112, 0.04)' }}
    >
      <input type="hidden" name="expected_updated_at" value={row.updated_at} />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            href={`/leads/${row.user_id}`}
            className="text-sm font-semibold text-slate-800 hover:underline"
          >
            {row.name || 'Unnamed'}
          </Link>
          <p className="text-xs text-slate-500 mt-0.5">
            {row.phone ? (
              <a href={`tel:${row.phone}`} className="text-[#006970] font-semibold">
                {row.phone}
              </a>
            ) : (
              'No phone'
            )}
            {' · '}
            {topicLabel(row.topic)}
            {row.preferred_time ? ` · prefers ${row.preferred_time}` : ''}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Requested {formatDate(row.created_at)}
            {showAge && ` · ${updatedAgoLabel(daysSince(row.updated_at))}`}
            {needsOutcome && (
              <span className="ml-1 font-semibold text-amber-700">· needs outcome</span>
            )}
          </p>
        </div>
        {row.outcome === 'won' &&
          (clientId ? (
            <Link
              href={`/clients/${clientId}`}
              className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#006970] border border-[#3AAFB9]/40"
            >
              <span className="material-symbols-outlined text-sm">badge</span>
              View client
            </Link>
          ) : (
            <Link
              href={`/clients/new?fromLead=${row.user_id}`}
              className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
              style={{ backgroundColor: '#3AAFB9' }}
            >
              <span className="material-symbols-outlined text-sm">person_add</span>
              Convert to Client
            </Link>
          ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Status
          <select
            name="status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              if (e.target.value !== 'done') setOutcome('')
            }}
            className={`${fieldClass} mt-1 normal-case tracking-normal`}
          >
            {CONSULTATION_STATUSES.map((s: ConsultationStatus) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Outcome {!isDone && <span className="normal-case">(after Done)</span>}
          <select
            name="outcome"
            value={outcome}
            disabled={!isDone}
            onChange={(e) => setOutcome(e.target.value)}
            className={`${fieldClass} mt-1 normal-case tracking-normal`}
          >
            <option value="">—</option>
            {CONSULTATION_OUTCOMES.map((o: ConsultationOutcome) => (
              <option key={o} value={o}>
                {OUTCOME_LABELS[o]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <textarea
        name="note"
        defaultValue={row.note ?? ''}
        rows={2}
        placeholder="Note (what was discussed, when to call back…)"
        className={fieldClass}
      />
      {isDone && outcome && (
        <textarea
          name="outcome_note"
          defaultValue={row.outcome_note ?? ''}
          rows={2}
          placeholder="Outcome note"
          className={fieldClass}
        />
      )}

      <div className="flex items-center justify-end gap-3">
        {saved && (
          <p role="status" className="text-xs text-emerald-700 font-medium">
            Saved
          </p>
        )}
        {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-60"
          style={{ backgroundColor: '#3AAFB9' }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  )
}
