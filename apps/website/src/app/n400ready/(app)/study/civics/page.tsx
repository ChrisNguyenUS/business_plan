'use client';

// Civics hub — an execution page: "how do I want to study Civics?". The
// dashboard owns recommendations, so this page is just Hero (identity +
// progress) → Practice (primary CTA) → Flashcards → Weak Areas. There is no
// "continue learning" card: users study randomly, so "you are on question #13"
// carries no meaning. Sessions run on the existing /practice screen.

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useN400UserState } from '@/lib/n400/user-state';
import { N400_QUESTIONS, N400_CATEGORY_LABELS } from '@/lib/n400/questions-data';
import { PRACTICE_PRESETS, recommendWeakCategory, lastWrongQuestionIds } from '@/lib/n400/quiz-engine';
import { pendingMockReviewIds } from '@/lib/n400/hero-recommendation';
import { deriveHubProgress } from '@/lib/n400/hub-progress';
import { HubHero, HubStudyCardsCard, HubWeakAreasCard, type StudyCardsFilter } from '@/components/n400/hub/HubCards';
import {
  PracticeSelector,
  presetModes,
  PRACTICE_ACCENTS,
  type PracticeMode,
} from '@/components/n400/hub/PracticeSelector';

const CIVICS_CHIPS: { id: StudyCardsFilter; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'unknown', label: 'Đang học' },
  { id: 'known', label: 'Đã thuộc' },
  { id: 'bookmarks', label: '⭐ Đã lưu' },
];

export default function CivicsHubPage() {
  const { state, hydrated } = useN400UserState();
  const router = useRouter();
  const base = '/n400ready';

  const attempted = useMemo(() => new Set(state.attempts.map((a) => a.questionId)), [state.attempts]);
  const progress = useMemo(
    () => deriveHubProgress(N400_QUESTIONS, (q) => attempted.has(q.id), (q) => q.id),
    [attempted],
  );
  const recommendation = useMemo(() => recommendWeakCategory(state.attempts), [state.attempts]);

  // Same debt pool the ?start=wrongs session will actually draw from:
  // uncorrected mock wrongs first, then remaining graded wrongs, one ≤10 chunk.
  const wrongsCount = useMemo(() => {
    const pending = pendingMockReviewIds(state.mockResults, state.attempts, new Date());
    const rest = lastWrongQuestionIds(state.attempts).filter((id) => !pending.includes(id));
    return Math.min(pending.length + rest.length, 10);
  }, [state.mockResults, state.attempts]);

  // Review modes lead when available (they're what "Đề xuất" points at);
  // the four preset tiers follow in the shared fixed order.
  const modes = useMemo<PracticeMode[]>(() => {
    const list: PracticeMode[] = [];
    if (wrongsCount > 0) {
      list.push({
        id: 'wrongs',
        title: 'Ôn lại câu sai',
        desc: 'Ôn lại các câu bạn đã trả lời sai để ghi nhớ tốt hơn.',
        countLabel: `${wrongsCount} câu`,
        minutes: 5,
      });
    }
    if (recommendation) {
      list.push({
        id: 'weak',
        title: 'Chủ đề còn yếu',
        desc: `Tập trung luyện chủ đề ${N400_CATEGORY_LABELS[recommendation.category].vi}.`,
        countLabel: '5 câu',
        minutes: 3,
      });
    }
    list.push(...presetModes(PRACTICE_PRESETS, N400_QUESTIONS.length));
    return list;
  }, [wrongsCount, recommendation]);

  if (!hydrated) {
    return <div className="text-sm text-gray-500">Đang tải…</div>;
  }

  const weakAccuracy = recommendation
    ? Math.round(((recommendation.sampleSize - recommendation.wrongCount) / recommendation.sampleSize) * 100)
    : 0;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 pb-4 animate-in fade-in duration-300 sm:gap-4">
      <HubHero
        emoji="🇺🇸"
        imageSrc="/images/n400/civic-thumbnail-study.png"
        title="Civic 128 câu"
        tagline="Học toàn bộ 128 câu hỏi Civics theo thứ tự và theo chủ đề."
        stats={{ seenCount: progress.seenCount, totalCount: progress.totalCount, percent: progress.percent }}
      />

      <PracticeSelector
        skillKey="civics"
        modes={modes}
        recommendedId={wrongsCount > 0 ? 'wrongs' : 'standard'}
        illustrationSrc="/images/n400/practice_individual/Civic-thumbnail-select-mode.png"
        accent={PRACTICE_ACCENTS.civics}
        onStart={(m) => router.push(`${base}/practice?start=${m.id}`)}
      />

      <HubStudyCardsCard
        totalCount={N400_QUESTIONS.length}
        chips={CIVICS_CHIPS}
        onBrowse={(filter) =>
          router.push(filter === 'all' ? `${base}/flashcards` : `${base}/flashcards?filter=${filter}`)
        }
      />

      {recommendation ? (
        <HubWeakAreasCard
          metricLabel={N400_CATEGORY_LABELS[recommendation.category].vi}
          accuracyPercent={weakAccuracy}
          onPractice={() => router.push(`${base}/practice?start=weak`)}
        />
      ) : null}
    </div>
  );
}
