// Geoapify autocomplete client. Two responsibilities:
//   1. parseGeoapifyResponse — pure parser. Filters to US-only results, drops
//      anything missing housenumber, postcode, or coordinates. The lat/lon are
//      the important part: the parent form hands them to Geocodio's *reverse*
//      geocoder so the district comes from a precise point, not a fuzzy street
//      match — critical for split-zip areas where one zip spans two districts.
//   2. autocompleteAddress — fetches /v1/geocode/autocomplete. The Geoapify
//      API key is a public client-side key (NEXT_PUBLIC_GEOAPIFY_API_KEY) so
//      this module is safe to import from a Client Component.

export interface GeoapifySuggestion {
  id: string
  formatted: string
  street: string
  city: string
  stateCode: string
  zip: string
  lat: number
  lon: number
}

interface GeoapifyResultRaw {
  formatted?: unknown
  housenumber?: unknown
  street?: unknown
  city?: unknown
  county?: unknown
  district?: unknown
  suburb?: unknown
  state_code?: unknown
  postcode?: unknown
  country_code?: unknown
  lat?: unknown
  lon?: unknown
  place_id?: unknown
}

function asTrimmedString(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

let fallbackIdSeq = 0

export function parseGeoapifyResponse(data: unknown): GeoapifySuggestion[] {
  if (!data || typeof data !== 'object') return []
  const results = (data as { results?: unknown }).results
  if (!Array.isArray(results)) return []

  const out: GeoapifySuggestion[] = []
  for (const raw of results as GeoapifyResultRaw[]) {
    if (typeof raw.country_code !== 'string' || raw.country_code.toLowerCase() !== 'us') continue
    if (typeof raw.housenumber !== 'string' || !raw.housenumber.trim()) continue
    if (typeof raw.postcode !== 'string' || !raw.postcode.trim()) continue
    if (typeof raw.street !== 'string' || !raw.street.trim()) continue
    if (typeof raw.state_code !== 'string' || !raw.state_code.trim()) continue
    if (typeof raw.formatted !== 'string') continue
    if (typeof raw.lat !== 'number' || !Number.isFinite(raw.lat)) continue
    if (typeof raw.lon !== 'number' || !Number.isFinite(raw.lon)) continue

    // `city` is absent for unincorporated areas (common in Texas suburbs); per
    // the Geoapify docs the locality can instead live in county/district/suburb.
    // Don't drop these — the district now comes from lat/lon — so fall back
    // through those fields for the (editable) city label.
    const city =
      asTrimmedString(raw.city) ||
      asTrimmedString(raw.county) ||
      asTrimmedString(raw.district) ||
      asTrimmedString(raw.suburb)

    out.push({
      id: typeof raw.place_id === 'string' && raw.place_id ? raw.place_id : `geoapify-${++fallbackIdSeq}`,
      formatted: raw.formatted,
      street: `${raw.housenumber} ${raw.street}`,
      city,
      stateCode: raw.state_code.toUpperCase(),
      zip: raw.postcode,
      lat: raw.lat,
      lon: raw.lon,
    })
  }
  return out
}

export class GeoapifyError extends Error {
  constructor(public readonly status: number) {
    super(`Geoapify request failed (${status})`)
  }
}

export async function autocompleteAddress(params: {
  query: string
  apiKey: string
  signal?: AbortSignal
  limit?: number
}): Promise<GeoapifySuggestion[]> {
  const url = new URL('https://api.geoapify.com/v1/geocode/autocomplete')
  url.searchParams.set('text', params.query)
  url.searchParams.set('filter', 'countrycode:us')
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', String(params.limit ?? 5))
  url.searchParams.set('apiKey', params.apiKey)

  const res = await fetch(url.toString(), { cache: 'no-store', signal: params.signal })
  if (!res.ok) throw new GeoapifyError(res.status)

  const data = await res.json()
  return parseGeoapifyResponse(data)
}
