'use client';

// "Chọn cách luyện tập" — the primary section of every skill hub (spec
// 2026-07-16). The hub is an execution page, so this card leads: a tinted,
// subject-accented panel showing the remembered current mode (with the
// subject's select-mode illustration) and two actions:
//   • "Bắt đầu luyện tập" (primary) launches practice in the current mode.
//   • "Đổi chế độ" (secondary) opens a picker that only *changes* the mode —
//     it never starts practice. Desktop → anchored popover (no overlay);
//     mobile → native bottom sheet.
// Each subject passes its own ordered mode list (presets + review modes such
// as "Ôn lại câu sai"); availability is decided by the page, so a stored pick
// that is no longer offered falls back to today's recommended mode.

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import {
  ArrowRight,
  CalendarCheck,
  Check,
  ChevronDown,
  Clock,
  Flame,
  RotateCcw,
  Target,
  TrendingDown,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import { usePracticeModeId, type PracticeModeId, type PracticeSkillKey } from '@/lib/n400/practice-mode';
import type { PracticePreset } from '@/lib/n400/quiz-engine';
import { useN400Lang } from '@/lib/n400/i18n/provider';

/** One launchable practice mode, fully resolved by the page (counts included). */
export interface PracticeMode {
  id: PracticeModeId;
  title: string;
  desc: string;
  /** Resolved session size with its unit, e.g. "10 câu" / "5 từ". */
  countLabel: string;
  minutes: number | null;
}

/** Subject accent classes — teal (civics), blue (what mean), purple (yes/no), orange (writing). */
export interface PracticeAccent {
  /** Tinted section frame. */
  card: string;
  /** Header icon tile. */
  iconTile: string;
  /** Current-mode inner card border. */
  innerCard: string;
  /** "Chế độ hiện tại" pill. */
  chip: string;
  /** Primary CTA button. */
  button: string;
}

/** Preset tiers → display modes, in the shared fixed order (Daily → Quick → Challenge → Full). */
export function presetModes(presets: PracticePreset[], totalCount: number, unit: string): PracticeMode[] {
  const order: PracticeModeId[] = ['standard', 'quick', 'deep', 'full'];
  const byId = new Map(presets.map((p) => [p.id, p]));
  return order.flatMap((id) => {
    const p = byId.get(id as PracticePreset['id']);
    if (!p) return [];
    return [{
      id,
      title: p.title,
      desc: p.desc,
      countLabel: `${p.count ?? totalCount} ${unit}`,
      minutes: p.minutes,
    }];
  });
}

/** Subject accents (design-system palette: teal / blue / purple / orange). */
export const PRACTICE_ACCENTS: Record<PracticeSkillKey, PracticeAccent> = {
  civics: {
    card: 'border-teal-100 bg-gradient-to-br from-teal-50/70 to-white',
    iconTile: 'bg-teal-100 text-teal-600',
    innerCard: 'border-teal-100',
    chip: 'bg-teal-100 text-teal-700',
    button: 'bg-teal-600 hover:bg-teal-700 shadow-teal-600/20',
  },
  whatmean: {
    card: 'border-blue-100 bg-gradient-to-br from-blue-50/70 to-white',
    iconTile: 'bg-blue-100 text-blue-600',
    innerCard: 'border-blue-100',
    chip: 'bg-blue-100 text-blue-700',
    button: 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20',
  },
  yesno: {
    card: 'border-purple-100 bg-gradient-to-br from-purple-50/70 to-white',
    iconTile: 'bg-purple-100 text-purple-600',
    innerCard: 'border-purple-100',
    chip: 'bg-purple-100 text-purple-700',
    button: 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20',
  },
  writing: {
    card: 'border-orange-100 bg-gradient-to-br from-orange-50/70 to-white',
    iconTile: 'bg-orange-100 text-orange-500',
    innerCard: 'border-orange-100',
    chip: 'bg-orange-100 text-orange-700',
    button: 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20',
  },
};

const MODE_META: Record<PracticeModeId, { icon: React.ReactNode; tone: string }> = {
  standard: { icon: <Flame size={20} />, tone: 'bg-amber-50 text-amber-500' },
  quick: { icon: <Zap size={20} />, tone: 'bg-teal-50 text-teal-600' },
  deep: { icon: <Target size={20} />, tone: 'bg-blue-50 text-blue-600' },
  full: { icon: <Trophy size={20} />, tone: 'bg-purple-50 text-purple-600' },
  wrongs: { icon: <RotateCcw size={20} />, tone: 'bg-rose-50 text-rose-500' },
  weak: { icon: <TrendingDown size={20} />, tone: 'bg-orange-50 text-orange-500' },
};

// Desktop = the popover, mobile = the bottom sheet. Which surface shows is
// decided by CSS breakpoints (hidden md:block / md:hidden), not JS, so it's
// correct on first paint with no media-query hydration timing. This helper only
// gates *behaviour* (scroll-lock, outside-click) at event time.
const DESKTOP_MQ = '(min-width: 768px)';
const isDesktopViewport = () =>
  typeof window !== 'undefined' && window.matchMedia(DESKTOP_MQ).matches;

function RecommendedBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
      {label}
    </span>
  );
}

