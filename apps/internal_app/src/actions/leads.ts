'use server'

import { createClient } from '@/lib/supabase/server'
import {
  LEADS_LIST_COLUMNS,
  LEADS_PAGE_SIZE,
  TIMELINE_LIMIT,
  type LeadDetail,
  type LeadRow,
  type TimelineRow,
  type WeakSection,
} from '@/lib/n400/leads-shape'

/**
 * One page of leads, highest effective score first.
 *
 * role = 'client' is not optional. The account_created trigger fires on every
 * profiles INSERT and the scoring trigger gives everyone an n400_lead_profiles
 * row, so without this filter every staff and admin account appears as a cold
 * lead.
 */
export async function getLeads(params: {
  q?: string
  status?: string
  page?: number
}): Promise<{ leads: LeadRow[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, params.page ?? 1)
  const supabase = await createClient()

  let query = supabase
    .from('n400_leads_view')
    .select(LEADS_LIST_COLUMNS, { count: 'exact' })
    .eq('role', 'client')
    .order('effective_score', { ascending: false })
    // Secondary key so paging is stable when scores tie.
    .order('user_id', { ascending: true })

  if (params.status) query = query.eq('effective_status', params.status)
  if (params.q) {
    const term = params.q.replace(/[%,()]/g, '')
    if (term) query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%`)
  }

  const from = (page - 1) * LEADS_PAGE_SIZE
  const { data, error, count } = await query.range(from, from + LEADS_PAGE_SIZE - 1)
  // Throw rather than returning []: an RLS-filtered result and a genuinely
  // empty list look identical, and that ambiguity is what makes this feature
  // hard to debug.
  if (error) throw error

  return {
    leads: (data ?? []) as unknown as LeadRow[],
    total: count ?? 0,
    page,
    pageSize: LEADS_PAGE_SIZE,
  }
}

/** One lead, or null when the id does not exist or RLS hides it. */
export async function getLead(userId: string): Promise<LeadDetail | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('n400_leads_view')
    .select('*')
    .eq('role', 'client')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return (data as unknown as LeadDetail) ?? null
}

/** Most recent events first, capped. Also returns the true total. */
export async function getLeadTimeline(
  userId: string,
): Promise<{ events: TimelineRow[]; total: number }> {
  const supabase = await createClient()
  const { data, error, count } = await supabase
    .from('n400_growth_events')
    .select('id, event_type, payload, created_at', { count: 'exact' })
    // Explicit user filter — the staff read policy is not a scope filter.
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(TIMELINE_LIMIT)
  if (error) throw error
  return { events: (data ?? []) as unknown as TimelineRow[], total: count ?? 0 }
}

/** Weakest graded section, or null when the lead has no graded attempts. */
export async function getLeadWeakSection(userId: string): Promise<WeakSection | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('n400_weak_section_for', {
    p_user_id: userId,
  })
  if (error) throw error
  const rows = (data ?? []) as WeakSection[]
  return rows[0] ?? null
}
