'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient_, updateClient } from '@/actions/clients'

interface Props {
  defaultValues?: Record<string, any>
  clientId?: string
}

function Field({
  label,
  name,
  type = 'text',
  defaultValue,
  required,
  placeholder,
  hint,
}: {
  label: string
  name: string
  type?: string
  defaultValue?: string
  required?: boolean
  placeholder?: string
  hint?: string
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue ?? ''}
        required={required}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 bg-[#f7f9ff] border border-[#bcc9ca]/30 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 placeholder:text-slate-400 transition-all"
        style={{ '--tw-ring-color': '#3AAFB9' } as React.CSSProperties}
      />
      {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
    </div>
  )
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string
  name: string
  defaultValue?: string
  options: { value: string; label: string }[]
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <select
        name={name}
        defaultValue={defaultValue ?? ''}
        className="w-full px-4 py-2.5 bg-[#f7f9ff] border border-[#bcc9ca]/30 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 transition-all"
        style={{ '--tw-ring-color': '#3AAFB9' } as React.CSSProperties}
      >
        <option value="">— Select —</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h3 className="text-base font-semibold text-slate-800 border-b border-[#ebeef3] pb-3 mb-5">
      {title}
    </h3>
  )
}

export function ClientForm({ defaultValues, clientId }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const d = defaultValues ?? {}
  const addr = (d.address as Record<string, string>) ?? {}

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const formData = new FormData(e.currentTarget)

    try {
      if (clientId) {
        await updateClient(clientId, formData)
        router.push(`/clients/${clientId}`)
      } else {
        const id = await createClient_(formData)
        router.push(`/clients/${id}`)
      }
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-10 max-w-3xl">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600 font-medium">{error}</p>
        </div>
      )}

      {/* Personal Information */}
      <section>
        <SectionHeader title="Personal Information" />
        <div className="grid grid-cols-3 gap-4 mb-4">
          <Field label="First Name" name="first_name" defaultValue={d.first_name} required />
          <Field label="Middle Name" name="middle_name" defaultValue={d.middle_name} />
          <Field label="Last Name" name="last_name" defaultValue={d.last_name} required />
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Field
            label="Date of Birth"
            name="date_of_birth"
            type="date"
            defaultValue={d.date_of_birth}
            required
          />
          <Field
            label="Country of Birth"
            name="country_of_birth"
            defaultValue={d.country_of_birth}
          />
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Field
            label="A-Number (Alien Registration)"
            name="a_number"
            defaultValue={d.a_number}
            placeholder="A000000000"
            hint="Format: A followed by 9 digits"
          />
          <Field
            label="Social Security Number"
            name="ssn"
            defaultValue={d.ssn}
            placeholder="XXX-XX-XXXX"
            hint="Stored encrypted at rest"
          />
        </div>
        <SelectField
          label="Marital Status"
          name="marital_status"
          defaultValue={d.marital_status}
          options={[
            { value: 'single', label: 'Single' },
            { value: 'married', label: 'Married' },
            { value: 'divorced', label: 'Divorced' },
            { value: 'widowed', label: 'Widowed' },
            { value: 'separated', label: 'Separated' },
          ]}
        />
      </section>

      {/* Contact Information */}
      <section>
        <SectionHeader title="Contact Information" />
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Phone"
            name="phone"
            type="tel"
            defaultValue={d.phone}
            placeholder="(713) 555-1234"
          />
          <Field
            label="Email"
            name="email"
            type="email"
            defaultValue={d.email}
            placeholder="client@email.com"
          />
        </div>
      </section>

      {/* Current Address */}
      <section>
        <SectionHeader title="Current Address" />
        <div className="mb-4">
          <Field
            label="Street Address"
            name="address_street"
            defaultValue={addr.street}
            placeholder="1234 Main St, Apt 5"
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field
            label="City"
            name="address_city"
            defaultValue={addr.city}
            placeholder="Houston"
          />
          <Field
            label="State"
            name="address_state"
            defaultValue={addr.state}
            placeholder="TX"
          />
          <Field
            label="ZIP Code"
            name="address_zip"
            defaultValue={addr.zip}
            placeholder="77001"
          />
        </div>
      </section>

      {/* Notes */}
      <section>
        <SectionHeader title="Notes" />
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Internal Notes
          </label>
          <textarea
            name="notes"
            rows={4}
            defaultValue={d.notes ?? ''}
            placeholder="Any additional notes about this client..."
            className="w-full px-4 py-2.5 bg-[#f7f9ff] border border-[#bcc9ca]/30 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 placeholder:text-slate-400 transition-all resize-none"
            style={{ '--tw-ring-color': '#3AAFB9' } as React.CSSProperties}
          />
        </div>
      </section>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-[#ebeef3]">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-white text-sm font-semibold disabled:opacity-70 transition-all"
          style={{ backgroundColor: saving ? '#2D8E96' : '#3AAFB9' }}
        >
          {saving ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Saving...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-lg">save</span>
              {clientId ? 'Save Changes' : 'Create Client'}
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
  )
}
