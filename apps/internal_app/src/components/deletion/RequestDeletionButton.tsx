'use client'

import { useState, useTransition } from 'react'
import { requestDeletion } from '@/actions/deletion-requests'
import { actionLabel, type EntityType } from '@/lib/deletion/requests'

/** Staff: ask an admin to delete (or, for a lead, hide) this item. */
export default function RequestDeletionButton({
  entityType,
  entityId,
}: {
  entityType: EntityType
  entityId: string
}) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [pending, startTransition] = useTransition()
  const label = entityType === 'lead' ? 'Request hide' : 'Request deletion'

  function submit() {
    setMessage(null)
    startTransition(async () => {
      const result = await requestDeletion({ entityType, entityId, reason })
      if (!result.ok) {
        setMessage({ kind: 'error', text: result.error })
        return
      }
      setOpen(false)
      setReason('')
      setMessage({
        kind: 'ok',
        text: result.value.emailError
          ? `Request saved. The admin email was not sent: ${result.value.emailError}`
          : 'Request sent to an admin.',
      })
    })
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
        >
          <span className="material-symbols-outlined text-sm">
            {entityType === 'lead' ? 'visibility_off' : 'delete'}
          </span>
          {label}
        </button>
      ) : (
        <div className="w-80 bg-white rounded-lg border border-[#bcc9ca]/40 p-3 space-y-2 shadow-sm">
          <p className="text-xs font-semibold text-slate-600">
            {actionLabel(entityType)} — why? An admin will review it.
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            rows={3}
            className="w-full text-sm border border-[#bcc9ca]/40 rounded-lg p-2 outline-none focus:ring-2"
            style={{ '--tw-ring-color': '#3AAFB9' } as React.CSSProperties}
            placeholder="e.g. Duplicate of another record"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={pending}
              className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={pending || !reason.trim()}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: '#006970' }}
            >
              {pending ? 'Sending…' : 'Send request'}
            </button>
          </div>
        </div>
      )}
      {message && (
        <p className={`text-xs max-w-xs text-right ${message.kind === 'error' ? 'text-red-600' : 'text-[#006970]'}`}>
          {message.text}
        </p>
      )}
    </div>
  )
}
