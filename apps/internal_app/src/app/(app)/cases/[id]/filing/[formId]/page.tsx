import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getForm } from '@/lib/forms'
import { CopyPasteScreen } from '@/components/filing/CopyPasteScreen'

export const dynamic = 'force-dynamic'

export default async function FilingScreenPage({
  params,
}: {
  params: Promise<{ id: string; formId: string }>
}) {
  const { id: caseId, formId } = await params
  const supabase = await createClient()

  // Get case form
  const { data: caseForm, error: formError } = await supabase
    .from('case_forms')
    .select('*, case:cases(primary_client_id, secondary_client_id)')
    .eq('id', formId)
    .single()

  if (formError || !caseForm) notFound()

  // Get client data
  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', (caseForm.case as any).primary_client_id)
    .single()

  if (!client) notFound()

  const formDef = getForm(caseForm.form_type)
  if (!formDef) {
    return (
      <div className="p-8 text-center text-slate-500">
        No filing definition found for form type: {caseForm.form_type}
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/cases/${caseId}`}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
        </Link>
        <div>
          <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">
            {formDef.name}
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {client.last_name}, {client.first_name} — Mode A: Copy & Paste
          </p>
        </div>
      </div>

      {/* UPL Disclaimer */}
      <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50">
        <span className="material-symbols-outlined text-amber-500 shrink-0">info</span>
        <div>
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">
            UPL Notice — Texas TDPSA Compliance
          </p>
          <p className="text-sm text-amber-600">
            This screen provides pre-filled data for you to copy into the official USCIS portal.
            Manna One Solution is a registered immigration consultant. All form advice and preparation
            must be reviewed and approved by the supervising authorized representative before submission.
          </p>
        </div>
      </div>

      {/* Copy-Paste Fields */}
      <CopyPasteScreen formDef={formDef} client={client} />
    </div>
  )
}
