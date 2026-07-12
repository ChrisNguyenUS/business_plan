'use client';

// Civics hub — "I want to study Civics", then pick a method. Flashcards,
// Practice and Weak Areas are learning methods here, not destinations: the
// cards deep-link into the existing screens (which are unchanged).

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useN400UserState } from '@/lib/n400/user-state';
import { N400_QUESTIONS, N400_CATEGORY_LABELS } from '@/lib/n400/questions-data';
import { PRACTICE_PRESETS, recommendWeakCategory } from '@/lib/n400/quiz-engine';
import { deriveHubProgress } from '@/lib/n400/hub-progress';
import {
  HubHero,
  HubContinueCard,
  HubStudyCardsCard,
  HubWeakAreasCard,
  type StudyCardsFilter,
} from '@/components/n400/hub/HubCards';
import { PracticeSelector } from '@/components/n400/hub/PracticeSelector';

const CIVICS_CHIPS: { id: StudyCardsFilter; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'unknown', label: 'Đang học' },
  { id: 'known', label: 'Đã thuộc' },
  { id: 'bookmarks', label: '⭐ Đã lưu' },
];

export default function CivicsHubPage() {
  const { state, hydrated } = useN400UserState();
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const base = `/${locale}/n400app`;

  const attempted = useMemo(() => new Set(state.attempts.map((a) => a.questionId)), [state.attempts]);
  const progress = useMemo(
    () => deriveHubProgress(N400_QUESTIONS, (q) => attempted.has(q.id), (q) => q.id),
    [attempted],
  );
  const recommendation = useMemo(() => recommendWeakCategory(state.attempts), [state.attempts]);

  if (!hydrated) {
    return <div className="text-sm text-gray-500">Đang tải…</div>;
  }

  const weakTopicSize = recommendation
    ? N400_QUESTIONS.filter((q) => q.category === recommendation.category).length
    : 0;
  const weakAccuracy = recommendation
    ? Math.round(((recommendation.sampleSize - recommendation.wrongCount) / recommendation.sampleSize) * 100)
    : 0;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 pb-8 animate-in fade-in duration-300">
      <HubHero
        emoji="🇺🇸"
        imageSrc="/images/n400/civic-thumbnail-study.png"
        title="Civics"
        countLabel={`${N400_QUESTIONS.length} câu hỏi`}
        tagline={`Học ${N400_QUESTIONS.length} câu Civics của kỳ thi quốc tịch Mỹ, từng bước một.`}
        stats={{ seenCount: progress.seenCount, totalCount: progress.totalCount, percent: progress.percent }}
      />

      <HubContinueCard
        seenCount={progress.seenCount}
        totalCount={progress.totalCount}
        percent={progress.percent}
        nextLabel={
          progress.nextNumber !== null
            ? `Bạn đang ở câu #${progress.nextNumber}`
            : `Bạn đã học qua cả ${N400_QUESTIONS.length} câu — ôn lại nhé!`
        }
        started={progress.started}
        onContinue={() => router.push(`${base}/flashcards?filter=unknown`)}
      />

      <HubStudyCardsCard
        totalCount={N400_QUESTIONS.length}
        chips={CIVICS_CHIPS}
        onBrowse={(filter) =>
          router.push(filter === 'all' ? `${base}/flashcards` : `${base}/flashcards?filter=${filter}`)
        }
      />

      <PracticeSelector
        skillKey="civics"
        subtitle="Luyện tập với câu hỏi trắc nghiệm."
        presets={PRACTICE_PRESETS}
        totalCount={N400_QUESTIONS.length}
        onStart={(p) => router.push(`${base}/practice?start=${p.id}`)}
      />

      {recommendation ? (
        <HubWeakAreasCard
          topicLabel={N400_CATEGORY_LABELS[recommendation.category].vi}
          questionCount={weakTopicSize}
          accuracyPercent={weakAccuracy}
          onPractice={() => router.push(`${base}/practice?start=weak`)}
        />
      ) : null}
    </div>
  );
}
