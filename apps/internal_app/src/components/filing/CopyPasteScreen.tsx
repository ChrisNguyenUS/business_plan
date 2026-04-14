'use client'

import { useState, useMemo } from 'react'
import type { FormDefinition } from '@/lib/forms/types'
import Link from 'next/link'

interface Props {
  formDef: FormDefinition
  client: Record<string, any>
  caseId: string
}

export function CopyPasteScreen({ formDef, client, caseId }: Props) {
  const [activeSection, setActiveSection] = useState(formDef.sections[0]?.id)
  const [copiedFields, setCopiedFields] = useState<Set<string>>(new Set())

  const totalFields = formDef.sections.reduce((acc, s) => acc + s.fields.length, 0)
  const copiedCount = copiedFields.size
  const progress = totalFields > 0 ? Math.round((copiedCount / totalFields) * 100) : 0

  async function copyToClipboard(id: string, value: string) {
    if (!value) return
    await navigator.clipboard.writeText(value)
    setCopiedFields(prev => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }

  function markAllCopied(sectionId: string) {
    const section = formDef.sections.find(s => s.id === sectionId)
    if (!section) return
    
    setCopiedFields(prev => {
      const next = new Set(prev)
      section.fields.forEach(f => {
        const val = f.getValue(client)
        if (val) next.add(`${section.id}-${f.id}`)
      })
      return next
    })
  }

  function resetSection(sectionId: string) {
    const section = formDef.sections.find(s => s.id === sectionId)
    if (!section) return
    
    setCopiedFields(prev => {
      const next = new Set(prev)
      section.fields.forEach(f => {
        next.delete(`${section.id}-${f.id}`)
      })
      return next
    })
  }

  const currentSection = formDef.sections.find(s => s.id === activeSection)

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-surface">
      {/* Top Header */}
      <header className="h-16 flex items-center justify-between px-8 bg-surface-container-lowest border-b border-outline-variant/10 shrink-0">
        <div className="flex items-center gap-4">
          <Link href={`/cases/${caseId}`} className="flex items-center gap-2 text-primary font-medium hover:underline text-sm">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back to Case
          </Link>
        </div>
        <div className="flex items-center gap-2 mr-auto ml-10">
          <h1 className="font-semibold text-on-surface tracking-tight">Filing Assistant — Form {formDef.name?.toUpperCase()}</h1>
        </div>
        <div className="flex flex-col items-end w-64 ml-auto">
          <div className="flex justify-between w-full mb-1">
            <span className="text-[10px] uppercase tracking-wider font-bold text-tertiary">Overall Progress</span>
            <span className="text-[10px] font-bold text-on-surface">{copiedCount} of {totalFields} fields copied ({progress}%)</span>
          </div>
          <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
            <div className="h-full" style={{ width: `${progress}%`, backgroundColor: '#3aafb9' }}></div>
          </div>
        </div>
      </header>

      {/* Section Tabs */}
      <nav className="bg-surface-container-lowest border-b border-outline-variant/10 shrink-0 overflow-x-auto no-scrollbar">
        <div className="flex px-8 gap-8 h-12 items-center min-w-max">
          {formDef.sections.map((section, idx) => {
            const isActive = activeSection === section.id
            const sectionCopied = section.fields.filter(f => copiedFields.has(`${section.id}-${f.id}`)).length
            const isFullyCopied = section.fields.length > 0 && sectionCopied === section.fields.length

            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`relative h-full flex items-center gap-2 text-sm whitespace-nowrap transition-colors ${
                  isActive 
                    ? 'font-bold border-b-2 text-[#006970] border-[#006970]' 
                    : 'font-medium text-slate-500 hover:text-slate-800'
                }`}
              >
                {isFullyCopied && (
                  <span className="material-symbols-outlined text-green-600 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                    check_circle
                  </span>
                )}
                Part {idx + 1}: {section.label}
              </button>
            )
          })}
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-8 py-10 pb-28">
        <div className="max-w-4xl mx-auto space-y-3">
          {currentSection?.fields.map((field, itemIdx) => {
            const fieldId = `${currentSection.id}-${field.id}`
            const value = field.getValue(client)
            const isCopied = copiedFields.has(fieldId)
            const isMissing = !value

            return (
              <div key={fieldId} className={`group flex items-center gap-4 p-3 rounded-lg border transition-all hover:shadow-sm ${
                isCopied ? 'bg-[#F0FDF4] border-green-100' :
                isMissing ? 'bg-[#FEF3C7] border-amber-200' :
                'bg-white border-[#ebeef3] hover:border-[#bcc9ca]/60'
              }`}>
                <div className="flex-1 grid grid-cols-[140px_1fr_2fr] items-center gap-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                      Item {itemIdx + 1}
                    </span>
                    <span className="text-sm font-semibold text-slate-800 truncate pr-2" title={field.label}>
                      {field.label}
                    </span>
                  </div>
                  
                  {isCopied ? (
                    <div className="bg-white border border-green-200 px-4 py-2 rounded-md text-sm text-slate-800 font-medium truncate">
                      {value}
                    </div>
                  ) : isMissing ? (
                    <div className="bg-white/50 italic border border-amber-200 px-4 py-2 rounded-md text-sm text-amber-800 font-medium truncate">
                      Missing — update client profile
                    </div>
                  ) : (
                    <div className="bg-[#f7f9ff] border border-[#bcc9ca]/30 px-4 py-2 rounded-md text-sm text-slate-800 font-medium truncate font-mono">
                      {value}
                    </div>
                  )}

                  <div className="flex justify-end">
                    {isCopied ? (
                      <button className="flex items-center gap-2 px-4 py-1.5 bg-green-600 text-white rounded-md text-xs font-bold uppercase tracking-wider">
                        <span className="material-symbols-outlined text-sm">done</span>
                        Copied
                      </button>
                    ) : isMissing ? (
                      <a href={`/clients/${client.id}`} target="_blank" className="text-amber-700 text-xs font-bold uppercase flex items-center gap-1 hover:underline">
                        <span className="material-symbols-outlined text-sm">edit</span>
                        Fix Profile
                      </a>
                    ) : (
                      <button 
                        onClick={() => copyToClipboard(fieldId, value)}
                        className="flex items-center gap-2 px-6 py-1.5 bg-[#3aafb9] text-white rounded-md text-xs font-bold uppercase tracking-wider hover:bg-[#006970] transition-colors"
                      >
                        Copy
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Sticky Bottom Action Bar */}
      {currentSection && (
        <footer className="h-20 bg-white border-t border-[#ebeef3] px-8 flex items-center justify-between sticky bottom-0 z-30 shadow-[0_-8px_24px_rgba(0,105,112,0.04)]">
          <button 
            onClick={() => resetSection(currentSection.id)}
            className="px-6 py-2 border border-[#bcc9ca] text-slate-500 text-sm font-bold uppercase tracking-wider rounded-lg hover:bg-[#f7f9ff] transition-colors"
          >
            Reset Section
          </button>
          <div className="flex flex-col items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter mb-0.5">Section Progress</span>
            <span className="text-sm font-bold text-[#006970]">
              {currentSection.fields.filter(f => copiedFields.has(`${currentSection.id}-${f.id}`)).length} of {currentSection.fields.length} copied
            </span>
          </div>
          <button 
            onClick={() => markAllCopied(currentSection.id)}
            className="px-8 py-3 text-white text-sm font-bold uppercase tracking-widest rounded-lg shadow-lg hover:brightness-105 active:scale-95 transition-all" 
            style={{ background: 'linear-gradient(135deg, #006970 0%, #3AAFB9 100%)' }}
          >
            Mark Section Copied
          </button>
        </footer>
      )}
    </div>
  )
}
