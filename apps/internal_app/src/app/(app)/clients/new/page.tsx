import { notFound, redirect } from 'next/navigation'
import { ClientForm } from '@/components/clients/ClientForm'
import { getLeadConversion, getLeadPrefill } from '@/actions/leads'

export const dynamic = 'force-dynamic'

export default async function NewClientPage({
  searchParams,
}: {
  searchParams: Promise<{ fromLead?: string }>
}) {
  const { fromLead } = await searchParams

  let prefill: Awaited<ReturnType<typeof getLeadPrefill>> = null
  if (fromLead !== undefined) {
    // Already converted → go to that client instead of offering a duplicate.
    const existing = await getLeadConversion(fromLead)
    if (existing) redirect(`/clients/${existing}`)
    // Bad id, staff/admin account, or hidden by RLS.
    prefill = await getLeadPrefill(fromLead)
    if (!prefill) notFound()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">New Client</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          Create a client profile — enter once, reuse across all cases
        </p>
      </div>
      {prefill && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-[rgba(58,175,185,0.08)] text-sm text-[#006970]">
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          <span>
            Converting N400Ready lead <strong>{prefill.displayName}</strong> — check the details
            and enter date of birth to finish.
          </span>
        </div>
      )}
      <div
        className="bg-white rounded-xl p-8"
        style={{ boxShadow: '0 12px 32px -4px rgba(0, 105, 112, 0.04)' }}
      >
        <ClientForm
          defaultValues={prefill?.values}
          sourceLeadId={prefill ? fromLead : undefined}
        />
      </div>
    </div>
  )
}
