import { i131 } from '@/lib/forms/i765-i130-i131'

const mockTraveler = {
  first_name: 'Traveler',
  last_name: 'Person',
  date_of_birth: '1970-01-01',
  country_of_birth: 'France',
  a_number: '',
  ssn: '',
}

describe('i131 form definition', () => {
  it('has MAIL filing mode with a PDF template attached', () => {
    expect(i131.filingMode).toBe('mail')
    expect(i131.pdfTemplate).toBe('/forms/i131/i131.pdf')
  })

  it('returns empty string if identifiers are empty strings', () => {
    const part1 = i131.sections.find((s) => s.id === 'part1_identity')!
    const aNumberField = part1.fields.find((f) => f.id === 'a_number')!
    const ssnField = part1.fields.find((f) => f.id === 'ssn')!

    // If client record literally stores empty string rather than null
    expect(aNumberField.getValue(mockTraveler as any)).toBe('')
    expect(ssnField.getValue(mockTraveler as any)).toBe('')
  })
})
