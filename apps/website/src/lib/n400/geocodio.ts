// Geocodio v1.7 client. Responsibilities:
//   1. parseGeocodioResponse — pure parser. Lifts the congressional district from the
//      `fields.congressional_districts` array. Returns null on ambiguous (>1 district),
//      empty results, or malformed payloads. Spec §5.1: ambiguous addresses must NOT
//      silently save the first match.
//   2. geocodeAddress — forward geocode from a text address. Used as a fallback when
//      the user typed a free-form address without picking an autocomplete suggestion.
//   3. reverseGeocodeCoords — reverse geocode from a precise lat/lng (from the picked
//      autocomplete suggestion). Preferred path: a point falls inside exactly one
//      district polygon, so split-zip addresses resolve unambiguously instead of
//      relying on fuzzy street matching.
// Auth via Authorization header so the API key never lands in URL/query logs.
// GeocodioError carries only the HTTP status, not the input — callers can log it
// without leaking PII.
//
// Live response shape (verified 2026-05-26):
//   results[0].fields.congressional_districts[0] = {
//     district_number: 7,
//     ocd_id: "ocd-division/country:us/state:tx/cd:7",
//     ...
//   }
// Note: there is no `state_abbreviation` field on the district object —
// state is parsed out of `ocd_id`.

export interface GeocodeResult {
  districtNumber: number
  stateCode: string
  // Authoritative locality for the matched point, lifted from
  // results[0].address_components. On the reverse (coordinate) path these are
  // the USPS-normalized city/zip — e.g. an unincorporated point Geoapify only
  // knew as "Harris County" comes back as city "Houston", zip "77083" — so the
  // caller can store them without asking the user to type anything. `null` when
  // Geocodio omits them.
  city: string | null
  zip: string | null
}

interface GeocodioDistrict {
  district_number?: unknown
  ocd_id?: unknown
}

const OCD_STATE_RE = /\/state:([a-z]{2})(?:\/|$)/

function readComponent(result: unknown, key: 'city' | 'zip'): string | null {
  const ac = (result as { address_components?: unknown })?.address_components
  if (!ac || typeof ac !== 'object') return null
  const v = (ac as Record<string, unknown>)[key]
  return typeof v === 'string' && v.trim() ? v : null
}

export function parseGeocodioResponse(data: unknown): GeocodeResult | null {
  if (!data || typeof data !== 'object') return null
  const results = (data as { results?: unknown }).results
  if (!Array.isArray(results) || results.length === 0) return null
  const fields = (results[0] as { fields?: unknown })?.fields
  if (!fields || typeof fields !== 'object') return null
  const districts = (fields as { congressional_districts?: unknown }).congressional_districts
  if (!Array.isArray(districts) || districts.length === 0) return null
  if (districts.length > 1) return null

  const d = districts[0] as GeocodioDistrict
  if (typeof d.district_number !== 'number') return null
  if (typeof d.ocd_id !== 'string') return null
  const m = OCD_STATE_RE.exec(d.ocd_id)
  if (!m) return null

  return {
    districtNumber: d.district_number,
    stateCode: m[1].toUpperCase(),
    city: readComponent(results[0], 'city'),
    zip: readComponent(results[0], 'zip'),
  }
}

export class GeocodioError extends Error {
  constructor(public readonly status: number) {
    super(`Geocodio request failed (${status})`)
  }
}

// Shared transport for both the forward and reverse endpoints. Any unexpected
// error is re-packaged as GeocodioError so the input (address or coordinates)
// never leaks into a stack trace, then reported. Tag-only context — explicit
// empty `extra` so a future code path can't accidentally attach PII as a
// breadcrumb.
async function fetchDistrict(url: URL, apiKey: string): Promise<GeocodeResult | null> {
  try {
    const res = await fetch(url.toString(), {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!res.ok) throw new GeocodioError(res.status)
    const data = await res.json()
    return parseGeocodioResponse(data)
  } catch (err) {
    const safe = err instanceof GeocodioError ? err : new GeocodioError(0)
    try {
      const Sentry = await import('@sentry/nextjs')
      Sentry.captureException(safe, {
        tags: { feature: 'n400-geocodio' },
        extra: {},
      })
    } catch {
      // Sentry import failure must not block the user-facing setup form. Silent.
    }
    throw safe
  }
}

export async function geocodeAddress(params: {
  street: string
  city: string
  state: string
  zip: string
  apiKey: string
}): Promise<GeocodeResult | null> {
  const query = `${params.street}, ${params.city}, ${params.state} ${params.zip}`
  const url = new URL('https://api.geocod.io/v1.7/geocode')
  url.searchParams.set('q', query)
  url.searchParams.set('fields', 'cd')
  return fetchDistrict(url, params.apiKey)
}

export async function reverseGeocodeCoords(params: {
  lat: number
  lng: number
  apiKey: string
}): Promise<GeocodeResult | null> {
  const url = new URL('https://api.geocod.io/v1.7/reverse')
  url.searchParams.set('q', `${params.lat},${params.lng}`)
  url.searchParams.set('fields', 'cd')
  return fetchDistrict(url, params.apiKey)
}
