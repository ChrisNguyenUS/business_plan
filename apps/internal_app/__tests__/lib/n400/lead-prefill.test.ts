import { buildLeadPrefill, isUuid } from '@/lib/n400/lead-prefill'

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
      address: { street: '', city: 'Sunnyside', state: 'NY', zip: '' },
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
