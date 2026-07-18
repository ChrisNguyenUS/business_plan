'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  User,
  MapPin,
  BarChart2,
  RotateCcw,
  Volume2,
  VolumeX,
  Pencil,
  Building2,
  ExternalLink,
} from 'lucide-react';
import { Card } from '@/components/n400/ui';
import { BadgeGallery } from '@/components/n400/BadgeGallery';
import { useN400UserState } from '@/lib/n400/user-state';
import { useN400Badges } from '@/lib/n400/use-badges';
import { STATES } from '@/lib/n400/state-data';
import { useAuth } from '@/components/providers/AuthProvider';
import { getAvatarUrl, getDisplayName, getInitials } from '@/lib/profile-utils';
import { useN400Lang } from '@/lib/n400/i18n/provider';

export default function ProfilePage() {
  const { dict } = useN400Lang();
  const { state, hydrated, stats, updateSettings, resetAll } = useN400UserState();
  const badges = useN400Badges();
  const [confirmReset, setConfirmReset] = useState(false);
  const { user, profile } = useAuth();

  const avatarUrl = profile ? getAvatarUrl(profile.avatar_path, profile.updated_at) : null;

  if (!hydrated) {
    return <div className="text-sm text-gray-500">{dict.common.loading}</div>;
  }

  const stateInfo = STATES.find(
    (s) => s.code === (state.address.stateCode ?? state.settings.stateCode)
  );

  const onResetConfirm = () => {
    resetAll();
    setConfirmReset(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-[1100px] mx-auto">
      {/* ─── Identity ─── */}
      <Card className="p-6 sm:p-8">
        <div className="flex items-center gap-6 sm:gap-8">
          <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-teal-50 border-4 border-teal-100 relative shadow-inner overflow-hidden shrink-0 flex items-center justify-center">
            {avatarUrl ? (
              // Plain <img>: avatar lives on the Supabase storage CDN, which
              // is not in next/image's remotePatterns allowlist.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt="Avatar"
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <span className="text-2xl sm:text-4xl font-bold text-teal-600">
                {profile ? getInitials(profile) : '?'}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1">
              {profile ? getDisplayName(profile) : '…'}
            </h2>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-xs font-bold mb-3">
              <User size={14} /> {dict.profile.badge}
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
              {user?.email && (
                <span className="flex items-center gap-1.5">
                  <User size={14} /> {user.email}
                </span>
              )}
              {stateInfo && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={14} /> {stateInfo.nameEn}
                </span>
              )}
            </div>
            <Link
              href={`/n400ready/profile/edit`}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-50 text-teal-700 text-sm font-semibold hover:bg-teal-100"
            >
              <Pencil size={14} /> {dict.profile.editProfile}
            </Link>
          </div>
        </div>

        {/* Summary stat line → Learning Progress */}
        <Link
          href={`/n400ready/progress`}
          className="mt-6 group flex items-center gap-3 px-4 py-3 bg-gray-50/80 rounded-xl text-sm text-gray-600 hover:bg-teal-50 hover:text-teal-700 transition-colors duration-[var(--motion-fast)] border border-gray-100/80"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 group-hover:bg-teal-100 transition-colors">
            <BarChart2 size={16} className="text-gray-400 group-hover:text-teal-600 transition-colors" />
          </div>
          <span className="font-medium">
            {stats.coverage}% {dict.profile.coverageLabel} · {stats.accuracy}% {dict.profile.accuracyLabel} ·{' '}
            {stats.mastered} {dict.profile.masteredLabel}
          </span>
          <ExternalLink size={14} className="ml-auto text-gray-300 group-hover:text-teal-500 transition-colors" />
        </Link>
      </Card>

      {/* ─── Achievements (product data, displayed on Account) ─── */}
      {badges.hydrated ? (
        <BadgeGallery catalog={badges.catalog} earned={badges.earned} />
      ) : null}

      {/* ─── Address & District ─── */}
      <Card className="p-6">
        <div className="flex justify-between items-start mb-4 gap-4 flex-wrap">
          <div>
            <h3 className="font-bold text-gray-800">{dict.profile.addressSectionTitle}</h3>
            <p className="text-xs text-gray-500 mt-1">{dict.profile.addressSectionHint}</p>
          </div>
          <Link
            href={{
              pathname: `/n400ready/setup`,
              query: {
                from: 'profile',
                ...(state.address.city ? { city: state.address.city } : {}),
                ...(state.address.stateCode ? { state: state.address.stateCode } : {}),
                ...(state.address.zipcode ? { zip: state.address.zipcode } : {}),
              },
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-50 text-teal-700 text-sm font-semibold hover:bg-teal-100"
          >
            <Pencil size={14} /> {dict.profile.editButton}
          </Link>
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
