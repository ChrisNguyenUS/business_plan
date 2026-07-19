'use server'

// Setup form server action. Pipeline:
//   1. Verify auth (defense-in-depth — middleware already gates /n400ready/setup)
//   2. Rate-limit by `<ip>:<userId>` (sliding 5/h) and by `<userId>` (10/24h)
//   3. Validate form input
//   4. Resolve the district in-memory (address/coordinates NOT persisted):
//       - if the form carries lat/lon from a picked autocomplete suggestion,
//         reverse-geocode that exact point (unambiguous in split-zip areas)
//       - otherwise forward-geocode the typed text address (fallback)
//   5. Upsert n400_user_profile — district_number stays null on ambiguous matches
//   6. Redirect to /n400ready
//
// Notes
//  - PII guarantee: neither the street address nor the coordinates from the form
//    reach the database. Geocodio sees them for one HTTP call, then they're GC'd.
//    This matches the bilingual disclaimer rendered by the setup form.
//  - Ambiguous addresses (>1 congressional district) get saved with
//    district_number = null. The dashboard surfaces a "couldn't resolve your
//    representative" prompt and offers a re-run with a more specific address.

import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createHash } from 'node:crypto'

import { geocodeAddress, reverseGeocodeCoords, GeocodioError } from '@/lib/n400/geocodio'
import { geocodioIpLimiter, geocodioUserLimiter } from '@/lib/n400/rate-limit'
import { sendCapiEvent } from '@/lib/analytics/meta-capi'
import { getN400Lang, getN400Dict } from '@/lib/n400/i18n/server'

export type SetupFormState =
  | { ok: false; error: string }
  | { ok: true }
  | null

function extractClientIp(forwardedFor: string | null): string {
  if (!forwardedFor) return 'unknown'
  return forwardedFor.split(',')[0]?.trim() || 'unknown'
}

export async function saveSetupProfile(
  _prev: SetupFormState,
  formData: FormData,
): Promise<SetupFormState> {
  const cookieStore = await cookies()
  const headerStore = await headers()
  const lang = await getN400Lang()
  const dict = getN400Dict(lang)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) =>
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const ip = extractClientIp(headerStore.get('x-forwarded-for'))
  const { success: ipOk } = await geocodioIpLimiter.limit(`${ip}:${user.id}`)
  if (!ipOk) {
    return {
      ok: false,
      error: dict.setup.errorRateLimitIp,
    }
  }

  const { success: userOk } = await geocodioUserLimiter.limit(user.id)
  if (!userOk) {
    return {
      ok: false,
      error: dict.setup.errorRateLimitUser,
    }
  }

  const street = (formData.get('street') as string | null)?.trim() ?? ''
  const city = (formData.get('city') as string | null)?.trim() ?? ''
  const state = (formData.get('state') as string | null)?.trim() ?? ''
  const zip = (formData.get('zip') as string | null)?.trim() ?? ''

  if (!street || !city || !state || !zip) {
    return {
      ok: false,
      error: dict.setup.errorMissingFields,
    }
  }
  if (!/^\d{5}$/.test(zip)) {
    return {
      ok: false,
      error: dict.setup.errorInvalidZipcode,
    }
  }

  // Coordinates from a picked autocomplete suggestion, if any. Reverse-geocoding
  // a precise point resolves the district unambiguously; falling back to the
  // typed text address only when the user didn't pick a suggestion.
  const lat = Number(formData.get('lat'))
  const lon = Number(formData.get('lon'))
  const hasCoords =
    formData.get('lat') != null &&
    formData.get('lon') != null &&
    Number.isFinite(lat) &&
    Number.isFinite(lon)

  let districtNumber: number | null = null
  let stateFromGeo: string | null = null
  let cityFromGeo: string | null = null
  let zipFromGeo: string | null = null
  try {
    const apiKey = process.env.GEOCODIO_API_KEY!
    const result = hasCoords
      ? await reverseGeocodeCoords({ lat, lng: lon, apiKey })
      : await geocodeAddress({ street, city, state, zip, apiKey })
    districtNumber = result?.districtNumber ?? null
    stateFromGeo = result?.stateCode ?? null
    // Only trust Geocodio's normalized city/zip on the coordinate path: reverse
    // geocoding a precise point yields the real USPS locality (e.g. "Houston"
    // for an address Geoapify only labeled "Harris County"). On the text path
    // we keep exactly what the user typed.
    if (hasCoords) {
      cityFromGeo = result?.city ?? null
      zipFromGeo = result?.zip ?? null
    }
  } catch (err) {
    if (err instanceof GeocodioError) {
      // err.message intentionally generic — no PII. Phase 8 wraps with Sentry.
    }
    return {
      ok: false,
      error: dict.setup.errorGeocoding,
    }
  }

  const { error: dbError } = await supabase.from('n400_user_profile').upsert(
    {
      user_id: user.id,
      city: cityFromGeo ?? city,
      state_code: stateFromGeo ?? state,
      zipcode: zipFromGeo ?? zip,
      district_number: districtNumber,
      district_resolved_at: districtNumber !== null ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )

  if (dbError) {
    return {
      ok: false,
      error: dict.setup.errorDatabase,
    }
  }

  // Server-side Meta CAPI conversion. Deterministic event_id =
  // sha256(user.id + resolved_state + district) so a retried setup
  // (e.g. user re-runs the form to fix an ambiguous match) doesn't
  // double-count in Meta — same inputs hash to the same id.
  // Non-blocking: a CAPI failure must never block the redirect.
  try {
    const idInput = `n400-setup:${user.id}:${stateFromGeo ?? state}:${districtNumber ?? 'na'}`
    const eventId = createHash('sha256').update(idInput).digest('hex').slice(0, 32)
    await sendCapiEvent({
      eventName: 'n400_setup_complete',
      eventId,
      eventSourceUrl: 'https://mannaos.com/n400ready/setup',
      user: {
        emails: user.email ? [user.email] : undefined,
        clientIp: ip === 'unknown' ? null : ip,
        clientUserAgent: headerStore.get('user-agent') ?? null,
      },
      customData: {
        state_code: stateFromGeo ?? state,
        district_resolved: districtNumber !== null,
      },
    })
  } catch {
    // CAPI errors already log inside sendCapiEvent; swallowing here
    // keeps the redirect on the happy path.
  }

  // Edit flow comes from /n400ready/profile and expects to land back there.
  // First-time setup falls through to the dashboard with ?welcome=signup so
  // the client can fire the n400_signup_complete GA4 event once on arrival.
  // `?updated=1` tells the profile page to re-pull the address into the client
  // store (the store loaded once at login and won't otherwise see this write).
  const from = (formData.get('from') as string | null)?.trim() ?? ''
  redirect(from === 'profile' ? '/n400ready/profile?updated=1' : '/n400ready?welcome=signup')
}
