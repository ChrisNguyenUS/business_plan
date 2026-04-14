import { n400 } from '@/lib/forms/n400'

const mockClient = {
  first_name: 'Van A',
  last_name: 'Nguyen',
  middle_name: null,
  date_of_birth: '1985-01-15',
  a_number: 'A123456789',
  address: { street: '1234 Main St', city: 'Houston', state: 'TX', zip: '77001' },
  marital_status: 'married',
  phone: '713-555-1234',
  ssn: '123-45-6789',
}

describe('n400 form definition', () => {
  it('has online filing mode', () => {
    expect(n400.filingMode).toBe('online')
  })

  it('returns last name from client', () => {
    const part2 = n400.sections.find((s) => s.id === 'part2_identity')!
    const lastNameField = part2.fields.find((f) => f.id === 'family_name')!
    expect(lastNameField.getValue(mockClient as any)).toBe('Nguyen')
  })

  it('returns formatted date of birth', () => {
    const part2 = n400.sections.find((s) => s.id === 'part2_dob')!
    const dobField = part2.fields.find((f) => f.id === 'date_of_birth')!
    expect(dobField.getValue(mockClient as any)).toBe('01/15/1985')
  })

  it('returns N/A for missing middle name', () => {
    const part2 = n400.sections.find((s) => s.id === 'part2_identity')!
    const midField = part2.fields.find((f) => f.id === 'middle_name')!
    expect(midField.getValue(mockClient as any)).toBe('N/A')
  })

  it('returns phone from client', () => {
    const contactSection = n400.sections.find((s) => s.id === 'part2_contact')!
    const phoneField = contactSection.fields.find((f) => f.id === 'phone')!
    expect(phoneField.getValue(mockClient as any)).toBe('713-555-1234')
  })

  it('returns address components', () => {
    const addrSection = n400.sections.find((s) => s.id === 'part2_address')!
    const streetField = addrSection.fields.find((f) => f.id === 'street')!
    expect(streetField.getValue(mockClient as any)).toBe('1234 Main St')
    const cityField = addrSection.fields.find((f) => f.id === 'city')!
    expect(cityField.getValue(mockClient as any)).toBe('Houston')
  })
})
