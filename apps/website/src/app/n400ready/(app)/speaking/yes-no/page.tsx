'use client';

// Yes/No hub — an execution page: Hero (identity + progress) → Practice
// (primary CTA) → Flashcards → Weak Areas. No "continue learning" card and no
// recommendation cards (the dashboard owns those). Quiz sessions run in-page
// via SectionYesNoQuiz; the flashcard deck via SectionFlashcardScreen.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useN400UserState } from '@/lib/n400/user-state';
import { YESNO_QUESTIONS, YESNO_QUESTIONS_BY_ID } from '@/lib/n400/yesno-data';
import { YESNO_PRESETS } from '@/lib/n400/section-presets';
import {
  deriveSectionSeen,
  deriveSectionGradedTally,
  lastWrongSectionItemIds,
} from '@/lib/n400/section-progress';
import { shuffle, yesNoAudioUrl } from '@/lib/n400/quiz-engine';
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
  const router = useRouter();
  const pathname = usePathname();

  const known = useMemo(() => new Set(state.sectionKnown.yesno), [state.sectionKnown.yesno]);
  const seen = useMemo(() => deriveSectionSeen(state.sectionAttempts).yesno, [state.sectionAttempts]);
  const progress = useMemo(
    () => deriveHubProgress(YESNO_QUESTIONS, (q) => seen.has(q.id), (q) => q.num),
    [seen],
  );
  const wrongIds = useMemo(
    () => lastWrongSectionItemIds(state.sectionAttempts, 'yesno'),
    [state.sectionAttempts],
  );
  const graded = useMemo(
    () => deriveSectionGradedTally(state.sectionAttempts).yesno,
    [state.sectionAttempts],
  );

  const wrongsCount = Math.min(wrongIds.length, 10);
  const recommendedId = wrongsCount > 0 ? 'wrongs' : 'standard';

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
    list.push(...presetModes(YESNO_PRESETS, ALL_IDS.length));
    return list;
  }, [wrongsCount]);

  // ?start=wrongs deep link (study tip / card review link): one 10-question
  // chunk of review debt. Param is stripped immediately; with no debt the hub
  // itself is the fallback.
  const startWrongsReview = () => {
    const ids = lastWrongSectionItemIds(state.sectionAttempts, 'yesno').slice(0, 10);
    if (ids.length > 0) {
      setMode({ kind: 'quiz', ids });
      router.push(`${pathname}?mode=practice`, { scroll: false });
    }
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
        onExit={() => {
          setMode({ kind: 'landing' });
          router.replace(pathname, { scroll: false });
        }}
        title="Câu hỏi Yes/No"
      />
    );
  }

  if (mode.kind === 'quiz') {
    return (
      <SectionYesNoQuiz
        questions={mode.ids.map((id) => YESNO_QUESTIONS_BY_ID[id])}
        onAnswer={(id, ok) => void recordSectionAnswer('yesno', id, ok, 'practice')}
        onExit={() => {
          setMode({ kind: 'landing' });
          router.replace(pathname, { scroll: false });
        }}
        onRestart={() => startQuizWith(mode.ids.length)}
        title="Yes No Quiz"
        estimatedMinutes={mode.minutes}
      />
    );
  }

  function startQuizWith(count: number, minutes?: number | null) {
    const ids = shuffle([...ALL_IDS], `yn-quiz-${Date.now()}`).slice(0, count);
    setMode({ kind: 'quiz', ids, minutes });
    router.push(`${pathname}?mode=practice`, { scroll: false });
  }

  const startMode = (m: PracticeMode) => {
    if (m.id === 'wrongs') startWrongsReview();
    else {
      const preset = YESNO_PRESETS.find((p) => p.id === m.id);
      startQuizWith(preset?.count ?? ALL_IDS.length, preset?.minutes);
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
          emoji="📋"
          imageSrc="/images/n400/yesno-thumbnail-study.png"
          title="Yes / No Questions"
          countLabel={`${ALL_IDS.length} câu hỏi`}
          tagline="Luyện các câu hỏi dạng Yes/No trong đơn N-400 và các câu hỏi phỏng vấn cá nhân."
          accentTextClass="text-purple-600"
          accentBarClass="bg-purple-500"
          stats={{ seenCount: progress.seenCount, totalCount: progress.totalCount, percent: progress.percent }}
        />
        <PracticeSelector
          skillKey="yesno"
          modes={modes}
          recommendedId={recommendedId}
          illustrationSrc="/images/n400/practice_individual/yesno-thumbnail-select-mode.png"
          accent={PRACTICE_ACCENTS.yesno}
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
            subtitle="Tập trung vào các nhóm câu hỏi bạn còn yếu."
            metricLabel="Độ chính xác trung bình"
            percentSuffix=""
            accuracyPercent={accuracy}
            onPractice={() => {
              if (wrongIds.length > 0) startWrongsReview();
              else startQuizWith(10, 5);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
