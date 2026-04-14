'use client'

import { useState } from 'react'
import type { FormDefinition } from '@/lib/forms/types'

interface Props {
  formDef: FormDefinition
  client: Record<string, any>
}

interface CopyFieldProps {
  label: string
  value: string
}

function CopyField({ label, value }: CopyFieldProps) {
  const [copied, setCopied] = useState(false)

  async function copyToClipboard() {
    if (!value) return
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="group">
      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <div className="flex-1 px-4 py-2.5 bg-[#f7f9ff] border border-[#bcc9ca]/30 rounded-lg text-sm text-slate-700 font-mono min-h-[42px] flex items-center">
          {value || <span className="text-slate-400 italic">—</span>}
        </div>
        <button
          onClick={copyToClipboard}
          disabled={!value}
          title="Copy to clipboard"
          className="w-9 h-9 flex items-center justify-center rounded-lg border transition-all shrink-0 disabled:opacity-30"
          style={
            copied
              ? { backgroundColor: '#16a34a', borderColor: '#16a34a', color: 'white' }
              : {
                  borderColor: '#bcc9ca',
                  color: '#6d797a',
                }
          }
        >
          <span className="material-symbols-outlined text-sm">
            {copied ? 'check' : 'content_copy'}
          </span>
        </button>
      </div>
    </div>
  )
}

export function CopyPasteScreen({ formDef, client }: Props) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(
    Object.fromEntries(formDef.sections.map((s) => [s.id, true]))
  )

  function toggleSection(id: string) {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Click the copy button next to each field to copy its value, then paste into the USCIS
          portal.
        </p>
        <a
          href="https://my.uscis.gov"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all"
          style={{ backgroundColor: '#3AAFB9' }}
        >
          <span className="material-symbols-outlined text-sm">open_in_new</span>
          Open USCIS Portal
        </a>
      </div>

      {formDef.sections.map((section) => (
        <div
          key={section.id}
          className="bg-white rounded-xl overflow-hidden"
          style={{ boxShadow: '0 12px 32px -4px rgba(0, 105, 112, 0.04)' }}
        >
          {/* Section Header */}
          <button
            onClick={() => toggleSection(section.id)}
            className="w-full flex items-center justify-between p-5 text-left hover:bg-[#f7f9ff]/60 transition-colors"
          >
            <h3 className="text-sm font-semibold text-slate-800">{section.label}</h3>
            <span className="material-symbols-outlined text-slate-400 text-sm transition-transform"
              style={{ transform: expandedSections[section.id] ? 'rotate(180deg)' : 'rotate(0deg)' }}
            >
              expand_more
            </span>
          </button>

          {/* Fields */}
          {expandedSections[section.id] && (
            <div className="px-5 pb-5 border-t border-[#ebeef3]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                {section.fields.map((field) => (
                  <CopyField
                    key={field.id}
                    label={field.label}
                    value={field.getValue(client)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
