'use client';

/*
 * FLASHCARD PAGE — LAYOUT ARCHITECTURE
 *
 * This page uses an immersive layout (see flashcards/layout.tsx):
 * - The page NEVER scrolls.
 * - The Flashcard is the ONLY flexible area (flex-1 min-h-0).
 * - English and Vietnamese content ALWAYS stay together inside
 *   a single Content Area.
 * - ONLY the Content Area may scroll internally, as a last resort.
 * - Bottom study controls ALWAYS remain visible and anchored.
 */

import { useMemo, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  Layers,
  Landmark,
  Building2,
  Scale,
  ScrollText,
  Flag,
  type LucideIcon,
} from 'lucide-react';
import { Card, ProgressBar } from '@/components/n400/ui';
import { Flashcard } from '@/components/n400/flashcard/Flashcard';
import { QuestionList } from './QuestionList';
import { CategoryFilterPicker } from './CategoryFilterPicker';
import { useN400UserState } from '@/lib/n400/user-state';
import { N400_QUESTIONS, N400_CATEGORY_LABELS, type N400CategoryKey } from '@/lib/n400/questions-data';
import {
  correctAnswersFor,
  shuffle,
  questionAudioUrl,
  answerAudioUrlFor,
  isPersonalizedAnswerUnavailable,
  filterFlashcards,
  type FlashcardFilter,
} from '@/lib/n400/quiz-engine';
import { PersonalizedAnswerNotice } from '@/components/n400/PersonalizedAnswerNotice';
import { useN400Lang } from '@/lib/n400/i18n/provider';
import type { N400Dict } from '@/lib/n400/i18n/vi';

/* ── Status filter chips (learning state) ─────────────────────────── */

type StatusFilter = 'all' | 'unknown' | 'known' | 'bookmarks';

function buildStatusOptions(dict: N400Dict): { id: StatusFilter; label: string }[] {
  return [
    { id: 'all', label: 'All Questions' },
    { id: 'unknown', label: dict.flashcards.unknown },
    { id: 'known', label: dict.flashcards.known },
    { id: 'bookmarks', label: 'Saved' },
  ];
}

/* ── Category dropdown options ────────────────────────────────────── */

const categoryCount = (id: N400CategoryKey | 'all') =>
  id === 'all' ? N400_QUESTIONS.length : N400_QUESTIONS.filter((q) => q.category === id).length;

function buildCategoryOptions(
  dict: N400Dict,
  lang: 'vi' | 'en',
): { id: N400CategoryKey | 'all'; label: string; count: number; icon: LucideIcon }[] {
  const catLabel = (key: N400CategoryKey) => N400_CATEGORY_LABELS[key][lang === 'en' ? 'en' : 'vi'];
  return [
    { id: 'all', label: dict.flashcards.allTopics, count: categoryCount('all'), icon: Layers },
    { id: 'principles', label: catLabel('principles'), count: categoryCount('principles'), icon: Landmark },
    { id: 'system', label: catLabel('system'), count: categoryCount('system'), icon: Building2 },
    { id: 'rights', label: catLabel('rights'), count: categoryCount('rights'), icon: Scale },
    { id: 'history', label: catLabel('history'), count: categoryCount('history'), icon: ScrollText },
    { id: 'symbols', label: catLabel('symbols'), count: categoryCount('symbols'), icon: Flag },
  ];
}

