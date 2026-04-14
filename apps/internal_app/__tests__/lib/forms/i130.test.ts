import { i130 } from '@/lib/forms/i765-i130-i131'

const mockPetitioner = {
  first_name: 'John',
  last_name: 'Doe',
  middle_name: 'A',
  date_of_birth: '1980-11-11',
  a_number: null,
  ssn: null,
  marital_status: 'Married',
  address: null, // edge case: entirely missing address
}

describe('i130 form definition', () => {
  it('has online filing mode', () => {
    expect(i130.filingMode).toBe('online')
  })

  it('handles missing identifiers correctly', () => {
    const part1 = i130.sections.find((s) => s.id === 'part1_petitioner')!
    const aNumberField = part1.fields.find((f) => f.id === 'a_number')!
    const ssnField = part1.fields.find((f) => f.id === 'ssn')!

    expect(aNumberField.getValue(mockPetitioner as any)).toBe('None')
    expect(ssnField.getValue(mockPetitioner as any)).toBe('')
  })

  it('safely handles entirely missing address object without crashing', () => {
    const addrSection = i130.sections.find((s) => s.id === 'part1_address')!
    const streetField = addrSection.fields.find((f) => f.id === 'street')!
    expect(streetField.getValue(mockPetitioner as any)).toBe('')
  })

  it('maps marital status correctly', () => {
    const part1 = i130.sections.find((s) => s.id === 'part1_petitioner')!
    const msField = part1.fields.find((f) => f.id === 'marital_status')!
    expect(msField.getValue(mockPetitioner as any)).toBe('Married')
  })
})
