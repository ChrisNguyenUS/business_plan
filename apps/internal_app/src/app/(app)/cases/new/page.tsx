'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createCase } from '@/actions/cases'
import type { FormType } from '@/types'

const FORM_OPTIONS: Array<{
  id: FormType
  name: string
  category: string
  description: string
}> = [
  { id: 'n400', name: 'N-400', category: 'Citizenship', description: 'Application for Naturalization' },
  { id: 'i485', name: 'I-485', category: 'Green Card', description: 'Adjustment of Status' },
  { id: 'i130', name: 'I-130', category: 'Family', description: 'Petition for Alien Relative' },
  { id: 'i765', name: 'I-765', category: 'Work', description: 'Employment Authorization' },
  { id: 'i131', name: 'I-131', category: 'Travel', description: 'Application for Travel Document' },
  { id: 'i864', name: 'I-864', category: 'Support', description: 'Affidavit of Support' },
  { id: 'i693', name: 'I-693', category: 'Medical', description: 'Medical Examination' },
]

const PACKAGE_TEMPLATES: Array<{
  id: string
  name: string
  formIds: FormType[]
}> = [
  {
    id: 'marriage_greencard',
    name: 'Marriage-Based Green Card',
    formIds: ['i130', 'i485', 'i765', 'i131', 'i864', 'i693'],
  },
  {
    id: 'parent_greencard',
    name: 'Parent-Sponsored Green Card',
    formIds: ['i130', 'i485', 'i765', 'i131', 'i864', 'i693'],
  },
]

