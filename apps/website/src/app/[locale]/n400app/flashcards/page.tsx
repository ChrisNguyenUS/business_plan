'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, ThumbsUp, ThumbsDown, RotateCw, Filter, Bookmark } from 'lucide-react';
import { Card, ProgressBar } from '@/components/n400/ui';
import { AudioButton } from '@/components/n400/AudioButton';
import { MilestoneBanner } from '@/components/n400/MilestoneBanner';
import { BadgeUnlockToast } from '@/components/n400/BadgeUnlockToast';
import { useN400UserState } from '@/lib/n400/user-state';
import { useN400Badges } from '@/lib/n400/use-badges';
import { trackStreakMilestone } from '@/lib/n400/analytics';
import {
  N400_QUESTIONS,
  N400_CATEGORY_LABELS,
  type N400CategoryKey,
} from '@/lib/n400/questions-data';
import {
  correctAnswersFor,
  shuffle,
  questionAudioUrl,
  answerAudioUrlFor,
} from '@/lib/n400/quiz-engine';

type FilterMode = 'all' | 'unknown' | 'bookmarks' | N400CategoryKey;

const FILTER_OPTIONS: { id: FilterMode; label: string }[] = [
  { id: 'all', label: 'Tất cả 128 câu' },
  { id: 'unknown', label: 'Chưa thuộc' },
  { id: 'bookmarks', label: 'Đã đánh dấu' },
  { id: 'principles', label: N400_CATEGORY_LABELS.principles.vi },
  { id: 'system', label: N400_CATEGORY_LABELS.system.vi },
  { id: 'rights', label: N400_CATEGORY_LABELS.rights.vi },
  { id: 'history', label: N400_CATEGORY_LABELS.history.vi },
  { id: 'symbols', label: N400_CATEGORY_LABELS.symbols.vi },
];

