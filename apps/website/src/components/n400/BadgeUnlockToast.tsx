'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { BadgeIcon } from './BadgeIcon';
import { trackBadgeUnlocked } from '@/lib/analytics/events';
import { useN400Lang } from '@/lib/n400/i18n/provider';

interface BadgeMeta {
  slug: string;
  title_vi: string;
  title_en: string;
  description_vi: string;
  description_en: string;
}

interface BadgeUnlockToastProps {
  // Slugs that the dispatcher returned as newly inserted. Toast shows
  // one card per slug, dismissable by click or auto-dismiss after 5s.
  slugs: string[];
  // Catalog metadata so we can show titles/descriptions without an
  // additional client fetch. Caller (the page that received the
  // unlocks) supplies it from the server-side query.
  catalog: Record<string, BadgeMeta>;
  // Trigger that produced these unlocks — passed through to the
  // analytics event so funnel data can split streak vs session.
  trigger: 'session_complete' | 'streak_change' | 'manual_recompute';
}

const AUTO_DISMISS_MS = 5000;

export function BadgeUnlockToast({ slugs, catalog, trigger }: BadgeUnlockToastProps) {
  const [visibleSlugs, setVisibleSlugs] = useState<string[]>(slugs);
  const { dict } = useN400Lang();

  useEffect(() => {
    setVisibleSlugs(slugs);
  }, [slugs]);

  // Fire one analytics event per unlock when the toast mounts. We don't
  // need server-side dedupe — n400_user_badges PK already guarantees one
  // INSERT per (user, slug), so the toast can only fire once per unlock.
  useEffect(() => {
    if (visibleSlugs.length === 0) return;
    for (const slug of visibleSlugs) {
      trackBadgeUnlocked(slug, trigger);
    }
  }, [visibleSlugs, trigger]);

  // Auto-dismiss the entire stack after AUTO_DISMISS_MS. Per-card
  // dismissal also works via the close button.
  useEffect(() => {
    if (visibleSlugs.length === 0) return;
    const timer = window.setTimeout(() => setVisibleSlugs([]), AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [visibleSlugs]);

  if (visibleSlugs.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm pointer-events-none">
      {visibleSlugs.map((slug) => {
        const meta = catalog[slug];
        if (!meta) return null;
        return (
          <div
            key={slug}
            className="pointer-events-auto bg-white rounded-2xl shadow-lg border border-orange-200 p-4 flex items-center gap-3 animate-in slide-in-from-right-5 fade-in duration-300"
          >
            <BadgeIcon slug={slug} alt={meta.title_vi} size={56} earned />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-orange-600 uppercase tracking-wide">
                {dict.common.badgeUnlockLabel}
              </div>
              <Link
                href={`/n400ready/profile#badges`}
                className="block font-bold text-gray-800 truncate hover:text-teal-700"
              >
                {meta.title_vi}
              </Link>
              <div className="text-xs text-gray-500 truncate">{meta.description_vi}</div>
            </div>
            <button
              type="button"
              onClick={() => setVisibleSlugs((prev) => prev.filter((s) => s !== slug))}
              aria-label={dict.common.closeButton}
              className="text-gray-300 hover:text-gray-500 shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