/** The list of mode rows — shared by the desktop popover and the mobile sheet. */
function ModeList({
  modes,
  currentId,
  recommendedId,
  onPick,
  recommendedLabel,
  minutesUnit,
}: {
  modes: PracticeMode[];
  currentId: PracticeModeId;
  recommendedId: PracticeModeId;
  onPick: (mode: PracticeMode) => void;
  recommendedLabel: string;
  minutesUnit: string;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {modes.map((mode) => {
        const meta = MODE_META[mode.id];
        const selected = mode.id === currentId;
        return (
          <li key={mode.id}>
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => onPick(mode)}
              className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                selected
                  ? 'border-teal-500 bg-teal-50/60'
                  : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'
              }`}
            >
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.tone}`}>
                {meta.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="font-bold text-gray-800">{mode.title}</span>
                  {mode.id === recommendedId ? <RecommendedBadge label={recommendedLabel} /> : null}
                </span>
                <span className="mt-0.5 block text-sm text-gray-500">
                  {mode.countLabel}
                  {mode.minutes !== null ? ` · ≈ ${mode.minutes} ${minutesUnit}` : ''}
                </span>
              </span>
              {selected ? <Check size={18} className="shrink-0 text-teal-600" /> : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function PracticeSelector({
  skillKey,
  modes,
  recommendedId,
  illustrationSrc,
  accent,
  subtitle,
  onStart,
}: {
  skillKey: PracticeSkillKey;
  /** Ordered mode list for this subject — review modes first when available. */
  modes: PracticeMode[];
  /** Today's suggested mode (e.g. 'wrongs' while there is review debt). */
  recommendedId: PracticeModeId;
  /** Subject illustration for the current-mode block (practice_individual set). */
  illustrationSrc: string;
  accent: PracticeAccent;
  subtitle?: string;
  /** Launch practice in the given mode. Only fired by "Bắt đầu luyện tập". */
  onStart: (mode: PracticeMode) => void;
}) {
  const { dict } = useN400Lang();
  const [storedId, setStoredId] = usePracticeModeId(skillKey);
  const [open, setOpen] = useState(false);

  const changeBtnRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Stored pick if this subject still offers it today, else the recommended
  // mode (always offered). Keeps "Ôn lại câu sai" sticky only while debt exists.
  const current =
    modes.find((m) => m.id === storedId) ?? modes.find((m) => m.id === recommendedId) ?? modes[0];

  // Escape closes either surface; on desktop an outside click closes the popover
  // (the mobile sheet dismisses via its own backdrop). Scroll-lock only on the
  // mobile sheet. All media checks are at event time — no render dependency.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onDown = (e: MouseEvent) => {
      if (!isDesktopViewport()) return;
      const t = e.target as Node;
      if (popoverRef.current?.contains(t) || changeBtnRef.current?.contains(t)) return;
      setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);

    const mobile = !isDesktopViewport();
    const prevOverflow = document.body.style.overflow;
    if (mobile) document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
      if (mobile) document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const pick = (mode: PracticeMode) => {
    setStoredId(mode.id);
    setOpen(false);
    changeBtnRef.current?.focus();
  };

  return (
    // Primary section of the hub — the main CTA of the page.
    <section className={`rounded-[24px] border p-4 shadow-sm sm:p-5 ${accent.card}`}>
      {/* Identity */}
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accent.iconTile}`}>
          <Target size={20} />
        </div>
        <div className="min-w-0">
          <h2 className="font-extrabold text-gray-900">{dict.practice.heading}</h2>
          <p className="text-sm text-gray-500">{subtitle ?? dict.practice.subtitle}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-stretch">
        {/* Current-mode block: text + subject illustration */}
        <div className={`flex min-w-0 flex-1 items-center gap-3 overflow-hidden rounded-2xl border bg-white p-3.5 sm:p-4 ${accent.innerCard}`}>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${accent.chip}`}>
                {dict.practice.currentMode}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-lg font-extrabold leading-tight text-gray-900">{current.title}</span>
              {current.id === recommendedId ? <RecommendedBadge label={dict.practice.recommended} /> : null}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-gray-500">
              <span className="inline-flex items-center gap-1">
                <CalendarCheck size={14} className="text-gray-400" />
                {current.countLabel}
              </span>
              {current.minutes !== null ? (
                <span className="inline-flex items-center gap-1">
                  <Clock size={14} className="text-gray-400" />≈ {current.minutes} {dict.practice.minutesUnit}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm leading-snug text-gray-500">{current.desc}</p>
          </div>
          <div className="relative hidden h-24 w-32 shrink-0 overflow-hidden rounded-xl min-[400px]:block sm:h-28 sm:w-40">
            <Image
              src={illustrationSrc}
              alt=""
              fill
              sizes="160px"
              className="object-cover object-center"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="relative flex flex-col justify-center gap-2 md:w-56 md:shrink-0">
          <button
            type="button"
            onClick={() => onStart(current)}
            className={`group inline-flex min-h-[48px] cursor-pointer items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all ${accent.button}`}
          >
            {dict.practice.startButton}
            <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
          </button>
          <button
            ref={changeBtnRef}
            type="button"
            aria-expanded={open}
            aria-haspopup="dialog"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex min-h-[48px] cursor-pointer items-center justify-center gap-1 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
          >
            {dict.practice.changeMode}
            <ChevronDown size={15} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>

          {/* Desktop only (md+): floating popover anchored to the button —
              no overlay, no blur. Opens downward since the Practice card sits
              high on the page. CSS breakpoint, not JS, decides visibility. */}
          {open ? (
            <div
              ref={popoverRef}
              role="dialog"
              aria-label={dict.practice.changeModeLabel}
              className="absolute right-0 top-full z-50 mt-2 hidden max-h-[420px] w-[460px] max-w-[calc(100vw-2rem)] origin-top-right flex-col rounded-2xl border border-gray-100 bg-white p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150 motion-reduce:animate-none md:flex"
            >
              <div className="mb-3 flex shrink-0 items-center justify-between">
                <h3 className="text-base font-extrabold text-gray-900">{dict.practice.changeModeLabel}</h3>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={dict.common.closeButton}
                  className="cursor-pointer rounded-lg p-1 text-gray-400 hover:bg-gray-50 hover:text-gray-700"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="-mr-1 flex-1 overflow-y-auto pr-1">
                <ModeList
                  modes={modes}
                  currentId={current.id}
                  recommendedId={recommendedId}
                  onPick={pick}
                  recommendedLabel={dict.practice.recommended}
                  minutesUnit={dict.practice.minutesUnit}
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Mobile only (below md): native bottom sheet. */}
      {open ? (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label={dict.practice.changeModeLabel}>
          <button
            type="button"
            aria-label={dict.common.closeButton}
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-pointer bg-slate-900/40 backdrop-blur-[2px]"
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[70vh] overflow-y-auto rounded-t-[28px] bg-white p-5 pb-[max(env(safe-area-inset-bottom),1rem)] shadow-2xl animate-in slide-in-from-bottom duration-300 motion-reduce:animate-none">
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-gray-200" />
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-gray-900">{dict.practice.changeModeLabel}</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={dict.common.closeButton}
                className="cursor-pointer rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            <ModeList
              modes={modes}
              currentId={current.id}
              recommendedId={recommendedId}
              onPick={pick}
              recommendedLabel={dict.practice.recommended}
              minutesUnit={dict.practice.minutesUnit}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
