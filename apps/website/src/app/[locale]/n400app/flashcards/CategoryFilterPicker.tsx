'use client';

/**
 * CategoryFilterPicker — Responsive category filter for the Flashcards screen.
 *
 * Trigger: teal filter chip (layers icon + selected topic).
 * Mobile (<sm):  slide-up bottom sheet with backdrop.
 * Desktop (sm+): floating popover card anchored below the chip.
 *
 * Rows show the topic icon, question count, and mastery progress.
 * Accessibility: WAI-ARIA listbox pattern; Escape / outside click to close.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Check, ChevronDown, ChevronRight, Layers, Lightbulb, type LucideIcon } from 'lucide-react';

export interface CategoryOption {
  id: string;
  label: string;
  count: number;
  icon: LucideIcon;
  /** Mastery 0–100, or null to hide the progress bar (e.g. "all"). */
  percent: number | null;
}

interface CategoryFilterPickerProps {
  options: CategoryOption[];
  value: string;
  onChange: (id: string) => void;
}

export function CategoryFilterPicker({ options, value, onChange }: CategoryFilterPickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const selected = options.find((o) => o.id === value) ?? options[0];

  const close = useCallback(() => {
    setOpen(false);
    buttonRef.current?.focus();
  }, []);

  const select = (id: string) => {
    onChange(id);
    close();
  };

  // Close on outside click (desktop popover; the mobile sheet has its own backdrop)
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, close]);

  // Keyboard: Escape closes, ArrowUp/Down move between options
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      // Popover and sheet are both mounted (CSS decides which shows) — only
      // navigate the visible set.
      const items = Array.from(
        rootRef.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? []
      ).filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const idx = items.indexOf(document.activeElement as HTMLElement);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        items[idx < items.length - 1 ? idx + 1 : 0]?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        items[idx > 0 ? idx - 1 : items.length - 1]?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, close]);

  // Lock body scroll while the mobile sheet is open
  useEffect(() => {
    if (!open) return;
    const mq = window.matchMedia('(max-width: 639px)');
    if (!mq.matches) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const optionRow = (opt: CategoryOption) => {
    const active = opt.id === value;
    const Icon = opt.icon;
    return (
      <button
        key={opt.id}
        type="button"
        role="option"
        aria-selected={active}
        onClick={() => select(opt.id)}
        className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors outline-none ${
          active
            ? 'border-teal-500 bg-teal-50/70'
            : 'border-slate-100 bg-slate-50/70 hover:border-teal-200 hover:bg-teal-50/40 focus:border-teal-200 focus:bg-teal-50/40'
        }`}
      >
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            active ? 'bg-white text-teal-600' : 'bg-white text-slate-500 border border-slate-100'
          }`}
        >
          <Icon size={20} strokeWidth={1.75} />
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-sm font-bold ${active ? 'text-teal-800' : 'text-slate-800'}`}>
            {opt.label}
          </span>
          <span className={`block text-xs font-medium ${active ? 'text-teal-600' : 'text-slate-400'}`}>
            {opt.count} câu hỏi
          </span>
        </span>
        {active ? (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-600 text-white">
            <Check size={14} strokeWidth={3} />
          </span>
        ) : opt.percent !== null ? (
          <span className="flex shrink-0 flex-col items-start gap-1.5 w-20">
            <span className="text-xs font-bold text-teal-700">{opt.percent}%</span>
            <span className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
              <span
                className="block h-full rounded-full bg-teal-600"
                style={{ width: `${opt.percent}%` }}
              />
            </span>
          </span>
        ) : null}
      </button>
    );
  };

  const tipFooter = (withArrow: boolean) => (
    <div className="flex items-center gap-3 rounded-2xl bg-teal-50 p-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-teal-600">
        <Lightbulb size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-slate-800">Gợi ý</span>
        <span className="block text-xs font-medium text-slate-500">
          Học theo từng chủ đề giúp bạn ghi nhớ lâu hơn.
        </span>
      </span>
      {withArrow ? <ChevronRight size={18} className="shrink-0 text-teal-600" /> : null}
    </div>
  );

  return (
    <div ref={rootRef} className="relative shrink-0">
      {/* ── Filter chip trigger ── */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-teal-700/20 transition-all duration-200 hover:bg-teal-800"
      >
        <Layers size={14} className="shrink-0" />
        <span className="max-w-[9rem] truncate">{selected.label}</span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-white/80 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <>
          {/* ── Desktop: floating popover card anchored below the chip ── */}
          <div
            role="listbox"
            aria-label="Chọn chủ đề"
            className="hidden sm:flex absolute left-0 top-full z-50 mt-2 w-[380px] origin-top-left flex-col gap-2 rounded-3xl border border-slate-100 bg-white p-3 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200"
          >
            {options.map(optionRow)}
            {tipFooter(false)}
          </div>

          {/* ── Mobile: bottom sheet ── */}
          <div className="sm:hidden fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-black/40 animate-in fade-in duration-200"
              onClick={close}
              aria-hidden="true"
            />
            <div
              role="listbox"
              aria-label="Chọn chủ đề"
              className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white shadow-2xl animate-in slide-in-from-bottom duration-300"
              style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.75rem)' }}
            >
              <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-slate-200" />
              <div className="px-5 pb-3 pt-3">
                <h3 className="text-lg font-bold text-slate-900">Chọn chủ đề</h3>
                <p className="mt-0.5 text-sm text-slate-500">
                  Lọc câu hỏi theo từng chủ đề để học hiệu quả hơn.
                </p>
              </div>
              <div className="flex max-h-[65vh] flex-col gap-2.5 overflow-y-auto px-4 pb-2">
                {options.map(optionRow)}
                {tipFooter(true)}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
