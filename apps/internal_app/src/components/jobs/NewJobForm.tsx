'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createJobFromTemplate } from '@/actions/jobs'
import ClientLookup from '@/components/clients/ClientLookup'
import type { JobTemplateSummary } from '@/lib/jobs/types'

const CARD_SHADOW = { boxShadow: '0 12px 32px -4px rgba(0, 105, 112, 0.04)' }

export default function NewJobForm({
  templates,
  initialClient,
}: {
  templates: JobTemplateSummary[]
  initialClient: { id: string; name: string } | null
}) {
  const router = useRouter()
  const [clientId, setClientId] = useState(initialClient?.id ?? '')
  const [templateKey, setTemplateKey] = useState('')
  const [fee, setFee] = useState('')
  const [deadline, setDeadline] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  // Stays true after a successful create: router.push is still in flight when
  // the transition ends, and a second click would make a second job.
  const [created, setCreated] = useState(false)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!clientId) {
      setError('Choose a client.')
      return
    }
    if (!templateKey) {
      setError('Choose a service template.')
      return
    }
    startTransition(async () => {
      const data = new FormData()
      data.set('client_id', clientId)
      data.set('template_key', templateKey)
      data.set('fee', fee)
      data.set('deadline', deadline)
      data.set('notes', notes)
      const result = await createJobFromTemplate(data)
      if (result.ok) {
        setCreated(true)
        router.push(`/jobs/${result.value.id}`)
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <form onSubmit={submit} className="space-y-8 max-w-3xl">
      <div className="bg-white rounded-xl p-6" style={CARD_SHADOW}>
        <h3 className="text-base font-semibold text-slate-800 mb-4 pb-3 border-b border-[#ebeef3]">
          Client
        </h3>
        <ClientLookup
          value={clientId}
          onChange={(id) => setClientId(id)}
          initialName={initialClient?.name ?? ''}
        />
      </div>

      <div className="bg-white rounded-xl p-6" style={CARD_SHADOW}>
        <h3 className="text-base font-semibold text-slate-800 mb-4 pb-3 border-b border-[#ebeef3]">
          Service
        </h3>
        {templates.length === 0 ? (
          <p className="text-sm text-slate-400">No service templates are available.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3" role="radiogroup" aria-label="Service template">
            {templates.map((t) => {
              const selected = templateKey === t.key
              return (
                <button
                  key={t.key}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setTemplateKey(t.key)}
                  className={`text-left rounded-xl border p-4 transition-colors ${
                    selected
                      ? 'border-[#3AAFB9] bg-[rgba(58,175,185,0.06)]'
                      : 'border-[#ebeef3] hover:bg-[#f7f9ff]'
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-800">{t.title_en}</p>
                  <p className="text-xs text-slate-400">{t.title_vi}</p>
                  <p className="mt-2 text-xs text-slate-500">{t.description_en}</p>
                  <p className="mt-2 text-[11px] font-semibold text-slate-400">{t.step_count} steps</p>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl p-6" style={CARD_SHADOW}>
        <h3 className="text-base font-semibold text-slate-800 mb-4 pb-3 border-b border-[#ebeef3]">
          Details
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Fee (USD, optional)
            </span>
            <input
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              inputMode="decimal"
              placeholder="1,500"
              className="w-full rounded-lg border border-[#bcc9ca]/60 px-3 py-2 text-sm text-slate-700"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Deadline (optional)
            </span>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full rounded-lg border border-[#bcc9ca]/60 px-3 py-2 text-sm text-slate-700"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Notes (staff only, optional)
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-[#bcc9ca]/60 px-3 py-2 text-sm text-slate-700"
            />
          </label>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm font-semibold text-red-600">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || created}
          className="rounded-lg px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          style={{ backgroundColor: '#3AAFB9' }}
        >
          {pending || created ? 'Creating…' : 'Create job'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg px-6 py-2.5 text-sm font-semibold text-slate-600 border border-[#bcc9ca]/40 hover:bg-[#f1f4f9]"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
