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
import { useParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, ThumbsUp, ThumbsDown, RotateCw, Filter, Layers, List } from 'lucide-react';
import { Card, ProgressBar } from '@/components/n400/ui';
import { Flashcard } from '@/components/n400/flashcard/Flashcard';
import { QuestionList } from './QuestionList';
import { MilestoneBanner } from '@/components/n400/MilestoneBanner';
import { BadgeUnlockToast } from '@/components/n400/BadgeUnlockToast';
import { useN400UserState } from '@/lib/n400/user-state';
import { useN400Badges } from '@/lib/n400/use-badges';
import { trackStreakMilestone } from '@/lib/n400/analytics';
import { N400_QUESTIONS, N400_CATEGORY_LABELS } from '@/lib/n400/questions-data';
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

const FILTER_OPTIONS: { id: FlashcardFilter; label: string }[] = [
  { id: 'all', label: 'Tất cả 128 câu' },
  { id: 'unknown', label: 'Chưa thuộc' },
  { id: 'known', label: 'Đã thuộc' },
  { id: 'bookmarks', label: 'Đã đánh dấu' },
  { id: 'principles', label: N400_CATEGORY_LABELS.principles.vi },
  { id: 'system', label: N400_CATEGORY_LABELS.system.vi },
  { id: 'rights', label: N400_CATEGORY_LABELS.rights.vi },
  { id: 'history', label: N400_CATEGORY_LABELS.history.vi },
  { id: 'symbols', label: N400_CATEGORY_LABELS.symbols.vi },
];

