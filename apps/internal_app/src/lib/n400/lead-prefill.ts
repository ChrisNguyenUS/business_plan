// Shape an N400Ready lead into ClientForm defaultValues for Convert to Client.
// Pure — actions/leads.ts loads the rows. Blank beats a wrong guess: staff
// review every field before saving.

export interface LeadProfileNames {
  first_name: string | null
  middle_name: string | null
  last_name: string | null
  full_name: string | null
  email: string | null
}

export interface LeadPrefill {
  first_name: string
  middle_name: string
  last_name: string
  email: string
  phone: string
  address: { street: string; city: string; state: string; zip: string }
  /** full_name the first/last split was derived from; null when split columns were used. */
  nameSplitFrom: string | null
}

/** Profile names with the leads view as fallback for a null/missing profile field. */
export function mergeLeadNames(
  profile: LeadProfileNames | null,
  lead: { full_name: string | null; email: string | null },
): LeadProfileNames {
  return {
    first_name: profile?.first_name ?? null,
    middle_name: profile?.middle_name ?? null,
    last_name: profile?.last_name ?? null,
    full_name: profile?.full_name ?? lead.full_name,
    email: profile?.email ?? lead.email,
  }
}

/** Unique-violation on clients.source_lead_id (lead already converted). */
export function isSourceLeadDuplicate(
  error: { code?: string; message?: string } | null,
): boolean {
  return (
    !!error &&
    error.code === '23505' &&
    (error.message ?? '').includes('clients_source_lead_id_key')
  )
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Guard before a value reaches a uuid column — Postgres raises 22P02 otherwise. */
export function isUuid(value: string | undefined | null): value is string {
  return typeof value === 'string' && UUID.test(value)
}

const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

function splitFullName(full: string): { first: string; middle: string; last: string } {
  const parts = full.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { first: '', middle: '', last: '' }
  if (parts.length === 1) return { first: parts[0], middle: '', last: '' }
  return {
    first: parts[0],
    middle: parts.slice(1, -1).join(' '),
    last: parts[parts.length - 1],
  }
}

export function buildLeadPrefill(
  profile: LeadProfileNames,
  phone: string | null,
  addressPayload: Record<string, unknown> | null,
): LeadPrefill {
  const hasSplit = text(profile.first_name) !== '' || text(profile.last_name) !== ''
  const name = hasSplit
    ? { first: text(profile.first_name), middle: text(profile.middle_name), last: text(profile.last_name) }
    : splitFullName(text(profile.full_name))
  const nameSplitFrom = !hasSplit && text(profile.full_name) !== '' ? text(profile.full_name) : null

  return {
    first_name: name.first,
    middle_name: name.middle,
    last_name: name.last,
    email: text(profile.email),
    phone: text(phone),
    address: {
      street: '',
      city: text(addressPayload?.['city']),
      state: text(addressPayload?.['state']),
      zip: '',
    },
    nameSplitFrom,
  }
}
