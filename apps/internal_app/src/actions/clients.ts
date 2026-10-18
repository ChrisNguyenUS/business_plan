'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { isUuid } from '@/lib/n400/lead-prefill'

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

export async function createClient_(formData: FormData) {
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
    services_used: [],
    notes: (formData.get('notes') as string) || null,
    // Set only by Convert to Client (hidden field). A label, never user_id.
    source_lead_id: isUuid(formData.get('source_lead_id') as string | null)
      ? (formData.get('source_lead_id') as string)
      : null,
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
    if (
      error.code === '23505' &&
      error.message.includes('clients_source_lead_id_key') &&
      payload.source_lead_id
    ) {
      const { data: existing, error: lookupError } = await supabase
        .from('clients')
        .select('id')
        .eq('source_lead_id', payload.source_lead_id)
        .single()
      if (lookupError) throw lookupError
      return existing.id as string
    }
    throw error
  }
  revalidatePath('/clients')
  if (payload.source_lead_id) {
    revalidatePath('/leads')
    revalidatePath(`/leads/${payload.source_lead_id}`)
  }
  return data.id as string
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
