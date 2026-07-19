'use server';

// Onboarding step 2 server action.
//
// Same geocoding pipeline as /setup, with one deliberate difference: this action
// does NOT redirect. It returns the resolved civics facts so the client can
// render the "personalization summary" card — the payoff moment that justifies
// asking for an address at all. Navigation to the dashboard happens client-side
// after the user confirms.
//
// Pipeline:
//   1. Verify auth (defense-in-depth — middleware already gates /n400ready/*)
//   2. Rate-limit by `<ip>:<userId>` (sliding 5/h) and by `<userId>` (10/24h)
//   3. Resolve the district in-memory — the street address and coordinates are
//      sent to Geocodio for one call and never persisted, matching the privacy
//      notice rendered next to the form.
//   4. Upsert n400_user_profile (this is the row whose absence gates onboarding)
//   5. Return the localized personalization payload
//
// The upsert also writes ui_language from the cookie. Step 1 runs before any
// profile row exists, so its DB write is a no-op — this is where the language
// choice actually lands in the database.

import { createServerClient } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createHash } from 'node:crypto';

import { geocodeAddress, reverseGeocodeCoords, GeocodioError } from '@/lib/n400/geocodio';
import { geocodioIpLimiter, geocodioUserLimiter } from '@/lib/n400/rate-limit';
import { sendCapiEvent } from '@/lib/analytics/meta-capi';
import { getN400Lang, getN400Dict } from '@/lib/n400/i18n/server';
import {
  buildCivicsPersonalization,
  type CivicsPersonalization,
} from '@/lib/n400/personalization';

export type OnboardingFormState =
  | { ok: false; error: string }
  | { ok: true; personalization: CivicsPersonalization; formattedAddress: string }
  | null;

function extractClientIp(forwardedFor: string | null): string {
  if (!forwardedFor) return 'unknown';
  return forwardedFor.split(',')[0]?.trim() || 'unknown';
}

export async function resolveOnboardingAddress(
  _prev: OnboardingFormState,
  formData: FormData
): Promise<OnboardingFormState> {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const lang = await getN400Lang();
  const dict = getN400Dict(lang);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) =>
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/n400ready/login');

  const ip = extractClientIp(headerStore.get('x-forwarded-for'));
  const { success: ipOk } = await geocodioIpLimiter.limit(`${ip}:${user.id}`);
  if (!ipOk) return { ok: false, error: dict.setup.errorRateLimitIp };

  const { success: userOk } = await geocodioUserLimiter.limit(user.id);
  if (!userOk) return { ok: false, error: dict.setup.errorRateLimitUser };

  const street = (formData.get('street') as string | null)?.trim() ?? '';
  const city = (formData.get('city') as string | null)?.trim() ?? '';
  const state = (formData.get('state') as string | null)?.trim() ?? '';
  const zip = (formData.get('zip') as string | null)?.trim() ?? '';
  const formattedAddress = (formData.get('formatted') as string | null)?.trim() || street;

  // Coordinates come from the picked autocomplete suggestion. Reverse-geocoding
  // a precise point resolves the district unambiguously, which matters in the
  // split-zip areas where one zipcode spans two districts.
  const lat = Number(formData.get('lat'));
  const lon = Number(formData.get('lon'));
  const hasCoords =
    formData.get('lat') != null &&
    formData.get('lon') != null &&
    Number.isFinite(lat) &&
    Number.isFinite(lon);

  // City is the one field Geoapify can legitimately omit (unincorporated areas
  // have no `city`). Onboarding deliberately shows no editable city field, so
  // don't hard-fail on it when coordinates are present — the reverse geocode
  // below returns the real USPS locality anyway.
  if (!street || !state || !zip || (!city && !hasCoords)) {
    return { ok: false, error: dict.setup.errorMissingFields };
  }
  if (!/^\d{5}$/.test(zip)) {
    return { ok: false, error: dict.setup.errorInvalidZipcode };
  }

  let districtNumber: number | null = null;
  let stateFromGeo: string | null = null;
  let cityFromGeo: string | null = null;
  let zipFromGeo: string | null = null;
  try {
    const apiKey = process.env.GEOCODIO_API_KEY!;
    const result = hasCoords
      ? await reverseGeocodeCoords({ lat, lng: lon, apiKey })
      : await geocodeAddress({ street, city, state, zip, apiKey });
    districtNumber = result?.districtNumber ?? null;
    stateFromGeo = result?.stateCode ?? null;
    // Only trust Geocodio's normalized city/zip on the coordinate path — see
    // the matching note in /setup/actions.ts.
    if (hasCoords) {
      cityFromGeo = result?.city ?? null;
      zipFromGeo = result?.zip ?? null;
    }
  } catch (err) {
    if (err instanceof GeocodioError) {
      // err.message is intentionally generic — no PII.
    }
    return { ok: false, error: dict.setup.errorGeocoding };
  }

  const resolvedState = stateFromGeo ?? state;

  const personalization = buildCivicsPersonalization(resolvedState, districtNumber, lang);
  if (!personalization) {
    return { ok: false, error: dict.setup.errorGeocoding };
  }

  const { error: dbError } = await supabase.from('n400_user_profile').upsert(
    {
      user_id: user.id,
      city: cityFromGeo || city || null,
      state_code: resolvedState,
      zipcode: zipFromGeo ?? zip,
      district_number: districtNumber,
      district_resolved_at: districtNumber !== null ? new Date().toISOString() : null,
      ui_language: lang,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (dbError) return { ok: false, error: dict.setup.errorDatabase };

  // Deterministic event_id so a re-run (e.g. the user edits the address to fix
  // an ambiguous match) doesn't double-count in Meta. Non-blocking by design.
  try {
    const idInput = `n400-setup:${user.id}:${resolvedState}:${districtNumber ?? 'na'}`;
    const eventId = createHash('sha256').update(idInput).digest('hex').slice(0, 32);
    await sendCapiEvent({
      eventName: 'n400_setup_complete',
      eventId,
      eventSourceUrl: 'https://mannaos.com/n400ready/onboarding/address',
      user: {
        emails: user.email ? [user.email] : undefined,
        clientIp: ip === 'unknown' ? null : ip,
        clientUserAgent: headerStore.get('user-agent') ?? null,
      },
      customData: {
        state_code: resolvedState,
        district_resolved: districtNumber !== null,
      },
    });
  } catch {
    // sendCapiEvent already logs; swallowing keeps the happy path clean.
  }

  return { ok: true, personalization, formattedAddress };
}
