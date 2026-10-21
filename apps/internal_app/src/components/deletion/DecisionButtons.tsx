'use client'

import { useState, useTransition } from 'react'
import { approveDeletionRequest, rejectDeletionRequest } from '@/actions/deletion-requests'

/** Admin: approve (runs the delete/hide) or reject a pending request. */
export default function DecisionButtons({ requestId, action }: { requestId: string; action: string }) {
  const [rejecting, setRejecting] = useState(false)
  const [note, setNote] = useState('')
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  function run(fn: () => ReturnType<typeof approveDeletionRequest>) {
    setMessage(null)
    startTransition(async () => {
      const result = await fn()
      if (!result.ok) {
        setMessage({ kind: 'error', text: result.error })
        return
      }
      // The row moves to History on revalidate; this note covers the email only.
      if (result.value.emailError) {
        setMessage({ kind: 'error', text: `Done. Staff email not sent: ${result.value.emailError}` })
      }
    })
  }

  function approve() {
    if (!window.confirm(`${action}? This cannot be undone.`)) return
    run(() => approveDeletionRequest(requestId))
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {!rejecting ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setRejecting(true)}
            disabled={pending}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 border border-[#bcc9ca]/40 hover:bg-[#f1f4f9] disabled:opacity-50"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={approve}
            disabled={pending}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
          >
            {pending ? 'Working…' : 'Approve'}
          </button>
        </div>
      ) : (
        <div className="w-72 space-y-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="Optional note for the staff member"
            className="w-full text-sm border border-[#bcc9ca]/40 rounded-lg p-2 outline-none"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setRejecting(false)}
              disabled={pending}
              className="px-3 py-1.5 text-xs font-semibold text-slate-500"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => run(() => rejectDeletionRequest(requestId, note))}
              disabled={pending}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: '#006970' }}
            >
              {pending ? 'Working…' : 'Reject request'}
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
