'use server'
import { createClient } from '@/lib/supabase/server'
import { fetchUscisStatus } from '@/lib/uscis/status'
import { revalidatePath } from 'next/cache'

export async function setReceiptNumber(caseFormId: string, receiptNumber: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('case_forms')
    .update({ receipt_number: receiptNumber })
    .eq('id', caseFormId)
  if (error) throw error
  revalidatePath('/tracker')
}

export async function checkCaseStatus(caseFormId: string) {
  const supabase = await createClient()
  const { data: caseForm, error } = await supabase
    .from('case_forms')
    .select('receipt_number')
    .eq('id', caseFormId)
    .single()

  if (error || !caseForm?.receipt_number) throw new Error('Cannot check status without receipt number')

  const { status, description } = await fetchUscisStatus(caseForm.receipt_number)

  // Record history
  await supabase.from('status_history').insert({
    case_form_id: caseFormId,
    status,
    description,
    source: 'uscis_api'
  })

  // Update current status
  await supabase
    .from('case_forms')
    .update({ 
      current_uscis_status: status,
      last_checked_at: new Date().toISOString()
    })
    .eq('id', caseFormId)

  revalidatePath('/tracker')
}