export default function NewCasePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const prefillClientId = searchParams.get('clientId') ?? ''

  const [caseType, setCaseType] = useState<'simple' | 'package'>('simple')
  const [selectedForms, setSelectedForms] = useState<FormType[]>([])
  const [packageType, setPackageType] = useState('')
  const [primaryClientId, setPrimaryClientId] = useState(prefillClientId)
  const [secondaryClientId, setSecondaryClientId] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function toggleForm(id: FormType) {
    setSelectedForms((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    )
  }

  function applyPackageTemplate(templateId: string) {
    const pkg = PACKAGE_TEMPLATES.find((p) => p.id === templateId)
    if (pkg) {
      setSelectedForms(pkg.formIds)
      setPackageType(templateId)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!primaryClientId.trim()) {
      setError('Please enter a primary client ID')
      return
    }
    if (selectedForms.length === 0) {
      setError('Please select at least one form')
      return
    }

    setSaving(true)
    setError('')

    try {
      const formData = new FormData()
      formData.set('case_type', caseType)
      formData.set('primary_client_id', primaryClientId)
      formData.set('secondary_client_id', secondaryClientId)
      formData.set('package_type', packageType)
      formData.set('notes', notes)
      selectedForms.forEach((f) => formData.append('form_types', f))

      const caseId = await createCase(formData)
      router.push(`/cases/${caseId}`)
    } catch (err: any) {
      setError(err.message ?? 'Failed to create case')
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">New Case</h2>
        <p className="text-sm text-slate-400 mt-0.5">Open a new immigration case</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600 font-medium">{error}</p>
          </div>
        )}

        {/* Case Type */}
        <div className="bg-white rounded-xl p-6" style={{ boxShadow: '0 12px 32px -4px rgba(0, 105, 112, 0.04)' }}>
          <h3 className="text-base font-semibold text-slate-800 mb-4 pb-3 border-b border-[#ebeef3]">
            Case Type
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'simple', label: 'Simple Case', desc: 'One client, one or more forms', icon: 'person' },
              { value: 'package', label: 'Package Case', desc: 'Petitioner + beneficiary, bundled forms', icon: 'group' },
            ].map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setCaseType(type.value as 'simple' | 'package')}
                className="flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left"
                style={
                  caseType === type.value
                    ? { borderColor: '#3AAFB9', backgroundColor: 'rgba(58, 175, 185, 0.05)' }
                    : { borderColor: '#ebeef3', backgroundColor: '#f7f9ff' }
                }
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor:
                      caseType === type.value ? 'rgba(58, 175, 185, 0.15)' : '#ebeef3',
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ color: caseType === type.value ? '#3AAFB9' : '#6d797a' }}
                  >
                    {type.icon}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{type.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{type.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Clients */}
        <div className="bg-white rounded-xl p-6" style={{ boxShadow: '0 12px 32px -4px rgba(0, 105, 112, 0.04)' }}>
          <h3 className="text-base font-semibold text-slate-800 mb-4 pb-3 border-b border-[#ebeef3]">
            {caseType === 'package' ? 'Clients (Petitioner + Beneficiary)' : 'Client'}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                {caseType === 'package' ? 'Primary Client (Petitioner) ID' : 'Client ID'}{' '}
                <span className="text-red-400">*</span>
              </label>
              <input
                value={primaryClientId}
                onChange={(e) => setPrimaryClientId(e.target.value)}
                placeholder="Paste client UUID or search above..."
                className="w-full px-4 py-2.5 bg-[#f7f9ff] border border-[#bcc9ca]/30 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 font-mono placeholder:text-slate-400 transition-all"
                style={{ '--tw-ring-color': '#3AAFB9' } as React.CSSProperties}
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Go to the client profile and copy their ID from the URL
              </p>
            </div>
            {caseType === 'package' && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Secondary Client (Beneficiary) ID
                </label>
                <input
                  value={secondaryClientId}
                  onChange={(e) => setSecondaryClientId(e.target.value)}
                  placeholder="Paste beneficiary client UUID..."
                  className="w-full px-4 py-2.5 bg-[#f7f9ff] border border-[#bcc9ca]/30 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 font-mono placeholder:text-slate-400 transition-all"
                  style={{ '--tw-ring-color': '#3AAFB9' } as React.CSSProperties}
                />
              </div>
            )}
          </div>
        </div>

        {/* Forms */}
        <div className="bg-white rounded-xl p-6" style={{ boxShadow: '0 12px 32px -4px rgba(0, 105, 112, 0.04)' }}>
          <h3 className="text-base font-semibold text-slate-800 mb-4 pb-3 border-b border-[#ebeef3]">
            Form Selection
          </h3>

          {caseType === 'package' && (
            <div className="mb-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                Package Templates
              </p>
              <div className="flex gap-2 flex-wrap">
                {PACKAGE_TEMPLATES.map((pkg) => (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => applyPackageTemplate(pkg.id)}
                    className="px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-all"
                    style={
                      packageType === pkg.id
                        ? { borderColor: '#3AAFB9', backgroundColor: 'rgba(58, 175, 185, 0.08)', color: '#006970' }
                        : { borderColor: '#ebeef3', color: '#6d797a' }
                    }
                  >
                    {pkg.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
            Individual Forms
          </p>
          <div className="grid grid-cols-2 gap-2">
            {FORM_OPTIONS.map((form) => {
              const selected = selectedForms.includes(form.id)
              return (
                <button
                  key={form.id}
                  type="button"
                  onClick={() => toggleForm(form.id)}
                  className="flex items-center gap-3 p-3 rounded-lg border transition-all text-left"
                  style={
                    selected
                      ? { borderColor: '#3AAFB9', backgroundColor: 'rgba(58, 175, 185, 0.05)' }
                      : { borderColor: '#ebeef3' }
                  }
                >
                  <div
                    className="w-5 h-5 rounded flex items-center justify-center shrink-0 border-2 transition-all"
                    style={
                      selected
                        ? { backgroundColor: '#3AAFB9', borderColor: '#3AAFB9' }
                        : { borderColor: '#bcc9ca' }
                    }
                  >
                    {selected && (
                      <span className="material-symbols-outlined text-white text-xs" style={{ fontSize: '14px' }}>
                        check
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{form.name}</p>
                    <p className="text-[11px] text-slate-400">{form.description}</p>
                  </div>
                </button>
              )
            })}
          </div>
          {selectedForms.length > 0 && (
            <p className="mt-3 text-xs text-[#006970] font-semibold">
              {selectedForms.length} form{selectedForms.length !== 1 ? 's' : ''} selected:{' '}
              {selectedForms.map((f) => f.toUpperCase()).join(', ')}
            </p>
          )}
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl p-6" style={{ boxShadow: '0 12px 32px -4px rgba(0, 105, 112, 0.04)' }}>
          <h3 className="text-base font-semibold text-slate-800 mb-4 pb-3 border-b border-[#ebeef3]">
            Notes
          </h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Any initial notes about this case..."
            className="w-full px-4 py-2.5 bg-[#f7f9ff] border border-[#bcc9ca]/30 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 placeholder:text-slate-400 transition-all resize-none"
            style={{ '--tw-ring-color': '#3AAFB9' } as React.CSSProperties}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-white text-sm font-semibold disabled:opacity-70 transition-all"
            style={{ backgroundColor: '#3AAFB9' }}
          >
            {saving ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creating...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">create_new_folder</span>
                Create Case
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold text-slate-600 border border-[#bcc9ca]/40 hover:bg-[#f1f4f9] transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
