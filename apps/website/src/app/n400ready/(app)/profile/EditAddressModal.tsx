'use client';

import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Info, ArrowRight, ArrowLeft } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AddressAutocomplete, type AddressSelection } from '@/components/n400/AddressAutocomplete';
import { useN400Lang } from '@/lib/n400/i18n/provider';
import { saveSetupProfile, type SetupFormState } from '../setup/actions';

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
];

function SubmitButton() {
  const { pending } = useFormStatus();
  const { dict } = useN400Lang();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-teal-700 active:bg-teal-800 disabled:opacity-60 mt-4"
    >
      {pending ? dict.setup.submitting : dict.profile.saveChanges}
      {!pending && <ArrowRight size={18} />}
    </button>
  );
}

interface EditAddressModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  prefillCity?: string;
  prefillState?: string;
  prefillZip?: string;
  districtDisplay?: string;
}

export function EditAddressModal({
  isOpen,
  onOpenChange,
  prefillCity = '',
  prefillState = '',
  prefillZip = '',
  districtDisplay = '',
}: EditAddressModalProps) {
  const { dict } = useN400Lang();
  
  // The action redirects on success, so we don't need a custom success handler here.
  // We provide the 'null' initial state as required by useActionState.
  const [state, formAction] = useActionState<SetupFormState, FormData>(saveSetupProfile, null);

  const [city, setCity] = useState(prefillCity);
  const [stateCode, setStateCode] = useState(prefillState);
  const [zip, setZip] = useState(prefillZip);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY ?? '';

  // Reset internal state if the modal is reopened or prefill changes
  useEffect(() => {
    if (isOpen) {
      setCity(prefillCity);
      setStateCode(prefillState);
      setZip(prefillZip);
      setCoords(null);
    }
  }, [isOpen, prefillCity, prefillState, prefillZip]);

  const handleAutocompleteSelect = (s: AddressSelection) => {
    setCity(s.city);
    setStateCode(s.stateCode);
    setZip(s.zip);
    setCoords({ lat: s.lat, lon: s.lon });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent 
        className="w-[95vw] max-w-[640px] rounded-[20px] p-4 sm:p-6 bg-white overflow-y-auto max-h-[95vh] gap-0 border-slate-100 [&>button]:hidden"
      >
        <div className="text-center mb-6">
          <DialogTitle className="text-xl font-extrabold text-slate-900 sm:text-2xl mt-2">
            {dict.profile.editAddressTitle}
          </DialogTitle>
          <p className="mx-auto mt-1.5 max-w-[500px] text-xs leading-relaxed text-slate-500 sm:text-sm">
            {dict.profile.editAddressSubtitle}
          </p>
        </div>

        {state && !state.ok && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {state.error}
          </div>
        )}

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="from" value="profile" />
          
          <div>
            <label htmlFor="street-autocomplete" className="block text-xs font-semibold text-slate-700 mb-1">
              {dict.setup.streetLabel} <span className="text-red-500">*</span>
            </label>
            <AddressAutocomplete
              apiKey={apiKey}
              onSelect={handleAutocompleteSelect}
              onInputChange={() => setCoords(null)}
              placeholder="123 Main St, Houston, TX"
              required={false}
            />
            {coords && (
              <>
                <input type="hidden" name="lat" value={coords.lat} />
                <input type="hidden" name="lon" value={coords.lon} />
              </>
            )}
            <p className="mt-1 text-xs text-slate-400">{dict.profile.editAddressStreetHint}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="city" className="block text-xs font-semibold text-slate-700 mb-1">
                {dict.profile.addressCityLabel} <span className="text-red-500">*</span>
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
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label htmlFor="zip" className="block text-xs font-semibold text-slate-700 mb-1">
                {dict.profile.addressZipLabel} <span className="text-red-500">*</span>
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
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="state" className="block text-xs font-semibold text-slate-700 mb-1">
                {dict.profile.addressStateLabel} <span className="text-red-500">*</span>
              </label>
              <select
                id="state"
                name="state"
                required
                value={stateCode}
                onChange={(e) => setStateCode(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">{dict.setup.stateSelectPlaceholder}</option>
                {US_STATES.map(([code, name]) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                {dict.profile.addressDistrictLabel} <Info size={14} className="text-slate-400" />
              </label>
              <input
                type="text"
                disabled
                value={districtDisplay}
                className="w-full border border-gray-100 bg-gray-50 text-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none cursor-not-allowed"
              />
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-teal-50/70 px-3.5 py-3 border border-teal-100/50">
            <Info size={16} className="mt-0.5 shrink-0 text-teal-600" />
            <p className="text-xs leading-normal text-slate-600">
              <span className="font-semibold text-slate-700">{dict.profile.editAddressDistrictInfoTitle}</span>{' '}
              <span>{dict.profile.editAddressDistrictInfoDesc}</span>
            </p>
          </div>

          <SubmitButton />

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="mt-2 flex w-full items-center justify-center gap-1 py-2 text-xs font-semibold text-teal-700 transition hover:text-teal-800"
          >
            <ArrowLeft size={14} />
            {dict.profile.cancelEdit}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
