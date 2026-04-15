'use client'

import { useState } from 'react'
import { toggleDocumentReceived } from '@/actions/cases'

interface DocItem {
  id: string
  label: string
  required: boolean
  received: boolean
  case_form_id: string | null
}

interface FormInfo {
  id: string
  form_type: string
}

export default function DocumentChecklist({
  documents,
  forms,
  caseId,
  totalDocs,
  receivedDocs: initialReceived,
}: {
  documents: DocItem[]
  forms: FormInfo[]
  caseId: string
  totalDocs: number
  receivedDocs: number
}) {
  const [docs, setDocs] = useState(documents)
  const [loading, setLoading] = useState<string | null>(null)
  const receivedDocs = docs.filter((d) => d.received).length
  const progressPercent = totalDocs > 0 ? Math.round((receivedDocs / totalDocs) * 100) : 0

  const formMap = new Map(forms.map((f) => [f.id, f.form_type]))

  const grouped = new Map<string, DocItem[]>()
  for (const doc of docs) {
    const key = doc.case_form_id ?? '__general__'
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(doc)
  }

  const groupOrder = forms
    .filter((f) => grouped.has(f.id))
    .map((f) => ({ key: f.id, label: `${f.form_type.toUpperCase()} Documents` }))
  if (grouped.has('__general__')) {
    groupOrder.push({ key: '__general__', label: 'General Documents' })
  }

  async function handleToggle(docId: string, newReceived: boolean) {
    setLoading(docId)
    setDocs((prev) => prev.map((d) => (d.id === docId ? { ...d, received: newReceived } : d)))
    try {
      await toggleDocumentReceived(docId, newReceived, caseId)
    } catch {
      setDocs((prev) => prev.map((d) => (d.id === docId ? { ...d, received: !newReceived } : d)))
    }
    setLoading(null)
  }

  return (
    <div className="space-y-8">
      {/* Progress Header */}
      <div className="bg-surface-container-low p-6 rounded-xl flex flex-wrap md:flex-nowrap items-center justify-between gap-4">
        <div className="flex-grow md:mr-12 w-full">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-bold text-on-surface">Overall Completion</span>
            <span className="text-sm font-bold text-primary">{progressPercent}%</span>
          </div>
          <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progressPercent}%`, background: 'linear-gradient(135deg, #006970 0%, #3AAFB9 100%)' }}
            />
          </div>
          <p className="text-xs text-tertiary mt-2">
            {receivedDocs} of {totalDocs} documents received and verified.
          </p>
        </div>
        {receivedDocs > 0 && (
          <button className="px-5 py-2.5 text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all flex items-center justify-center space-x-2 shrink-0 w-full md:w-auto" style={{ background: 'linear-gradient(135deg, #006970 0%, #3AAFB9 100%)' }}>
            <span className="material-symbols-outlined text-sm">download</span>
            <span>Download All as ZIP</span>
          </button>
        )}
      </div>

      {/* Document Groups */}
      {groupOrder.map(({ key, label }) => {
        const groupDocs = grouped.get(key) ?? []
        const groupReceived = groupDocs.filter((d) => d.received).length
        const groupMissing = groupDocs.filter((d) => !d.received && d.required).length

        return (
          <section key={key}>
            <div className="flex items-center justify-between mb-4 px-2">
              <h4 className="text-sm font-black text-on-surface-variant uppercase tracking-widest">{label}</h4>
              {groupMissing > 0 ? (
                <span className="text-xs font-bold text-error">Missing {groupMissing} items</span>
              ) : (
                <span className="text-xs font-bold text-tertiary">{groupReceived} of {groupDocs.length} Completed</span>
              )}
            </div>
            <div className="bg-surface-container-lowest rounded-xl overflow-hidden border border-[#ebeef3]">
              {groupDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 flex flex-wrap items-center justify-between group hover:bg-surface-container-low transition-colors border-b border-surface-container-high last:border-0"
                >
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => handleToggle(doc.id, !doc.received)}
                      disabled={loading === doc.id}
                      className="disabled:opacity-50"
                    >
                      {doc.received ? (
                        <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      ) : (
                        <span className="material-symbols-outlined text-surface-variant cursor-pointer hover:text-primary transition-colors">radio_button_unchecked</span>
                      )}
                    </button>
                    <span className={`text-sm font-semibold ${doc.received ? 'text-on-surface' : 'text-tertiary'}`}>
                      {doc.label}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 mt-2 sm:mt-0 ml-10 sm:ml-0">
                    {doc.received ? (
                      <>
                        <span className="text-xs text-tertiary font-medium">Uploaded</span>
                        <button className="text-primary hover:bg-primary/10 p-1.5 rounded-md transition-all">
                          <span className="material-symbols-outlined text-lg">visibility</span>
                        </button>
                      </>
                    ) : (
                      <>
                        {doc.required && (
                          <span className="flex items-center space-x-1 px-2 py-0.5 bg-error-container text-on-error-container text-[10px] font-bold rounded uppercase">
                            <span className="material-symbols-outlined text-[10px]">warning</span>
                            <span>Missing</span>
                          </span>
                        )}
                        <button className="text-primary text-xs font-bold border border-primary-container px-3 py-1 rounded hover:bg-primary-container hover:text-white transition-all">
                          Upload
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )
      })}

      {docs.length === 0 && (
        <div className="p-8 text-center text-sm text-tertiary bg-surface-container-lowest rounded-xl border border-[#ebeef3]">
          No checklist items yet.
        </div>
      )}

      <div className="flex justify-center pt-4">
        <button className="flex items-center space-x-2 text-tertiary hover:text-primary font-bold text-sm transition-all group">
          <span className="material-symbols-outlined group-hover:rotate-90 transition-transform">add_circle</span>
          <span>Add Custom Item</span>
        </button>
      </div>
    </div>
  )
}
