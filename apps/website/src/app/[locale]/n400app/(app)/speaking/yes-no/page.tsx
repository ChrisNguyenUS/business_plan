'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useN400UserState } from '@/lib/n400/user-state';
import { YESNO_QUESTIONS, YESNO_QUESTIONS_BY_ID } from '@/lib/n400/yesno-data';
import { YESNO_PRESETS } from '@/lib/n400/section-presets';
import { deriveSectionSeen, lastWrongSectionItemIds } from '@/lib/n400/section-progress';
import { shuffle, yesNoAudioUrl } from '@/lib/n400/quiz-engine';
import { deriveHubProgress, continueOrder } from '@/lib/n400/hub-progress';
import {
  HubHero,
  HubContinueCard,
  HubStudyCardsCard,
  type StudyCardsFilter,
} from '@/components/n400/hub/HubCards';
import { PracticeSelector } from '@/components/n400/hub/PracticeSelector';
import {
  SectionFlashcardScreen,
  type SectionCard,
} from '@/components/n400/speaking/SectionFlashcardScreen';
import { SectionYesNoQuiz } from '@/components/n400/speaking/SectionYesNoQuiz';

const ALL_IDS = YESNO_QUESTIONS.map((q) => q.id);

type Mode =
  | { kind: 'landing' }
  | { kind: 'deck'; ids: string[] }
  | { kind: 'quiz'; ids: string[]; minutes?: number | null };

const answerLabel = (answer: 'yes' | 'no') => (answer === 'yes' ? 'Yes, officer' : 'No, officer');

function toCard(id: string): SectionCard {
  const q = YESNO_QUESTIONS_BY_ID[id];
  const audio = yesNoAudioUrl(q.num);
  return {
    id,
    badge: `Câu hỏi Yes/No #${q.num}`,
    questionEn: q.questionEn,
    questionVi: q.questionVi,
    questionAudioSrc: audio,
    answerAudioSrc: audio,
    answers: [{ en: answerLabel(q.answer), vi: q.questionVi }],
    listPrimary: q.questionEn,
    listSecondary: answerLabel(q.answer),
  };
}

export default function YesNoPage() {
  const { state, hydrated, recordSectionAnswer, setSectionKnown } = useN400UserState();
  const [mode, setMode] = useState<Mode>({ kind: 'landing' });

  const known = useMemo(() => new Set(state.sectionKnown.yesno), [state.sectionKnown.yesno]);
  const seen = useMemo(() => deriveSectionSeen(state.sectionAttempts).yesno, [state.sectionAttempts]);
  const progress = useMemo(
    () => deriveHubProgress(YESNO_QUESTIONS, (q) => seen.has(q.id), (q) => q.num),
    [seen],
  );

  // ?start=wrongs deep link (study tip / card review link): one 10-question
  // chunk of review debt. Param is stripped immediately; with no debt the hub
  // itself is the fallback.
  const startWrongsReview = () => {
    const ids = lastWrongSectionItemIds(state.sectionAttempts, 'yesno').slice(0, 10);
    if (ids.length > 0) setMode({ kind: 'quiz', ids });
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
        onSetKnown={(id, v) => void setSectionKnown('yesno', id, v)}
        onExit={() => setMode({ kind: 'landing' })}
        title="Câu hỏi Yes/No"
      />
    );
  }

  if (mode.kind === 'quiz') {
    return (
      <SectionYesNoQuiz
        questions={mode.ids.map((id) => YESNO_QUESTIONS_BY_ID[id])}
        onAnswer={(id, ok) => void recordSectionAnswer('yesno', id, ok, 'practice')}
        onExit={() => setMode({ kind: 'landing' })}
        onRestart={() => startQuizWith(mode.ids.length)}
        title="Yes No Quiz"
        estimatedMinutes={mode.minutes}
      />
    );
  }

  function startQuizWith(count: number, minutes?: number | null) {
    const ids = shuffle([...ALL_IDS], `yn-quiz-${Date.now()}`).slice(0, count);
    setMode({ kind: 'quiz', ids, minutes });
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
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 pb-4 animate-in fade-in duration-300 sm:gap-4">
        <HubHero
          emoji="📋"
          imageSrc="/images/n400/yesno-thumbnail-study.png"
          title="Yes / No"
          countLabel={`${ALL_IDS.length} câu hỏi`}
          tagline="Trả lời Yes/No về bản thân, tiền án, thuế,… như trong phỏng vấn."
          stats={{ seenCount: progress.seenCount, totalCount: progress.totalCount, percent: progress.percent }}
        />
        <HubContinueCard
          seenCount={progress.seenCount}
          totalCount={progress.totalCount}
          percent={progress.percent}
          nextLabel={
            progress.nextNumber !== null
              ? `Bạn đang ở câu #${progress.nextNumber}`
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
        <PracticeSelector
          skillKey="yesno"
          subtitle="Luyện trả lời Yes/No với hai nút bấm."
          presets={YESNO_PRESETS}
          totalCount={ALL_IDS.length}
          onStart={(p) => startQuizWith(p.count ?? ALL_IDS.length, p.minutes)}
        />
      </div>
    </div>
  );
}
