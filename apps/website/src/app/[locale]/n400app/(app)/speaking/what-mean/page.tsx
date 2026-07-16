'use client';

// What Mean hub — an execution page: Hero (identity + progress) → Practice
// (primary CTA) → Flashcards → Weak Areas. No "continue learning" card and no
// recommendation cards (the dashboard owns those). Practice sessions run
// in-page via SectionMCQuiz; the flashcard deck via SectionFlashcardScreen.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useN400UserState } from '@/lib/n400/user-state';
import { WHATMEAN_QUESTIONS, WHATMEAN_QUESTIONS_BY_ID } from '@/lib/n400/whatmean-data';
import { WHATMEAN_PRESETS } from '@/lib/n400/section-presets';
import {
  deriveSectionSeen,
  deriveSectionGradedTally,
  lastWrongSectionItemIds,
} from '@/lib/n400/section-progress';
import { buildWhatMeanOptions } from '@/lib/n400/whatmean-options';
import {
  shuffle,
  whatMeanQuestionAudioUrl,
  whatMeanAnswerAudioUrl,
} from '@/lib/n400/quiz-engine';
import { deriveHubProgress } from '@/lib/n400/hub-progress';
import { HubHero, HubStudyCardsCard, HubWeakAreasCard, type StudyCardsFilter } from '@/components/n400/hub/HubCards';
import {
  PracticeSelector,
  presetModes,
  PRACTICE_ACCENTS,
  type PracticeMode,
} from '@/components/n400/hub/PracticeSelector';
import {
  SectionFlashcardScreen,
  type SectionCard,
} from '@/components/n400/speaking/SectionFlashcardScreen';
import { SectionMCQuiz, type MCQuestion } from '@/components/n400/speaking/SectionMCQuiz';

const ALL_IDS = WHATMEAN_QUESTIONS.map((q) => q.id);

type Mode =
  | { kind: 'landing' }
  | { kind: 'deck'; ids: string[] }
  | { kind: 'practice'; ids: string[]; seed: string; minutes?: number | null };

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
  const progress = useMemo(
    () => deriveHubProgress(WHATMEAN_QUESTIONS, (q) => seen.has(q.id), (q) => q.num),
    [seen],
  );
  const wrongIds = useMemo(
    () => lastWrongSectionItemIds(state.sectionAttempts, 'whatmean'),
    [state.sectionAttempts],
  );
  const graded = useMemo(
    () => deriveSectionGradedTally(state.sectionAttempts).whatmean,
    [state.sectionAttempts],
  );

  const wrongsCount = Math.min(wrongIds.length, 10);
  const recommendedId = wrongsCount > 0 ? 'wrongs' : 'standard';

  const modes = useMemo<PracticeMode[]>(() => {
    const list: PracticeMode[] = [];
    if (wrongsCount > 0) {
      list.push({
        id: 'wrongs',
        title: 'Ôn lại từ sai',
        desc: 'Ôn lại các từ bạn đã trả lời sai để ghi nhớ tốt hơn.',
        countLabel: `${wrongsCount} từ`,
        minutes: 5,
      });
    }
    list.push(...presetModes(WHATMEAN_PRESETS, ALL_IDS.length, 'từ'));
    return list;
  }, [wrongsCount]);

  // ?start=wrongs deep link (study tip / card review link): one 10-question
  // chunk of review debt. Param is stripped immediately; with no debt the hub
  // itself is the fallback.
  const startWrongsReview = () => {
    const ids = lastWrongSectionItemIds(state.sectionAttempts, 'whatmean').slice(0, 10);
    if (ids.length > 0) setMode({ kind: 'practice', ids, seed: `${Date.now()}` });
  };
  const autoStarted = useRef(false);
  useEffect(() => {
    if (!hydrated || autoStarted.current) return;
    if (new URLSearchParams(window.location.search).get('start') !== 'wrongs') return;
    autoStarted.current = true;
    window.history.replaceState(null, '', window.location.pathname);
    // One-shot URL-to-state sync (same deep-link pattern as practice/page.tsx).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    startWrongsReview();
  });

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
        estimatedMinutes={mode.minutes}
      />
    );
  }

  function startPracticeWith(count: number, minutes?: number | null) {
    const seed = `${Date.now()}`;
    const ids = shuffle([...ALL_IDS], `wm-practice-${seed}`).slice(0, count);
    setMode({ kind: 'practice', ids, seed, minutes });
  }

  const startMode = (m: PracticeMode) => {
    if (m.id === 'wrongs') startWrongsReview();
    else {
      const preset = WHATMEAN_PRESETS.find((p) => p.id === m.id);
      startPracticeWith(preset?.count ?? ALL_IDS.length, preset?.minutes);
    }
  };

  const browse = (filter: StudyCardsFilter) => {
    const ids =
      filter === 'known'
        ? ALL_IDS.filter((id) => known.has(id))
        : filter === 'unknown'
          ? ALL_IDS.filter((id) => !known.has(id))
          : [...ALL_IDS];
    if (ids.length > 0) setMode({ kind: 'deck', ids });
  };

  // "Need improvement" strip: only with enough graded evidence, never for a
  // new user (spec §7).
  const accuracy = graded.total > 0 ? Math.round((graded.correct / graded.total) * 100) : 0;
  const showWeak = graded.total >= 5 && accuracy < 80;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 pb-4 animate-in fade-in duration-300 sm:gap-4">
        <HubHero
          emoji="💬"
          imageSrc="/images/n400/whatmean-thumbnail-study.png"
          title="What Mean"
          countLabel={`${ALL_IDS.length} từ vựng`}
          tagline="Hiểu và trả lời các câu hỏi “What mean” trong buổi phỏng vấn."
          accentTextClass="text-blue-600"
          accentBarClass="bg-blue-500"
          stats={{
            seenCount: progress.seenCount,
            totalCount: progress.totalCount,
            percent: progress.percent,
            unitLabel: 'từ',
          }}
        />
        <PracticeSelector
          skillKey="whatmean"
          modes={modes}
          recommendedId={recommendedId}
          illustrationSrc="/images/n400/practice_individual/whatmean-thumbnail-select-mode.png"
          accent={PRACTICE_ACCENTS.whatmean}
          onStart={startMode}
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
        {showWeak ? (
          <HubWeakAreasCard
            title="Từ cần cải thiện"
            subtitle="Tập trung vào những từ bạn chưa nhớ chắc."
            metricLabel="Độ chính xác trung bình"
            percentSuffix=""
            accuracyPercent={accuracy}
            onPractice={() => {
              if (wrongIds.length > 0) startWrongsReview();
              else startPracticeWith(10, 5);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
