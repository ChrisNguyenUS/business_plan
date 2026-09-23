// Union types mirroring the CHECK constraints on the growth tables
// (n400_15_growth_tables.sql), so app code and database agree on the
// allowed values.

export type JourneyStage =
  | 'exploring'
  | 'preparing'
  | 'filed'
  | 'waiting_interview'
  | 'interview_scheduled';

export type FilingTimeline = '30d' | '3m' | '6m' | 'exploring';

export type WantsGuidance = 'yes' | 'maybe' | 'no';

export type LeadStatus = 'cold' | 'warm' | 'hot' | 'sales_ready';

export type ConsultationStatus =
  | 'new'
  | 'contacted'
  | 'booked'
  | 'done'
  | 'no_show'
  | 'cancelled';

export type ConsultationOutcome = 'won' | 'lost' | 'follow_up';

// Mirrors booking.ts CONSULTATION_TOPICS, including 'document_prep' which the
// database only started accepting in n400_28.
export type ConsultationTopic =
  | 'document_prep'
  | 'n400_review'
  | 'interview_prep'
  | 'writing'
  | 'speaking'
  | 'other';

/** Section keys used by the Speaking/Writing study sections. Mirrors
 *  apps/website/src/lib/n400/section-progress.ts SECTION_KEYS, in the same
 *  order — the order is the documented tie-break for "weakest section". */
export const SECTION_KEYS = ['whatmean', 'yesno', 'writing'] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];
