'use client';

// Flashcard study screen for the Speaking/Writing sections. Reproduces the
// civics flashcards page chrome (Flashcard/List segmented control, status
// chips, Câu x/N + progress, bottom Chưa thuộc/Đã thuộc controls) and reuses
// the real civics Flashcard component so the card is pixel-identical. Category
// and Saved (bookmark) filters are civics-only and intentionally omitted.

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Flashcard } from '@/components/n400/flashcard/Flashcard';
import { ProgressBar } from '@/components/n400/ui';
import { useN400Lang } from '@/lib/n400/i18n/provider';
import { tFormat } from '@/lib/n400/i18n/format';

export interface SectionCard {
  id: string;
  badge: string;
  questionEn: string;
  questionVi: string;
  questionAudioSrc: string | null;
  answerAudioSrc: string | null;
  answers: { en: string; vi: string }[];
  listPrimary: string;
  listSecondary: string;
}

type StatusFilter = 'all' | 'unknown' | 'known';

export function SectionFlashcardScreen({
  cards,
  known,
  onSetKnown,
  onExit,
  title,
}: {
  cards: SectionCard[];
  known: ReadonlySet<string>;
  onSetKnown: (id: string, known: boolean) => void;
  onExit: () => void;
  title: string;
}) {
  const { dict } = useN400Lang();
  const STATUS_OPTIONS: { id: StatusFilter; label: string }[] = [
    { id: 'all', label: 'All Questions' },
    { id: 'unknown', label: dict.flashcards.unknown },
    { id: 'known', label: dict.flashcards.known },
  ];
  const [view, setView] = useState<'cards' | 'list'>('cards');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [prevKey, setPrevKey] = useState(status);

  const filtered = useMemo(() => {
    if (status === 'known') return cards.filter((c) => known.has(c.id));
    if (status === 'unknown') return cards.filter((c) => !known.has(c.id));
    return cards;
  }, [cards, status, known]);

  // Reset position when the filter changes (React-recommended pattern).
  if (status !== prevKey) {
    setPrevKey(status);
    setIndex(0);
    setFlipped(false);
  }

  const total = filtered.length;
  const current = filtered[Math.min(index, Math.max(0, total - 1))];

  const goPrev = () => {
    setIndex((i) => Math.max(0, i - 1));
    setFlipped(false);
  };
  const goNext = () => {
    setIndex((i) => Math.min(total - 1, i + 1));
    setFlipped(false);
  };
  const markKnown = (v: boolean) => {
    if (current) onSetKnown(current.id, v);
    if (index < total - 1) goNext();
  };

  return (
    <div
      className="flex flex-col h-full overflow-hidden gap-2 max-w-[1100px] mx-auto w-full animate-in fade-in duration-300"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}
    >
      {/* ── Header: segmented control + back + status chips ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={onExit}
          className="text-sm font-semibold text-slate-500 hover:text-slate-800 shrink-0 self-start"
        >
          ← {title}
        </button>

        <div className="hidden sm:block w-px h-5 bg-slate-200" />

        <div className="inline-flex bg-slate-100 rounded-lg p-0.5 shrink-0">
          {(
            [
              { id: 'cards', label: dict.quiz.view.cards },
              { id: 'list', label: dict.quiz.view.list },
            ] as const
          ).map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all duration-200 ${
                view === id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="hidden sm:block w-px h-5 bg-slate-200" />

        <div className="flex items-center gap-1.5 flex-wrap">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setStatus(opt.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                status === opt.id
                  ? 'bg-teal-600 text-white shadow-sm shadow-teal-600/20'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-teal-300 hover:bg-slate-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {total === 0 ? (
        <div className="flex flex-1 items-center justify-center text-slate-500">
          {dict.quiz.noCards}
        </div>
      ) : view === 'cards' && current ? (
        <>
          {/* Progress */}
          <div className="shrink-0">
            <div className="flex items-center justify-between mb-1.5 text-sm text-slate-500">
              <span className="font-medium">
                {tFormat(dict.quiz.cardCounter, { index: index + 1, total })}
              </span>
            </div>
            <ProgressBar progress={((index + 1) / total) * 100} heightClass="h-1.5" />
          </div>

          {/* Flashcard (reused civics component, no bookmark) */}
          <Flashcard
            flipped={flipped}
            onFlip={() => setFlipped((f) => !f)}
            questionId={index + 1}
            badge={current.badge}
            questionEn={current.questionEn}
            questionVi={current.questionVi}
            questionAudioSrc={current.questionAudioSrc}
            answerAudioSrc={current.answerAudioSrc}
            answers={current.answers}
          />

          {/* Study controls */}
          <div
            className="flex items-center justify-center gap-3 sm:gap-4 shrink-0"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)' }}
          >
            <button
              type="button"
              onClick={goPrev}
              disabled={index === 0}
              className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 disabled:opacity-30 hover:border-slate-300 hover:bg-slate-50 shadow-sm transition-all hover:scale-105 active:scale-95 shrink-0"
              aria-label={dict.flashcards.prev}
            >
              <ChevronLeft size={22} />
            </button>

            <button
              type="button"
              onClick={() => markKnown(false)}
              className={`flex-1 sm:flex-none flex flex-col items-center justify-center px-4 py-3 sm:px-8 sm:py-3.5 rounded-2xl border transition-all hover:scale-[1.02] active:scale-95 shadow-sm ${
                !known.has(current.id)
                  ? 'bg-orange-50 text-orange-600 border-orange-200 shadow-orange-500/10'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm sm:text-base whitespace-nowrap">
                <ThumbsDown size={18} className="hidden sm:block" /> {dict.flashcards.unknown}
              </div>
            </button>

            <button
              type="button"
              onClick={() => markKnown(true)}
              className="flex-1 sm:flex-none flex flex-col items-center justify-center px-4 py-3 sm:px-8 sm:py-3.5 rounded-2xl border transition-all hover:scale-[1.02] active:scale-95 shadow-sm bg-teal-600 text-white border-teal-600 shadow-teal-600/30 hover:bg-teal-700"
            >
              <div className="flex items-center gap-2 font-bold text-sm sm:text-base whitespace-nowrap">
                <ThumbsUp size={18} className="hidden sm:block" /> {dict.flashcards.known}
              </div>
            </button>

            <button
              type="button"
              onClick={goNext}
              disabled={index === total - 1}
              className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 disabled:opacity-30 hover:border-slate-300 hover:bg-slate-50 shadow-sm transition-all hover:scale-105 active:scale-95 shrink-0"
              aria-label={dict.flashcards.next}
            >
              <ChevronRight size={22} />
            </button>
          </div>
        </>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2">
          {filtered.map((c) => (
            <div key={c.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold text-slate-800">{c.listPrimary}</div>
                {known.has(c.id) ? (
                  <span className="text-xs font-bold text-teal-600">{dict.flashcards.known}</span>
                ) : null}
              </div>
              <div className="mt-1 text-sm text-slate-600">{c.listSecondary}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
