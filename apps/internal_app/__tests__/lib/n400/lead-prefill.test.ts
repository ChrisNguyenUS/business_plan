import { buildLeadPrefill, isSourceLeadDuplicate, isUuid, mergeLeadNames } from '@/lib/n400/lead-prefill'

const names = (p: Partial<Parameters<typeof buildLeadPrefill>[0]>) => ({
  first_name: null, middle_name: null, last_name: null, full_name: null, email: null, ...p,
})

describe('buildLeadPrefill', () => {
  it('uses the split name columns when present', () => {
    const v = buildLeadPrefill(
      names({ first_name: 'Vu', middle_name: 'Van', last_name: 'Tran', full_name: 'ignored', email: 'v@x.com' }),
      '555-0100',
      { city: 'Sunnyside', state: 'NY' },
    )
    expect(v).toEqual({
      first_name: 'Vu', middle_name: 'Van', last_name: 'Tran', email: 'v@x.com', phone: '555-0100',
      address: { street: '', city: 'Sunnyside', state: 'NY', zip: '' }, nameSplitFrom: null,
    })
  })

  it('splits full_name when the columns are empty (Google sign-ups)', () => {
    expect(buildLeadPrefill(names({ full_name: 'Vu Tran' }), null, null)).toMatchObject({
      first_name: 'Vu', middle_name: '', last_name: 'Tran',
    })
    expect(buildLeadPrefill(names({ full_name: '  Nguyen   Van  Anh ' }), null, null)).toMatchObject({
      first_name: 'Nguyen', middle_name: 'Van', last_name: 'Anh',
    })
    expect(buildLeadPrefill(names({ full_name: 'Cher' }), null, null)).toMatchObject({
      first_name: 'Cher', last_name: '',
    })
  })

  it('leaves everything blank rather than guessing', () => {
    expect(buildLeadPrefill(names({}), null, null)).toEqual({
      first_name: '', middle_name: '', last_name: '', email: '', phone: '',
      address: { street: '', city: '', state: '', zip: '' },
      nameSplitFrom: null,
    })
  })

  it('ignores wrong-typed address payload fields', () => {
    expect(buildLeadPrefill(names({}), null, { city: 42, state: 'TX' }).address).toEqual({
      street: '', city: '', state: 'TX', zip: '',
    })
  })
})

describe('isUuid', () => {
  it('accepts a uuid and rejects anything else', () => {
    expect(isUuid('752015e5-1118-49d7-b9bf-b690eda90a2b')).toBe(true)
    expect(isUuid('not-a-uuid')).toBe(false)
    expect(isUuid('')).toBe(false)
    expect(isUuid(undefined)).toBe(false)
  })
})

describe('nameSplitFrom (V1)', () => {
  it('is the trimmed full_name when it was split', () => {
    expect(buildLeadPrefill(names({ full_name: '  Vu Tran ' }), null, null).nameSplitFrom).toBe('Vu Tran')
  })
  it('is null when split columns were used or nothing to split', () => {
    expect(buildLeadPrefill(names({ first_name: 'Vu', full_name: 'Vu Tran' }), null, null).nameSplitFrom).toBeNull()
    expect(buildLeadPrefill(names({}), null, null).nameSplitFrom).toBeNull()
  })
})

describe('mergeLeadNames (V4)', () => {
  const lead = { full_name: 'View Name', email: 'view@x.com' }
  it('falls back to the view when the profile row has nulls', () => {
    expect(mergeLeadNames(names({ first_name: 'A' }), lead)).toMatchObject({
      first_name: 'A', full_name: 'View Name', email: 'view@x.com',
    })
  })
  it('prefers profile values when present', () => {
    expect(mergeLeadNames(names({ full_name: 'P', email: 'p@x.com' }), lead)).toMatchObject({
      full_name: 'P', email: 'p@x.com',
    })
  })
  it('uses the view alone when there is no profile row', () => {
    expect(mergeLeadNames(null, lead)).toEqual({
      first_name: null, middle_name: null, last_name: null, full_name: 'View Name', email: 'view@x.com',
    })
  })
})

describe('isSourceLeadDuplicate (V5)', () => {
  it('matches only the source-lead unique index', () => {
    expect(isSourceLeadDuplicate({ code: '23505', message: 'duplicate key value violates unique constraint "clients_source_lead_id_key"' })).toBe(true)
    expect(isSourceLeadDuplicate({ code: '23505', message: 'violates "clients_email_key"' })).toBe(false)
    expect(isSourceLeadDuplicate({ code: '23503', message: 'clients_source_lead_id_key' })).toBe(false)
    expect(isSourceLeadDuplicate({ code: '23505' })).toBe(false)
    expect(isSourceLeadDuplicate(null)).toBe(false)
  })
})
