'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { CaseStatus, FormType } from '@/types'

export async function getCases(filters?: {
  status?: CaseStatus
  formType?: FormType
  clientId?: string
}) {
  const supabase = await createClient()
  let q = supabase
    .from('cases')
    .select(`
      id, case_type, package_type, status, created_at, notes,
      primary_client:clients!cases_primary_client_id_fkey(id, first_name, last_name, a_number),
      secondary_client:clients!cases_secondary_client_id_fkey(id, first_name, last_name),
      case_forms(id, form_type, filing_mode, receipt_number, current_uscis_status)
    `)
    .order('created_at', { ascending: false })

  if (filters?.status) {
    q = q.eq('status', filters.status)
  }
  if (filters?.clientId) {
    q = q.or(
      `primary_client_id.eq.${filters.clientId},secondary_client_id.eq.${filters.clientId}`
    )
  }

  const { data, error } = await q
  if (error) throw error
  return data ?? []
}

export async function getCase(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cases')
    .select(`
      *,
      primary_client:clients!cases_primary_client_id_fkey(*),
      secondary_client:clients!cases_secondary_client_id_fkey(*),
      case_forms(*),
      documents(*),
      payments(*),
      expenses(*)
    `)
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createCase(formData: FormData) {
  const supabase = await createClient()

  const caseType = formData.get('case_type') as string
  const primaryClientId = formData.get('primary_client_id') as string
  const secondaryClientId = (formData.get('secondary_client_id') as string) || null
  const packageType = (formData.get('package_type') as string) || null
  const formTypes = formData.getAll('form_types') as FormType[]
  const notes = (formData.get('notes') as string) || null

  // Create the case
  const { data: caseData, error: caseError } = await supabase
    .from('cases')
    .insert({
      case_type: caseType,
      package_type: packageType || null,
      primary_client_id: primaryClientId,
      secondary_client_id: secondaryClientId,
      status: 'documents_pending',
      notes,
    })
    .select('id')
    .single()

  if (caseError) throw caseError

  const caseId = caseData.id

  // Create case_forms for each selected form type
  if (formTypes.length > 0) {
    const mailForms = ['i131', 'i864', 'i693']
    const caseForms = formTypes.map((ft) => ({
      case_id: caseId,
      form_type: ft,
      filing_mode: mailForms.includes(ft) ? 'mail' : 'online',
    }))

    const { error: formsError, data: insertedForms } = await supabase
      .from('case_forms')
      .insert(caseForms)
      .select('id, form_type')
    if (formsError) throw formsError

    const formIdByType = new Map(
      (insertedForms ?? []).map((f: any) => [f.form_type, f.id])
    )

    // Populate document checklist from templates
    const { data: templates } = await supabase
      .from('checklist_templates')
      .select('*')
      .in('form_type', formTypes)

    if (templates && templates.length > 0) {
      const docItems = templates.flatMap((t: any) =>
        (t.items as Array<{ label: string; required: boolean; order: number }>).map((item) => ({
          case_id: caseId,
          case_form_id: formIdByType.get(t.form_type) ?? null,
          label: item.label,
          required: item.required,
          received: false,
        }))
      )
      if (docItems.length > 0) {
        await supabase.from('documents').insert(docItems)
      }
    }
  }

  revalidatePath('/cases')
  return caseId
}

export async function updateCaseStatus(id: string, status: CaseStatus) {
  const supabase = await createClient()
  const { error } = await supabase.from('cases').update({ status }).eq('id', id)
  if (error) throw error
  revalidatePath(`/cases/${id}`)
  revalidatePath('/cases')
}

export async function updateReceiptNumber(
  caseFormId: string,
  receiptNumber: string
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('case_forms')
    .update({ receipt_number: receiptNumber.trim().toUpperCase() })
    .eq('id', caseFormId)
  if (error) throw error
  revalidatePath('/cases')
}

export async function toggleDocumentReceived(docId: string, received: boolean, caseId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('documents')
    .update({ received })
    .eq('id', docId)
  if (error) throw error
  revalidatePath(`/cases/${caseId}`)
}
