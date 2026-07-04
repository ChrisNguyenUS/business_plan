'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const router = useRouter()

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      const q = query.trim()
      if (q) {
        router.push(`/clients?q=${encodeURIComponent(q)}`)
        setQuery('')
      }
    }
    if (e.key === 'Escape') {
      setQuery('')
      ;(e.target as HTMLInputElement).blur()
    }
  }

  return (
    <div className="relative">
      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
        search
      </span>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search cases, clients..."
        className="pl-10 pr-4 py-1.5 bg-[#f1f4f9] rounded-full border-none text-sm w-64 outline-none focus:ring-2"
        style={{ '--tw-ring-color': '#3AAFB9' } as React.CSSProperties}
        autoComplete="off"
      />
    </div>
  )
}
