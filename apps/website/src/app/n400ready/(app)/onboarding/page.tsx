'use client';

// Onboarding step 1 of 2 — language.
//
// Replaces the old LanguageSelectModal: same job, but as a real page inside the
// app chrome so onboarding reads as a two-step flow instead of a popup.
//
// This step runs before any n400_user_profile row exists, so setN400Language's
// DB write is a no-op here — the cookie carries the choice, and step 2's upsert
// persists it as ui_language. Both paths matter: the cookie makes the switch
// instant, the DB makes it survive a new device.

import { useState, useSyncExternalStore, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { DEFAULT_N400_LANG, type N400Lang } from '@/lib/n400/i18n/config';
import { readN400LangCookie } from '@/lib/n400/i18n/client';
import { setN400Language } from '@/lib/n400/i18n/actions';
import { useN400Lang } from '@/lib/n400/i18n/provider';

// The cookie can't change while this page is mounted — subscribe is a no-op.
// useSyncExternalStore is here for its server/client snapshot split, which lets
// the preselection follow the cookie without a hydration mismatch.
const subscribeNoop = () => () => {};
const getServerLang = () => DEFAULT_N400_LANG;

export default function OnboardingLanguagePage() {
  const router = useRouter();
  const { dict } = useN400Lang();
  const t = dict.onboarding;

  const cookieLang = useSyncExternalStore(subscribeNoop, readN400LangCookie, getServerLang);
  // null = not tapped yet -> fall back to the cookie, which respects a language
  // already picked on the login-screen toggle before signup.
  const [tapped, setTapped] = useState<N400Lang | null>(null);
  const choice = tapped ?? cookieLang;
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  function goNext() {
    if (pending || !choice) return;
    setFailed(false);
    startTransition(async () => {
      try {
        const { ok } = await setN400Language(choice);
        if (!ok) {
          setFailed(true);
          return;
        }
        // The language provider lives in the (app) layout, so a plain push would
        // keep step 2 in the previous language. refresh() re-renders the layout
        // against the cookie we just set.
        router.refresh();
        router.push('/n400ready/onboarding/address');
      } catch {
        setFailed(true);
      }
    });
  }

  const options: { code: N400Lang; label: string; desc: string; flag: string }[] = [
    { code: 'vi', label: 'Tiếng Việt', desc: t.langViDesc, flag: '🇻🇳' },
    { code: 'en', label: 'English', desc: t.langEnDesc, flag: '🇺🇸' },
  ];

  return (
    <div className="flex min-h-full items-start justify-center pt-2 sm:pt-6 lg:pt-8">
      <div className="w-full max-w-[520px] rounded-[20px] border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
        <div className="text-center">
          <span className="inline-flex items-center rounded-full bg-teal-600/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-teal-700">
            {t.step1Badge}
          </span>
          <h1 className="mt-4 text-2xl font-extrabold text-slate-900 sm:text-3xl">
            {t.langTitle}
          </h1>
          <p className="mx-auto mt-2 max-w-[420px] text-[15px] leading-relaxed text-slate-500">
            {t.langSubtitle1}
            <br />
            {t.langSubtitle2}
          </p>
        </div>

        <div className="mt-6 space-y-3 border-t border-slate-100 pt-6">
          {options.map((opt) => {
            const selected = choice === opt.code;
            return (
              <button
                key={opt.code}
                type="button"
                onClick={() => setTapped(opt.code)}
                aria-pressed={selected}
                className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition duration-150 hover:-translate-y-px hover:border-teal-400 hover:shadow-sm ${
                  selected ? 'border-teal-500 bg-teal-50/70' : 'border-slate-200 bg-white'
                }`}
              >
                <span aria-hidden className="text-3xl leading-none">
                  {opt.flag}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-bold text-slate-900">{opt.label}</span>
                  <span className="mt-0.5 block text-sm text-slate-500">{opt.desc}</span>
                </span>
                <span
                  aria-hidden
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
                    selected ? 'border-teal-600' : 'border-slate-300'
                  }`}
                >
                  {selected && <span className="h-2.5 w-2.5 rounded-full bg-teal-600" />}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={goNext}
          disabled={pending || !choice}
          aria-busy={pending}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-600 px-4 py-4 text-lg font-semibold text-white transition-colors hover:bg-teal-700 active:bg-teal-800 disabled:opacity-60"
        >
          {t.langContinue}
          <ArrowRight size={20} />
        </button>

        {failed && (
          <p role="alert" className="mt-3 text-center text-xs font-semibold text-red-600">
            {t.langError}
          </p>
        )}

        <p className="mt-4 text-center text-xs text-slate-400">{t.langFooter}</p>
      </div>
    </div>
  );
}
