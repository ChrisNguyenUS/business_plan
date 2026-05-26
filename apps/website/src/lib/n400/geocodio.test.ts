import { describe, it, expect } from 'vitest'
import { parseGeocodioResponse } from './geocodio'

// Real v1.7 shape — state is in ocd_id, not a top-level field.
const MOCK_SUCCESS = {
  results: [
    {
      fields: {
        congressional_districts: [
          {
            name: 'Congressional District 7',
            district_number: 7,
            ocd_id: 'ocd-division/country:us/state:tx/cd:7',
            congress_number: '119th',
          },
        ],
      },
    },
  ],
}

const MOCK_AMBIGUOUS = {
  results: [
    {
      fields: {
        congressional_districts: [
          { district_number: 7, ocd_id: 'ocd-division/country:us/state:tx/cd:7' },
          { district_number: 9, ocd_id: 'ocd-division/country:us/state:tx/cd:9' },
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
        congressional_districts: [
          { district_number: 0, ocd_id: 'ocd-division/country:us/state:wy/cd:0' },
        ],
      },
    },
  ],
}

const MOCK_MALFORMED = {
  results: [
    {
      fields: {
        congressional_districts: [{ district_number: '9', ocd_id: 'ocd-division/country:us/state:tx/cd:9' }],
      },
    },
  ],
}

const MOCK_OCD_MISSING = {
  results: [
    {
      fields: {
        congressional_districts: [{ district_number: 7 }],
      },
    },
  ],
}

const MOCK_OCD_NO_STATE = {
  results: [
    {
      fields: {
        congressional_districts: [{ district_number: 7, ocd_id: 'ocd-division/country:us/cd:7' }],
      },
    },
  ],
}

describe('parseGeocodioResponse', () => {
  it('returns district + uppercased state from ocd_id on unambiguous success', () => {
    expect(parseGeocodioResponse(MOCK_SUCCESS)).toEqual({ districtNumber: 7, stateCode: 'TX' })
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

  it('returns null when ocd_id missing', () => {
    expect(parseGeocodioResponse(MOCK_OCD_MISSING)).toBeNull()
  })

  it('returns null when ocd_id has no state segment', () => {
    expect(parseGeocodioResponse(MOCK_OCD_NO_STATE)).toBeNull()
  })

  it('returns null for null/undefined input', () => {
    expect(parseGeocodioResponse(null)).toBeNull()
    expect(parseGeocodioResponse(undefined)).toBeNull()
  })
})
