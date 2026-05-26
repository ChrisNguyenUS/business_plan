import { describe, it, expect } from 'vitest'
import { parseGeocodioResponse } from './geocodio'

const MOCK_SUCCESS = {
  results: [
    {
      fields: {
        congressional_districts: [{ district_number: 9, state_abbreviation: 'TX' }],
      },
    },
  ],
}

const MOCK_AMBIGUOUS = {
  results: [
    {
      fields: {
        congressional_districts: [
          { district_number: 7, state_abbreviation: 'TX' },
          { district_number: 9, state_abbreviation: 'TX' },
        ],
      },
    },
  ],
}

const MOCK_EMPTY = { results: [] }

const MOCK_AT_LARGE = {
  results: [
    {
      fields: {
        congressional_districts: [{ district_number: 0, state_abbreviation: 'WY' }],
      },
    },
  ],
}

const MOCK_MALFORMED = {
  results: [
    {
      fields: {
        congressional_districts: [{ district_number: '9', state_abbreviation: 'TX' }],
      },
    },
  ],
}

describe('parseGeocodioResponse', () => {
  it('returns district number on unambiguous success', () => {
    expect(parseGeocodioResponse(MOCK_SUCCESS)).toEqual({ districtNumber: 9, stateCode: 'TX' })
  })

  it('returns null when ambiguous (>1 district returned)', () => {
    expect(parseGeocodioResponse(MOCK_AMBIGUOUS)).toBeNull()
  })

  it('returns null when no results', () => {
    expect(parseGeocodioResponse(MOCK_EMPTY)).toBeNull()
  })

  it('handles at-large districts (district_number = 0)', () => {
    expect(parseGeocodioResponse(MOCK_AT_LARGE)).toEqual({ districtNumber: 0, stateCode: 'WY' })
  })

  it('returns null for malformed payload (district_number not a number)', () => {
    expect(parseGeocodioResponse(MOCK_MALFORMED)).toBeNull()
  })

  it('returns null for null/undefined input', () => {
    expect(parseGeocodioResponse(null)).toBeNull()
    expect(parseGeocodioResponse(undefined)).toBeNull()
  })
})