export default function FlashcardsPage() {
  const { dict, lang } = useN400Lang();
  const { state, hydrated, toggleBookmark, setFlashcardKnown } = useN400UserState();
  const statusOptions = useMemo(() => buildStatusOptions(dict), [dict]);
  const baseCategoryOptions = useMemo(() => buildCategoryOptions(dict, lang), [dict, lang]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<N400CategoryKey | null>(null);
  const [view, setView] = useState<'cards' | 'list'>('cards');
  const [seed] = useState(() => String(Date.now()));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [prevFilterSeed, setPrevFilterSeed] = useState(`${'all'}-${'all'}-`);

  // Composite filter key for reset detection.
  const filterSeedKey = `${statusFilter}-${categoryFilter ?? 'all'}-${seed}`;

  // Reset card position whenever filter or seed changes (React-recommended pattern).
  if (filterSeedKey !== prevFilterSeed) {
    setPrevFilterSeed(filterSeedKey);
    setIndex(0);
    setFlipped(false);
  }

  const stateCode = state.settings.stateCode;
  const districtNumber = state.address.districtNumber;

  // Compose two filters: status first, then category.
  const questions = useMemo(() => {
    let qs = filterFlashcards(N400_QUESTIONS, statusFilter as FlashcardFilter, state.bookmarks, state.flashcardKnown);
    if (categoryFilter) {
      qs = qs.filter((q) => q.category === categoryFilter);
    }
    return shuffle(
      qs.map((q) => q.id),
      `flash-${statusFilter}-${categoryFilter ?? 'all'}-${seed}`
    )
      .map((id) => N400_QUESTIONS.find((q) => q.id === id)!)
      .filter(Boolean);
  }, [statusFilter, categoryFilter, seed, state.bookmarks, state.flashcardKnown]);

  const total = questions.length;

  // Category options with live mastery percent (known cards / category size).
  const categoryOptions = useMemo(
    () =>
      baseCategoryOptions.map((opt) => ({
        ...opt,
        percent:
          opt.id === 'all'
            ? null
            : Math.round(
                (N400_QUESTIONS.filter(
                  (q) => q.category === opt.id && state.flashcardKnown.includes(q.id)
                ).length /
                  opt.count) *
                  100
              ),
      })),
    [baseCategoryOptions, state.flashcardKnown]
  );

  // Render-time adjustment: clamp the index when the filtered set shrinks
  // under a fixed filter, e.g. after un-bookmarking a question in list view.
  if (filterSeedKey === prevFilterSeed && index > 0 && index > questions.length - 1) {
    setIndex(Math.max(0, questions.length - 1));
  }

  const current = questions[Math.min(index, total - 1)];

  const goPrev = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
    setFlipped(false);
  }, []);

  const goNext = useCallback(() => {
    setIndex((i) => Math.min(total - 1, i + 1));
    setFlipped(false);
  }, [total]);

  const markKnown = useCallback((k: boolean) => {
    if (!current) return;
    void setFlashcardKnown(current.id, k);
    if (index < total - 1) {
      setIndex((i) => i + 1);
      setFlipped(false);
    }
  }, [current, index, total, setFlashcardKnown]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (view === 'list') return;
    // Ignore keypresses if user is typing in an input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

    switch (e.key.toLowerCase()) {
      case ' ':
        e.preventDefault();
        setFlipped((f) => !f);
        break;
      case 'r':
        markKnown(false);
        break;
      case 'm':
        markKnown(true);
        break;
      case 'arrowleft':
        goPrev();
        break;
      case 'arrowright':
        goNext();
        break;
    }
  }, [view, goPrev, goNext, markKnown]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const f = p.get('filter') as StatusFilter;
      const cat = p.get('category') as N400CategoryKey;
      const v = p.get('view');

      setTimeout(() => {
        if (f && statusOptions.some((o) => o.id === f)) {
          setStatusFilter(f);
        }
        if (cat && baseCategoryOptions.some((o) => o.id === cat)) {
          setCategoryFilter(cat);
        }
        if (v === 'list') {
          setView('list');
        }
      }, 0);
    }
    // One-shot URL-to-state sync on mount (same deep-link pattern as practice/page.tsx).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!hydrated) {
    return <div className="text-sm text-gray-500">{dict.common.loading}</div>;
  }

  if (total === 0) {
    return (
      <Card className="p-8 text-center max-w-md mx-auto">
        <h3 className="font-bold text-gray-800 mb-2">
          {statusFilter === 'bookmarks'
            ? dict.flashcards.noBookmarked
            : statusFilter === 'known'
              ? dict.flashcards.noMastered
              : dict.flashcards.noFilter}
        </h3>
        <p className="text-sm text-gray-500 mb-6">
          {statusFilter === 'bookmarks'
            ? dict.flashcards.bookmarkHint
            : statusFilter === 'known'
              ? dict.flashcards.masteredHint
              : dict.flashcards.filterHint}
        </p>
        <div className="flex items-center justify-center gap-3">
          {statusFilter === 'bookmarks' ? (
            <Link
              href={`/n400ready/study/civics`}
              className="px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold"
            >
              {dict.flashcards.goPractice}
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => { setStatusFilter('all'); setCategoryFilter(null); }}
            className={`px-4 py-2 rounded-xl font-semibold ${
              statusFilter === 'bookmarks'
                ? 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                : 'bg-teal-600 text-white'
            }`}
          >
            {dict.flashcards.viewAll}
          </button>
        </div>
      </Card>
    );
  }

  const known = state.flashcardKnown.includes(current.id);
  const bookmarked = state.bookmarks.includes(current.id);
  const allCorrect = correctAnswersFor(current, stateCode, districtNumber);
  const answers = allCorrect.length > 0
    ? allCorrect
    : current.answersEn.map((en, i) => ({ en, vi: current.answersVi[i] ?? en }));

  return (
    <div
      className="flex flex-col h-full overflow-hidden gap-2 max-w-[1100px] mx-auto w-full animate-in fade-in duration-300"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}
    >
      {/* ── Header: Segmented Control + Filters ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
        {/* Apple-style segmented control */}
        <div className="inline-flex bg-slate-100 rounded-lg p-0.5 shrink-0">
          {(
            [
              { id: 'cards', label: 'Flashcard' },
              { id: 'list', label: 'List' },
            ] as const
          ).map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all duration-200 ${
                view === id
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px h-5 bg-slate-200" />

        {/* Topic chip + status chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Category filter: bottom sheet on mobile, anchored popover on desktop */}
          <CategoryFilterPicker
            options={categoryOptions}
            value={categoryFilter ?? 'all'}
            onChange={(id) => setCategoryFilter(id === 'all' ? null : (id as N400CategoryKey))}
          />
          {statusOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setStatusFilter(opt.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                statusFilter === opt.id
                  ? 'bg-teal-600 text-white shadow-sm shadow-teal-600/20'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-teal-300 hover:bg-slate-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

      </div>

      {view === 'cards' ? (
        <>
      {/* Progress — shrink-0 */}
      <div className="shrink-0">
        <div className="flex items-center justify-between mb-1.5 text-sm text-slate-500">
          <span className="font-medium">
            {dict.flashcards.questionShort} {index + 1} / {total}
          </span>
        </div>
        <ProgressBar progress={((index + 1) / total) * 100} heightClass="h-1.5" />
      </div>

      {isPersonalizedAnswerUnavailable(current, districtNumber) ? (
        <div className="shrink-0">
          <PersonalizedAnswerNotice from="flashcards" />
        </div>
      ) : null}

      {/* Flashcard — flex-1 min-h-0 (fills remaining space) */}
      <Flashcard
        flipped={flipped}
        onFlip={() => setFlipped((f) => !f)}
        questionId={current.id}
        questionEn={current.questionEn}
        questionVi={current.questionVi}
        questionAudioSrc={questionAudioUrl(current.id)}
        answerAudioSrc={answerAudioUrlFor(current, stateCode, districtNumber)}
        answers={answers}
        bookmarked={bookmarked}
        onToggleBookmark={() => toggleBookmark(current.id)}
      />

      {/* Study Controls — shrink-0, contextual based on flip state */}
      <div className="flex items-center justify-center gap-3 sm:gap-4 shrink-0" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)' }}>
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
            !known
              ? 'bg-orange-50 text-orange-600 border-orange-200 shadow-orange-500/10'
              : 'bg-white border-slate-200 text-slate-600 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600'
          }`}
        >
          <div className="flex items-center gap-2 font-bold text-sm sm:text-base whitespace-nowrap"><ThumbsDown size={18} className="hidden sm:block" /> {dict.flashcards.unknown}</div>
          <span className="text-[10px] text-slate-400 font-medium mt-0.5 hidden sm:block">R</span>
        </button>

        <button
          type="button"
          onClick={() => markKnown(true)}
          className={`flex-1 sm:flex-none flex flex-col items-center justify-center px-4 py-3 sm:px-8 sm:py-3.5 rounded-2xl border transition-all hover:scale-[1.02] active:scale-95 shadow-sm ${
            known
              ? 'bg-teal-600 text-white border-teal-600 shadow-teal-600/30'
              : 'bg-teal-600 text-white border-teal-600 shadow-teal-600/30 hover:bg-teal-700'
          }`}
        >
          <div className="flex items-center gap-2 font-bold text-sm sm:text-base whitespace-nowrap"><ThumbsUp size={18} className="hidden sm:block" /> {dict.flashcards.known}</div>
          <span className="text-[10px] text-white/60 font-medium mt-0.5 hidden sm:block">M</span>
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
        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
          <QuestionList
            questions={questions}
            bookmarks={state.bookmarks}
            onToggleBookmark={(id) => void toggleBookmark(id)}
            stateCode={stateCode}
            districtNumber={districtNumber}
            onSelectQuestion={(id) => {
              const idx = questions.findIndex((q) => q.id === id);
              if (idx !== -1) {
                setIndex(idx);
                setView('cards');
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
