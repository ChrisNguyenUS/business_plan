'use client'

// Setup form — Geoapify autocomplete drives a single street input that, on
// selection, populates editable city/state/zip fields below. Street is sent
// to Geocodio in-memory and never persisted.
//
// Hybrid UX rationale: autocomplete makes the common case fast, but the
// editable city/state/zip lets users correct mis-parses. If the Geoapify
// API key is missing or the network fails, the autocomplete dropdown
// silently collapses and the user can fill the fields manually.

import { use, useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Card } from '@/components/n400/ui'
import { AddressAutocomplete, type AddressSelection } from '@/components/n400/AddressAutocomplete'
import { saveSetupProfile, type SetupFormState } from './actions'

const US_STATES: ReadonlyArray<readonly [string, string]> = [
  ['AL', 'Alabama'], ['AK', 'Alaska'], ['AZ', 'Arizona'], ['AR', 'Arkansas'], ['CA', 'California'],
  ['CO', 'Colorado'], ['CT', 'Connecticut'], ['DE', 'Delaware'], ['DC', 'District of Columbia'],
  ['FL', 'Florida'], ['GA', 'Georgia'], ['HI', 'Hawaii'], ['ID', 'Idaho'], ['IL', 'Illinois'],
  ['IN', 'Indiana'], ['IA', 'Iowa'], ['KS', 'Kansas'], ['KY', 'Kentucky'], ['LA', 'Louisiana'],
  ['ME', 'Maine'], ['MD', 'Maryland'], ['MA', 'Massachusetts'], ['MI', 'Michigan'], ['MN', 'Minnesota'],
  ['MS', 'Mississippi'], ['MO', 'Missouri'], ['MT', 'Montana'], ['NE', 'Nebraska'], ['NV', 'Nevada'],
  ['NH', 'New Hampshire'], ['NJ', 'New Jersey'], ['NM', 'New Mexico'], ['NY', 'New York'],
  ['NC', 'North Carolina'], ['ND', 'North Dakota'], ['OH', 'Ohio'], ['OK', 'Oklahoma'],
  ['OR', 'Oregon'], ['PA', 'Pennsylvania'], ['RI', 'Rhode Island'], ['SC', 'South Carolina'],
  ['SD', 'South Dakota'], ['TN', 'Tennessee'], ['TX', 'Texas'], ['UT', 'Utah'], ['VT', 'Vermont'],
  ['VA', 'Virginia'], ['WA', 'Washington'], ['WV', 'West Virginia'], ['WI', 'Wisconsin'], ['WY', 'Wyoming'],
]

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="w-full bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white rounded-2xl px-4 py-4 text-lg font-semibold mt-2 disabled:opacity-60 transition-colors"
    >
      {pending ? 'Đang xác định khu vực... / Resolving district...' : 'Tiếp tục / Continue →'}
    </button>
  )
}

type SetupSearchParams = { city?: string; state?: string; zip?: string; from?: string }

export default function SetupPage({
  searchParams,
}: {
  searchParams?: Promise<SetupSearchParams>
}) {
  const prefill = searchParams ? use(searchParams) : {}
  const [state, formAction] = useActionState<SetupFormState, FormData>(saveSetupProfile, null)

  const [city, setCity] = useState(prefill.city ?? '')
  const [stateCode, setStateCode] = useState(prefill.state ?? 'TX')
  const [zip, setZip] = useState(prefill.zip ?? '')
  // Coordinates from a picked autocomplete suggestion. When present, the server
  // action resolves the district by reverse-geocoding this exact point (correct
  // even where a zip spans two districts). Cleared the moment the user edits the
  // street by hand, falling back to text-based geocoding.
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null)
  const fromProfile = prefill.from === 'profile'

  const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY ?? ''

  const handleAutocompleteSelect = (s: AddressSelection) => {
    setCity(s.city)
    setStateCode(s.stateCode)
    setZip(s.zip)
    setCoords({ lat: s.lat, lon: s.lon })
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md">
        <Card>
          <h1 className="text-2xl font-bold mb-1">Cho biết bạn đang ở đâu</h1>
          <p className="text-base font-semibold text-gray-500 mb-6">Where do you live?</p>

          <p className="text-sm text-gray-600 mb-2">
            Vui lòng điền địa chỉ chính xác để app xác định đúng đáp án cho câu hỏi về Hạ nghị sĩ
            khu vực bạn đang sinh sống. Zipcode đôi khi chồng lên nhiều khu vực bầu cử, nên cần
            địa chỉ cụ thể.
          </p>
          <p className="text-xs text-gray-400 mb-6">
            Please enter your accurate address so we can identify your U.S. Representative.
            Zipcodes sometimes span multiple districts.
          </p>

          <p className="text-xs text-gray-400 mb-6 italic">
            Địa chỉ đầy đủ được gửi đến Geocodio (dịch vụ tra cứu khu vực bầu cử) chỉ để xác định
            Hạ nghị sĩ của bạn — không lưu trữ trên hệ thống của chúng tôi.
            <br />
            Your full address is sent to Geocodio (a districting lookup service) solely to identify
            your Representative — it is not stored on our servers.
          </p>

          {state && !state.ok && (
            <div
              role="alert"
              className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {state.error}
            </div>
          )}

          <form action={formAction} className="space-y-4">
            {fromProfile && <input type="hidden" name="from" value="profile" />}
            <div>
              <label htmlFor="street-autocomplete" className="block text-sm font-medium mb-1">
                Địa chỉ nhà / Street Address <span className="text-red-500">*</span>
              </label>
              <AddressAutocomplete
                apiKey={apiKey}
                onSelect={handleAutocompleteSelect}
                onInputChange={() => setCoords(null)}
                placeholder="123 Main St, Houston, TX"
              />
              {coords && (
                <>
                  <input type="hidden" name="lat" value={coords.lat} />
                  <input type="hidden" name="lon" value={coords.lon} />
                </>
              )}
              <p className="text-xs text-gray-400 mt-1">
                Bắt đầu gõ địa chỉ và chọn từ gợi ý. /
                Start typing your address and pick from the suggestions.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="city" className="block text-sm font-medium mb-1">
                  Thành phố / City <span className="text-red-500">*</span>
                </label>
                <input
                  id="city"
                  name="city"
                  type="text"
                  required
                  autoComplete="address-level2"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Houston"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label htmlFor="zip" className="block text-sm font-medium mb-1">
                  Zipcode <span className="text-red-500">*</span>
                </label>
                <input
                  id="zip"
                  name="zip"
                  type="text"
                  inputMode="numeric"
                  required
                  pattern="\d{5}"
                  maxLength={5}
                  autoComplete="postal-code"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  placeholder="77083"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="state" className="block text-sm font-medium mb-1">
                Tiểu bang / State <span className="text-red-500">*</span>
              </label>
              <select
                id="state"
                name="state"
                required
                value={stateCode}
                onChange={(e) => setStateCode(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">-- Chọn tiểu bang / Select state --</option>
                {US_STATES.map(([code, name]) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <SubmitButton />
          </form>
        </Card>
      </div>
    </div>
  )
}
