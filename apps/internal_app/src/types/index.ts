export type CaseStatus =
  | 'documents_pending'
  | 'ready_to_file'
  | 'submitted'
  | 'receipt_received'
  | 'in_progress'
  | 'rfe_issued'
  | 'approved'
  | 'denied'

export type CaseType = 'simple' | 'package'

export type PackageType =
  | 'marriage_greencard'
  | 'parent_greencard'
  | null

export type FormType =
  | 'n400'
  | 'i485'
  | 'i130'
  | 'i765'
  | 'i131'
  | 'i864'
  | 'i693'

export type FilingMode = 'online' | 'mail'

export type ServiceTag = 'immigration' | 'tax' | 'insurance' | 'ai'

export type UserRole = 'ultimate_admin' | 'staff'

export type PaymentMethod = 'cash' | 'check' | 'card' | 'zelle'

export type JobStatus = 'open' | 'in_progress' | 'complete'

export type ServiceType = 'immigration' | 'tax' | 'insurance' | 'ai'

export interface Client {
  id: string
  created_at: string
  first_name: string
  middle_name?: string | null
  last_name: string
  other_names?: string[]
  date_of_birth: string
  country_of_birth?: string | null
  a_number?: string | null
  ssn?: string | null
  address?: {
    street?: string
    city?: string
    state?: string
    zip?: string
  }
  mailing_address?: {
    street?: string
    city?: string
    state?: string
    zip?: string
  }
  phone?: string | null
  email?: string | null
  marital_status?: string | null
  spouse_id?: string | null
  children?: Array<{
    name: string
    dob: string
    citizenship_status: string
  }>
  immigration_history?: unknown[]
  travel_history?: unknown[]
  employment_history?: unknown[]
  services_used?: ServiceTag[]
  notes?: string | null
}

export interface Case {
  id: string
  created_at: string
  case_type: CaseType
  package_type?: PackageType
  primary_client_id: string
  secondary_client_id?: string | null
  status: CaseStatus
  notes?: string | null
  primary_client?: Client
  secondary_client?: Client
}

export interface CaseForm {
  id: string
  case_id: string
  form_type: FormType
  filing_mode: FilingMode
  receipt_number?: string | null
  current_uscis_status?: string | null
  last_checked_at?: string | null
}

export interface Document {
  id: string
  created_at: string
  case_id: string
  case_form_id?: string | null
  label: string
  required: boolean
  received: boolean
  file_path?: string | null
  notes?: string | null
}

export interface StatusHistory {
  id: string
  checked_at: string
  case_form_id: string
  status: string
  description?: string | null
  source: 'uscis_api' | 'manual'
}

export interface Notification {
  id: string
  created_at: string
  staff_id: string
  case_id: string
  message: string
  read: boolean
}

export interface Payment {
  id: string
  case_id?: string | null
  job_id?: string | null
  milestone_label?: string | null
  amount: number
  payment_date: string
  method: PaymentMethod
  logged_by: string
  created_at: string
}

export interface Expense {
  id: string
  case_id?: string | null
  job_id?: string | null
  label: string
  amount: number
  expense_date: string
  paid_by: 'mos' | 'client'
  logged_by: string
  created_at: string
}

export interface Job {
  id: string
  client_id: string
  service_type: ServiceType
  description: string
  fee: number
  deadline?: string | null
  status: JobStatus
  notes?: string | null
  created_at: string
  created_by: string
}

export interface FeeScheduleEntry {
  id: string
  service_type: ServiceType
  form_type?: FormType | null
  uscis_fee?: number | null
  mos_fee: number
  updated_at: string
  updated_by: string
}

export interface AuditLogEntry {
  id: string
  user_id: string
  action: string
  entity_type: string
  entity_id: string
  old_value?: unknown
  new_value?: unknown
  created_at: string
}

export interface ChecklistTemplate {
  id: string
  form_type: FormType
  items: Array<{
    label: string
    required: boolean
    order: number
  }>
  updated_at: string
  updated_by: string
}

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  documents_pending: 'Documents Pending',
  ready_to_file: 'Ready to File',
  submitted: 'Submitted',
  receipt_received: 'Receipt Received',
  in_progress: 'In Progress',
  rfe_issued: 'RFE Issued',
  approved: 'Approved',
  denied: 'Denied',
}

export const CASE_STATUS_COLORS: Record<CaseStatus, string> = {
  documents_pending: 'bg-amber-100 text-amber-700',
  ready_to_file: 'bg-blue-100 text-blue-700',
  submitted: 'bg-purple-100 text-purple-700',
  receipt_received: 'bg-cyan-100 text-cyan-700',
  in_progress: 'bg-teal-100 text-teal-700',
  rfe_issued: 'bg-orange-100 text-orange-700',
  approved: 'bg-green-100 text-green-700',
  denied: 'bg-red-100 text-red-700',
}
