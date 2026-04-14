import { ClientForm } from '@/components/clients/ClientForm'

export default function NewClientPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">New Client</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          Create a client profile — enter once, reuse across all cases
        </p>
      </div>
      <div
        className="bg-white rounded-xl p-8"
        style={{ boxShadow: '0 12px 32px -4px rgba(0, 105, 112, 0.04)' }}
      >
        <ClientForm />
      </div>
    </div>
  )
}
