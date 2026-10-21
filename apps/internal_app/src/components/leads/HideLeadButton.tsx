'use client'

import { useState, useTransition } from 'react'
import { setLeadHidden } from '@/actions/leads'

/** Admin-only toggle on the lead page. Hiding keeps the N400Ready account. */
export default function HideLeadButton({
  userId,
  hidden,
}: {
  userId: string
  hidden: boolean
}) {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function toggle() {
    if (
      !hidden &&
      !window.confirm(
        'Hide this lead from the Leads list and the Sales-Ready email? Their N400Ready account stays. You can unhide it later.'
      )
    ) {
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await setLeadHidden(userId, !hidden)
      if (!result.ok) setError(result.error)
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 border border-[#bcc9ca]/40 hover:bg-[#f1f4f9] transition-colors disabled:opacity-50"
      >
        <span className="material-symbols-outlined text-sm">
          {hidden ? 'visibility' : 'visibility_off'}
        </span>
        {pending ? 'Saving…' : hidden ? 'Unhide' : 'Hide lead'}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
