'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ServiceTag } from '@/types'

const CROSS_SELL_RULES: Record<string, { services: ServiceTag[]; label: string }> = {
  approved: { services: ['tax', 'insurance'], label: 'Case Approved' },
  receipt_received: { services: ['tax'], label: 'Receipt Received' },
  interview_scheduled: { services: ['insurance'], label: 'Interview Scheduled' },
}

const SERVICE_LABELS: Record<ServiceTag, string> = {
  immigration: 'Immigration',
  tax: 'Tax Services',
  insurance: 'Insurance',
  ai: 'AI Services',
}

export interface CrossSellOpportunity {
  caseId: string
  clientId: string
  clientName: string
  triggerLabel: string
  formTypes: string[]
  suggestedServices: { type: ServiceTag; label: string }[]
}

export async function getCrossSellOpportunities(): Promise<CrossSellOpportunity[]> {
  const supabase = await createClient()

  const { data: cases } = await supabase
    .from('cases')
    .select(`
      id, status, created_at,
      primary_client:clients!cases_primary_client_id_fkey(id, first_name, last_name, services_used),
      case_forms(form_type)
    `)
    .in('status', Object.keys(CROSS_SELL_RULES))
    .order('created_at', { ascending: false })
    .limit(20)

  if (!cases) return []

  const opportunities: CrossSellOpportunity[] = []

  for (const c of cases) {
    const rule = CROSS_SELL_RULES[c.status]
    if (!rule) continue

    const client = c.primary_client as any
    if (!client?.id) continue

    const existingServices: string[] = client.services_used ?? []
    const suggestedServices = rule.services
      .filter((s) => !existingServices.includes(s))
      .map((s) => ({ type: s, label: SERVICE_LABELS[s] }))

    if (suggestedServices.length === 0) continue

    opportunities.push({
      caseId: c.id,
      clientId: client.id,
      clientName: `${client.first_name} ${client.last_name}`,
      triggerLabel: rule.label,
      formTypes: (c.case_forms as any[]).map((f: any) => f.form_type.toUpperCase()),
      suggestedServices,
    })
  }

  return opportunities.slice(0, 5)
}

export async function createCrossSellJob(
  clientId: string,
  caseId: string,
  serviceType: ServiceTag
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase.from('jobs').insert({
    client_id: clientId,
    case_id: caseId,
    service_type: serviceType,
    description: `${SERVICE_LABELS[serviceType]} — cross-sell opportunity`,
    status: 'open',
    created_by: user.id,
  })
  if (error) throw error

  const { data: client } = await supabase
    .from('clients')
    .select('services_used')
    .eq('id', clientId)
    .single()

  const existing: string[] = client?.services_used ?? []
  if (!existing.includes(serviceType)) {
    await supabase
      .from('clients')
      .update({ services_used: [...existing, serviceType] })
      .eq('id', clientId)
  }

  revalidatePath('/dashboard')
  return { success: true }
}