export default function FlashcardsPage() {
  const { state, hydrated, toggleBookmark, setFlashcardKnown } = useN400UserState();
  const [filter, setFilter] = useState<FilterMode>('all');
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
    let qs = N400_QUESTIONS;
    if (filter === 'bookmarks') {
      qs = qs.filter((q) => state.bookmarks.includes(q.id));
    } else if (filter === 'unknown') {
      qs = qs.filter((q) => !state.flashcardKnown.includes(q.id));
    } else if (filter !== 'all') {
      qs = qs.filter((q) => q.category === filter);
    }
    // Q29 (your U.S. Representative) needs the user's resolved district to
    // produce a per-user correct answer. Hide it until /setup completes.
    if (districtNumber === null) {
      qs = qs.filter((q) => q.id !== 29);
    }
    return shuffle(
      qs.map((q) => q.id),
      `flash-${filter}-${seed}`
    )
      .map((id) => N400_QUESTIONS.find((q) => q.id === id)!)
      .filter(Boolean);
  }, [filter, seed, state.bookmarks, state.flashcardKnown, districtNumber]);

  const total = questions.length;
  const current = questions[index];

  if (!hydrated) {
    return <div className="text-sm text-gray-500">Đang tải…</div>;
  }

  if (total === 0) {
    return (
      <Card className="p-8 text-center max-w-md mx-auto">
        <h3 className="font-bold text-gray-800 mb-2">Không có câu nào trong bộ lọc này</h3>
        <p className="text-sm text-gray-500 mb-6">
          Đổi sang bộ lọc khác hoặc luyện tập để đánh dấu các câu đã thuộc.
        </p>
        <button
          type="button"
          onClick={() => setFilter('all')}
          className="px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold"
        >
          Xem tất cả 128 câu
        </button>
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

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-3xl mx-auto">
      {unlockedBadges.length > 0 ? (
        <BadgeUnlockToast
          slugs={unlockedBadges}
          catalog={Object.fromEntries(badges.catalog.map((b) => [b.slug, b]))}
          trigger="session_complete"
        />
      ) : null}

      {milestone !== null ? <MilestoneBanner days={milestone} /> : null}

      <div className="flex items-center gap-3 flex-wrap">
        <Filter size={16} className="text-gray-400" />
        <span className="text-xs text-gray-500 font-medium">Bộ lọc:</span>
        {FILTER_OPTIONS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === f.id
                ? 'bg-teal-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-teal-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3 text-sm text-gray-700">
          <span className="font-medium">
            Thẻ {index + 1} / {total}
          </span>
          <span className="text-xs text-gray-500">Đã thuộc: {state.flashcardKnown.length}</span>
        </div>
        <ProgressBar progress={((index + 1) / total) * 100} heightClass="h-2" />
      </div>

      <div className="relative" style={{ perspective: 1500 }}>
        <button
          type="button"
          onClick={() => setFlipped((f) => !f)}
          aria-label="Lật thẻ"
          className="block w-full"
          style={{ minHeight: 360 }}
        >
          <div
            className="relative w-full transition-transform duration-500 ease-in-out"
            style={{
              minHeight: 360,
              transformStyle: 'preserve-3d',
              transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            }}
          >
            {/* Front: question */}
            <div
              className="absolute inset-0 p-8 rounded-3xl bg-white shadow-md border border-gray-100 flex flex-col"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-600">
                  Câu hỏi / Question #{current.id}
                </span>
                <div className="flex items-center gap-2">
                  <AudioButton src={questionAudioUrl(current.id)} label="Nghe câu hỏi" size="sm" />
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleBookmark(current.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleBookmark(current.id);
                      }
                    }}
                    aria-label="Đánh dấu"
                    className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
                      bookmarked
                        ? 'bg-amber-50 text-amber-500'
                        : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                    }`}
                  >
                    <Bookmark size={14} fill={bookmarked ? 'currentColor' : 'none'} />
                  </span>
                </div>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="relative w-24 h-24 mb-6">
                  <Image
                    src="/images/n400/illu-studying.png"
                    alt=""
                    fill
                    className="object-contain"
                    sizes="96px"
                  />
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-3 max-w-xl">
                  {current.questionEn}
                </div>
                <div className="text-base text-gray-500 max-w-xl">{current.questionVi}</div>
              </div>
              <div className="text-xs text-gray-400 text-center mt-4">
                Nhấn vào thẻ để xem đáp án
              </div>
            </div>

            {/* Back: answers */}
            <div
              className="absolute inset-0 p-8 rounded-3xl bg-teal-50 shadow-md border border-teal-100 flex flex-col"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
                  Đáp án / Answer
                </span>
                <AudioButton src={answerAudioUrlFor(current, stateCode, districtNumber)} label="Nghe đáp án" size="sm" />
              </div>
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <ul className="space-y-3 max-w-xl text-left">
                  {answers.map((a, i) => (
                    <li
                      key={i}
                      className="bg-white rounded-xl p-3 border border-teal-100 text-gray-800 font-medium"
                    >
                      <div>{a.en}</div>
                      {a.vi !== a.en ? (
                        <div className="text-sm text-gray-500 mt-1">{a.vi}</div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="text-xs text-gray-500 text-center mt-4">
                Nhấn lại để quay về câu hỏi
              </div>
            </div>
          </div>
        </button>
      </div>

      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={goPrev}
          disabled={index === 0}
          className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 disabled:opacity-30 hover:border-teal-300 shadow-sm"
          aria-label="Trước"
        >
          <ChevronLeft size={20} />
        </button>

        <button
          type="button"
          onClick={() => markKnown(false)}
          className={`px-5 py-3 rounded-xl border text-sm font-semibold flex items-center gap-2 ${
            !known
              ? 'bg-orange-50 text-orange-600 border-orange-200'
              : 'bg-white border-gray-200 text-gray-600 hover:border-orange-200'
          }`}
        >
          <ThumbsDown size={16} /> Chưa thuộc
        </button>

        <button
          type="button"
          onClick={() => setFlipped((f) => !f)}
          className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:border-teal-300 shadow-sm"
          aria-label="Lật thẻ"
        >
          <RotateCw size={18} />
        </button>

        <button
          type="button"
          onClick={() => markKnown(true)}
          className={`px-5 py-3 rounded-xl border text-sm font-semibold flex items-center gap-2 ${
            known
              ? 'bg-teal-50 text-teal-700 border-teal-200'
              : 'bg-white border-gray-200 text-gray-600 hover:border-teal-200'
          }`}
        >
          <ThumbsUp size={16} /> Đã thuộc
        </button>

        <button
          type="button"
          onClick={goNext}
          disabled={index === total - 1}
          className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 disabled:opacity-30 hover:border-teal-300 shadow-sm"
          aria-label="Tiếp"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
