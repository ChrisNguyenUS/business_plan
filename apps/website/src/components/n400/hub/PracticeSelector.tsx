'use client';

// Practice card + mode picker for the skill hubs. Replaces the old
// "HubPracticeCard opens a bottom sheet that starts practice" flow with a
// current-mode-first design (spec 2026-07-12):
//   • The card always shows the remembered current mode + count + duration.
//   • "Tiếp tục luyện tập" (primary) launches practice in that mode.
//   • "Đổi chế độ" (secondary) opens a picker that only *changes* the mode —
//     it never starts practice. Desktop → anchored popover (no overlay);
//     mobile → native bottom sheet.

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, ChevronDown, Flame, Target, Trophy, X, Zap } from 'lucide-react';
import type { PracticePreset } from '@/lib/n400/quiz-engine';
import {
  PRACTICE_MODE_ORDER,
  RECOMMENDED_PRACTICE_MODE_ID,
  usePracticeModeId,
  type PracticeSkillKey,
} from '@/lib/n400/practice-mode';

type ModeId = PracticePreset['id'];

const MODE_META: Record<ModeId, { icon: React.ReactNode; tone: string }> = {
  standard: { icon: <Flame size={20} />, tone: 'bg-amber-50 text-amber-500' },
  quick: { icon: <Zap size={20} />, tone: 'bg-teal-50 text-teal-600' },
  deep: { icon: <Target size={20} />, tone: 'bg-blue-50 text-blue-600' },
  full: { icon: <Trophy size={20} />, tone: 'bg-purple-50 text-purple-600' },
};

// Desktop = the popover, mobile = the bottom sheet. Which surface shows is
// decided by CSS breakpoints (hidden md:block / md:hidden), not JS, so it's
// correct on first paint with no media-query hydration timing. This helper only
// gates *behaviour* (scroll-lock, outside-click) at event time.
const DESKTOP_MQ = '(min-width: 768px)';
const isDesktopViewport = () =>
  typeof window !== 'undefined' && window.matchMedia(DESKTOP_MQ).matches;

function metaFor(preset: PracticePreset, totalCount: number) {
  const count = preset.count ?? totalCount;
  const duration = preset.minutes !== null ? ` · ≈ ${preset.minutes} phút` : '';
  return { count, duration };
}

function RecommendedBadge() {
  return (
    <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-teal-700">
      Đề xuất
    </span>
  );
}

