'use client'

import { useState, useRef, useEffect } from 'react'
import { updateCaseStatus } from '@/actions/cases'
import { CASE_STATUSES, CASE_STATUS_LABELS, CASE_STATUS_COLORS, type CaseStatus } from '@/types'

export default function StatusDropdown({
  caseId,
  currentStatus,
}: {
  caseId: string
  currentStatus: CaseStatus
}) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState(currentStatus)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleSelect(newStatus: CaseStatus) {
    if (newStatus === status) { setOpen(false); return }
    setLoading(true)
    setError(null)
    try {
      await updateCaseStatus(caseId, newStatus)
      setStatus(newStatus)
    } catch {
      // Next hides server error text in production, so say it plainly.
      setError('Could not change the status. Try again.')
    }
    setLoading(false)
    setOpen(false)
  }

  const dotColor = status === 'approved' ? 'bg-green-500' : status === 'denied' ? 'bg-red-500' : 'bg-primary-container'

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        disabled={loading}
        className="flex items-center space-x-2 px-4 py-2 bg-surface-container-lowest border border-outline-variant/20 rounded-lg text-sm font-semibold hover:bg-surface-container-low transition-all disabled:opacity-50"
      >
        <span className={`w-2 h-2 rounded-full ${dotColor}`} />
        <span>{loading ? 'Saving...' : CASE_STATUS_LABELS[status] ?? status}</span>
        <span className="material-symbols-outlined text-sm">expand_more</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-surface-container-lowest rounded-lg shadow-xl border border-outline-variant/20 z-50 py-1">
          {CASE_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => handleSelect(s)}
              className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-surface-container-low transition-colors ${s === status ? 'font-bold text-primary' : 'text-on-surface'}`}
            >
              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${CASE_STATUS_COLORS[s]}`}>
                {CASE_STATUS_LABELS[s]}
              </span>
            </button>
          ))}
        </div>
      )}
      {error && <p className="absolute right-0 top-full mt-1 text-xs text-red-600 whitespace-nowrap">{error}</p>}
    </div>
  )
}
