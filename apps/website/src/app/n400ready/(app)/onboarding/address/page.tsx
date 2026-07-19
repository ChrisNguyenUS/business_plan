'use client';

// Onboarding step 2 of 2 — address → personalized civics.
//
// The point of this screen is the payoff: the moment the user picks an address
// we resolve their district and show the actual civics answers they'll be
// tested on (representative, governor, capital, senators). Asking for an
// address is easier to justify when the value lands one second later.
//
// Deliberately no street/city/state/zip fields — one autocomplete input is the
// whole task. The editable-fields version still lives at /n400ready/setup,
// which Profile uses for address edits.

import { useCallback, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Info,
  Landmark,
  Loader2,
  MapPin,
  Pencil,
  Star,
  User,
  Users,
} from 'lucide-react';
import { AddressAutocomplete, type AddressSelection } from '@/components/n400/AddressAutocomplete';
import { useN400Lang } from '@/lib/n400/i18n/provider';
import { districtLabel } from '@/lib/n400/personalization';
import { resolveOnboardingAddress, type OnboardingFormState } from '../actions';

// Staggered reveal of the three confirmation lines, then navigate. Tuned so the
// whole transition reads as ~1s of "we're doing something" without feeling slow.
const FINISH_STEP_MS = 300;
const FINISH_EXIT_MS = 1100;

