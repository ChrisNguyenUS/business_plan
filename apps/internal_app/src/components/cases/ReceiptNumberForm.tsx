'use client'

import { useState } from 'react'
import { updateReceiptNumber } from '@/actions/cases'
import { isValidReceiptNumber } from '@/lib/utils'

interface FormWithReceipt {
  id: string
  form_type: string
  receipt_number: string | null
  current_uscis_status: string | null
}

export default function ReceiptNumberSection({
  forms,
}: {
  forms: FormWithReceipt[]
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [localForms, setLocalForms] = useState(forms)

  async function handleSave(formId: string) {
    if (!isValidReceiptNumber(value)) {
      setError('Format: 3 letters + 10 digits (e.g. IOE0912345678)')
      return
    }
    setLoading(true)
    try {
      await updateReceiptNumber(formId, value)
      setLocalForms((prev) =>
        prev.map((f) => (f.id === formId ? { ...f, receipt_number: value.trim().toUpperCase() } : f))
      )
      setEditingId(null)
      setValue('')
      setError('')
    } catch {
      setError('Failed to save')
    }
    setLoading(false)
  }

  const formsWithReceipt = localForms.filter((f) => f.receipt_number)
  const formsWithoutReceipt = localForms.filter((f) => !f.receipt_number)

  return (
    <section>
      <h4 className="text-sm font-black text-on-surface-variant uppercase tracking-widest mb-4">
        Receipt Numbers
      </h4>
      <div className="space-y-3">
        {formsWithReceipt.map((form) => (
          <div key={form.id} className="bg-surface-container p-4 rounded-xl border border-outline-variant/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-on-surface">{form.receipt_number}</span>
              <span className="text-[10px] font-bold text-primary px-2 py-0.5 bg-white/50 rounded uppercase">
                {form.form_type}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="material-symbols-outlined text-primary text-sm">sync</span>
              <span className="text-xs font-medium text-tertiary">
                Status: {form.current_uscis_status || 'Checking...'}
              </span>
            </div>
          </div>
        ))}

        {formsWithoutReceipt.length > 0 && editingId ? (
          <div className="bg-surface-container-low p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-on-surface">
                Add for {localForms.find((f) => f.id === editingId)?.form_type.toUpperCase()}
              </span>
              <button onClick={() => { setEditingId(null); setError('') }} className="text-xs text-tertiary hover:text-on-surface">
                Cancel
              </button>
            </div>
            <input
              value={value}
              onChange={(e) => { setValue(e.target.value); setError('') }}
              placeholder="IOE0912345678"
              className="w-full px-3 py-2 text-sm border border-outline-variant/30 rounded-lg focus:ring-2 focus:ring-primary-container focus:border-transparent outline-none"
            />
            {error && <p className="text-xs text-error">{error}</p>}
            <button
              onClick={() => handleSave(editingId)}
              disabled={loading || !value.trim()}
              className="w-full py-2 bg-primary-container text-white text-xs font-bold rounded-lg hover:brightness-105 transition-all disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Receipt Number'}
            </button>
          </div>
        ) : (
          formsWithoutReceipt.length > 0 && (
            <div className="space-y-2">
              {formsWithoutReceipt.map((form) => (
                <button
                  key={form.id}
                  onClick={() => { setEditingId(form.id); setValue(''); setError('') }}
                  className="w-full py-3 bg-surface-container-low text-tertiary text-xs font-bold rounded-xl border-2 border-dashed border-outline-variant/20 hover:border-primary-container hover:text-primary transition-all"
                >
                  + Add Receipt Number for {form.form_type.toUpperCase()}
                </button>
              ))}
            </div>
          )
        )}

        {formsWithoutReceipt.length === 0 && formsWithReceipt.length === 0 && (
          <div className="p-4 text-center text-xs text-tertiary bg-surface-container-low rounded-xl">
            No forms added to this case.
          </div>
        )}
      </div>
    </section>
  )
}
