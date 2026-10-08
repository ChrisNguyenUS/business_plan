'use client';

import Link from 'next/link';
import {
  User,
  MapPin,
  BarChart2,
  Pencil,
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
  const { state, hydrated, stats } = useN400UserState();
  const badges = useN400Badges();
  const { user, profile } = useAuth();

  const avatarUrl = profile ? getAvatarUrl(profile.avatar_path, profile.updated_at) : null;

  if (!hydrated) {
    return <div className="text-sm text-gray-500">{dict.common.loading}</div>;
  }

  const stateInfo = STATES.find(
    (s) => s.code === (state.address.stateCode ?? state.settings.stateCode)
  );

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

    </div>
  );
}
