'use client'

import { useEffect, useRef, useState } from 'react'
import { getClients } from '@/actions/clients'

interface ClientSearchResult {
  id: string
  first_name: string
  last_name: string
  a_number: string | null
}

/**
 * Search box that picks one existing client. Extracted from
 * cases/new/page.tsx when New Job became another user, with the
 * setState-in-effect lint error removed and initialName, title and
 * description added.
 */
export default function ClientLookup({
  value,
  onChange,
  initialName = '',
  title,
  description,
}: {
  value: string
  onChange: (id: string, name: string) => void
  /** Shown while `value` is already set on first render, for example from a URL. */
  initialName?: string
  /** Heading above the search box; omitted when not given. */
  title?: string
  /** Paragraph under the heading; omitted when not given. */
  description?: string
}) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<ClientSearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [selectedName, setSelectedName] = useState(initialName)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!search.trim()) return
    const delay = setTimeout(async () => {
      setResults(await getClients(search))
    }, 300)
    return () => clearTimeout(delay)
  }, [search])

  // Old results stay hidden while the box is empty, as clearing them did before.
  const visibleResults = search.trim() ? results : []

  return (
    <div className="relative w-full" ref={wrapperRef}>
      {title && <h2 className="text-2xl font-bold text-slate-800 tracking-tight mb-2">{title}</h2>}
      {description && <p className="text-sm text-slate-500 mb-8">{description}</p>}

      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex justify-between">
        <span>Client Name or A-Number</span>
        {value && <span className="text-[#3AAFB9] cursor-pointer hover:underline" onClick={() => { onChange('', ''); setSelectedName(''); setSearch('') }}>Clear</span>}
      </label>

      {value ? (
        <div className="w-full px-4 py-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-green-200/50 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-green-700 text-sm">person</span>
            </div>
            <div>
              <p className="font-semibold">{selectedName}</p>
              <p className="text-xs text-green-700 mt-0.5">Selected from database</p>
            </div>
          </div>
          <span className="material-symbols-outlined text-green-600 text-[28px]">check_circle</span>
        </div>
      ) : (
        <>
          <div className="relative">
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setIsOpen(true) }}
              onFocus={() => setIsOpen(true)}
              placeholder="e.g. Maria"
              className="w-full pl-4 pr-10 py-3 border-b-2 border-[#3AAFB9] bg-transparent text-lg text-slate-800 outline-none placeholder:text-slate-300 font-sans font-medium transition-colors focus:bg-slate-50 rounded-t-lg"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#3AAFB9]">search</span>
          </div>

          {isOpen && search.trim() && (
            <div className="absolute z-20 w-full mt-2 bg-white border border-[#ebeef3] rounded-xl shadow-[0_12px_40px_-12px_rgba(0,105,112,0.15)] overflow-hidden">
              <div className="bg-[#f7f9ff] px-4 py-2 border-b border-[#ebeef3]">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Matching Results ({visibleResults.length})</p>
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {visibleResults.length > 0 ? (
                  visibleResults.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        onChange(c.id, `${c.first_name} ${c.last_name}`)
                        setSelectedName(`${c.first_name} ${c.last_name}`)
                        setIsOpen(false)
                        setSearch('')
                      }}
                      className="w-full text-left px-5 py-4 hover:bg-[#f7f9ff] border-b border-[#ebeef3] last:border-0 flex items-center gap-4 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-[#e7f6f7] text-[#006970] flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-lg">person</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[15px] font-bold text-slate-800 truncate">{c.first_name} {c.last_name}</p>
                        <p className="text-xs font-semibold text-slate-400 mt-0.5 truncate tracking-wide">
                          {c.a_number ? `A# ${c.a_number}` : 'No A-Number'}
                        </p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-5 py-6 text-sm text-center text-slate-500 font-medium">No matching clients found.</div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
