'use client';

import { useEffect, useState } from 'react';
import { MapPin, RotateCcw, Volume2, VolumeX, Pencil, Building2 } from 'lucide-react';
import { Card } from '@/components/n400/ui';
import { useN400UserState } from '@/lib/n400/user-state';
import { STATES } from '@/lib/n400/state-data';
import { useAuth } from '@/components/providers/AuthProvider';
import { useN400Lang } from '@/lib/n400/i18n/provider';
import { EditAddressModal } from './EditAddressModal';

// Cài đặt — how the app works for you: the address that sets the location answers
// (senators, representative, governor, capital), audio, and Reset. Who you are and
// your badges stay on Tài khoản (/profile). Owner decision 2026-10-08.
export default function SettingsPage() {
  const { dict } = useN400Lang();
  const { state, hydrated, updateSettings, resetAll, reloadAddress } = useN400UserState();
  const [confirmReset, setConfirmReset] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const { user } = useAuth();

  // Returning from a setup save (?updated=1): the setup form wrote the new
  // district via a server action, which this client store can't observe. Pull
  // the fresh address in, then strip the marker so it fires once. Reading
  // window.location avoids a useSearchParams Suspense boundary on the page.
  useEffect(() => {
    if (!user) return;
    if (new URLSearchParams(window.location.search).get('updated') !== '1') return;
    // Close the editor once the fresh address is in: a callback, not the effect
    // body, since setState inside an effect is a lint error here.
    void reloadAddress().finally(() => setIsAddressModalOpen(false));
    window.history.replaceState(null, '', '/n400ready/settings');
  }, [user, reloadAddress]);

  if (!hydrated) {
    return <div className="text-sm text-gray-500">{dict.common.loading}</div>;
  }

  const onResetConfirm = () => {
    resetAll();
    setConfirmReset(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-[1100px] mx-auto">
      {/* ─── Address & District ─── */}
      <Card className="p-6">
        <div className="flex justify-between items-start mb-4 gap-4 flex-wrap">
          <div>
            <h3 className="font-bold text-gray-800">{dict.profile.addressSectionTitle}</h3>
            <p className="text-xs text-gray-500 mt-1">{dict.profile.addressSectionHint}</p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddressModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-50 text-teal-700 text-sm font-semibold hover:bg-teal-100"
          >
            <Pencil size={14} /> {dict.profile.editButton}
          </button>
        </div>

        {state.address.districtNumber === null ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
            {dict.profile.noAddressBefore}{' '}
            <span className="font-semibold text-teal-700">{dict.profile.editButton}</span>{' '}
            {dict.profile.noAddressAfter}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AddressField
              icon={<MapPin size={16} />}
              label={dict.profile.addressCityLabel}
              value={state.address.city ?? '—'}
            />
            <AddressField
              icon={<MapPin size={16} />}
              label={dict.profile.addressStateLabel}
              value={
                state.address.stateCode
                  ? `${STATES.find((s) => s.code === state.address.stateCode)?.nameEn ?? state.address.stateCode} (${state.address.stateCode})`
                  : '—'
              }
            />
            <AddressField
              icon={<MapPin size={16} />}
              label={dict.profile.addressZipLabel}
              value={state.address.zipcode ?? '—'}
            />
            <AddressField
              icon={<Building2 size={16} />}
              label={dict.profile.addressDistrictLabel}
              value={
                state.address.districtNumber === 0
                  ? dict.profile.districtAtLarge
                  : `${state.address.stateCode ?? ''}-${state.address.districtNumber}`
              }
              highlight
            />
          </div>
        )}
      </Card>

      {/* ─── Preferences ─── */}
      <Card className="p-6 space-y-6">
        <h3 className="font-bold text-gray-800">{dict.profile.preferencesTitle}</h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{dict.profile.audioLabel}</label>
          <button
            type="button"
            onClick={() => updateSettings({ audioEnabled: !state.settings.audioEnabled })}
            className={`flex items-center gap-3 px-4 h-11 rounded-xl border ${
              state.settings.audioEnabled
                ? 'bg-teal-50 border-teal-200 text-teal-700'
                : 'bg-white border-gray-200 text-gray-600'
            }`}
          >
            {state.settings.audioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            {state.settings.audioEnabled ? dict.profile.audioEnabled : dict.profile.audioDisabled}
          </button>
          <p className="text-xs text-gray-500 mt-2">{dict.profile.audioHint}</p>
        </div>

        {/* ─── Danger Zone ─── */}
        <div className="border-t border-gray-100 pt-6">
          <h4 className="font-semibold text-gray-800 mb-2">{dict.profile.resetProgressTitle}</h4>
          <p className="text-xs text-gray-500 mb-3">{dict.profile.resetProgressHint}</p>
          {confirmReset ? (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onResetConfirm}
                className="px-4 py-2 rounded-lg bg-red-500 text-white font-semibold text-sm hover:bg-red-600"
              >
                {dict.profile.confirmReset}
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-600 text-sm"
              >
                {dict.profile.cancel}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 text-sm hover:border-red-200 hover:text-red-500 flex items-center gap-2"
            >
              <RotateCcw size={14} /> {dict.profile.resetButton}
            </button>
          )}
        </div>
      </Card>
      
      <EditAddressModal
        isOpen={isAddressModalOpen}
        onOpenChange={setIsAddressModalOpen}
        prefillCity={state.address.city ?? ''}
        prefillState={state.address.stateCode ?? ''}
        prefillZip={state.address.zipcode ?? ''}
        districtDisplay={
          state.address.districtNumber === null
            ? ''
            : state.address.districtNumber === 0
            ? dict.profile.districtAtLarge
            : `${state.address.stateCode ?? ''}-${state.address.districtNumber}`
        }
      />
    </div>
  );
}

function AddressField({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        highlight ? 'bg-teal-50 border-teal-200' : 'bg-gray-50 border-gray-100'
      }`}
    >
      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
        {icon} {label}
      </div>
      <div className={`text-sm font-semibold ${highlight ? 'text-teal-700' : 'text-gray-800'}`}>
        {value}
      </div>
    </div>
  );
}
