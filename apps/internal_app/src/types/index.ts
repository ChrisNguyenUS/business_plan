export type UserRole = 'staff' | 'admin'

export interface Profile {
  id: string
  created_at: string
  updated_at: string
  name: string | null
  role: UserRole
}

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

// Must match the cases_status_check constraint (migration 001); the website
// portal reads the same values. __tests__/lib/case-status.test.ts pins this.
export const CASE_STATUSES = [
  'documents_pending',
  'ready_to_file',
  'submitted',
  'receipt_received',
  'in_progress',
  'rfe_issued',
  'approved',
  'denied',
] as const

export type CaseStatus = (typeof CASE_STATUSES)[number]

export const CASE_STATUS_COLORS: Record<CaseStatus, string> = {
  documents_pending: 'bg-amber-100 text-amber-700',
  ready_to_file: 'bg-primary/10 text-primary',
  submitted: 'bg-blue-100 text-blue-700',
  receipt_received: 'bg-sky-100 text-sky-700',
  in_progress: 'bg-slate-200 text-slate-700',
  rfe_issued: 'bg-error-container/50 text-error',
  approved: 'bg-green-600 text-white',
  denied: 'bg-red-600 text-white',
}

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  documents_pending: 'DOCUMENTS PENDING',
  ready_to_file: 'READY TO FILE',
  submitted: 'SUBMITTED',
  receipt_received: 'RECEIPT RECEIVED',
  in_progress: 'IN PROGRESS',
  rfe_issued: 'RFE ISSUED',
  approved: 'APPROVED',
  denied: 'DENIED',
}
