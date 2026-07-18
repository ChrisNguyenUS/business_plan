import { describe, it, expect } from 'vitest'
import { parseGeoapifyResponse } from './geoapify'

const MOCK_HOUSTON = {
  results: [
    {
      formatted: '9800 Bellaire Boulevard, Houston, TX 77036, United States',
      housenumber: '9800',
      street: 'Bellaire Boulevard',
      city: 'Houston',
      state_code: 'TX',
      postcode: '77036',
      country_code: 'us',
      lat: 29.7,
      lon: -95.5,
      place_id: 'abc-123',
    },
    {
      formatted: '9800 Bellaire Blvd Suite 100, Houston, TX 77036, United States',
      housenumber: '9800',
      street: 'Bellaire Blvd',
      city: 'Houston',
      state_code: 'TX',
      postcode: '77036',
      country_code: 'us',
      lat: 29.7,
      lon: -95.5,
      place_id: 'abc-456',
    },
  ],
}

const MOCK_NON_US = {
  results: [
    {
      formatted: '9800 Bellaire Boulevard, Toronto, ON M5H 2N2, Canada',
      housenumber: '9800',
      street: 'Bellaire Boulevard',
      city: 'Toronto',
      state_code: 'ON',
      postcode: 'M5H 2N2',
      country_code: 'ca',
      place_id: 'tor-1',
    },
  ],
}

const MOCK_MISSING_PARTS = {
  results: [
    {
      formatted: 'Some Street, Houston, TX',
      // no housenumber, no postcode → cannot drive Geocodio district lookup
      street: 'Some Street',
      city: 'Houston',
      state_code: 'TX',
      country_code: 'us',
      place_id: 'm-1',
    },
  ],
}

const MOCK_LOWERCASE_STATE = {
  results: [
    {
      formatted: '123 Main St, Austin, tx 73301',
      housenumber: '123',
      street: 'Main St',
      city: 'Austin',
      state_code: 'tx',
      postcode: '73301',
      country_code: 'us',
      lat: 30.3,
      lon: -97.7,
      place_id: 'lc-1',
    },
  ],
}

describe('parseGeoapifyResponse', () => {
  it('returns parsed US addresses with all required parts', () => {
    const out = parseGeoapifyResponse(MOCK_HOUSTON)
    expect(out).toHaveLength(2)
    expect(out[0]).toEqual({
      id: 'abc-123',
      formatted: '9800 Bellaire Boulevard, Houston, TX 77036, United States',
      street: '9800 Bellaire Boulevard',
      city: 'Houston',
      stateCode: 'TX',
      zip: '77036',
      lat: 29.7,
      lon: -95.5,
    })
  })

  it('drops non-US results', () => {
    expect(parseGeoapifyResponse(MOCK_NON_US)).toEqual([])
  })

  it('drops results missing housenumber or postcode', () => {
    expect(parseGeoapifyResponse(MOCK_MISSING_PARTS)).toEqual([])
  })

  it('uppercases state_code', () => {
    const out = parseGeoapifyResponse(MOCK_LOWERCASE_STATE)
    expect(out[0]?.stateCode).toBe('TX')
  })

  it('returns empty array for empty/malformed input', () => {
    expect(parseGeoapifyResponse({ results: [] })).toEqual([])
    expect(parseGeoapifyResponse(null)).toEqual([])
    expect(parseGeoapifyResponse(undefined)).toEqual([])
    expect(parseGeoapifyResponse({})).toEqual([])
  })

  it('falls back to a stable id when place_id is missing', () => {
    const out = parseGeoapifyResponse({
      results: [
        {
          formatted: '500 Elm St, Dallas, TX 75201',
          housenumber: '500',
          street: 'Elm St',
          city: 'Dallas',
          state_code: 'TX',
          postcode: '75201',
          country_code: 'us',
          lat: 32.78,
          lon: -96.8,
        },
      ],
    })
    expect(out[0]?.id).toBeTruthy()
  })

  it('keeps unincorporated addresses (no city), falling back to county', () => {
    // Real Geoapify shape for an unincorporated area: `county` present, no `city`.
    const out = parseGeoapifyResponse({
      results: [
        {
          formatted: '8127 Golden Trace Court, Harris County, TX 77083, United States of America',
          housenumber: '8127',
          street: 'Golden Trace Court',
          county: 'Harris County',
          state_code: 'TX',
          postcode: '77083',
          country_code: 'us',
          lat: 29.6903159,
          lon: -95.6209418,
          place_id: 'unincorp-1',
        },
      ],
    })
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({
      street: '8127 Golden Trace Court',
      city: 'Harris County',
      stateCode: 'TX',
      zip: '77083',
      lat: 29.6903159,
      lon: -95.6209418,
    })
  })

  it('drops results missing coordinates', () => {
    const out = parseGeoapifyResponse({
      results: [
        {
          formatted: '700 Oak St, Austin, TX 78701',
          housenumber: '700',
          street: 'Oak St',
          city: 'Austin',
          state_code: 'TX',
          postcode: '78701',
          country_code: 'us',
          // no lat/lon → cannot drive the reverse-geocode district lookup
        },
      ],
    })
    expect(out).toEqual([])
  })
})
