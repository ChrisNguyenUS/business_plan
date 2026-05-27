'use server'

// Setup form server action. Pipeline:
//   1. Verify auth (defense-in-depth — middleware already gates /n400app/setup)
//   2. Rate-limit by `<ip>:<userId>` (sliding 5/h) and by `<userId>` (10/24h)
//   3. Validate form input
//   4. Geocode in-memory (street address NOT persisted)
//   5. Upsert n400_user_profile — district_number stays null on ambiguous matches
//   6. Redirect to /n400app
//
// Notes
//  - PII guarantee: the street address from the form never reaches the database.
//    Geocodio sees it for one HTTP call, then it's GC'd. This matches the
//    bilingual disclaimer rendered by the setup form.
//  - Ambiguous addresses (>1 congressional district) get saved with
//    district_number = null. The dashboard surfaces a "couldn't resolve your
//    representative" prompt and offers a re-run with a more specific address.

import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { geocodeAddress, GeocodioError } from '@/lib/n400/geocodio'
import { geocodioIpLimiter, geocodioUserLimiter } from '@/lib/n400/rate-limit'

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
      error:
        'Quá nhiều yêu cầu. Vui lòng thử lại sau 1 giờ. / Too many requests. Please try again in 1 hour.',
    }
  }

  const { success: userOk } = await geocodioUserLimiter.limit(user.id)
  if (!userOk) {
    return {
      ok: false,
      error:
        'Đã vượt quá giới hạn hôm nay. Vui lòng thử lại ngày mai. / Daily limit reached. Please try again tomorrow.',
    }
  }

  const street = (formData.get('street') as string | null)?.trim() ?? ''
  const city = (formData.get('city') as string | null)?.trim() ?? ''
  const state = (formData.get('state') as string | null)?.trim() ?? ''
  const zip = (formData.get('zip') as string | null)?.trim() ?? ''

  if (!street || !city || !state || !zip) {
    return {
      ok: false,
      error: 'Vui lòng điền đầy đủ thông tin. / Please fill in all fields.',
    }
  }
  if (!/^\d{5}$/.test(zip)) {
    return {
      ok: false,
      error: 'Zipcode phải có 5 chữ số. / Zipcode must be 5 digits.',
    }
  }

  let districtNumber: number | null = null
  let stateFromGeo: string | null = null
  try {
    const result = await geocodeAddress({
      street,
      city,
      state,
      zip,
      apiKey: process.env.GEOCODIO_API_KEY!,
    })
    districtNumber = result?.districtNumber ?? null
    stateFromGeo = result?.stateCode ?? null
  } catch (err) {
    if (err instanceof GeocodioError) {
      // err.message intentionally generic — no PII. Phase 8 wraps with Sentry.
    }
    return {
      ok: false,
      error:
        'Không thể xác định khu vực. Vui lòng kiểm tra lại địa chỉ. / Could not determine your district. Please check your address.',
    }
  }

  const { error: dbError } = await supabase.from('n400_user_profile').upsert(
    {
      user_id: user.id,
      city,
      state_code: stateFromGeo ?? state,
      zipcode: zip,
      district_number: districtNumber,
      district_resolved_at: districtNumber !== null ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )

  if (dbError) {
    return {
      ok: false,
      error: 'Lỗi lưu dữ liệu. Vui lòng thử lại. / Error saving data. Please try again.',
    }
  }

  // Edit flow comes from /n400app/profile and expects to land back there.
  // First-time setup falls through to the dashboard.
  const from = (formData.get('from') as string | null)?.trim() ?? ''
  redirect(from === 'profile' ? '/n400app/profile' : '/n400app')
}
