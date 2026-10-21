'use client'

import { useState, useTransition } from 'react'
import { deleteCase } from '@/actions/cases'

/** Admin-only. Deleting a case also deletes its forms, documents and status history. */
export default function DeleteCaseButton({ id }: { id: string }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function remove() {
    if (
      !window.confirm(
        'Permanently delete this case and its forms, documents and status history? This cannot be undone.'
      )
    ) {
      return
    }
    setError(null)
    startTransition(async () => {
      // On success the action redirects to /cases and never returns.
      const result = await deleteCase(id)
      if (!result.ok) setError(result.error)
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50"
      >
        <span className="material-symbols-outlined text-sm">delete</span>
        {pending ? 'Deleting…' : 'Delete'}
      </button>
      {error && <p className="text-xs text-red-600 max-w-xs text-right">{error}</p>}
    </div>
  )
}
