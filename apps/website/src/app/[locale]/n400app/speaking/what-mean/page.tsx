'use client';

import { useMemo, useState } from 'react';
import { useN400UserState } from '@/lib/n400/user-state';
import { WHATMEAN_QUESTIONS, WHATMEAN_QUESTIONS_BY_ID } from '@/lib/n400/whatmean-data';
import { WHATMEAN_PRESETS } from '@/lib/n400/section-presets';
import { deriveSectionSeen } from '@/lib/n400/section-progress';
import { buildWhatMeanOptions } from '@/lib/n400/whatmean-options';
import {
  shuffle,
  whatMeanQuestionAudioUrl,
  whatMeanAnswerAudioUrl,
} from '@/lib/n400/quiz-engine';
import { deriveHubProgress, continueOrder } from '@/lib/n400/hub-progress';
import {
  HubHero,
  HubContinueCard,
  HubStudyCardsCard,
  HubPracticeCard,
  type StudyCardsFilter,
} from '@/components/n400/hub/HubCards';
import { PracticeModesSheet } from '@/components/n400/hub/PracticeModesSheet';
import {
  SectionFlashcardScreen,
  type SectionCard,
} from '@/components/n400/speaking/SectionFlashcardScreen';
import { SectionMCQuiz, type MCQuestion } from '@/components/n400/speaking/SectionMCQuiz';

const ALL_IDS = WHATMEAN_QUESTIONS.map((q) => q.id);

type Mode =
  | { kind: 'landing' }
  | { kind: 'deck'; ids: string[] }
  | { kind: 'practice'; ids: string[]; seed: string };

function toCard(id: string): SectionCard {
  const q = WHATMEAN_QUESTIONS_BY_ID[id];
  return {
    id,
    badge: `Từ vựng / Vocabulary #${q.num}`,
    questionEn: q.termEn,
    questionVi: q.termVi,
    questionAudioSrc: whatMeanQuestionAudioUrl(q.num),
    answerAudioSrc: whatMeanAnswerAudioUrl(q.num),
    answers: [{ en: q.definitionEn, vi: q.definitionVi }],
    listPrimary: q.termEn,
    listSecondary: q.definitionEn,
  };
}

function toQuestion(id: string, seed: string, i: number): MCQuestion {
  const q = WHATMEAN_QUESTIONS_BY_ID[id];
  const options = buildWhatMeanOptions(q, `${seed}-${i}`).map((o) => ({
    id: o.id,
    en: o.text,
    vi: '',
    isCorrect: o.isCorrect,
  }));
  return {
    itemId: id,
    badge: `Từ vựng / Vocabulary #${q.num}`,
    headerEn: q.termEn,
    headerVi: q.questionVi,
    questionAudioSrc: whatMeanQuestionAudioUrl(q.num),
    answerAudioSrc: whatMeanAnswerAudioUrl(q.num),
    options,
    accepted: [{ en: q.definitionEn, vi: q.definitionVi }],
  };
}

export default function WhatMeanPage() {
  const { state, hydrated, recordSectionAnswer, setSectionKnown } = useN400UserState();
  const [mode, setMode] = useState<Mode>({ kind: 'landing' });

  const known = useMemo(() => new Set(state.sectionKnown.whatmean), [state.sectionKnown.whatmean]);
  const seen = useMemo(
    () => deriveSectionSeen(state.sectionAttempts).whatmean,
    [state.sectionAttempts],
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const progress = useMemo(
    () => deriveHubProgress(WHATMEAN_QUESTIONS, (q) => seen.has(q.id), (q) => q.num),
    [seen],
  );

  if (!hydrated) {
    return <div className="text-sm text-gray-500">Đang tải…</div>;
  }

  if (mode.kind === 'deck') {
    return (
      <SectionFlashcardScreen
        cards={mode.ids.map(toCard)}
        known={known}
        onSetKnown={(id, v) => void setSectionKnown('whatmean', id, v)}
        onExit={() => setMode({ kind: 'landing' })}
        title="Câu hỏi What Mean"
      />
    );
  }

  if (mode.kind === 'practice') {
    return (
      <SectionMCQuiz
        questions={mode.ids.map((id, i) => toQuestion(id, mode.seed, i))}
        onAnswer={(id, ok) => void recordSectionAnswer('whatmean', id, ok, 'practice')}
        onExit={() => setMode({ kind: 'landing' })}
        onRestart={() => startPracticeWith(mode.ids.length)}
        title="Câu hỏi What Mean"
      />
    );
  }

  function startPracticeWith(count: number) {
    const seed = `${Date.now()}`;
    const ids = shuffle([...ALL_IDS], `wm-practice-${seed}`).slice(0, count);
    setMode({ kind: 'practice', ids, seed });
  }

  const browse = (filter: StudyCardsFilter) => {
    const ids =
      filter === 'known'
        ? ALL_IDS.filter((id) => known.has(id))
        : filter === 'unknown'
          ? ALL_IDS.filter((id) => !known.has(id))
          : [...ALL_IDS];
    if (ids.length > 0) setMode({ kind: 'deck', ids });
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 pb-8 animate-in fade-in duration-300">
        <HubHero
          emoji="💬"
          title="What Mean"
          countLabel={`${ALL_IDS.length} từ vựng`}
          tagline="Hiểu và trả lời các câu hỏi “What mean” trong buổi phỏng vấn."
        />
        <HubContinueCard
          seenCount={progress.seenCount}
          totalCount={progress.totalCount}
          percent={progress.percent}
          nextLabel={
            progress.nextNumber !== null
              ? `Bạn đang ở từ #${progress.nextNumber}`
              : 'Bạn đã học hết — ôn lại nhé!'
          }
          started={progress.started}
          onContinue={() => setMode({ kind: 'deck', ids: continueOrder(ALL_IDS, (id) => seen.has(id)) })}
        />
        <HubStudyCardsCard
          totalCount={ALL_IDS.length}
          chips={[
            { id: 'all', label: 'Tất cả' },
            { id: 'unknown', label: 'Đang học' },
            { id: 'known', label: 'Đã thuộc' },
          ]}
          onBrowse={browse}
        />
        <HubPracticeCard subtitle="Luyện tập trắc nghiệm nghĩa của từ." onStart={() => setSheetOpen(true)} />
        <PracticeModesSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          presets={WHATMEAN_PRESETS}
          totalCount={ALL_IDS.length}
          onSelect={(p) => {
            setSheetOpen(false);
            startPracticeWith(p.count ?? ALL_IDS.length);
          }}
        />
      </div>
    </div>
  );
}