export default function OnboardingAddressPage() {
  const router = useRouter();
  const { dict } = useN400Lang();
  const t = dict.onboarding;

  const [result, setResult] = useState<OnboardingFormState>(null);
  const [pending, startTransition] = useTransition();
  // Number of confirmation lines revealed; -1 = not finishing yet.
  const [finishStep, setFinishStep] = useState(-1);

  const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY ?? '';
  const resolved = result?.ok ? result : null;

  // Resolving fires straight off the autocomplete selection — no extra click.
  // The action is called directly (rather than via a <form>) so the summary can
  // replace the input without the two competing `name="street"` inputs a
  // hidden-field form would need.
  const resolve = useCallback((sel: AddressSelection) => {
    const fd = new FormData();
    fd.set('street', sel.street);
    fd.set('city', sel.city);
    fd.set('state', sel.stateCode);
    fd.set('zip', sel.zip);
    fd.set('formatted', sel.formatted);
    fd.set('lat', String(sel.lat));
    fd.set('lon', String(sel.lon));
    startTransition(async () => {
      setResult(await resolveOnboardingAddress(null, fd));
    });
  }, []);

  function startOver() {
    setResult(null);
  }

  function finish() {
    if (!resolved || finishStep >= 0) return;
    setFinishStep(0);
  }

  // Drive the finishing sequence, then navigate. `?welcome=signup` is what makes
  // the dashboard fire the n400_signup_complete GA4 event exactly once.
  useEffect(() => {
    if (finishStep < 0) return;
    if (finishStep < 2) {
      const id = setTimeout(() => setFinishStep((s) => s + 1), FINISH_STEP_MS);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => router.push('/n400ready?welcome=signup'), FINISH_EXIT_MS);
    return () => clearTimeout(id);
  }, [finishStep, router]);

  return (
    <div className="flex min-h-full items-start justify-center pt-2 sm:pt-6 lg:pt-8">
      <div className="w-full max-w-[580px] rounded-[20px] border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
        <div className="text-center">
          <span className="inline-flex items-center rounded-full bg-teal-600/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-teal-700">
            {t.step2Badge}
          </span>
          <h1 className="mt-4 text-2xl font-extrabold text-slate-900 sm:text-[28px]">
            {t.addrTitle}
          </h1>
          <p className="mx-auto mt-2 max-w-[460px] text-[15px] leading-relaxed text-slate-500">
            {t.addrSubtitle1}
            <br />
            {t.addrSubtitle2}
          </p>
        </div>

        {finishStep >= 0 ? (
          <FinishingSequence
            step={finishStep}
            lines={[t.finish1, t.finish2, t.finish3]}
          />
        ) : (
          <>
            <div className="mt-6 border-t border-slate-100 pt-6">
              <p className="mb-2 text-sm font-semibold text-slate-700">
                {t.addrLabel} <span className="text-red-500">*</span>
              </p>

              {resolved ? (
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <MapPin size={18} className="shrink-0 text-teal-600" />
                  <span className="min-w-0 flex-1 truncate text-[15px] text-slate-800">
                    {resolved.formattedAddress}
                  </span>
                  <button
                    type="button"
                    onClick={startOver}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-semibold text-teal-700 transition hover:border-teal-400 hover:bg-teal-50"
                  >
                    <Pencil size={14} />
                    {t.addrEdit}
                  </button>
                </div>
              ) : (
                <>
                  <AddressAutocomplete
                    apiKey={apiKey}
                    onSelect={resolve}
                    placeholder={t.addrPlaceholder}
                    required={false}
                  />
                  <p className="mt-2 text-xs text-slate-400">{t.addrHint}</p>
                </>
              )}
            </div>

            {pending && (
              <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-slate-50 px-4 py-6 text-sm font-medium text-slate-500">
                <Loader2 size={16} className="animate-spin text-teal-600" />
                {t.resolving}
              </div>
            )}

            {result && !result.ok && (
              <p
                role="alert"
                className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {result.error}
              </p>
            )}

            {resolved && <PersonalizationSummary result={resolved} t={t} />}

            <div className="mt-4 flex items-start gap-3 rounded-2xl bg-teal-50/70 px-4 py-3.5">
              <Info size={18} className="mt-0.5 shrink-0 text-teal-600" />
              <p className="text-[13px] leading-relaxed text-slate-600">
                <span className="font-semibold text-slate-700">{t.privacy1}</span>
                <br />
                {t.privacy2}
              </p>
            </div>

            <button
              type="button"
              onClick={finish}
              disabled={!resolved}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-600 px-4 py-4 text-lg font-semibold text-white transition-colors hover:bg-teal-700 active:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t.startLearning}
              <ArrowRight size={20} />
            </button>

            <button
              type="button"
              onClick={() => router.push('/n400ready/onboarding')}
              className="mt-3 flex w-full items-center justify-center gap-2 py-1 text-sm font-semibold text-teal-700 transition hover:text-teal-800"
            >
              <ArrowLeft size={16} />
              {t.back}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

type OnboardingDict = ReturnType<typeof useN400Lang>['dict']['onboarding'];

/**
 * The reward moment. Soft teal, minimal borders — the visual highlight of the
 * page, deliberately heavier than anything above it.
 */
function PersonalizationSummary({
  result,
  t,
}: {
  result: Extract<OnboardingFormState, { ok: true }>;
  t: OnboardingDict;
}) {
  const p = result.personalization;
  const district = districtLabel(p.districtNumber, t.districtPrefix);

  const facts: { icon: typeof Landmark; label: string; value: string; sub?: string }[] = [
    { icon: Landmark, label: t.labelState, value: p.stateName },
  ];
  if (p.representative) {
    facts.push({
      icon: User,
      label: t.labelRep,
      value: p.representative,
      sub: district ?? undefined,
    });
  }
  facts.push({ icon: Building2, label: t.labelGovernor, value: p.governor });
  if (p.capital) facts.push({ icon: Star, label: t.labelCapital, value: p.capital });
  if (p.senators.length > 0) {
    facts.push({ icon: Users, label: t.labelSenators, value: p.senators.join('\n') });
  }

  return (
    <div className="mt-4 rounded-2xl bg-teal-50/70 p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-600">
          <Check size={20} className="text-white" strokeWidth={3} />
        </span>
        <div className="min-w-0">
          <p className="text-base font-bold text-slate-900">{t.summaryTitle}</p>
          <p className="text-sm text-slate-500">{t.summarySubtitle}</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-3">
        {facts.map((f) => (
          <div key={f.label} className="flex items-start gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white">
              <f.icon size={17} className="text-teal-700" />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-slate-500">{f.label}</p>
              {f.value.split('\n').map((line) => (
                <p key={line} className="text-[15px] font-bold leading-snug text-slate-900">
                  {line}
                </p>
              ))}
              {f.sub && <p className="text-xs text-slate-400">{f.sub}</p>}
            </div>
          </div>
        ))}
      </div>

      {!p.representative && (
        <p className="mt-4 text-xs leading-relaxed text-slate-500">{t.repUnresolved}</p>
      )}
    </div>
  );
}

function FinishingSequence({ step, lines }: { step: number; lines: string[] }) {
  // Busy until the last line lands, so assistive tech reads the sequence as one
  // in-progress region rather than three separate interruptions.
  const done = step >= lines.length - 1;

  return (
    <div className="mt-6 border-t border-slate-100 pt-8 pb-4" aria-live="polite" aria-busy={!done}>
      <div className="mx-auto flex max-w-[380px] flex-col gap-3">
        {lines.map((line, i) => (
          <div
            key={line}
            className={`flex items-center gap-3 text-[15px] transition-opacity duration-300 ${
              i <= step ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-600">
              <Check size={14} className="text-white" strokeWidth={3} />
            </span>
            <span className="text-slate-700">{line}</span>
          </div>
        ))}
      </div>
      <div className="mt-7 flex justify-center">
        <Loader2 size={24} className="animate-spin text-teal-600" />
      </div>
    </div>
  );
}
