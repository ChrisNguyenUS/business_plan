export type ServiceTag = 'immigration' | 'tax' | 'insurance' | 'ai'

export type FormType =
  | 'n400'
  | 'i485'
  | 'i130'
  | 'i765'
  | 'i131'
  | 'i864'
  | 'i693'
  | 'i140'
  | 'i129'
  | 'i589'

export type CaseStatus =
  | 'drafting'
  | 'awaiting_docs'
  | 'under_review'
  | 'rfe_issued'
  | 'rfe_submitted'
  | 'interview_scheduled'
  | 'approved'
  | 'denied'

export const CASE_STATUS_COLORS: Record<CaseStatus, string> = {
  drafting: 'bg-primary/10 text-primary',
  awaiting_docs: 'bg-amber-100 text-amber-700',
  under_review: 'bg-blue-100 text-blue-700',
  rfe_issued: 'bg-error-container/50 text-error',
  rfe_submitted: 'bg-green-100 text-green-700',
  interview_scheduled: 'bg-slate-200 text-slate-700',
  approved: 'bg-green-600 text-white',
  denied: 'bg-red-600 text-white',
}

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  drafting: 'DRAFTING',
  awaiting_docs: 'AWAITING DOCS',
  under_review: 'UNDER REVIEW',
  rfe_issued: 'ACTION REQ.',
  rfe_submitted: 'RFE SUBMITTED',
  interview_scheduled: 'INTERVIEW SCHED.',
  approved: 'APPROVED',
  denied: 'DENIED',
}
