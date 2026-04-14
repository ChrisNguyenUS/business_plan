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
    <div className="flex flex-col min-h-screen">
      <CopyPasteScreen formDef={formDef} client={client} caseId={caseId} />
    </div>
  )
}
