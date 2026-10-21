'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { isSourceLeadDuplicate, isUuid } from '@/lib/n400/lead-prefill'
import { getCurrentAdminId } from '@/lib/auth/is-admin'
import { deleteClientRow } from '@/lib/deletion/perform'
import { closePendingFor, deletionDeps } from '@/lib/deletion/flow'
import type { Result } from '@/lib/jobs/types'

export async function getClients(query?: string) {
  const supabase = await createClient()
  let q = supabase
    .from('clients')
    .select(
      'id, first_name, middle_name, last_name, phone, email, a_number, services_used, created_at'
    )
    .order('last_name')

  if (query) {
    q = q.or(
      `last_name.ilike.%${query}%,first_name.ilike.%${query}%,a_number.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`
    )
  }

  const { data, error } = await q
  if (error) throw error
  return data ?? []
}

export async function getClient(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createClient_(
  formData: FormData,
): Promise<{ id: string; alreadyConverted: boolean }> {
  const supabase = await createClient()

  // The hidden field can be tampered with: only keep a lead staff can actually
  // see as a client-role lead, otherwise store null (a bad uuid would be an
  // unreadable FK error).
  let sourceLeadId: string | null = null
  const postedLead = formData.get('source_lead_id') as string | null
  if (isUuid(postedLead)) {
    const { data: lead, error: leadError } = await supabase
      .from('n400_leads_view')
      .select('user_id')
      .eq('role', 'client')
      .eq('user_id', postedLead)
      .maybeSingle()
    if (leadError) throw leadError
    if (lead) sourceLeadId = postedLead
  }

  const payload = {
    first_name: formData.get('first_name') as string,
    middle_name: (formData.get('middle_name') as string) || null,
    last_name: formData.get('last_name') as string,
    date_of_birth: formData.get('date_of_birth') as string,
    country_of_birth: (formData.get('country_of_birth') as string) || null,
    a_number: (formData.get('a_number') as string) || null,
    ssn: (formData.get('ssn') as string) || null,
    phone: (formData.get('phone') as string) || null,
    email: (formData.get('email') as string) || null,
    marital_status: (formData.get('marital_status') as string) || null,
    address: {
      street: formData.get('address_street') || '',
      city: formData.get('address_city') || '',
      state: formData.get('address_state') || '',
      zip: formData.get('address_zip') || '',
    },
    services_used: [],
    notes: (formData.get('notes') as string) || null,
    // Set only by Convert to Client (hidden field). A label, never user_id.
    source_lead_id: sourceLeadId,
  }

  const { data, error } = await supabase
    .from('clients')
    .insert(payload)
    .select('id')
    .single()

  if (error) {
    // Lead already converted (double submit, Back + resubmit, two staff at
    // once). Land on the existing client instead of failing: Next hides
    // thrown messages in production, so an error here would be unreadable.
    if (isSourceLeadDuplicate(error) && payload.source_lead_id) {
      const { data: existing, error: lookupError } = await supabase
        .from('clients')
        .select('id')
        .eq('source_lead_id', payload.source_lead_id)
        .single()
      if (lookupError) throw lookupError
      return { id: existing.id as string, alreadyConverted: true }
    }
    throw error
  }
  revalidatePath('/clients')
  if (payload.source_lead_id) {
    revalidatePath('/leads')
    revalidatePath(`/leads/${payload.source_lead_id}`)
  }
  return { id: data.id as string, alreadyConverted: false }
}

export async function updateClient(id: string, formData: FormData) {
  const supabase = await createClient()

  const payload = {
    first_name: formData.get('first_name') as string,
    middle_name: (formData.get('middle_name') as string) || null,
    last_name: formData.get('last_name') as string,
    date_of_birth: formData.get('date_of_birth') as string,
    country_of_birth: (formData.get('country_of_birth') as string) || null,
    a_number: (formData.get('a_number') as string) || null,
    ssn: (formData.get('ssn') as string) || null,
    phone: (formData.get('phone') as string) || null,
    email: (formData.get('email') as string) || null,
    marital_status: (formData.get('marital_status') as string) || null,
    address: {
      street: formData.get('address_street') || '',
      city: formData.get('address_city') || '',
      state: formData.get('address_state') || '',
      zip: formData.get('address_zip') || '',
    },
    notes: (formData.get('notes') as string) || null,
  }

  const { error } = await supabase.from('clients').update(payload).eq('id', id)
  if (error) throw error

  revalidatePath(`/clients/${id}`)
  revalidatePath('/clients')
}

export async function updateClientServices(id: string, services: string[]) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('clients')
    .update({ services_used: services })
    .eq('id', id)
  if (error) throw error
  revalidatePath(`/clients/${id}`)
}

/**
 * Admin only: permanently delete a client that has no cases and no jobs, then
 * go back to the list. Same code as approving a staff request
 * (lib/deletion/perform.ts); RLS "clients admin delete" (009) is the real gate.
 */
export async function deleteClient(id: string): Promise<Result<never>> {
  if (!isUuid(id)) return { ok: false, error: 'Unknown client.' }
  const adminId = await getCurrentAdminId()
  if (!adminId) return { ok: false, error: 'Only an admin can delete clients.' }

  const supabase = await createClient()
  const result = await deleteClientRow(supabase, id)
  if (!result.ok) return result
  for (const path of result.value) revalidatePath(path)
  await closePendingFor(deletionDeps(supabase), 'client', id, adminId)
  revalidatePath('/deletion-requests')
  redirect('/clients')
}