/** The list of mode rows — shared by the desktop popover and the mobile sheet. */
function ModeList({
  presets,
  totalCount,
  currentId,
  onPick,
}: {
  presets: PracticePreset[];
  totalCount: number;
  currentId: ModeId;
  onPick: (preset: PracticePreset) => void;
}) {
  const byId = new Map(presets.map((p) => [p.id, p]));
  return (
    <ul className="flex flex-col gap-2">
      {PRACTICE_MODE_ORDER.map((id) => {
        const preset = byId.get(id);
        if (!preset) return null;
        const meta = MODE_META[id];
        const { count, duration } = metaFor(preset, totalCount);
        const selected = id === currentId;
        const recommended = id === RECOMMENDED_PRACTICE_MODE_ID;
        return (
          <li key={id}>
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => onPick(preset)}
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
                  <span className="font-bold text-gray-800">{preset.titleVi}</span>
                  {recommended ? <RecommendedBadge /> : null}
                </span>
                <span className="mt-0.5 block text-sm text-gray-500">
                  {count} câu
                  {duration}
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
  subtitle,
  presets,
  totalCount,
  onStart,
}: {
  skillKey: PracticeSkillKey;
  subtitle: string;
  presets: PracticePreset[];
  totalCount: number;
  /** Launch practice in the given mode. Only fired by "Tiếp tục luyện tập". */
  onStart: (preset: PracticePreset) => void;
}) {
  const [currentId, setCurrentId] = usePracticeModeId(skillKey);
  const [open, setOpen] = useState(false);

  const changeBtnRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const current = presets.find((p) => p.id === currentId) ?? presets.find((p) => p.id === 'standard') ?? presets[0];
  const { count, duration } = metaFor(current, totalCount);
  const currentMeta = MODE_META[current.id];
  const currentRecommended = current.id === RECOMMENDED_PRACTICE_MODE_ID;

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

  const pick = (preset: PracticePreset) => {
    setCurrentId(preset.id);
    setOpen(false);
    changeBtnRef.current?.focus();
  };

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
        {/* Identity */}
        <div className="flex items-center gap-4 sm:min-w-0 sm:flex-1">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
            <Target size={22} />
          </div>
          <div className="min-w-0">
            <h2 className="font-extrabold text-gray-900">Luyện tập</h2>
            <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>
          </div>
        </div>

        {/* Current mode + actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
          <div className="min-w-0 sm:border-l sm:border-gray-100 sm:pl-5">
            <div className="text-xs font-medium text-gray-400">Chế độ hiện tại</div>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 font-bold text-gray-800">
                <span className={`flex h-5 w-5 items-center justify-center rounded-md ${currentMeta.tone}`}>
                  <span className="scale-[0.7]">{currentMeta.icon}</span>
                </span>
                {current.titleVi}
              </span>
              {currentRecommended ? <RecommendedBadge /> : null}
            </div>
            <div className="mt-0.5 text-sm text-gray-500">
              {count} câu
              {duration}
            </div>
          </div>

          <div className="relative flex shrink-0 flex-col items-stretch gap-1.5">
            <button
              type="button"
              onClick={() => onStart(current)}
              className="group inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-teal-600/20 transition-all hover:bg-teal-700"
            >
              Tiếp tục luyện tập
              <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
            </button>
            <button
              ref={changeBtnRef}
              type="button"
              aria-expanded={open}
              aria-haspopup="dialog"
              onClick={() => setOpen((v) => !v)}
              className="inline-flex cursor-pointer items-center justify-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-teal-700 transition-colors hover:bg-teal-50"
            >
              Đổi chế độ
              <ChevronDown size={15} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {/* Desktop only (md+): floating popover anchored to the button —
                no overlay, no blur. Opens upward since the Practice card sits
                low in the page. CSS breakpoint, not JS, decides visibility. */}
            {open ? (
              <div
                ref={popoverRef}
                role="dialog"
                aria-label="Đổi chế độ luyện tập"
                className="absolute bottom-full right-0 z-50 mb-2 hidden h-[360px] w-[460px] max-w-[calc(100vw-2rem)] origin-bottom-right flex-col rounded-2xl border border-gray-100 bg-white p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150 motion-reduce:animate-none md:flex"
              >
                <div className="mb-3 flex shrink-0 items-center justify-between">
                  <h3 className="text-base font-extrabold text-gray-900">Đổi chế độ luyện tập</h3>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Đóng"
                    className="cursor-pointer rounded-lg p-1 text-gray-400 hover:bg-gray-50 hover:text-gray-700"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="-mr-1 flex-1 overflow-y-auto pr-1">
                  <ModeList presets={presets} totalCount={totalCount} currentId={current.id} onPick={pick} />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Mobile only (below md): native bottom sheet. */}
      {open ? (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Đổi chế độ luyện tập">
          <button
            type="button"
            aria-label="Đóng"
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-pointer bg-slate-900/40 backdrop-blur-[2px]"
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[60vh] overflow-y-auto rounded-t-[28px] bg-white p-5 pb-[max(env(safe-area-inset-bottom),1rem)] shadow-2xl animate-in slide-in-from-bottom duration-300 motion-reduce:animate-none">
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-gray-200" />
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-gray-900">Đổi chế độ luyện tập</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Đóng"
                className="cursor-pointer rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            <ModeList presets={presets} totalCount={totalCount} currentId={current.id} onPick={pick} />
          </div>
        </div>
      ) : null}
    </section>
  );
}
