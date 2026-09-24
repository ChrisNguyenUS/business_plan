// Row shapes and tuning constants for the Leads feature. Deliberately NOT in
// actions/leads.ts: that file is 'use server', and every export of a
// 'use server' module must be an async function.

import type { GrowthEventType, JourneyStage, LeadStatus } from '@mannaos/n400-growth'

export const LEADS_PAGE_SIZE = 50
export const TIMELINE_LIMIT = 100

export interface LeadRow {
  user_id: string
  full_name: string | null
  email: string | null
  journey_stage: JourneyStage | null
  interview_date: string | null
  effective_score: number
  effective_status: LeadStatus
  current_streak: number | null
  last_activity_date: string | null
}

export interface LeadDetail extends LeadRow {
  n400_filed: boolean | null
  filing_timeline: string | null
  interview_scheduled: boolean | null
  wants_guidance: string | null
  service_interest: string[]
  lead_score: number
  consultation_requested_at: string | null
  consultation_booked_at: string | null
  first_touch: Record<string, unknown> | null
  last_touch: Record<string, unknown> | null
  created_at: string
  account_created_at: string | null
}

export interface TimelineRow {
  id: string
  event_type: GrowthEventType
  payload: Record<string, unknown>
  created_at: string
}

export interface WeakSection {
  section: string
  graded_total: number
  correct_pct: number
}

export const LEADS_LIST_COLUMNS =
  'user_id, full_name, email, journey_stage, interview_date, effective_score, effective_status, current_streak, last_activity_date'