export default function FlashcardsPage() {
  const { state, hydrated, toggleBookmark, setFlashcardKnown } = useN400UserState();
  const [filter, setFilter] = useState<FlashcardFilter>('all');
  const [view, setView] = useState<'cards' | 'list'>('cards');
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const [seed] = useState(() => String(Date.now()));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [prevFilterSeed, setPrevFilterSeed] = useState(`${'all'}-`);
  const [milestone, setMilestone] = useState<number | null>(null);
  const [unlockedBadges, setUnlockedBadges] = useState<string[]>([]);
  const badges = useN400Badges();

  // Reset card position whenever filter or seed changes (React-recommended pattern).
  const filterSeedKey = `${filter}-${seed}`;
  if (filterSeedKey !== prevFilterSeed) {
    setPrevFilterSeed(filterSeedKey);
    setIndex(0);
    setFlipped(false);
  }

  const stateCode = state.settings.stateCode;
  const districtNumber = state.address.districtNumber;

  const questions = useMemo(() => {
    const qs = filterFlashcards(N400_QUESTIONS, filter, state.bookmarks, state.flashcardKnown);
    return shuffle(
      qs.map((q) => q.id),
      `flash-${filter}-${seed}`
    )
      .map((id) => N400_QUESTIONS.find((q) => q.id === id)!)
      .filter(Boolean);
  }, [filter, seed, state.bookmarks, state.flashcardKnown]);

  const total = questions.length;

  // Render-time adjustment (same pattern as prevFilterSeed above): clamp the
  // index when the filtered set shrinks under a fixed filter, e.g. after
  // un-bookmarking a question in list view.
  if (index > 0 && index > questions.length - 1) {
    setIndex(Math.max(0, questions.length - 1));
  }

  const current = questions[Math.min(index, total - 1)];

  if (!hydrated) {
    return <div className="text-sm text-gray-500">Đang tải…</div>;
  }

  if (total === 0) {
    return (
      <Card className="p-8 text-center max-w-md mx-auto">
        <h3 className="font-bold text-gray-800 mb-2">
          {filter === 'bookmarks'
            ? 'Bạn chưa đánh dấu câu hỏi nào'
            : filter === 'known'
              ? 'Chưa có câu nào "Đã thuộc"'
              : 'Không có câu nào trong bộ lọc này'}
        </h3>
        <p className="text-sm text-gray-500 mb-6">
          {filter === 'bookmarks'
            ? 'Nhấn biểu tượng dấu trang trên thẻ hoặc trong Luyện tập để lưu câu cần ôn lại.'
            : filter === 'known'
              ? 'Hãy học vài thẻ trước — nhấn "Đã thuộc" khi bạn đã nhớ câu trả lời.'
              : 'Đổi sang bộ lọc khác hoặc luyện tập để đánh dấu các câu đã thuộc.'}
        </p>
        <div className="flex items-center justify-center gap-3">
          {filter === 'bookmarks' ? (
            <Link
              href={`/${locale}/n400app/practice`}
              className="px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold"
            >
              Vào luyện tập
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl font-semibold ${
              filter === 'bookmarks'
                ? 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                : 'bg-teal-600 text-white'
            }`}
          >
            Xem tất cả 128 câu
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

  const goPrev = () => {
    setIndex((i) => Math.max(0, i - 1));
    setFlipped(false);
  };
  const goNext = () => {
    setIndex((i) => Math.min(total - 1, i + 1));
    setFlipped(false);
  };
  const markKnown = (k: boolean) => {
    void setFlashcardKnown(current.id, k).then((result) => {
      if (result.milestone) {
        setMilestone(result.milestone);
        trackStreakMilestone(result.milestone);
      }
      if (result.unlockedBadges.length > 0) setUnlockedBadges(result.unlockedBadges);
    });
    if (index < total - 1) {
      setIndex((i) => i + 1);
      setFlipped(false);
    }
  };

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
      const f = p.get('filter') as FlashcardFilter;
      if (f && FILTER_OPTIONS.some((o) => o.id === f)) {
        setFilter(f);
      }
      if (p.get('view') === 'list') {
        setView('list');
      }
    }
  }, []);

  return (
    <div
      className="flex flex-col h-full overflow-hidden gap-[clamp(0.5rem,1vw,1rem)] max-w-[1100px] mx-auto w-full animate-in fade-in duration-300"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}
    >
      {/* View toggle — shrink-0 */}
      <div className="flex items-center gap-2 shrink-0">
        {(
          [
            { id: 'cards', label: 'Học thẻ', icon: Layers },
            { id: 'list', label: 'Danh sách', icon: List },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${
              view === id
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-teal-300 hover:bg-slate-50'
            }`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {unlockedBadges.length > 0 ? (
        <BadgeUnlockToast
          slugs={unlockedBadges}
          catalog={Object.fromEntries(badges.catalog.map((b) => [b.slug, b]))}
          trigger="session_complete"
        />
      ) : null}

      {milestone !== null ? <MilestoneBanner days={milestone} /> : null}

      {/* Filters — shrink-0 */}
      <div className="flex items-center gap-3 flex-wrap shrink-0">
        <Filter size={16} className="text-slate-400" />
        <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Bộ lọc:</span>
        {FILTER_OPTIONS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 ${
              filter === f.id
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20 scale-105'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-teal-300 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {view === 'cards' ? (
        <>
      {/* Progress — shrink-0 */}
      <div className="shrink-0">
        <div className="flex items-center justify-between mb-2 text-sm text-slate-700">
          <span className="font-bold text-base">
            Thẻ {index + 1} / {total}
          </span>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">Đã thuộc: {state.flashcardKnown.length}</span>
        </div>
        <ProgressBar progress={((index + 1) / total) * 100} heightClass="h-2.5" />
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

      {/* Study Controls — shrink-0 */}
      <div className="flex items-center justify-center gap-3 sm:gap-6 shrink-0" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)' }}>
        <button
          type="button"
          onClick={goPrev}
          disabled={index === 0}
          className="w-14 h-14 rounded-full bg-white border-2 border-slate-100 flex items-center justify-center text-slate-500 disabled:opacity-30 hover:border-slate-200 hover:bg-slate-50 shadow-sm transition-all hover:scale-105 active:scale-95 shrink-0"
          aria-label="Trước"
        >
          <ChevronLeft size={24} />
        </button>

        <button
          type="button"
          onClick={() => markKnown(false)}
          className={`flex-1 sm:flex-none flex flex-col items-center justify-center px-4 py-4 sm:px-10 sm:py-5 rounded-[24px] border-2 transition-all hover:scale-[1.02] active:scale-95 shadow-sm ${
            !known
              ? 'bg-orange-50 text-orange-600 border-orange-200 shadow-orange-500/10'
              : 'bg-white border-slate-200 text-slate-600 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600'
          }`}
        >
          <div className="flex items-center gap-2 font-bold text-sm sm:text-lg whitespace-nowrap"><ThumbsDown size={20} className="hidden sm:block" /> Chưa thuộc</div>
          <span className="text-[11px] font-bold opacity-50 mt-1 hidden sm:block">Phím R</span>
        </button>

        <button
          type="button"
          onClick={() => setFlipped((f) => !f)}
          className="hidden sm:flex flex-col items-center justify-center px-8 py-5 rounded-[24px] bg-white border-2 border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 shadow-sm transition-all hover:scale-[1.02] active:scale-95"
          aria-label="Lật thẻ"
        >
          <div className="flex items-center gap-2 font-bold text-base"><RotateCw size={20} /> Lật thẻ</div>
          <span className="text-[11px] font-bold opacity-50 mt-1">Space</span>
        </button>

        <button
          type="button"
          onClick={() => setFlipped((f) => !f)}
          className="flex sm:hidden w-14 h-14 shrink-0 rounded-full bg-white border-2 border-slate-200 items-center justify-center text-slate-600 hover:border-slate-300 hover:bg-slate-50 shadow-sm transition-all active:scale-95"
          aria-label="Lật thẻ"
        >
          <RotateCw size={20} />
        </button>

        <button
          type="button"
          onClick={() => markKnown(true)}
          className={`flex-1 sm:flex-none flex flex-col items-center justify-center px-4 py-4 sm:px-10 sm:py-5 rounded-[24px] border-2 transition-all hover:scale-[1.02] active:scale-95 shadow-md ${
            known
              ? 'bg-teal-600 text-white border-teal-600 shadow-teal-600/30'
              : 'bg-teal-600 text-white border-teal-600 shadow-teal-600/30 hover:bg-teal-700'
          }`}
        >
          <div className="flex items-center gap-2 font-bold text-sm sm:text-lg whitespace-nowrap"><ThumbsUp size={20} className="hidden sm:block" /> Đã thuộc</div>
          <span className="text-[11px] font-bold opacity-80 mt-1 hidden sm:block">Phím M</span>
        </button>

        <button
          type="button"
          onClick={goNext}
          disabled={index === total - 1}
          className="w-14 h-14 rounded-full bg-white border-2 border-slate-100 flex items-center justify-center text-slate-500 disabled:opacity-30 hover:border-slate-200 hover:bg-slate-50 shadow-sm transition-all hover:scale-105 active:scale-95 shrink-0"
          aria-label="Tiếp"
        >
          <ChevronRight size={24} />
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
          />
        </div>
      )}
    </div>
  );
}
