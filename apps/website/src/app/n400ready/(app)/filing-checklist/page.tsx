'use client';

// N-400 Filing Checklist (spec §4.3). Content page — tickable items persisted
// per device (checklist-storage), ending in the consultation hook. Flags off →
// bounce to the dashboard; the CTA/hero that link here are flag-gated too, so
// this is only a deep-link guard. The `checklist_viewed` event fires once per
// mount — it is UI telemetry (client-writable, n400_24), not scoring.

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/AuthProvider';
import { useN400Lang } from '@/lib/n400/i18n/provider';
import { tFormat } from '@/lib/n400/i18n/format';
import { isFeatureOn, type FeatureFlag } from '@/lib/n400/growth/flags';
import { ingestClientEvent } from '@/lib/n400/growth/ingest';
import { CHECKLIST_ITEM_IDS, CHECKLIST_SECTIONS } from '@/lib/n400/checklist-data';
import { loadTicks, saveTicks } from '@/lib/n400/checklist-storage';

export default function FilingChecklistPage() {
  const { dict, lang } = useN400Lang();
  const { user } = useAuth();
  const router = useRouter();
  const t = dict.growth.checklist;

  const [ready, setReady] = useState(false);
  const [ticks, setTicks] = useState<Set<string>>(new Set());
  const viewedLogged = useRef(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('n400_feature_flags')
        .select('flag_key, enabled, rollout_pct')
        .in('flag_key', ['growth_engine', 'filing_checklist']);
      if (cancelled) return;
      const flags = new Map((data ?? []).map((f) => [f.flag_key as string, f as FeatureFlag]));
      if (
        !isFeatureOn(flags.get('growth_engine') ?? null, user.id) ||
        !isFeatureOn(flags.get('filing_checklist') ?? null, user.id)
      ) {
        router.replace('/n400ready');
        return;
      }
      setTicks(loadTicks(user.id));
      setReady(true);
      if (!viewedLogged.current) {
        viewedLogged.current = true;
        void ingestClientEvent('checklist_viewed', {});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, router]);

  if (!user || !ready) {
    return <div className="text-sm text-gray-500">{dict.common.loading}</div>;
  }

  const toggle = (id: string) => {
    const next = new Set(ticks);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setTicks(next);
    saveTicks(user.id, next);
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <div className="rounded-[24px] border border-slate-100 bg-white p-6 shadow-sm">
        <div className="text-xs font-bold uppercase tracking-wide text-teal-600">{t.eyebrow}</div>
        <h1 className="mt-1.5 text-xl font-bold text-gray-800">{t.title}</h1>
        <p className="mt-1 text-sm text-gray-600">{t.subtitle}</p>
        <p className="mt-3 inline-block rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
          {tFormat(t.progress, { done: ticks.size, total: CHECKLIST_ITEM_IDS.length })}
        </p>

        <div className="mt-5 space-y-6">
          {CHECKLIST_SECTIONS.map((section) => (
            <section key={section.id}>
              <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">
                {lang === 'en' ? section.title_en : section.title_vi}
              </h2>
              <ul className="mt-2 space-y-2">
                {section.items.map((item) => {
                  const done = ticks.has(item.id);
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => toggle(item.id)}
                        aria-pressed={done}
                        className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                          done
                            ? 'border-teal-200 bg-teal-50 text-gray-500'
                            : 'border-slate-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span
                          aria-hidden
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                            done ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-300 text-transparent'
                          }`}
                        >
                          ✓
                        </span>
                        <span>
                          <span className={done ? 'line-through decoration-teal-400' : ''}>
                            {lang === 'en' ? item.title_en : item.title_vi}
                          </span>
                          {(lang === 'en' ? item.note_en : item.note_vi) && (
                            <span className="mt-0.5 block text-xs text-gray-500">
                              {lang === 'en' ? item.note_en : item.note_vi}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>

        <p className="mt-6 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-relaxed text-gray-500">
          {t.disclosure}
        </p>

        <div className="mt-5 rounded-2xl border border-teal-100 bg-teal-50/60 p-4">
          <h2 className="text-sm font-bold text-gray-800">{t.consultTitle}</h2>
          <p className="mt-1 text-sm text-gray-600">{t.consultBody}</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link
              href="/n400ready/consultation"
              className="rounded-full bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-700"
            >
              {t.consultCta}
            </Link>
            <Link
              href="/n400ready"
              className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
            >
              {t.backToDashboard}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
