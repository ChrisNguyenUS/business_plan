'use client';

// The CTA card (spec §4). Visually a sibling of GrowthPromptCard — same
// rounded-[24px] white card, same quiet dismiss — because they occupy the same
// slot and must not feel like two different systems bolted on.

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useN400Lang } from '@/lib/n400/i18n/provider';
import { clickCta, dismissCta, markCtaShown } from '@/lib/n400/growth/cta-actions';
import type { ActiveCta } from '@/lib/n400/growth/cta-state';

const ACTION_HREF: Record<ActiveCta['action'], string> = {
  // The consultation route also serves the document-prep support call — the
  // form prefills its topic from the source CTA (topicForCta), so no separate
  // destination is needed.
  book_consultation: '/n400ready/consultation',
  start_mock: '/n400ready/mock-test',
};

export function GrowthCtaCard({ cta, onDone }: { cta: ActiveCta; onDone: () => void }) {
  const { dict, lang } = useN400Lang();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const shownFor = useRef<string | null>(null);

  // One impression per CTA, fired from the mounted card — this is the moment
  // the 7-day cap gets stamped, so it must happen here and nowhere earlier.
  // A CTA the evaluator picked but the user never actually saw leaves the cap
  // untouched and simply gets picked again next time.
  useEffect(() => {
    if (shownFor.current === cta.ctaId) return;
    shownFor.current = cta.ctaId;
    void markCtaShown(cta.ctaId, cta.variant, cta.surface).catch(() => {
      // Best-effort funnel logging — never break a learning screen over it.
    });
  }, [cta.ctaId, cta.variant, cta.surface]);

  const title = lang === 'en' ? cta.titleEn : cta.titleVi;
  const body = lang === 'en' ? cta.bodyEn : cta.bodyVi;
  const label = lang === 'en' ? cta.labelEn : cta.labelVi;

  const go = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await clickCta(cta.ctaId, cta.variant, cta.surface);
    } catch {
      // Navigate regardless — a lost click event must not cost the user the CTA.
    } finally {
      // Reset even though navigation is about to unmount this card — a stalled
      // or intercepted router.push must not leave the button stuck disabled.
      setBusy(false);
    }
    router.push(ACTION_HREF[cta.action]);
  };

  const dismiss = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await dismissCta(cta.ctaId, cta.variant, cta.surface);
    } catch {
      // Best-effort; still close the card.
    }
    setBusy(false);
    onDone();
  };

  return (
    <div className="relative rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm animate-in fade-in duration-300">
      <button
        type="button"
        onClick={dismiss}
        aria-label={dict.growth.ctaDismiss}
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-50"
      >
        <X size={16} />
      </button>

      <div className="text-xs font-bold uppercase tracking-wide text-teal-600">
        {dict.growth.ctaEyebrow}
      </div>
      <div className="mt-1.5 pr-8 font-bold text-gray-800">{title}</div>
      <p className="mt-1 text-sm text-gray-600">{body}</p>

      <button
        type="button"
        disabled={busy}
        onClick={go}
        className="mt-3 rounded-full bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-40"
      >
        {label}
      </button>
    </div>
  );
}
