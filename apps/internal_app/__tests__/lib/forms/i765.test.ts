import { i765 } from '@/lib/forms/i765-i130-i131'

const mockClient = {
  first_name: 'Lan',
  last_name: 'Tran',
  middle_name: null,
  other_names: ['Lan Hoang', 'Lan Nguyen Tran'],
  date_of_birth: '1990-05-20',
  country_of_birth: 'Vietnam',
  a_number: 'A098765432',
  ssn: '987-65-4321',
  address: { street: '456 Westheimer Rd', city: 'Houston', state: 'TX', zip: '77006' },
}

describe('i765 form definition', () => {
  it('has online filing mode', () => {
    expect(i765.filingMode).toBe('online')
  })

  it('formats other_names as comma-separated string', () => {
    const part2 = i765.sections.find((s) => s.id === 'part2_identity')!
    const otherNamesField = part2.fields.find((f) => f.id === 'other_names')!
    expect(otherNamesField.getValue(mockClient as any)).toBe('Lan Hoang, Lan Nguyen Tran')
  })

  it('handles missing other_names returning None', () => {
    const part2 = i765.sections.find((s) => s.id === 'part2_identity')!
    const otherNamesField = part2.fields.find((f) => f.id === 'other_names')!
    expect(otherNamesField.getValue({ ...mockClient, other_names: null } as any)).toBe('None')
  })

  it('fetches correct country of birth and citizenship', () => {
    const part2 = i765.sections.find((s) => s.id === 'part2_identity')!
    const cob = part2.fields.find((f) => f.id === 'country_of_birth')!
    const coc = part2.fields.find((f) => f.id === 'country_of_citizenship')!
    expect(cob.getValue(mockClient as any)).toBe('Vietnam')
    expect(coc.getValue(mockClient as any)).toBe('Vietnam')
  })
})
