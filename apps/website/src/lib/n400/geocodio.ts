// Geocodio v1.7 client. Two responsibilities:
//   1. parseGeocodioResponse — pure parser. Lifts the congressional district from the
//      `fields.congressional_districts` array. Returns null on ambiguous (>1 district),
//      empty results, or malformed payloads. Spec §5.1: ambiguous addresses must NOT
//      silently save the first match.
//   2. geocodeAddress — fetches the API. Auth via Authorization header so the API key
//      never lands in URL/query logs. GeocodioError carries only the HTTP status, not
//      the input address — caller is free to log it without leaking PII.

export interface GeocodeResult {
  districtNumber: number
  stateCode: string
}

interface GeocodioDistrict {
  district_number?: unknown
  state_abbreviation?: unknown
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
  if (typeof d.district_number !== 'number' || typeof d.state_abbreviation !== 'string') return null

  return { districtNumber: d.district_number, stateCode: d.state_abbreviation }
}

export class GeocodioError extends Error {
  constructor(public readonly status: number) {
    super(`Geocodio request failed (${status})`)
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

  const res = await fetch(url.toString(), {
    cache: 'no-store',
    headers: { Authorization: `Bearer ${params.apiKey}` },
  })
  if (!res.ok) throw new GeocodioError(res.status)

  const data = await res.json()
  return parseGeocodioResponse(data)
}
